"""litellm 统一模型网关：自动扫描、思考强度检测、统一流式调用。"""
import json
import logging
from typing import Any

import litellm
from sqlalchemy import select

from app.database import async_session_factory
from app.models.provider import ModelProvider

logger = logging.getLogger(__name__)

# litellm 缓存
_configured_providers: dict[str, dict] = {}  # model_name -> provider config


async def load_providers() -> dict[str, dict]:
    """从数据库加载供应商配置到 litellm。"""
    global _configured_providers
    try:
        async with async_session_factory() as db:
            result = await db.execute(
                select(ModelProvider).where(ModelProvider.is_active == True)
            )
            providers = result.scalars().all()

            for p in providers:
                models = json.loads(p.models) if p.models else []
                for model_name in models:
                    _configured_providers[model_name] = {
                        "api_base": p.base_url,
                        "api_key": p.api_key,
                        "api_format": p.api_format,
                        "provider_name": p.name,
                        "is_default": p.is_default,
                    }
        logger.info("Loaded %d models from %d providers", len(_configured_providers),
                     len(set(v["provider_name"] for v in _configured_providers.values())))
    except Exception as e:
        logger.error("Failed to load providers: %s", e)
    return _configured_providers


def get_model_config(model_name: str) -> dict | None:
    """查找模型对应的供应商配置。"""
    # 直接匹配
    if model_name in _configured_providers:
        return _configured_providers[model_name]
    # 尝试去掉前缀匹配 (如 "openai/gpt-4" -> "gpt-4")
    if "/" in model_name:
        short = model_name.split("/", 1)[1]
        if short in _configured_providers:
            return _configured_providers[short]
    return None


def supports_reasoning(model_name: str) -> dict[str, Any]:
    """检测模型是否支持思考强度及可用等级。"""
    try:
        # litellm 内置模型能力库
        model_id = model_name
        if "/" in model_name:
            model_id = model_name.split("/", 1)[1]

        # 检查 litellm 内置数据库
        model_info = litellm.model_prices_and_context_window.get(model_id, {})
        if not model_info:
            # 尝试带 provider 前缀
            model_info = litellm.model_prices_and_context_window.get(model_name, {})

        supports = model_info.get("supports_reasoning", False)

        if supports:
            # 根据模型类型返回可用强度
            effort_levels = ["low", "medium", "high"]
            if "gpt-5" in model_id or "opus" in model_id or "o3" in model_id:
                effort_levels.append("max")
            return {
                "supports_reasoning": True,
                "available_efforts": effort_levels,
                "default_effort": "medium",
                "context_window": model_info.get("max_input_tokens", None),
                "cost_per_1k_input": model_info.get("cost_per_input_token", None),
                "cost_per_1k_output": model_info.get("cost_per_output_token", None),
            }

        return {
            "supports_reasoning": False,
            "available_efforts": [],
            "context_window": model_info.get("max_input_tokens", None),
        }
    except Exception as e:
        logger.error("Error checking reasoning support: %s", e)
        return {"supports_reasoning": False, "available_efforts": []}


async def scan_provider_models(provider_id: int | None = None) -> list[dict]:
    """扫描供应商可用模型列表（通过 litellm 的 /v1/models 端点）。"""
    await load_providers()
    results = []

    async with async_session_factory() as db:
        if provider_id:
            from app.models.provider import ModelProvider as MP
            p = await db.get(MP, provider_id)
            if not p:
                return []
            providers = [p]
        else:
            result = await db.execute(select(ModelProvider).where(ModelProvider.is_active == True))
            providers = result.scalars().all()

        for p in providers:
            models = json.loads(p.models) if p.models else []
            for model_name in models:
                reasoning_info = supports_reasoning(model_name)
                full_id = f"{p.api_format}/{model_name}"
                results.append({
                    "model_id": model_name,
                    "full_id": full_id,
                    "provider_name": p.name,
                    "provider_id": p.id,
                    "api_format": p.api_format,
                    **reasoning_info,
                })

    return results


async def acompletion(
    model_name: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 2000,
    stream: bool = False,
    reasoning_effort: str | None = None,
) -> dict | Any:
    """统一调用接口：从数据库匹配供应商并调用。"""
    if not _configured_providers:
        await load_providers()

    config = get_model_config(model_name)
    kwargs: dict[str, Any] = {
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    if reasoning_effort:
        kwargs["reasoning_effort"] = reasoning_effort

    if config:
        kwargs["model"] = f"{config['api_format']}/{model_name}"
        kwargs["api_base"] = config["api_base"]
        kwargs["api_key"] = config["api_key"]
    else:
        kwargs["model"] = model_name

    if stream:
        kwargs["stream"] = True

    response = await litellm.acompletion(**kwargs)

    if stream:
        return response

    return {
        "content": response.choices[0].message.content,
        "model": model_name,
        "usage": {
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
        } if response.usage else None,
    }

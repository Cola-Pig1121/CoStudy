"""litellm 统一调用层：从数据库读取供应商配置，自动路由到对应 API。"""
import json
import logging

from sqlalchemy import select

from app.database import async_session_factory
from app.models.provider import ModelProvider

logger = logging.getLogger(__name__)

# litellm 缓存
_litellm_configured = False


async def ensure_litellm_config() -> None:
    """从数据库加载供应商配置到 litellm。"""
    global _litellm_configured
    if _litellm_configured:
        return

    try:
        import litellm

        async with async_session_factory() as db:
            result = await db.execute(
                select(ModelProvider).where(ModelProvider.is_active == True)
            )
            providers = result.scalars().all()

            for p in providers:
                models = json.loads(p.models) if p.models else []
                for model_name in models:
                    # litellm model_name 格式: "provider/model_name"
                    # 通过 api_base + api_key 覆盖
                    full_name = f"custom/{model_name}"
                    litellm.custom_llm_provider = full_name  # noqa
                    logger.info("Registered model: %s -> %s", full_name, p.base_url)

            _litellm_configured = True
    except ImportError:
        logger.warning("litellm not installed, falling back to env-based config")
        _litellm_configured = True


async def acompletion(
    model_name: str,
    messages: list[dict],
    temperature: float = 0.7,
    max_tokens: int = 2000,
    stream: bool = False,
) -> dict:
    """统一调用接口：从数据库匹配供应商并调用。"""
    await ensure_litellm_config()

    try:
        import litellm

        # 从数据库查找匹配的供应商
        async with async_session_factory() as db:
            result = await db.execute(
                select(ModelProvider).where(ModelProvider.is_active == True)
            )
            providers = result.scalars().all()

            for p in providers:
                models = json.loads(p.models) if p.models else []
                if model_name in models:
                    response = await litellm.acompletion(
                        model=f"{p.api_format}/{model_name}",
                        api_base=p.base_url,
                        api_key=p.api_key,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        stream=stream,
                    )
                    if stream:
                        return {"stream": response}
                    return {
                        "content": response.choices[0].message.content,
                        "model": model_name,
                        "usage": {
                            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                        } if response.usage else None,
                    }

        # 没找到匹配的供应商，使用默认（兼容旧的环境变量配置）
        response = await litellm.acompletion(
            model=model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream,
        )
        if stream:
            return {"stream": response}
        return {
            "content": response.choices[0].message.content,
            "model": model_name,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            } if response.usage else None,
        }
    except ImportError:
        raise RuntimeError("litellm not installed: pip install litellm")
    except Exception as e:
        logger.error("litellm completion failed: %s", e)
        raise

"""模型供应商管理 API 路由：管理员 CRUD + litellm 调用。"""
import json

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.dependencies import DbSession, RequireAdmin
from app.models.provider import ModelProvider

router = APIRouter(prefix="/providers", tags=["providers"])


# ── Schemas ──

class ProviderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    base_url: str = Field(..., min_length=1, max_length=500)
    api_key: str = Field(..., min_length=1, max_length=500)
    api_format: str = Field("openai", pattern=r"^(openai|anthropic)$")
    models: list[str] = Field(default_factory=list, description="模型名称列表")


class ProviderUpdate(BaseModel):
    name: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    api_format: str | None = None
    models: list[str] | None = None
    is_active: bool | None = None
    is_default: bool | None = None


class ProviderResponse(BaseModel):
    id: int
    name: str
    base_url: str
    api_key_masked: str  # 仅显示前4位 + ****
    api_format: str
    models: list[str]
    is_active: bool
    is_default: bool


def _mask_key(key: str) -> str:
    if len(key) <= 8:
        return "****"
    return key[:4] + "****" + key[-4:]


def _to_response(p: ModelProvider) -> ProviderResponse:
    return ProviderResponse(
        id=p.id,
        name=p.name,
        base_url=p.base_url,
        api_key_masked=_mask_key(p.api_key),
        api_format=p.api_format,
        models=json.loads(p.models) if p.models else [],
        is_active=p.is_active,
        is_default=p.is_default,
    )


# ── CRUD ──

@router.get("")
async def list_providers(db: DbSession, admin: RequireAdmin) -> list[dict]:
    """获取所有供应商配置。"""
    result = await db.execute(select(ModelProvider).order_by(ModelProvider.is_default.desc(), ModelProvider.id))
    return [_to_response(p).model_dump() for p in result.scalars().all()]


@router.post("", status_code=201)
async def create_provider(payload: ProviderCreate, db: DbSession, admin: RequireAdmin) -> dict:
    """添加供应商。"""
    provider = ModelProvider(
        name=payload.name,
        base_url=payload.base_url,
        api_key=payload.api_key,
        api_format=payload.api_format,
        models=json.dumps(payload.models, ensure_ascii=False),
    )
    # 第一个供应商自动设为默认
    count_result = await db.execute(select(ModelProvider))
    if not count_result.scalars().first():
        provider.is_default = True

    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return _to_response(provider).model_dump()


@router.put("/{provider_id}")
async def update_provider(
    provider_id: int, payload: ProviderUpdate, db: DbSession, admin: RequireAdmin
) -> dict:
    """更新供应商配置。"""
    provider = await db.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="供应商不存在")

    data = payload.model_dump(exclude_unset=True)
    if "models" in data and data["models"] is not None:
        data["models"] = json.dumps(data["models"], ensure_ascii=False)
    if data.get("is_default"):
        # 取消其他默认
        result = await db.execute(select(ModelProvider).where(ModelProvider.is_default == True))
        for p in result.scalars().all():
            p.is_default = False

    for key, value in data.items():
        setattr(provider, key, value)
    await db.commit()
    await db.refresh(provider)
    return _to_response(provider).model_dump()


@router.delete("/{provider_id}", status_code=204)
async def delete_provider(provider_id: int, db: DbSession, admin: RequireAdmin) -> None:
    """删除供应商。"""
    provider = await db.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="供应商不存在")
    await db.delete(provider)
    await db.commit()


@router.post("/{provider_id}/test")
async def test_provider(provider_id: int, db: DbSession, admin: RequireAdmin) -> dict:
    """测试供应商连接（发送简单请求验证 API Key）。"""
    provider = await db.get(ModelProvider, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="供应商不存在")

    models = json.loads(provider.models) if provider.models else []
    if not models:
        raise HTTPException(status_code=400, detail="未配置模型列表")

    try:
        import litellm
        response = await litellm.acompletion(
            model=f"{provider.api_format}/{models[0]}",
            api_base=provider.base_url,
            api_key=provider.api_key,
            messages=[{"role": "user", "content": "Say 'ok' in one word."}],
            max_tokens=10,
        )
        return {"success": True, "model": models[0], "response": response.choices[0].message.content}
    except Exception as e:
        return {"success": False, "error": str(e)}

"""AI 辅助 API：文本润色、翻译、摘要。"""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.config import get_settings
from app.dependencies import CurrentUser

router = APIRouter(prefix="/ai", tags=["ai"])
settings = get_settings()


class PolishRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="需要润色的原文")
    mode: str = Field("polish", pattern=r"^(polish|translate|simplify|expand)$",
                       description="polish=润色, translate=翻译, simplify=简化, expand=展开")


class PolishResponse(BaseModel):
    result: str
    mode: str


PROMPTS = {
    "polish": "请对以下文本进行润色，保持原意，提升表达质量和流畅度。直接返回润色后的文本，不要加任何前缀说明：\n\n",
    "translate": "请将以下文本翻译为英文。直接返回翻译结果，不要加任何前缀说明：\n\n",
    "simplify": "请用更简单易懂的语言改写以下文本，适合中学生阅读。直接返回改写后的文本，不要加任何前缀说明：\n\n",
    "expand": "请对以下文本进行扩展补充，增加更多细节和解释。直接返回扩展后的文本，不要加任何前缀说明：\n\n",
}


@router.post("/polish", response_model=PolishResponse)
async def polish_text(payload: PolishRequest, user: CurrentUser) -> PolishResponse:
    """AI 文本润色 / 翻译 / 简化 / 扩展。"""
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=503, detail="AI 服务未配置")

    prompt = PROMPTS.get(payload.mode, PROMPTS["polish"]) + payload.text

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [
                        {"role": "system", "content": "你是一位专业的学术写作助手，擅长润色、翻译和改写中文文本。"},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            result = data["choices"][0]["message"]["content"].strip()
            return PolishResponse(result=result, mode=payload.mode)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"AI 服务返回错误: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 服务异常: {str(e)}")

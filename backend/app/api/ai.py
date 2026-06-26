"""AI 辅助 API：润色、对话（SSE 流式）、合规性预检、对话历史。"""
import json
import uuid
from typing import AsyncGenerator

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.config import get_settings
from app.dependencies import CurrentUser, DbSession
from app.models.chat import ChatLog

router = APIRouter(prefix="/ai", tags=["ai"])
settings = get_settings()


# ── 润色 ──

class PolishRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    mode: str = Field("polish", pattern=r"^(polish|translate|simplify|expand)$")


class PolishResponse(BaseModel):
    result: str
    mode: str


POLISH_PROMPTS = {
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
    prompt = POLISH_PROMPTS.get(payload.mode, POLISH_PROMPTS["polish"]) + payload.text
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                json={"model": settings.DEEPSEEK_MODEL,
                      "messages": [{"role": "system", "content": "你是一位专业的学术写作助手。"},
                                   {"role": "user", "content": prompt}],
                      "temperature": 0.7, "max_tokens": 2000},
            )
            resp.raise_for_status()
            return PolishResponse(result=resp.json()["choices"][0]["message"]["content"].strip(), mode=payload.mode)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 服务异常: {str(e)}")


# ── 合规性预检 ──

class ComplianceRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class ComplianceResponse(BaseModel):
    passed: bool
    reason: str


COMPLIANCE_PROMPT = """判断以下用户输入是否与学习、教材、考试相关。
只返回 JSON: {"passed": true/false, "reason": "简短原因"}
不相关的范围：闲聊、广告、政治敏感、暴力色情、技术破解。
相关的范围：教材知识、考试准备、学习方法、笔记编辑、作业问题。

用户输入："""


@router.post("/compliance/check", response_model=ComplianceResponse)
async def check_compliance(payload: ComplianceRequest, user: CurrentUser) -> ComplianceResponse:
    """对话合规性预检：确保用户输入与学习相关。"""
    if not settings.DEEPSEEK_API_KEY:
        return ComplianceResponse(passed=True, reason="AI 服务未配置，跳过检查")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                json={"model": settings.DEEPSEEK_MODEL,
                      "messages": [{"role": "user", "content": COMPLIANCE_PROMPT + payload.text}],
                      "temperature": 0.1, "max_tokens": 200},
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()
            # 尝试解析 JSON
            import re
            json_match = re.search(r'\{[^}]+\}', content)
            if json_match:
                result = json.loads(json_match.group())
                return ComplianceResponse(passed=result.get("passed", True), reason=result.get("reason", ""))
            return ComplianceResponse(passed=True, reason="解析失败，默认通过")
    except Exception:
        return ComplianceResponse(passed=True, reason="检查异常，默认通过")


# ── 聊天 (SSE 流式) ──

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:16])
    assistant_type: str = Field("ai_chat", pattern=r"^(ai_chat|feynman|knowledge_qa)$")
    reasoning_effort: str | None = Field(None, pattern=r"^(low|medium|high|max)$",
                                          description="思考强度: low/medium/high/max")


SYSTEM_PROMPTS = {
    "ai_chat": "你是 CoStudy 智能学习助手。你的职责是帮助学生理解教材知识。回答时引用具体资源，保持友好耐心的语气，像一位辅导老师。只回答与学习、教材、考试相关的问题。",
    "feynman": "你是 CoStudy 费曼学习助手。你用苏格拉底式提问引导学生：先让学生用自己的话解释概念，然后指出理解不准确的地方，反复对话帮助学生真正掌握知识。不要直接给出答案，而是通过提问引导。",
    "knowledge_qa": "你是 CoStudy 知识问答助手。学生提问时，你基于教材内容给出准确、详细的解答。如果不确定，诚实说明并建议学生查看相关教材章节。",
}


@router.post("/chat")
async def chat_stream(payload: ChatRequest, user: CurrentUser) -> StreamingResponse:
    """AI 对话（SSE 流式响应）。"""
    if not settings.DEEPSEEK_API_KEY:
        raise HTTPException(status_code=503, detail="AI 服务未配置")

    system_prompt = SYSTEM_PROMPTS.get(payload.assistant_type, SYSTEM_PROMPTS["ai_chat"])

    # 保存用户消息
    async with DbSession() as db:
        db.add(ChatLog(
            user_id=user.id, assistant_type=payload.assistant_type,
            conversation_id=payload.conversation_id, role="user", content=payload.message,
        ))
        await db.commit()

    async def generate() -> AsyncGenerator[str, None]:
        full_response = ""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # 构建请求参数
                llm_kwargs = {
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "system", "content": system_prompt},
                                 {"role": "user", "content": payload.message}],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                    "stream": True,
                }
                # 如果有思考强度参数，传入
                if payload.reasoning_effort:
                    llm_kwargs["reasoning_effort"] = payload.reasoning_effort

                async with client.stream(
                    "POST", f"{settings.DEEPSEEK_API_BASE}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}", "Content-Type": "application/json"},
                    json=llm_kwargs,
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            data = line[6:]
                            if data.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                delta = chunk["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    full_response += content
                                    yield f"data: {json.dumps({'content': content})}\n\n"
                            except (json.JSONDecodeError, KeyError, IndexError):
                                continue

            # 保存助手回复
            async with DbSession() as db:
                db.add(ChatLog(
                    user_id=user.id, assistant_type=payload.assistant_type,
                    conversation_id=payload.conversation_id, role="assistant", content=full_response,
                ))
                await db.commit()

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            error_msg = f"AI 服务异常: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ── 对话历史 ──

@router.get("/conversations")
async def list_conversations(
    db: DbSession, user: CurrentUser,
    assistant_type: str = Query("ai_chat"),
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50),
) -> dict:
    """获取对话列表（按 conversation_id 分组，取最新一条）。"""
    # 获取不重复的 conversation_id
    subq = (
        select(ChatLog.conversation_id, func.max(ChatLog.id).label("max_id"))
        .where(ChatLog.user_id == user.id, ChatLog.assistant_type == assistant_type)
        .group_by(ChatLog.conversation_id)
        .order_by(func.max(ChatLog.id).desc())
    )
    total = (await db.execute(
        select(func.count()).select_from(subq.subquery())
    )).scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(subq.offset(offset).limit(page_size))
    rows = result.all()

    conversations = []
    for row in rows:
        # 获取该会话的最新消息
        msg_result = await db.execute(
            select(ChatLog).where(ChatLog.conversation_id == row.conversation_id)
            .order_by(ChatLog.created_at.desc()).limit(1)
        )
        msg = msg_result.scalar_one_or_none()
        if msg:
            conversations.append({
                "conversation_id": row.conversation_id,
                "last_message": msg.content[:100] + "..." if len(msg.content) > 100 else msg.content,
                "last_role": msg.role,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            })

    return {"items": conversations, "total": total, "page": page, "page_size": page_size}


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str, db: DbSession, user: CurrentUser,
) -> list[dict]:
    """获取单个对话的完整历史。"""
    result = await db.execute(
        select(ChatLog)
        .where(ChatLog.user_id == user.id, ChatLog.conversation_id == conversation_id)
        .order_by(ChatLog.created_at.asc())
    )
    logs = result.scalars().all()
    return [{"role": l.role, "content": l.content, "created_at": l.created_at.isoformat() if l.created_at else None}
            for l in logs]

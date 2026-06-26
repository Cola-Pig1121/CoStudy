"""ChatLog ORM 模型 - AI 对话历史记录。"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ChatLog(Base):
    """AI 对话日志表。"""

    __tablename__ = "chat_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    assistant_type: Mapped[str] = mapped_column(String(30), nullable=False)  # 'feynman' | 'knowledge_qa' | 'ai_chat'
    conversation_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # 'user' | 'assistant'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    compliance_passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    compliance_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

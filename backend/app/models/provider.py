"""ModelProvider ORM 模型 - AI 模型供应商配置。

基于 litellm 的统一调用架构，管理员可在后台配置多个供应商。
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ModelProvider(Base):
    """AI 模型供应商配置表。"""

    __tablename__ = "model_providers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)           # 如 "DeepSeek", "MiniMax"
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)      # 如 "https://api.deepseek.com/v1"
    api_key: Mapped[str] = mapped_column(String(500), nullable=False)       # 加密存储（TODO: 生产环境用 Fernet）
    api_format: Mapped[str] = mapped_column(String(50), nullable=False, default="openai")  # openai | anthropic
    models: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON 数组: ["deepseek-chat", "deepseek-reasoner"]
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)  # 默认供应商
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

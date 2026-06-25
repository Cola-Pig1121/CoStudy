"""TextbookNode ORM 模型 - 教材知识树。

层级:
  0: 科目 (如"数学")
  1: 教材 (如"人教版高中数学必修一")
  2: 单元 (如"集合与函数")
  3: 章节 (如"集合的概念")
"""
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.database import Base


class TextbookNode(Base):
    """教材树节点，自引用层级结构。"""

    __tablename__ = "textbooks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    level: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("textbooks.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # 课本图片 URL 列表 (MinIO 路径)；JSONB on PG, JSON on SQLite
    image_urls: Mapped[list[Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list, server_default="[]"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

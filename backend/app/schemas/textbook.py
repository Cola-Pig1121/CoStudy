"""教材树相关 Pydantic 请求/响应模型。"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class TextbookNodeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    level: int = Field(..., ge=0, le=3, description="0:科目, 1:教材, 2:单元, 3:章节")
    parent_id: int | None = Field(None, description="父节点 ID，根节点为空")
    sort_order: int = 0
    description: str | None = None
    image_urls: list[Any] = Field(default_factory=list)


class TextbookCreate(TextbookNodeBase):
    """管理员创建节点。"""


class TextbookUpdate(BaseModel):
    """管理员更新节点（所有字段可选）。"""

    name: str | None = Field(None, min_length=1, max_length=100)
    sort_order: int | None = None
    description: str | None = None
    image_urls: list[Any] | None = None


class TextbookNodeResponse(TextbookNodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class TextbookTreeNode(TextbookNodeResponse):
    """树状结构响应：递归包含子节点。"""

    children: list["TextbookTreeNode"] = Field(default_factory=list)


# 递归模型自引用需要重新构建
TextbookTreeNode.model_rebuild()


class TextbookChildrenResponse(BaseModel):
    """节点详情 + 直接子节点列表。"""

    node: TextbookNodeResponse
    children: list[TextbookNodeResponse] = Field(default_factory=list)

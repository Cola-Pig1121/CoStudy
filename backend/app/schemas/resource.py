"""共享资源相关 Pydantic 请求/响应模型。"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResourceCreate(BaseModel):
    """创建资源（草稿）。"""

    title: str = Field(..., min_length=1, max_length=200)
    type: str = Field(..., pattern=r"^(excalidraw|markdown)$")
    textbook_id: int | None = None
    content: str = Field(default="", description="资源内容 (JSON 或 Markdown)")


class ResourceUpdate(BaseModel):
    """更新资源内容。"""

    title: str | None = Field(None, min_length=1, max_length=200)
    content: str | None = None
    textbook_id: int | None = None


class ResourceResponse(BaseModel):
    """资源列表/概要响应。"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    textbook_id: int | None
    user_id: int
    title: str
    type: str
    content_path: str | None
    preview_url: str | None
    status: int
    reviewer_id: int | None = None
    reject_reason: str | None = None
    favorites_count: int
    view_count: int
    created_at: datetime
    updated_at: datetime


class ResourceDetail(ResourceResponse):
    """资源详情（含内容）。"""

    content: str | None = None
    reviewer_id: int | None = None
    reject_reason: str | None = None
    is_favorited: bool = False
    author_name: str | None = None


class RejectRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


class FavoriteResponse(BaseModel):
    favorited: bool
    favorites_count: int


class ReviewLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_id: int
    reviewer_id: int
    action: str
    reason: str | None
    created_at: datetime
    resource_title: str | None = None
    reviewer_name: str | None = None

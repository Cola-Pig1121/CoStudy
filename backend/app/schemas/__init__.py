"""Pydantic schemas 汇总。"""
from app.schemas.resource import (
    FavoriteResponse,
    RejectRequest,
    ResourceCreate,
    ResourceDetail,
    ResourceResponse,
    ResourceUpdate,
    ReviewLogResponse,
)
from app.schemas.textbook import (
    TextbookChildrenResponse,
    TextbookCreate,
    TextbookNodeResponse,
    TextbookTreeNode,
    TextbookUpdate,
)
from app.schemas.user import (
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)

__all__ = [
    "RefreshRequest",
    "TokenResponse",
    "UserLogin",
    "UserRegister",
    "UserResponse",
    "UserUpdate",
    "TextbookChildrenResponse",
    "TextbookCreate",
    "TextbookNodeResponse",
    "TextbookTreeNode",
    "TextbookUpdate",
    "FavoriteResponse",
    "RejectRequest",
    "ResourceCreate",
    "ResourceDetail",
    "ResourceResponse",
    "ResourceUpdate",
    "ReviewLogResponse",
]

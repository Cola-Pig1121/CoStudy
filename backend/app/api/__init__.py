"""API 路由汇总。"""
from app.api.auth import router as auth_router
from app.api.resources import router as resources_router
from app.api.review import router as review_router
from app.api.textbooks import router as textbooks_router

__all__ = ["auth_router", "textbooks_router", "resources_router", "review_router"]

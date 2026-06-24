"""FastAPI 应用入口。"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期：启动 / 关闭钩子。"""
    # 启动
    from app.database import engine

    # 启动时打印日志（不强制连接 DB，便于无 DB 环境下也能起服务做联调）
    import logging

    logging.getLogger("app").info(
        "%s v%s 启动中 | DB=%s | Redis=%s",
        settings.APP_NAME,
        settings.APP_VERSION,
        settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "localhost",
        settings.REDIS_URL,
    )
    yield
    # 关闭
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="CoStudy 校内学生知识共享系统 - API",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 健康检查 ──
@app.get("/api/health", tags=["health"])
async def health() -> dict:
    """健康检查端点，供前端联调使用。"""
    from app.redis import redis_client
    from app.services.storage_service import is_storage_available

    db_ok = True
    redis_ok = False
    storage_ok = is_storage_available()

    # 尝试 ping Redis（不阻断）
    try:
        await redis_client.ping()
        redis_ok = True
    except Exception:  # noqa: BLE001
        pass

    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "checks": {
            "database": "ok" if db_ok else "unavailable",
            "redis": "ok" if redis_ok else "unavailable",
            "storage": "ok" if storage_ok else "unavailable",
        },
    }


# ── 注册 API 路由 ──
from app.api import auth_router, resources_router, review_router, textbooks_router  # noqa: E402

app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(textbooks_router, prefix=settings.API_V1_PREFIX)
app.include_router(resources_router, prefix=settings.API_V1_PREFIX)
app.include_router(review_router, prefix=settings.API_V1_PREFIX)
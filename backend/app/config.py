"""应用配置 - 从环境变量读取。"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """全局配置，通过环境变量 / .env 文件注入。"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore"
    )

    # ── 应用 ──
    APP_NAME: str = "CoStudy API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # ── 数据库 ──
    DATABASE_URL: str = "postgresql+asyncpg://costudy:costudy@localhost:5432/costudy"

    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── MinIO 对象存储 ──
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "costudy"
    MINIO_SECURE: bool = False

    # ── JWT 认证 ──
    JWT_SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 小时
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── DeepSeek API ──
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_API_BASE: str = "https://api.deepseek.com/v1"
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_VISION_MODEL: str = "deepseek-chat"

    # ── CORS ──
    CORS_ORIGINS: str = "http://localhost:3000"

    # ── Embedding (RAG) ──
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # ── 限流 ──
    RATE_LIMIT_AI_PER_MINUTE: int = 5
    RATE_LIMIT_OCR_PER_MINUTE: int = 2

    # ── Celery ──
    CELERY_BROKER_URL: Optional[str] = None  # 默认复用 REDIS_URL
    CELERY_RESULT_BACKEND: Optional[str] = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def celery_broker(self) -> str:
        return self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def celery_backend(self) -> str:
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL


@lru_cache
def get_settings() -> Settings:
    """单例配置实例。"""
    return Settings()


settings = get_settings()
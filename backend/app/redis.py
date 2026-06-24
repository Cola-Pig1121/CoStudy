"""Redis 客户端封装（缓存、排行榜、限流共享连接）。"""
from __future__ import annotations

import redis.asyncio as redis

from app.config import settings

# 全局异步 Redis 连接池
redis_client: redis.Redis = redis.Redis.from_url(
    str(settings.REDIS_URL),
    encoding="utf-8",
    decode_responses=True,
)


async def get_redis() -> redis.Redis:
    """FastAPI 依赖：返回 Redis 客户端。"""
    return redis_client


# ── 排行榜 ──
LEADERBOARD_KEY = "rank:leadership"
TEXTBOOK_TREE_CACHE_KEY = "cache:textbook_tree"
TEXTBOOK_TREE_CACHE_TTL = 3600  # 1 小时
"""MinIO 对象存储封装。

脚手架阶段：连接延迟到首次使用，缺失服务不影响启动。
生产阶段：移除 fallback，强制要求 MinIO 可用。
"""
from __future__ import annotations

import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)

# MinIO 客户端（延迟初始化）
_minio_client: Optional["Minio"] = None  # type: ignore[name-defined]


def get_minio() -> Optional["Minio"]:  # type: ignore[name-defined]
    """返回 MinIO 客户端实例，连接失败时返回 None（不阻断启动）。"""
    global _minio_client
    if _minio_client is not None:
        return _minio_client
    try:
        from minio import Minio  # 延迟导入，避免无依赖时崩溃

        _minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        # 确保 bucket 存在
        if not _minio_client.bucket_exists(settings.MINIO_BUCKET):
            _minio_client.make_bucket(settings.MINIO_BUCKET)
            logger.info("Created MinIO bucket: %s", settings.MINIO_BUCKET)
    except Exception as exc:  # noqa: BLE001  脚手架阶段容错
        logger.warning("MinIO 不可用（脚手架阶段可忽略）: %s", exc)
        _minio_client = None
    return _minio_client


def is_storage_available() -> bool:
    """检查对象存储是否可用。"""
    return get_minio() is not None
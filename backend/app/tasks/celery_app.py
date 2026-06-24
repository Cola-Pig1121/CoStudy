"""Celery 应用初始化。

OCR、视频转码、向量化等耗时任务通过 Celery 异步执行。
脚手架阶段仅创建空壳，具体任务在后续阶段补全。
"""
from celery import Celery

from app.config import settings

celery_app = Celery(
    "costudy",
    broker=settings.celery_broker,
    backend=settings.celery_backend,
    include=[],  # 后续阶段补充：["app.tasks.ocr_tasks", "app.tasks.video_tasks", ...]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
    # OCR 并发限制为 1-2，防止 CPU 过载（见 SPEC）
    worker_concurrency=2,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
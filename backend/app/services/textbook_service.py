"""教材树服务：递归构建树、根科目查询、缓存。

`get_root_subject_id` 在 PostgreSQL 上由 SQL 函数实现，但为保证
本地 SQLite 测试可用，此处用 Python 逐级向上遍历 parent_id 实现。
"""
from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import TextbookNode
from app.redis import TEXTBOOK_TREE_CACHE_KEY, TEXTBOOK_TREE_CACHE_TTL, redis_client

logger = logging.getLogger(__name__)


async def get_root_subject_id(db: AsyncSession, node_id: int) -> int | None:
    """沿 parent_id 链向上找到 level=0 的根科目 ID。

    等价于 PostgreSQL 中 `get_root_subject_id(node_id)` 函数。
    用于教师垂直审核权限校验。
    """
    current_id: int | None = node_id
    visited: set[int] = set()
    while current_id is not None and current_id not in visited:
        visited.add(current_id)  # 防御环路
        result = await db.execute(
            select(TextbookNode.parent_id, TextbookNode.level).where(
                TextbookNode.id == current_id
            )
        )
        row = result.first()
        if row is None:
            return None
        if row.level == 0:
            return current_id
        current_id = row.parent_id
    return None


def _node_to_dict(node: TextbookNode) -> dict[str, Any]:
    return {
        "id": node.id,
        "name": node.name,
        "level": node.level,
        "parent_id": node.parent_id,
        "sort_order": node.sort_order,
        "description": node.description,
        "image_urls": node.image_urls or [],
        "created_at": node.created_at.isoformat() if node.created_at else None,
    }


async def build_tree(db: AsyncSession) -> list[dict[str, Any]]:
    """从数据库加载全部节点，构建完整的教材树。

    Redis 不可用时降级为直接查询。
    """
    # 1. 尝试命中缓存
    try:
        cached = await redis_client.get(TEXTBOOK_TREE_CACHE_KEY)
        if cached:
            return json.loads(cached)
    except Exception as e:  # noqa: BLE001 - Redis 不可用时降级
        logger.debug("Redis 缓存读取失败，降级直查: %s", e)

    # 2. 查询全部节点并按 (level, sort_order, id) 排序
    result = await db.execute(
        select(TextbookNode).order_by(TextbookNode.level, TextbookNode.sort_order, TextbookNode.id)
    )
    nodes = result.scalars().all()

    # 3. 组装父子映射
    by_id: dict[int, dict[str, Any]] = {}
    roots: list[dict[str, Any]] = []
    for node in nodes:
        d = _node_to_dict(node)
        d["children"] = []
        by_id[node.id] = d
    for node in nodes:
        d = by_id[node.id]
        if node.parent_id is None or node.parent_id not in by_id:
            roots.append(d)
        else:
            by_id[node.parent_id]["children"].append(d)

    # 4. 写缓存（best-effort）
    try:
        await redis_client.set(
            TEXTBOOK_TREE_CACHE_KEY, json.dumps(roots, ensure_ascii=False), ex=TEXTBOOK_TREE_CACHE_TTL
        )
    except Exception as e:  # noqa: BLE001
        logger.debug("Redis 缓存写入失败，忽略: %s", e)

    return roots


async def invalidate_tree_cache() -> None:
    """教材树变更后清除缓存。"""
    try:
        await redis_client.delete(TEXTBOOK_TREE_CACHE_KEY)
    except Exception as e:  # noqa: BLE001
        logger.debug("Redis 缓存删除失败，忽略: %s", e)


async def get_node_with_children(
    db: AsyncSession, node_id: int
) -> tuple[TextbookNode | None, list[TextbookNode]]:
    """获取节点及其直接子节点列表。"""
    result = await db.execute(select(TextbookNode).where(TextbookNode.id == node_id))
    node = result.scalar_one_or_none()
    if node is None:
        return None, []
    children_result = await db.execute(
        select(TextbookNode)
        .where(TextbookNode.parent_id == node_id)
        .order_by(TextbookNode.sort_order, TextbookNode.id)
    )
    children = list(children_result.scalars().all())
    return node, children

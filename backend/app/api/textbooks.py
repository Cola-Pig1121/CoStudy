"""教材树 API 路由：浏览树、节点详情、管理员 CRUD。"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.dependencies import CurrentUser, DbSession, RequireAdmin
from app.models import TextbookNode
from app.schemas import (
    TextbookChildrenResponse,
    TextbookCreate,
    TextbookNodeResponse,
    TextbookUpdate,
)
from app.services.textbook_service import (
    build_tree,
    get_node_with_children,
    invalidate_tree_cache,
)

router = APIRouter(prefix="/textbooks", tags=["textbooks"])


@router.get("/tree")
async def get_tree(db: DbSession, user: CurrentUser) -> list[dict]:
    """获取完整教材树（带 Redis 缓存）。"""
    return await build_tree(db)


@router.get("/{node_id}", response_model=TextbookChildrenResponse)
async def get_node(node_id: int, db: DbSession, user: CurrentUser) -> TextbookChildrenResponse:
    """获取节点详情 + 直接子节点列表。"""
    node, children = await get_node_with_children(db, node_id)
    if node is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="节点不存在")
    return TextbookChildrenResponse(
        node=TextbookNodeResponse.model_validate(node),
        children=[TextbookNodeResponse.model_validate(c) for c in children],
    )


@router.post("", response_model=TextbookNodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    payload: TextbookCreate, db: DbSession, admin: RequireAdmin
) -> TextbookNodeResponse:
    """创建教材节点（管理员）。"""
    # 校验父节点存在性与层级一致性
    if payload.parent_id is not None:
        parent = await db.get(TextbookNode, payload.parent_id)
        if parent is None:
            raise HTTPException(status_code=400, detail="父节点不存在")
        if payload.level != parent.level + 1:
            raise HTTPException(
                status_code=400,
                detail=f"层级错误：子节点 level 应为 {parent.level + 1}，实际为 {payload.level}",
            )
    elif payload.level != 0:
        raise HTTPException(status_code=400, detail="根节点 level 必须为 0")

    node = TextbookNode(
        name=payload.name,
        level=payload.level,
        parent_id=payload.parent_id,
        sort_order=payload.sort_order,
        description=payload.description,
        image_urls=payload.image_urls,
    )
    db.add(node)
    await db.commit()
    await db.refresh(node)
    await invalidate_tree_cache()
    return TextbookNodeResponse.model_validate(node)


@router.put("/{node_id}", response_model=TextbookNodeResponse)
async def update_node(
    node_id: int, payload: TextbookUpdate, db: DbSession, admin: RequireAdmin
) -> TextbookNodeResponse:
    """更新教材节点（管理员）。"""
    node = await db.get(TextbookNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="节点不存在")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(node, key, value)
    await db.commit()
    await db.refresh(node)
    await invalidate_tree_cache()
    return TextbookNodeResponse.model_validate(node)


@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(node_id: int, db: DbSession, admin: RequireAdmin) -> None:
    """删除教材节点（级联删除子节点，管理员）。"""
    node = await db.get(TextbookNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="节点不存在")
    await db.delete(node)
    await db.commit()
    await invalidate_tree_cache()


@router.get("")
async def list_roots(db: DbSession, user: CurrentUser) -> list[dict]:
    """列出所有根科目（level=0）。"""
    result = await db.execute(
        select(TextbookNode)
        .where(TextbookNode.level == 0)
        .order_by(TextbookNode.sort_order, TextbookNode.id)
    )
    return [
        {
            "id": n.id,
            "name": n.name,
            "level": n.level,
            "parent_id": n.parent_id,
            "sort_order": n.sort_order,
            "description": n.description,
            "image_urls": n.image_urls or [],
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in result.scalars().all()
    ]

"""共享资源 API 路由：CRUD、提交审核、收藏、排行榜、推荐。"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.dependencies import CurrentUser, DbSession, RequireStudentOrTeacher
from app.models import Favorite, SharedResource, User
from app.schemas import (
    FavoriteResponse,
    ResourceCreate,
    ResourceDetail,
    ResourceResponse,
    ResourceUpdate,
)

router = APIRouter(prefix="/resources", tags=["resources"])


def _resource_to_dict(r: SharedResource) -> dict:
    return ResourceResponse.model_validate(r).model_dump()


# ── 列表 ──

@router.get("")
async def list_resources(
    db: DbSession,
    user: CurrentUser,
    type: str | None = Query(None, pattern=r"^(excalidraw|markdown)$"),
    textbook_id: int | None = Query(None),
    status_filter: int | None = Query(None, alias="status", ge=0, le=2),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> dict:
    """资源列表，支持按类型、教材节点、状态筛选。"""
    q = select(SharedResource)
    count_q = select(func.count(SharedResource.id))

    if type:
        q = q.where(SharedResource.type == type)
        count_q = count_q.where(SharedResource.type == type)
    if textbook_id is not None:
        q = q.where(SharedResource.textbook_id == textbook_id)
        count_q = count_q.where(SharedResource.textbook_id == textbook_id)
    if status_filter is not None:
        q = q.where(SharedResource.status == status_filter)
        count_q = count_q.where(SharedResource.status == status_filter)
    else:
        # 默认只显示已通过的资源
        q = q.where(SharedResource.status == 1)
        count_q = count_q.where(SharedResource.status == 1)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        q.order_by(SharedResource.created_at.desc()).offset(offset).limit(page_size)
    )
    items = [_resource_to_dict(r) for r in result.scalars().all()]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# ── 排行榜 ──

@router.get("/leadership")
async def leadership(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(10, ge=1, le=50),
) -> list[dict]:
    """收藏数 Top N 排行榜（仅已通过资源）。"""
    result = await db.execute(
        select(SharedResource)
        .where(SharedResource.status == 1)
        .order_by(SharedResource.favorites_count.desc(), SharedResource.created_at.desc())
        .limit(limit)
    )
    return [_resource_to_dict(r) for r in result.scalars().all()]


# ── 推荐 ──

@router.get("/recommended")
async def recommended(
    db: DbSession,
    user: CurrentUser,
    limit: int = Query(12, ge=1, le=50),
) -> list[dict]:
    """首页推荐：高赞 + 最新（仅已通过资源）。"""
    result = await db.execute(
        select(SharedResource)
        .where(SharedResource.status == 1)
        .order_by(
            SharedResource.favorites_count.desc(),
            SharedResource.created_at.desc(),
        )
        .limit(limit)
    )
    return [_resource_to_dict(r) for r in result.scalars().all()]


# ── 详情 ──

@router.get("/{resource_id}", response_model=ResourceDetail)
async def get_resource(
    resource_id: int, db: DbSession, user: CurrentUser
) -> ResourceDetail:
    """资源详情（含内容，浏览量 +1）。"""
    resource = await db.get(SharedResource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="资源不存在")

    # 浏览量 +1
    resource.view_count += 1
    resource.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(resource)

    # 检查当前用户是否已收藏
    fav_result = await db.execute(
        select(Favorite.id).where(
            Favorite.user_id == user.id, Favorite.resource_id == resource_id
        )
    )
    is_favorited = fav_result.scalar_one_or_none() is not None

    # 获取作者名
    author = await db.get(User, resource.user_id)
    author_name = author.display_name if author else None

    detail = ResourceDetail.model_validate(resource)
    detail.is_favorited = is_favorited
    detail.author_name = author_name
    return detail


# ── 创建 ──

@router.post("", response_model=ResourceResponse, status_code=201)
async def create_resource(
    payload: ResourceCreate, db: DbSession, user: RequireStudentOrTeacher
) -> ResourceResponse:
    """创建资源（草稿）。"""
    resource = SharedResource(
        textbook_id=payload.textbook_id,
        user_id=user.id,
        title=payload.title,
        type=payload.type,
        content=payload.content,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return ResourceResponse.model_validate(resource)


# ── 更新 ──

@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int, payload: ResourceUpdate, db: DbSession, user: CurrentUser
) -> ResourceResponse:
    """更新资源内容（仅作者）。"""
    resource = await db.get(SharedResource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    if resource.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能编辑自己的资源")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(resource, key, value)
    resource.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(resource)
    return ResourceResponse.model_validate(resource)


# ── 删除 ──

@router.delete("/{resource_id}", status_code=204)
async def delete_resource(
    resource_id: int, db: DbSession, user: CurrentUser
) -> None:
    """删除资源（作者或管理员）。"""
    resource = await db.get(SharedResource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    if resource.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="无权删除此资源")
    await db.delete(resource)
    await db.commit()


# ── 提交审核 ──

@router.post("/{resource_id}/submit", response_model=ResourceResponse)
async def submit_resource(
    resource_id: int, db: DbSession, user: CurrentUser
) -> ResourceResponse:
    """提交审核（仅作者，且当前为草稿状态）。"""
    resource = await db.get(SharedResource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    if resource.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能提交自己的资源")
    if resource.status != 0:
        raise HTTPException(status_code=400, detail="当前状态不可提交审核")
    resource.status = 0  # 保持待审核
    resource.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(resource)
    return ResourceResponse.model_validate(resource)


# ── 收藏 ──

@router.post("/{resource_id}/favorite", response_model=FavoriteResponse)
async def toggle_favorite(
    resource_id: int, db: DbSession, user: CurrentUser
) -> FavoriteResponse:
    """收藏/取消收藏（切换）。"""
    resource = await db.get(SharedResource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="资源不存在")

    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == user.id, Favorite.resource_id == resource_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        resource.favorites_count = max(0, resource.favorites_count - 1)
        favorited = False
    else:
        db.add(Favorite(user_id=user.id, resource_id=resource_id))
        resource.favorites_count += 1
        favorited = True

    resource.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return FavoriteResponse(favorited=favorited, favorites_count=resource.favorites_count)

"""审核模块 API 路由：待审核列表、通过/驳回、审核日志。

教师垂直审核: get_root_subject_id(resource.textbook_id) == user.subject_id
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DbSession, RequireTeacher
from app.models import SharedResource, User
from app.models.resource import ReviewLog
from app.schemas import RejectRequest, ResourceResponse, ReviewLogResponse
from app.services.textbook_service import get_root_subject_id

router = APIRouter(prefix="/review", tags=["review"])


async def _check_review_permission(db: DbSession, user: CurrentUser, resource: SharedResource) -> None:
    """校验审核权限：管理员可审核所有，教师仅可审核本科目。"""
    if user.role == "admin":
        return
    if user.role != "teacher":
        raise HTTPException(status_code=403, detail="仅教师和管理员可审核资源")
    if user.subject_id is None:
        raise HTTPException(status_code=403, detail="教师未绑定科目，无法审核")
    if resource.textbook_id is None:
        raise HTTPException(status_code=400, detail="资源未关联教材节点，无法审核")
    root_id = await get_root_subject_id(db, resource.textbook_id)
    if root_id is None:
        raise HTTPException(status_code=400, detail="教材节点不存在")
    if root_id != user.subject_id:
        raise HTTPException(status_code=403, detail="无权审核其他科目的资源")


@router.get("/pending")
async def list_pending(
    db: DbSession,
    user: RequireTeacher,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> dict:
    """待审核列表（教师仅见本科目，管理员可见全部）。"""
    q = select(SharedResource).where(SharedResource.status == 0)
    count_q = select(func.count(SharedResource.id)).where(SharedResource.status == 0)

    # 教师垂直过滤
    if user.role == "teacher" and user.subject_id is not None:
        # 查找该科目下所有教材节点 ID（简化：用 root_subject_id 关联查询）
        # 生产环境可用 SQL 函数，这里用 Python 侧逐条检查
        # 为了性能，先粗筛再过滤
        pass  # 下面在遍历时过滤

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        q.order_by(SharedResource.created_at.asc()).offset(offset).limit(page_size)
    )
    all_items = result.scalars().all()

    # 教师垂直过滤
    items = []
    for r in all_items:
        if user.role == "teacher" and user.subject_id is not None:
            if r.textbook_id is None:
                continue
            root_id = await get_root_subject_id(db, r.textbook_id)
            if root_id != user.subject_id:
                continue
        items.append(ResourceResponse.model_validate(r).model_dump())

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/{resource_id}/approve", response_model=ResourceResponse)
async def approve_resource(
    resource_id: int, db: DbSession, user: RequireTeacher
) -> ResourceResponse:
    """审核通过。"""
    resource = await db.get(SharedResource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    if resource.status != 0:
        raise HTTPException(status_code=400, detail="该资源不在待审核状态")

    await _check_review_permission(db, user, resource)

    resource.status = 1
    resource.reviewer_id = user.id
    resource.updated_at = datetime.now(timezone.utc)

    # 记录审核日志
    log = ReviewLog(
        resource_id=resource_id,
        reviewer_id=user.id,
        action="approved",
    )
    db.add(log)
    await db.commit()
    await db.refresh(resource)
    return ResourceResponse.model_validate(resource)


@router.post("/{resource_id}/reject", response_model=ResourceResponse)
async def reject_resource(
    resource_id: int,
    payload: RejectRequest,
    db: DbSession,
    user: RequireTeacher,
) -> ResourceResponse:
    """审核驳回（附原因）。"""
    resource = await db.get(SharedResource, resource_id)
    if resource is None:
        raise HTTPException(status_code=404, detail="资源不存在")
    if resource.status != 0:
        raise HTTPException(status_code=400, detail="该资源不在待审核状态")

    await _check_review_permission(db, user, resource)

    resource.status = 2
    resource.reviewer_id = user.id
    resource.reject_reason = payload.reason
    resource.updated_at = datetime.now(timezone.utc)

    # 记录审核日志
    log = ReviewLog(
        resource_id=resource_id,
        reviewer_id=user.id,
        action="rejected",
        reason=payload.reason,
    )
    db.add(log)
    await db.commit()
    await db.refresh(resource)
    return ResourceResponse.model_validate(resource)


@router.get("/logs")
async def review_logs(
    db: DbSession,
    user: RequireTeacher,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> dict:
    """审核历史记录。"""
    q = select(ReviewLog)
    count_q = select(func.count(ReviewLog.id))

    if user.role == "teacher":
        q = q.where(ReviewLog.reviewer_id == user.id)
        count_q = count_q.where(ReviewLog.reviewer_id == user.id)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(
        q.order_by(ReviewLog.created_at.desc()).offset(offset).limit(page_size)
    )
    logs = result.scalars().all()

    items = []
    for log in logs:
        resource = await db.get(SharedResource, log.resource_id)
        reviewer = await db.get(User, log.reviewer_id)
        items.append(
            ReviewLogResponse(
                id=log.id,
                resource_id=log.resource_id,
                reviewer_id=log.reviewer_id,
                action=log.action,
                reason=log.reason,
                created_at=log.created_at,
                resource_title=resource.title if resource else None,
                reviewer_name=reviewer.display_name if reviewer else None,
            ).model_dump()
        )

    return {"items": items, "total": total, "page": page, "page_size": page_size}

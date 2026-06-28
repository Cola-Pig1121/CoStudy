"""微课视频 API 路由：列表、详情、创建、HLS 流。"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.dependencies import CurrentUser, DbSession, RequireTeacher
from app.models.video import MicroCourseVideo

router = APIRouter(prefix="/videos", tags=["videos"])


class VideoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    textbook_id: int | None = None
    original_url: str | None = None
    duration_seconds: int | None = None


@router.get("")
async def list_videos(
    db: DbSession, user: CurrentUser,
    textbook_id: int | None = None,
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50),
) -> dict:
    q = select(MicroCourseVideo).where(MicroCourseVideo.status == 1)
    count_q = select(func.count(MicroCourseVideo.id)).where(MicroCourseVideo.status == 1)
    if textbook_id:
        q = q.where(MicroCourseVideo.textbook_id == textbook_id)
        count_q = count_q.where(MicroCourseVideo.textbook_id == textbook_id)
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * page_size
    result = await db.execute(q.order_by(MicroCourseVideo.created_at.desc()).offset(offset).limit(page_size))
    return {"items": [_video_dict(v) for v in result.scalars().all()], "total": total}


@router.get("/{video_id}")
async def get_video(video_id: int, db: DbSession, user: CurrentUser) -> dict:
    v = await db.get(MicroCourseVideo, video_id)
    if not v:
        raise HTTPException(status_code=404, detail="视频不存在")
    v.view_count += 1
    await db.commit()
    await db.refresh(v)
    return _video_dict(v)


@router.post("", response_model=dict, status_code=201)
async def create_video(payload: VideoCreate, db: DbSession, user: RequireTeacher) -> dict:
    v = MicroCourseVideo(
        title=payload.title, description=payload.description,
        user_id=user.id, textbook_id=payload.textbook_id,
        original_url=payload.original_url, duration_seconds=payload.duration_seconds,
    )
    db.add(v)
    await db.commit()
    await db.refresh(v)
    return _video_dict(v)


@router.post("/{video_id}/confirm")
async def confirm_video(video_id: int, db: DbSession, user: RequireTeacher) -> dict:
    """确认上传完成，标记为就绪。"""
    v = await db.get(MicroCourseVideo, video_id)
    if not v:
        raise HTTPException(status_code=404, detail="视频不存在")
    if v.user_id != user.id:
        raise HTTPException(status_code=403, detail="只能确认自己的视频")
    v.status = 1
    await db.commit()
    return {"message": "视频已就绪"}


def _video_dict(v: MicroCourseVideo) -> dict:
    return {
        "id": v.id, "title": v.title, "description": v.description,
        "user_id": v.user_id, "textbook_id": v.textbook_id,
        "hls_url": v.hls_url, "thumbnail_url": v.thumbnail_url,
        "duration_seconds": v.duration_seconds, "status": v.status,
        "view_count": v.view_count,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }

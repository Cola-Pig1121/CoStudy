"""认证 API 路由：注册、登录、刷新、当前用户、更新资料、修改密码、头像上传。"""
import os
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.dependencies import CurrentUser, DbSession
from app.models import User
from app.schemas import (
    RefreshRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _make_tokens(user: User) -> dict:
    """为用户生成 access + refresh token。"""
    token_data = {"sub": str(user.id), "role": user.role, "username": user.username}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user": UserResponse.model_validate(user).model_dump(),
    }


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(payload: UserRegister, db: DbSession):
    """用户注册，默认角色为 student。"""
    # 检查唯一性
    existing = await db.execute(
        select(User).where(
            or_(User.username == payload.username, User.email == payload.email)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名或邮箱已被注册",
        )
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name or payload.username,
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="用户名或邮箱已存在")
    await db.refresh(user)
    return _make_tokens(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: DbSession):
    """用户登录（支持用户名或邮箱）。"""
    result = await db.execute(
        select(User).where(
            or_(User.username == payload.account, User.email == payload.account)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误",
        )
    return _make_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: DbSession):
    """使用 refresh token 换取新的 token 对。"""
    data = verify_refresh_token(payload.refresh_token)
    if data is None:
        raise HTTPException(status_code=401, detail="刷新令牌无效或已过期")
    user_id = data.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在")
    return _make_tokens(user)


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    """获取当前登录用户信息。"""
    return user


@router.put("/profile", response_model=UserResponse)
async def update_profile(payload: UserUpdate, user: CurrentUser, db: DbSession):
    """更新个人资料。"""
    if payload.display_name is not None:
        user.display_name = payload.display_name
    if payload.avatar_url is not None:
        user.avatar_url = payload.avatar_url
    if payload.email is not None and payload.email != user.email:
        # 检查邮箱唯一性
        clash = await db.execute(select(User).where(User.email == payload.email))
        if clash.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="邮箱已被使用")
        user.email = payload.email
    await db.commit()
    await db.refresh(user)
    return user


# ── 修改密码 ──

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


@router.put("/password")
async def change_password(payload: ChangePasswordRequest, user: CurrentUser, db: DbSession):
    """修改密码。"""
    from app.services.auth_service import verify_password, hash_password

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="当前密码不正确")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "密码修改成功"}


# ── 头像上传 ──

AVATAR_DIR = Path("uploads/avatars")
AVATAR_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user: CurrentUser = None, db: DbSession = None):
    """上传并更新用户头像。"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持图片文件")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="头像大小不能超过 5MB")
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{user.id}_{uuid.uuid4().hex}.{ext}"
    filepath = AVATAR_DIR / filename
    filepath.write_bytes(content)
    url = f"/api/v1/auth/avatars/{filename}"
    user.avatar_url = url
    await db.commit()
    await db.refresh(user)
    return {"avatar_url": url}


@router.get("/avatars/{filename}")
async def serve_avatar(filename: str):
    """返回头像文件。"""
    from fastapi.responses import FileResponse
    filepath = AVATAR_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="头像不存在")
    return FileResponse(filepath, media_type="image/jpeg")
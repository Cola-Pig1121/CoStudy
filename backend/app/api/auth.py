"""认证 API 路由：注册、登录、刷新、当前用户、更新资料。"""
from fastapi import APIRouter, HTTPException, status
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
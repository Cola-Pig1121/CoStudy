"""集成测试：认证全流程（使用 SQLite 内存数据库，无需外部依赖）。"""
import asyncio
import os

# 测试前切换到 SQLite 内存库
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


async def run() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        # 1. 注册
        r = await c.post(
            "/api/v1/auth/register",
            json={
                "username": "student1",
                "email": "student@test.com",
                "password": "testpass123",
                "display_name": "测试学生",
            },
        )
        assert r.status_code == 201, r.text
        token = r.json()["access_token"]
        assert r.json()["user"]["role"] == "student"
        print("✅ 注册成功, role=student")

        # 2. 重复注册应 409
        r2 = await c.post(
            "/api/v1/auth/register",
            json={
                "username": "student1",
                "email": "other@test.com",
                "password": "testpass123",
            },
        )
        assert r2.status_code == 409
        print("✅ 重复注册被拒绝 (409)")

        # 3. 登录
        r3 = await c.post(
            "/api/v1/auth/login",
            json={"account": "student1", "password": "testpass123"},
        )
        assert r3.status_code == 200
        refresh = r3.json()["refresh_token"]
        print("✅ 登录成功")

        # 4. 邮箱登录
        r3b = await c.post(
            "/api/v1/auth/login",
            json={"account": "student@test.com", "password": "testpass123"},
        )
        assert r3b.status_code == 200
        print("✅ 邮箱登录成功")

        # 5. 错误密码
        r4 = await c.post(
            "/api/v1/auth/login",
            json={"account": "student1", "password": "wrong"},
        )
        assert r4.status_code == 401
        print("✅ 错误密码被拒绝 (401)")

        # 6. 获取当前用户
        r5 = await c.get(
            "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
        assert r5.status_code == 200
        assert r5.json()["username"] == "student1"
        print("✅ /me 返回当前用户")

        # 7. 无 Token 访问 /me
        r6 = await c.get("/api/v1/auth/me")
        assert r6.status_code == 401
        print("✅ 无 Token 被拒绝 (401)")

        # 8. 刷新 Token
        r7 = await c.post(
            "/api/v1/auth/refresh", json={"refresh_token": refresh}
        )
        assert r7.status_code == 200
        assert r7.json()["access_token"]
        print("✅ 刷新 Token 成功")

        # 9. 更新资料
        r8 = await c.put(
            "/api/v1/auth/profile",
            json={"display_name": "测试学生改名"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r8.status_code == 200
        assert r8.json()["display_name"] == "测试学生改名"
        print("✅ 更新资料成功")

    print("\n全部认证测试通过 ✨")


if __name__ == "__main__":
    asyncio.run(run())
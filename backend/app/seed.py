"""初始化管理员种子账号。

可通过 `python -m app.seed` 运行，或在存在时由 lifespan 调用。
需要 PostgreSQL 可用。
"""
import asyncio
import logging

from sqlalchemy import select

from app.database import async_session_factory, engine
from app.models import TextbookNode, User
from app.services.auth_service import hash_password

logger = logging.getLogger(__name__)

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@costudy.dev"
ADMIN_PASSWORD = "admin123456"  # 首次登录后应修改


async def seed_admin() -> None:
    async with async_session_factory() as db:
        result = await db.execute(select(User).where(User.username == ADMIN_USERNAME))
        if result.scalar_one_or_none():
            logger.info("管理员账号已存在，跳过种子")
            return
        admin = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            display_name="系统管理员",
            role="admin",
        )
        db.add(admin)
        await db.commit()
        logger.info("管理员种子账号已创建: %s / %s", ADMIN_USERNAME, ADMIN_PASSWORD)


async def init_db() -> None:
    """创建所有表（开发阶段，无 Alembic 时用）。"""
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: __import__("app.database", fromlist=["Base"]).Base.metadata.create_all(c))


async def seed_textbook_tree() -> None:
    """种子教材树：学科 → 教材 → 单元 → 章节。

    幂等：若根科目已存在则跳过。
    """
    async with async_session_factory() as db:
        result = await db.execute(select(TextbookNode).where(TextbookNode.level == 0))
        if result.scalars().first():
            logger.info("教材树已存在，跳过种子")
            return

        # (name, level, parent_name, sort_order, description)
        # 先建学科，再依次建教材/单元/章节，按名字查找父节点
        subjects = ["数学", "物理", "化学", "语文", "英语"]
        name_to_id: dict[str, int] = {}

        async def _add(name: str, level: int, parent_name: str | None, sort_order: int, desc: str = "") -> None:
            node = TextbookNode(
                name=name,
                level=level,
                parent_id=name_to_id[parent_name] if parent_name else None,
                sort_order=sort_order,
                description=desc,
            )
            db.add(node)
            await db.flush()  # 取 id
            name_to_id[f"{level}:{name}"] = node.id

        # level 0: 学科
        for i, subj in enumerate(subjects):
            await _add(subj, 0, None, i, f"{subj}学科")

        # level 1: 教材（每个学科一本示例教材）
        textbooks = [
            ("人教版高中数学必修一", "数学", "集合与函数概念、基本初等函数"),
            ("人教版高中物理必修一", "物理", "运动学、牛顿运动定律"),
            ("人教版高中化学必修一", "化学", "物质及其变化、金属及其化合物"),
            ("人教版高中语文必修上册", "语文", "现代诗文、古代诗文"),
            ("人教版高中英语必修一", "英语", "日常交际、基础语法"),
        ]
        for i, (tb, subj, desc) in enumerate(textbooks):
            await _add(tb, 1, f"0:{subj}", i, desc)

        # level 2 + 3: 单元与章节（仅数学详列，其余学科各一个示例单元）
        math_tb = "1:人教版高中数学必修一"
        units = [
            ("第一章 集合与函数概念", [("1.1 集合的含义与表示",), ("1.2 函数及其表示",), ("1.3 函数的基本性质",)]),
            ("第二章 基本初等函数", [("2.1 指数函数",), ("2.2 对数函数",), ("2.3 幂函数",)]),
            ("第三章 函数的应用", [("3.1 函数与方程",), ("3.2 函数模型及其应用",)]),
        ]
        for u_idx, (unit, sections) in enumerate(units):
            await _add(unit, 2, math_tb, u_idx)
            for s_idx, (section,) in enumerate(sections):
                await _add(section, 3, f"2:{unit}", s_idx)

        # 其他学科各一个示例单元 + 章节
        others = [
            ("物理", "人教版高中物理必修一", "第一章 运动的描述", ["1.1 质点 参考系和坐标系", "1.2 时间和位移", "1.3 运动快慢的描述——速度"]),
            ("化学", "人教版高中化学必修一", "第一章 从实验学化学", ["1.1 化学实验基本方法", "1.2 化学计量在实验中的应用"]),
            ("语文", "人教版高中语文必修上册", "第一单元", ["1 沁园春·长沙", "2 立在地球边上放号"]),
            ("英语", "人教版高中英语必修一", "Unit 1 Friendship", ["Reading", "Grammar"]),
        ]
        for subj, tb, unit, sections in others:
            await _add(unit, 2, f"1:{tb}", 0)
            for s_idx, section in enumerate(sections):
                await _add(section, 3, f"2:{unit}", s_idx)

        await db.commit()
        logger.info("教材树种子已创建：%d 个节点", len(name_to_id))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init_db())
    asyncio.run(seed_admin())
    asyncio.run(seed_textbook_tree())
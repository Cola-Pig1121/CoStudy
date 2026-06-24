# CoStudy 校内学生知识共享系统

> AI 驱动的校内知识共享平台 —— 教材树、思维导图、试卷识别、微课视频、AI 学习助手

[![Spec](https://img.shields.io/badge/spec-v1.0-blue)](./SPEC.md)

## 项目简介

CoStudy（Campus Knowledge-Share System）是一个面向校内的学生知识共享平台，支持：

- 📚 **教材树状结构管理**：科目 → 教材 → 单元 → 章节，多级树形导航 + 课本图片浏览
- 🎨 **思维导图 / 富文本笔记共享**：基于 Excalidraw 绘制 + Markdown 撰写，经教师审核后发布
- 📝 **试卷库**：上传试卷 → OCR 识别 → AI 结构化 → 在线测试 → 自动批改
- 🎬 **微课视频**：教师上传视频，FFmpeg 转码为 HLS 流媒体播放
- 🤖 **AI 助手**：费曼学习助手 + 基于 RAG 的校内知识问答
- 👥 **角色权限**：学生 / 教师（垂直科目审核）/ 管理员

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + 暖色调设计 |
| 后端 | Python FastAPI + SQLAlchemy 2.0 (async) + Alembic |
| 数据库 | PostgreSQL + pgvector（向量检索） |
| 缓存/队列 | Redis 7（缓存、排行榜、限流、Celery broker） |
| 对象存储 | MinIO（S3 兼容） |
| AI | DeepSeek API（V3/R1/Vision） |
| OCR | PaddleOCR + OpenCV |
| 异步任务 | Celery + FFmpeg（视频转码） |
| 部署 | Docker Compose（阶段 8） |

## 目录结构

```
CoStudy/
├── frontend/        # Next.js 前端
├── backend/         # FastAPI 后端
├── SPEC.md          # 完整系统设计规格书
├── .env.example     # 环境变量模板
└── README.md        # 本文件
```

完整架构与规格见 [SPEC.md](./SPEC.md)。

## 快速开始（开发环境）

### 前提条件

- Node.js 18+ / npm 10+
- Python 3.11+
- PostgreSQL 16（启用 pgvector）/ Redis 7 / MinIO（后续阶段需要，脚手架阶段可选）

### 前端

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

### 后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -e ".[dev]"
cp .env.example .env             # 按需修改配置
uvicorn app.main:app --reload --port 8000   # http://localhost:8000/docs
```

### 联调验证

前端访问 http://localhost:3000 ，首页右上方应显示后端健康检查状态。

后端健康检查接口：`GET http://localhost:8000/api/health`

## 开发阶段规划

| 阶段 | 内容 | 状态 |
|------|------|------|
| 0 | 项目脚手架 + 设计系统 | ✅ 进行中 |
| 1 | 用户认证系统 (JWT + RBAC) | ⏳ |
| 2 | 教材树 + 首页 | ⏳ |
| 3 | 创作工作台 + 审核流程 | ⏳ |
| 4 | 试卷库 + 在线测试 + OCR | ⏳ |
| 5 | 微课视频 + HLS 转码 | ⏳ |
| 6 | AI 助手 + RAG | ⏳ |
| 7 | 管理后台 + 手写笔记识别 | ⏳ |
| 8 | Docker Compose 一键部署 | ⏳ |

详细规格见 [SPEC.md](./SPEC.md) 第 9 节。

## 许可证

MIT
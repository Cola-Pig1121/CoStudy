# CoStudy 校内学生知识共享系统

> AI 驱动的校园知识共享平台 —— 教材树 · 思维导图 · 富文本笔记 · AI 学习助手

[![Spec](https://img.shields.io/badge/spec-v1.0-blue)](./SPEC.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 项目简介

CoStudy（Campus Knowledge-Share System）是一个面向校内的学生知识共享平台。学生可以浏览教材知识树、创作思维导图与富文本笔记、通过 AI 助手解答学习问题；教师可以上传讲义、审核共享内容；管理员可以配置模型供应商、管理教材树。

### 核心功能

| 模块 | 功能 | 状态 |
|------|------|------|
| 📚 **教材知识树** | 科目→教材→单元→章节 多级树形导航，课本图片浏览，书签收藏 | ✅ |
| 🎨 **思维导图** | Excalidraw 全功能画布，中文界面，公式插入，保存/加载 | ✅ |
| 📝 **富文本笔记** | TipTap 编辑器，LaTeX 公式实时渲染，AI 润色 | ✅ |
| 🤖 **AI 助手** | SSE 流式对话，三模式（AI对话/费曼/知识问答），思考强度控制 | ✅ |
| 🔧 **模型管理** | litellm 统一网关，模型自动扫描，思考强度检测 | ✅ |
| 📋 **共享资源** | 创建/编辑/收藏，教师审核流，排行榜 | ✅ |
| 📖 **教师讲义** | 上传 PDF/PPT 到教材节点 | ✅ |
| 🔐 **用户认证** | JWT + RBAC（学生/教师/管理员），HTTPS | ✅ |
| 🎥 **微课视频** | 教师上传，FFmpeg HLS 转码 | 🔜 |
| 📝 **试卷库** | OCR + AI 结构化 + 在线测试 | 🔜 |
| 📱 **Docker 部署** | 一键部署 | 🔜 |

---

## 技术栈

| 层级 | 技术选型 | 用途 |
|------|---------|------|
| **前端** | Next.js 16 (App Router) + TypeScript | SSR/ISR、路由、状态管理 |
| **UI** | Tailwind CSS v4 + LXGW WenKai | 暖色调设计系统 + 霞鹜文楷字体 |
| **思维导图** | @excalidraw/excalidraw | Excalidraw 画布 + 中文语言包 |
| **富文本** | @tiptap/react + BubbleMenu | TipTap 编辑器 + AI 润色 |
| **公式渲染** | KaTeX + remark-math | LaTeX 数学公式实时渲染 |
| **后端** | Python FastAPI + SQLAlchemy 2.0 (async) | 异步高并发 API |
| **认证** | JWT (python-jose) + bcrypt | 无状态 Token 认证 |
| **数据库** | PostgreSQL 18 + pgvector | 关系数据 + 向量检索 |
| **缓存** | Redis 8 | 会话缓存、排行榜、限流 |
| **AI 网关** | litellm | 多供应商模型统一调用 |
| **AI Agent** | Eve (eve.dev) | 文件系统驱动的持久化 Agent |
| **部署** | Node.js HTTPS 代理 + Docker Compose | SSL 终止 + 反向代理 |

---

## 快速开始

### 开发环境

**前提条件**：Node.js 18+、Python 3.11+、PostgreSQL 16+、Redis 7+

#### 前端

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

#### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate
pip install -r <(python -c "import tomllib; f=open('pyproject.toml'); print('\n'.join(tomllib.load(f)['project']['dependencies']))")
cp .env.example .env
uvicorn app.main:app --reload --port 8001   # http://localhost:8001/docs
```

#### 初始化数据

```bash
cd backend
source venv/bin/activate
python -c "import asyncio; from app.seed import init_db, seed_admin, seed_textbook_tree; asyncio.run(init_db()); asyncio.run(seed_admin()); asyncio.run(seed_textbook_tree())"
```

默认管理员账号：`admin` / `admin123456`

### 服务器部署 (HTTPS)

```bash
# 1. 克隆仓库
git clone https://github.com/Cola-Pig1121/CoStudy.git /srv/CoStudy
cd /srv/CoStudy

# 2. 后端
cd backend && python -m venv venv && source venv/bin/activate
pip install -r <(python -c "import tomllib; f=open('pyproject.toml'); print('\n'.join(tomllib.load(f)['project']['dependencies']))")
cp .env.example .env   # 修改 DATABASE_URL, REDIS_URL 等
python -c "import asyncio; from app.seed import init_db, seed_admin, seed_textbook_tree; asyncio.run(init_db()); asyncio.run(seed_admin()); asyncio.run(seed_textbook_tree())"

# 3. 前端
cd ../frontend && npm install
echo 'NEXT_PUBLIC_API_URL=' > .env.local   # 空值 = 相对路径，走 HTTPS 代理
npm run build

# 4. 启动服务
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 &
nohup npx next start --port 3000 --hostname 127.0.0.1 &
```

### HTTPS 代理

项目包含 Node.js HTTPS 反向代理 (`https-proxy.js`)，将 SSL 证书请求路由到前端/后端：

```bash
# 将 SSL 证书放入 /srv/ssl/ (fullchain.pem + privkey.pem)
node https-proxy.js   # 监听 8443 端口
```

访问 `https://your-server:8443` 即可使用 HTTPS（Clipboard API 等安全功能需要 HTTPS）。

---

## 架构概览

```
浏览器 ──HTTPS:8443──> Node.js 代理 ─┬─ /api/* ──> FastAPI :8001 ──> PostgreSQL + Redis
                                      └─ 其他  ──> Next.js :3000
```

### 暖色调设计系统

| 变量 | 色值 | 用途 |
|------|------|------|
| Primary | `#4a9d9a` | 主色/导航/按钮 |
| Accent | `#e8b86d` | 强调/公式/搜索框 |
| Danger | `#c17767` | 危险/驳回 |
| Muted | `#6b8e8e` | 次要信息 |
| Background | `#faf8f5` | 页面背景 |
| Surface | `#ffffff` | 卡片背景 |

---

## 项目结构

```
CoStudy/
├── frontend/                    # Next.js 前端
│   ├── src/app/                 # 路由页面
│   │   ├── (auth)/              # 登录/注册
│   │   ├── (main)/              # 需认证的页面
│   │   │   ├── page.tsx         # 首页 (推荐 + 排行榜)
│   │   │   ├── tree/            # 教材知识树
│   │   │   ├── workspace/       # 创作工作台 (思维导图/笔记)
│   │   │   ├── ai/              # AI 助手聊天
│   │   │   └── dashboard/       # 用户中心 + 管理后台
│   │   ├── proxy.ts             # Next.js 代理路由
│   │   └── not-found.tsx        # 404 页面
│   ├── src/components/          # 通用组件
│   │   ├── layout/              # 侧边栏/顶栏/布局壳
│   │   ├── tree/                 # 教材树导航
│   │   └── workspace/            # Excalidraw/TipTap/MediaInsert
│   └── src/lib/                  # API 客户端/工具函数
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── api/                 # 路由 (auth/textbooks/resources/review/ai/providers)
│   │   ├── models/              # ORM 模型 (User/Textbook/Resource/Chat/Provider)
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   ├── services/            # 业务逻辑 (auth/llm/textbook/storage)
│   │   ├── seed.py              # 种子数据
│   │   └── main.py              # 应用入口
│   └── alembic/                 # 数据库迁移
├── https-proxy.js              # Node.js HTTPS 反向代理
├── SPEC.md                      # 完整系统设计规格书
└── README.md                    # 本文件
```

---

## 开发阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| 0 | 项目脚手架 + 暖色调设计系统 | ✅ |
| 1 | 用户认证 (JWT + RBAC + HTTPS) | ✅ |
| 2 | 教材树 CRUD + Redis 缓存 + 首页推荐 | ✅ |
| 3 | TipTap 富文本 + Excalidraw + 资源审核 + 书签 | ✅ |
| 4 | 试卷库 (OCR + AI 结构化 + 在线测试) | 🔜 |
| 5 | 微课视频 (FFmpeg HLS + 播放器) | 🔜 |
| 6 | AI 助手 (litellm + Eve Agent + 合规性检查) | ✅ |
| 7 | 管理后台 + 手写笔记识别 | 🔜 |
| 8 | Docker Compose 一键部署 | 🔜 |

---

## API 概览

| 模块 | 前缀 | 主要端点 |
|------|------|---------|
| 认证 | `/api/v1/auth` | register, login, refresh, me, profile, password, avatar |
| 教材树 | `/api/v1/textbooks` | tree, CRUD, images |
| 共享资源 | `/api/v1/resources` | CRUD, submit, favorite, leadership, recommended |
| 审核 | `/api/v1/review` | pending, approve, reject, logs |
| AI 助手 | `/api/v1/ai` | chat (SSE), polish, compliance/check, conversations |
| 模型管理 | `/api/v1/providers` | CRUD, test, scan, capabilities, reasoning-levels |
| 上传 | `/api/v1/upload` | image upload (500MB) |

完整 API 文档：启动后端后访问 `http://localhost:8001/docs` (Swagger UI)

---

## RBAC 权限矩阵

| 功能 | 学生 | 教师 | 管理员 |
|------|------|------|--------|
| 浏览教材树 / 查看资源 | ✅ | ✅ | ✅ |
| 创建资源 / 收藏 / 书签 | ✅ | ✅ | ✅ |
| AI 问答 / 书签章节 | ✅ | ✅ | ✅ |
| 上传讲义 / 微课视频 | ❌ | ✅ | ✅ |
| 审核资源 | ❌ | ✅* | ✅ |
| 管理教材树 / 用户管理 | ❌ | ❌ | ✅ |

> *教师垂直审核：仅审核 `subject_id` 匹配的科目资源

---

## 相关文档

- [系统设计规格书 (SPEC.md)](./SPEC.md) — 完整架构、数据库设计、API 规范、开发计划
- [AI 驱动增强方案](./AI-驱动的知识共享系统增强.md)

## 许可证

[MIT](./LICENSE)

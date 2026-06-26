# CoStudy 校内学生知识共享系统 — 完整系统设计规格书

> 版本：v1.0 | 日期：2026-06-24 | 状态：设计阶段

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术架构](#2-技术架构)
3. [目录结构](#3-目录结构)
4. [数据库设计](#4-数据库设计)
5. [API 接口规范](#5-api-接口规范)
6. [前端页面与组件架构](#6-前端页面与组件架构)
7. [AI/OCR 管道设计](#7-aocr-管道设计)
8. [RBAC 权限模型](#8-rbac-权限模型)
9. [开发阶段规划](#9-开发阶段规划)
10. [Docker 部署方案](#10-docker-部署方案)

---

## 1. 项目概述

CoStudy（Campus Knowledge-Share System）是一个面向校内的学生知识共享平台，支持教材树状结构管理、思维导图/富文本笔记共享、试卷识别与在线测试、AI 学习助手等核心功能。

### 核心定位

- **知识共享**：学生上传思维导图、笔记，经教师审核后在对应教材栏目展示，按收藏数排行
- **AI 赋能**：OCR 试卷识别 + LLM 结构化、手写笔记转 Markdown、RAG 知识问答、费曼学习助手
- **书签导航**：教材重要章节加书签，快速定位核心内容
- **教师讲义**：教师上传讲义到对应章节，学生可直接查看
- **自部署**：Docker Compose 一键部署到云服务器

### 用户角色

| 角色 | 核心能力 |
|------|---------|
| 学生 | 浏览教材树、上传思维导图/笔记、在线测试、AI 问答、收藏资源、书签章节 |
| 教师 | 学生全部权限 + 上传微课视频 + 上传讲义 + 本科目内容审核（垂直权限） |
| 管理员 | 全量权限：用户管理、跨科目审核、系统配置、大模型参数调节 |

---

## 2. 技术架构

```
┌─────────────────────────────────────────────────────┐
│                   前端: Next.js (TypeScript)          │
│     Tailwind CSS + TipTap + Excalidraw + LXGW WenKai│
└──────────────┬──────────────────────────────────────┘
               │ REST API / WebSocket / SSE (Stream)
               ▼
┌──────────────────────────────────────────────────────┐
│              后端: Python FastAPI                      │
│   Auth (JWT) │ Rate Limit (slowapi) │ CORS            │
└──────┬───────┼──────────┬───────────┼────────────────┘
       │       │          │           │
       ▼       ▼          ▼           ▼
┌──────────┐ ┌──────┐ ┌────────┐ ┌──────────────────┐
│PostgreSQL│ │Redis │ │ MinIO  │ │ DeepSeek API     │
│ +pgvector│ │      │ │(S3兼容)│ │ (V3/R1/Vision)   │
└──────────┘ └──────┘ └────────┘ └──────────────────┘
                               │
                               ▼
              ┌────────────────┐ ┌──────────────────┐
              │  Celery Worker  │ │  Eve Agent       │
              │  PaddleOCR+FFmpeg│ │  知识库Q&A+导航  │
              └────────────────┘ └──────────────────┘
```

### 技术栈明细

| 层级 | 技术选型 | 用途 |
|------|---------|------|
| 前端框架 | Next.js 16+ (App Router) | SSR/ISR 渲染、路由、API 状态 |
| UI 组件 | TipTap + Tailwind CSS + LXGW WenKai | 暖色调设计系统 + 富文本编辑器 |
| 图标库 | lucide-react | 全局统一图标 |
| 思维导图 | @excalidraw/excalidraw | Excalidraw 画布 + 中文语言包 |
| 富文本 | @tiptap/react + BubbleMenu + FloatingMenu | 笔记编辑 + AI 润色 |
| Markdown 渲染 | react-markdown + remark-math + rehype-katex | 知识笔记/试题的 LaTeX 公式渲染 |
| 试卷框选 | fabric.js 或 react-rnd | 上传试卷图片后拖拽矩形框选题目 |
| 图表 | recharts 或 chart.js | 排行榜、数据统计可视化 |
| 后端框架 | Python FastAPI | 异步高并发 API |
| ORM | SQLAlchemy 2.0 (async) | 数据库操作 |
| 数据库迁移 | Alembic | Schema 版本管理 |
| 认证 | JWT (python-jose) | 无状态 Token 认证 |
| 限流 | slowapi (Redis) | API 防刷 |
| 异步队列 | Celery + Redis broker | 视频转码/向量化 |
| 视频转码 | FFmpeg | HLS 切片 (.m3u8 + .ts) |
| 对象存储 | MinIO | 图片/视频/JSON 文件存储 |
| 向量数据库 | pgvector (PostgreSQL 扩展) | RAG 检索增强生成 |
| AI 统一调用 | litellm | 多供应商模型管理 (DeepSeek/MiniMax/智谱等) |
| AI Agent | Eve (eve.dev) | 文件系统驱动的持久化 Agent |
| 外部 AI | DeepSeek API / MiniMax / 智谱 GLM | 问答/结构化/评分（通过 litellm 统一调用） |

---

## 3. 目录结构

```
CoStudy/
├── frontend/                          # Next.js 前端
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   ├── .env.local
│   ├── public/
│   │   ├── logo.svg
│   │   └── favicon.ico
│   ├── src/
│   │   ├── app/                       # App Router 页面
│   │   │   ├── layout.tsx             # 根布局 (Providers, Sidebar, Theme)
│   │   │   ├── page.tsx               # 首页 / Discovery
│   │   │   ├── globals.css            # 全局样式 + 暖色调 CSS 变量
│   │   │   ├── (auth)/                # 认证路由组
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── tree/                  # 教材知识树
│   │   │   │   ├── page.tsx           # 树状导航主页
│   │   │   │   └── [nodeId]/page.tsx  # 节点详情页 (课本图片 + 资源列表)
│   │   │   ├── workspace/             # 创作工作台
│   │   │   │   ├── mindmap/page.tsx   # Excalidraw 思维导图编辑器
│   │   │   │   ├── notes/page.tsx     # Markdown 富文本笔记编辑器
│   │   │   │   ├── exam-cut/page.tsx  # 试卷框选校对
│   │   │   │   └── note-convert/page.tsx  # 手写笔记转 Markdown
│   │   │   ├── exam/                  # 试卷库
│   │   │   │   ├── page.tsx           # 试卷列表
│   │   │   │   ├── [examId]/page.tsx  # 在线测试 (考试模式)
│   │   │   │   └── [examId]/result/page.tsx  # 测试结果/批改
│   │   │   ├── video/                 # 微课视频
│   │   │   │   ├── page.tsx           # 视频列表
│   │   │   │   └── [videoId]/page.tsx # 视频播放页
│   │   │   ├── ai/                    # AI 助手
│   │   │   │   └── page.tsx           # 费曼助手 + 知识问答
│   │   │   └── dashboard/             # 用户中心 + 管理后台
│   │   │       ├── page.tsx           # 学生仪表盘
│   │   │       ├── favorites/page.tsx
│   │   │       ├── drafts/page.tsx
│   │   │       ├── history/page.tsx
│   │   │       ├── errors/page.tsx    # 错题本
│   │   │       └── admin/             # 教师/管理员后台
│   │   │           ├── page.tsx       # 审核面板
│   │   │           ├── users/page.tsx # 用户管理 (Admin)
│   │   │           └── settings/page.tsx  # 系统设置 (Admin)
│   │   ├── components/                # 通用组件
│   │   │   ├── ui/                    # shadcn/ui 基础组件
│   │   │   ├── layout/               # 布局组件
│   │   │   │   ├── sidebar.tsx        # 侧边栏导航
│   │   │   │   ├── header.tsx         # 顶部栏 (搜索、通知、用户)
│   │   │   │   └── providers.tsx      # AuthProvider, ThemeProvider
│   │   │   ├── tree/                  # 教材树组件
│   │   │   │   ├── textbook-tree.tsx  # 可折叠树状导航
│   │   │   │   └── textbook-carousel.tsx  # 课本图片轮播
│   │   │   ├── resource/             # 资源展示组件
│   │   │   │   ├── resource-card.tsx  # 资源卡片 (导图/笔记预览)
│   │   │   │   ├── excalidraw-preview.tsx  # Excalidraw SVG 静态预览
│   │   │   │   └── markdown-renderer.tsx   # Markdown + LaTeX 渲染
│   │   │   ├── workspace/            # 工作台组件
│   │   │   │   ├── excalidraw-editor.tsx    # Excalidraw 画布封装
│   │   │   │   ├── markdown-editor.tsx      # Markdown 编辑器
│   │   │   │   ├── exam-cropper.tsx         # 试卷图片框选 (fabric.js)
│   │   │   │   └── note-converter.tsx       # 手写笔记转换器
│   │   │   ├── exam/                  # 试卷/测试组件
│   │   │   │   ├── exam-card.tsx      # 试卷卡片
│   │   │   │   ├── exam-runner.tsx    # 在线考试 (计时器 + 答题卡)
│   │   │   │   └── exam-result.tsx    # 批改结果展示
│   │   │   ├── video/                 # 视频组件
│   │   │   │   ├── video-player.tsx   # HLS 视频播放器
│   │   │   │   └── video-card.tsx     # 视频列表卡片
│   │   │   ├── ai/                    # AI 助手组件
│   │   │   │   ├── chat-panel.tsx     # 聊天界面
│   │   │   │   ├── chat-message.tsx   # 消息气泡 (Markdown 渲染)
│   │   │   │   └── assistant-switcher.tsx  # 助手切换器
│   │   │   └── review/               # 审核组件
│   │   │       ├── review-panel.tsx   # 教师审核面板
│   │   │       └── review-item.tsx    # 单条审核项
│   │   ├── lib/                      # 工具函数
│   │   │   ├── api.ts                # API 客户端 (fetch 封装)
│   │   │   ├── auth.ts               # JWT Token 管理
│   │   │   ├── utils.ts              # 通用工具函数
│   │   │   └── constants.ts          # 常量 (API URL, 色值等)
│   │   ├── hooks/                    # 自定义 Hooks
│   │   │   ├── use-auth.ts           # 认证状态
│   │   │   ├── use-tree.ts           # 教材树数据
│   │   │   └── use-chat.ts           # AI 聊天流式响应
│   │   └── types/                    # TypeScript 类型定义
│   │       ├── user.ts               # User, Role
│   │       ├── textbook.ts           # TextbookNode
│   │       ├── resource.ts           # SharedResource
│   │       ├── exam.ts               # ExamQuestion, ExamPaper
│   │       └── api.ts                # API Response 类型
│   └── .eslintrc.json
│
├── backend/                           # Python FastAPI 后端
│   ├── pyproject.toml                # 依赖管理 (Poetry/uv)
│   ├── alembic.ini
│   ├── alembic/                      # 数据库迁移
│   │   └── versions/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app 入口
│   │   ├── config.py                 # 环境变量配置
│   │   ├── database.py               # SQLAlchemy async engine + session
│   │   ├── dependencies.py           # 依赖注入 (get_db, get_current_user)
│   │   ├── models/                   # SQLAlchemy ORM 模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py               # User 模型
│   │   │   ├── textbook.py           # Textbook 模型
│   │   │   ├── resource.py           # SharedResource 模型
│   │   │   ├── exam.py               # ExamQuestion, ExamPaper
│   │   │   ├── video.py              # MicroCourseVideo
│   │   │   ├── favorite.py           # Favorite
│   │   │   └── review.py             # ReviewLog
│   │   ├── schemas/                  # Pydantic 请求/响应模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── textbook.py
│   │   │   ├── resource.py
│   │   │   ├── exam.py
│   │   │   ├── video.py
│   │   │   └── ai.py                 # AI 请求/响应
│   │   ├── api/                      # API 路由
│   │   │   ├── __init__.py
│   │   │   ├── auth.py               # /api/auth/* (登录、注册、刷新)
│   │   │   ├── users.py              # /api/users/* (用户 CRUD)
│   │   │   ├── textbooks.py          # /api/textbooks/* (教材树 CRUD)
│   │   │   ├── resources.py          # /api/resources/* (共享资源)
│   │   │   ├── exams.py              # /api/exams/* (试卷/测试)
│   │   │   ├── videos.py             # /api/videos/* (微课视频)
│   │   │   ├── ai.py                 # /api/ai/* (AI 助手)
│   │   │   ├── ocr.py                # /api/ocr/* (OCR 识别)
│   │   │   ├── upload.py             # /api/upload/* (MinIO 上传/预签名)
│   │   │   └── admin.py              # /api/admin/* (管理后台)
│   │   ├── services/                 # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py       # JWT 生成/验证
│   │   │   ├── textbook_service.py   # 教材树递归查询
│   │   │   ├── resource_service.py   # 资源 CRUD + Redis 排行
│   │   │   ├── exam_service.py       # 试卷结构化 + 批改
│   │   │   ├── ai_service.py         # DeepSeek API 封装
│   │   │   ├── ocr_service.py        # PaddleOCR 调用
│   │   │   ├── upload_service.py     # MinIO 操作封装
│   │   │   ├── video_service.py      # 视频上传 + FFmpeg 转码
│   │   │   └── vector_service.py     # pgvector 向量化 + RAG 检索
│   │   │   ├── rate_limit.py         # API 限流 (slowapi)
│   │   │   └── cors.py               # CORS 配置
│   │   └── tasks/                    # Celery 异步任务
│   │       ├── __init__.py           # Celery app 初始化
│   │       ├── ocr_tasks.py          # OCR 识别任务
│   │       ├── video_tasks.py        # 视频转码任务
│   │       ├── vector_tasks.py       # 向量化任务
│   │       └── review_tasks.py       # 审核通知任务
│   └── tests/                        # 后端测试
│       ├── test_auth.py
│       ├── test_textbooks.py
│       ├── test_resources.py
│       └── test_exams.py
│
├── docker-compose.yml                # Docker 编排 (开发后期)
├── Dockerfile.frontend               # 前端镜像
├── Dockerfile.backend                # 后端镜像
├── Dockerfile.worker                 # Celery Worker 镜像 (含 PaddleOCR)
├── .env.example                      # 环境变量模板
├── README.md                         # 项目文档
├── SPEC.md                           # 本文档
├── AI-驱动的知识共享系统增强.md        # 原始需求文档
└── warm-dashboard.tsx                # UI 设计参考模板
```

---

## 4. 数据库设计

### 4.1 PostgreSQL 表结构

#### 用户表 (`users`)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    role VARCHAR(20) NOT NULL DEFAULT 'student',  -- 'student' | 'teacher' | 'admin'
    subject_id INT REFERENCES textbooks(id),       -- 教师绑定的科目 ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subject ON users(subject_id);
```

#### 教材树表 (`textbooks`)

```sql
CREATE TABLE textbooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level INT NOT NULL,                            -- 0:科目, 1:教材, 2:单元, 3:章节
    parent_id INT REFERENCES textbooks(id) ON DELETE RESTRICT,
    sort_order INT DEFAULT 0,                      -- 同级排序
    description TEXT,
    image_urls JSONB DEFAULT '[]',                 -- 课本图片 URL 列表 (MinIO 路径)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_textbooks_parent ON textbooks(parent_id);
CREATE INDEX idx_textbooks_level ON textbooks(level);

-- 辅助函数：获取节点的根科目 ID（用于教师垂直审核权限校验）
CREATE OR REPLACE FUNCTION get_root_subject_id(node_id INT)
RETURNS INT AS $$
DECLARE
    current_id INT := node_id;
    parent_id_val INT;
BEGIN
    LOOP
        SELECT parent_id INTO parent_id_val FROM textbooks WHERE id = current_id;
        IF parent_id_val IS NULL THEN
            RETURN current_id;
        END IF;
        current_id := parent_id_val;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### 共享资源表 (`shared_resources`)

```sql
CREATE TABLE shared_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    textbook_id INT REFERENCES textbooks(id),
    user_id INT NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL,                     -- 'excalidraw' | 'markdown'
    content_path VARCHAR(500) NOT NULL,            -- MinIO 中 JSON/MD 文件路径
    preview_url VARCHAR(500),                      -- 导出的静态预览图 (PNG/SVG) 路径
    status INT DEFAULT 0,                          -- 0:待审核, 1:已通过, 2:已拒绝
    reviewer_id INT REFERENCES users(id),
    reject_reason TEXT,                            -- 驳回原因
    favorites_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    embedding VECTOR(768),                          -- pgvector 向量 (用于 RAG)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_resources_textbook ON shared_resources(textbook_id);
CREATE INDEX idx_resources_user ON shared_resources(user_id);
CREATE INDEX idx_resources_status ON shared_resources(status);
CREATE INDEX idx_resources_type ON shared_resources(type);
CREATE INDEX idx_resources_embedding ON shared_resources USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
```

#### 书签表 (`bookmarks`)

```sql
CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    textbook_id INT NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
    label VARCHAR(200),                     -- 书签备注 (如"期末重点")
    color VARCHAR(20) DEFAULT '#e8b86d',    -- 书签颜色
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, textbook_id)
);
```

#### 教师讲义表 (`lecture_notes`)

```sql
CREATE TABLE lecture_notes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 教师
    textbook_id INT NOT NULL REFERENCES textbooks(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    file_path VARCHAR(500) NOT NULL,         -- MinIO 路径 (PDF/PPT)
    file_type VARCHAR(20) NOT NULL,          -- 'pdf' | 'ppt' | 'pptx' | 'doc'
    file_size INT,                           -- 字节数
    description TEXT,
    download_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### AI 对话日志表 (`chat_logs`)

```sql
CREATE TABLE chat_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assistant_type VARCHAR(30) NOT NULL,     -- 'feynman' | 'knowledge_qa' | 'eve_agent'
    conversation_id VARCHAR(100),            -- 会话分组 ID
    role VARCHAR(10) NOT NULL,               -- 'user' | 'assistant'
    content TEXT NOT NULL,
    referenced_resource_id INT REFERENCES shared_resources(id),
    compliance_passed BOOLEAN DEFAULT TRUE,  -- 合规性检查结果
    compliance_reason TEXT,                  -- 不通过时的原因
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 试卷表 (`exam_papers`)

```sql
CREATE TABLE exam_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    user_id INT NOT NULL REFERENCES users(id),
    textbook_id INT REFERENCES textbooks(id),
    source_image_url VARCHAR(500),                 -- 原始试卷图片 (MinIO)
    status INT DEFAULT 0,                          -- 0:编辑中, 1:已发布
    total_questions INT DEFAULT 0,
    time_limit_minutes INT DEFAULT 120,            -- 考试时限
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_papers_user ON exam_papers(user_id);
```

#### 试题表 (`exam_questions`)

```sql
CREATE TABLE exam_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID REFERENCES exam_papers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,                     -- '选择题' | '填空题' | '解答题'
    stem TEXT NOT NULL,                            -- 题干 (Markdown)
    options JSONB DEFAULT '[]',                    -- 选项 (选择题): ["A. ...", "B. ..."]
    answer TEXT,                                   -- 标准答案
    explanation TEXT,                              -- 解析 (Markdown)
    difficulty INT DEFAULT 1,                      -- 难度 1-5
    sort_order INT DEFAULT 0,
    bounding_box JSONB,                            -- 原图裁剪坐标 {x, y, width, height}
    cropped_image_url VARCHAR(500),                -- 裁剪后的题目图片
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_paper ON exam_questions(paper_id);
```

#### 答题记录表 (`exam_attempts`)

```sql
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID REFERENCES exam_papers(id),
    user_id INT NOT NULL REFERENCES users(id),
    answers JSONB NOT NULL DEFAULT '{}',           -- {question_id: user_answer}
    score DECIMAL(5,2),
    total_score DECIMAL(5,2),
    is_graded BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,
    grading_result JSONB                           -- DeepSeek 主观题评分结果
);

CREATE INDEX idx_attempts_paper ON exam_attempts(paper_id);
CREATE INDEX idx_attempts_user ON exam_attempts(user_id);
```

#### 微课视频表 (`micro_course_videos`)

```sql
CREATE TABLE micro_course_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    user_id INT NOT NULL REFERENCES users(id),
    textbook_id INT REFERENCES textbooks(id),
    original_url VARCHAR(500),                     -- 原始视频 (MinIO)
    hls_url VARCHAR(500),                          -- HLS 流媒体 (.m3u8) 路径
    thumbnail_url VARCHAR(500),                    -- 视频缩略图
    duration_seconds INT,
    status INT DEFAULT 0,                          -- 0:转码中, 1:就绪, 2:失败
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_videos_user ON micro_course_videos(user_id);
CREATE INDEX idx_videos_textbook ON micro_course_videos(textbook_id);
```

#### 收藏表 (`favorites`)

```sql
CREATE TABLE favorites (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    resource_id UUID REFERENCES shared_resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, resource_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_resource ON favorites(resource_id);
```

#### 错题本表 (`error_notes`)

```sql
CREATE TABLE error_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES users(id),
    question_id UUID REFERENCES exam_questions(id),
    user_answer TEXT,                              -- 用户的错误答案
    correct_answer TEXT,
    notes TEXT,                                    -- 学生的订正笔记
    mastered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_errors_user ON error_notes(user_id);
```

#### 审核日志表 (`review_logs`)

```sql
CREATE TABLE review_logs (
    id SERIAL PRIMARY KEY,
    resource_id UUID REFERENCES shared_resources(id),
    reviewer_id INT NOT NULL REFERENCES users(id),
    action VARCHAR(10) NOT NULL,                   -- 'approve' | 'reject'
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 聊天记录表 (`chat_messages`)

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES users(id),
    assistant_type VARCHAR(20) NOT NULL,           -- 'feynman' | 'knowledge_qa'
    conversation_id UUID NOT NULL,
    role VARCHAR(10) NOT NULL,                     -- 'user' | 'assistant'
    content TEXT NOT NULL,
    referenced_resource_id UUID,                   -- 引用的校内资源
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_chat_conversation ON chat_messages(conversation_id);
```

### 4.2 Redis 数据结构

| Key Pattern | 类型 | 用途 |
|-------------|------|------|
| `rank:leadership` | ZSET | 资源排行榜，member=resource_id, score=favorites_count |
| `cache:textbook_tree` | STRING (JSON) | 教材树结构缓存，TTL=1h |
| `cache:resource:{id}` | STRING (JSON) | 单个资源详情缓存，TTL=30min |
| `rate:limit:{ip}:{endpoint}` | STRING | API 限流计数器，TTL=1min |
| `user:session:{token}` | HASH | 用户会话信息缓存 |
| `ai:stream:{task_id}` | STRING | AI 流式响应临时缓存，TTL=5min |

---

## 5. API 接口规范

### 通用约定

- **Base URL**: `/api/v1`
- **认证**: `Authorization: Bearer <jwt_token>`
- **响应格式**:

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

- **分页**: `?page=1&page_size=20`
- **排序**: `?sort=favorites_count&order=desc`

### 5.1 认证模块 (`/api/v1/auth`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/auth/register` | 用户注册 | 公开 |
| POST | `/auth/login` | 用户登录，返回 JWT | 公开 |
| POST | `/auth/refresh` | 刷新 Token | 登录用户 |
| GET | `/auth/me` | 获取当前用户信息 | 登录用户 |
| PUT | `/auth/profile` | 更新个人资料 | 登录用户 |

### 5.2 教材树模块 (`/api/v1/textbooks`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/textbooks/tree` | 获取完整教材树 (带缓存) | 登录用户 |
| GET | `/textbooks/{id}` | 获取节点详情 + 子节点列表 | 登录用户 |
| GET | `/textbooks/{id}/resources` | 获取该节点下的共享资源列表 | 登录用户 |
| POST | `/textbooks` | 创建教材节点 | 管理员 |
| PUT | `/textbooks/{id}` | 更新教材节点 | 管理员 |
| DELETE | `/textbooks/{id}` | 删除教材节点 (级联) | 管理员 |
| POST | `/textbooks/{id}/images` | 上传课本图片 | 管理员 |

### 5.3 共享资源模块 (`/api/v1/resources`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/resources` | 资源列表 (筛选: type, textbook_id, status) | 登录用户 |
| GET | `/resources/{id}` | 资源详情 (含内容) | 登录用户 |
| POST | `/resources` | 创建资源 (草稿) | 学生/教师 |
| PUT | `/resources/{id}` | 更新资源内容 | 作者 |
| DELETE | `/resources/{id}` | 删除资源 | 作者/管理员 |
| POST | `/resources/{id}/submit` | 提交审核 | 作者 |
| POST | `/resources/{id}/favorite` | 收藏/取消收藏 | 登录用户 |
| GET | `/resources/leadership` | 排行榜 (Top N) | 登录用户 |
| GET | `/resources/recommended` | 首页推荐 (高赞+最新) | 登录用户 |
| GET | `/resources/search?q=` | 全局搜索 | 登录用户 |

### 5.4 审核模块 (`/api/v1/review`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/review/pending` | 待审核列表 (教师仅见本科目) | 教师/管理员 |
| POST | `/review/{resourceId}/approve` | 审核通过 | 教师/管理员 |
| POST | `/review/{resourceId}/reject` | 审核驳回 (附原因) | 教师/管理员 |
| GET | `/review/logs` | 审核历史记录 | 教师/管理员 |

### 5.5 试卷模块 (`/api/v1/exams`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/exams/papers` | 试卷列表 | 登录用户 |
| POST | `/exams/papers` | 创建试卷 (上传原始图片) | 学生/教师 |
| GET | `/exams/papers/{id}` | 试卷详情 (含所有题目) | 登录用户 |
| PUT | `/exams/papers/{id}` | 更新试卷信息 | 作者 |
| POST | `/exams/papers/{id}/publish` | 发布试卷 | 作者 |
| POST | `/exams/questions/crop` | 框选裁剪 → OCR → 结构化 (SSE Stream) | 学生/教师 |
| PUT | `/exams/questions/{id}` | 校对/修改题目 | 作者 |
| POST | `/exams/papers/{id}/start` | 开始测试 (创建 attempt) | 学生 |
| POST | `/exams/attempts/{id}/submit` | 提交测试 | 学生 |
| GET | `/exams/attempts/{id}/result` | 查看批改结果 | 学生 |
| GET | `/exams/errors` | 错题本列表 | 学生 |
| PUT | `/exams/errors/{id}` | 更新错题状态 (已掌握) | 学生 |

### 5.6 微课视频模块 (`/api/v1/videos`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/videos` | 视频列表 (按 textbook_id 筛选) | 登录用户 |
| GET | `/videos/{id}` | 视频详情 | 登录用户 |
| POST | `/videos` | 创建视频记录 (获取 presigned URL 上传) | 教师 |
| POST | `/videos/{id}/confirm` | 确认上传完成，触发转码 | 教师 |
| GET | `/videos/{id}/stream` | 获取 HLS 流地址 | 登录用户 |

### 5.7 AI 助手模块 (`/api/v1/ai`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/ai/feynman/chat` | 费曼助手对话 (SSE Stream) | 学生 |
| POST | `/ai/knowledge/chat` | 知识问答 (RAG + SSE Stream) | 学生 |
| POST | `/ai/polish` | AI 文本润色/翻译/简化/扩展 | 登录用户 |
| POST | `/ai/compliance/check` | 对话合规性预检 (学习相关性) | 系统 |
| POST | `/ai/exam/grade` | 主观题 AI 批改 | 系统 |
| GET | `/ai/conversations` | 聊天历史列表 | 登录用户 |
| GET | `/ai/conversations/{id}` | 单次对话历史 | 登录用户 |

### 5.10 书签模块 (`/api/v1/bookmarks`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/bookmarks` | 我的书签列表 | 登录用户 |
| POST | `/bookmarks` | 添加书签 | 登录用户 |
| PUT | `/bookmarks/{id}` | 更新书签 (备注/颜色/排序) | 作者 |
| DELETE | `/bookmarks/{id}` | 删除书签 | 作者 |

### 5.11 教师讲义模块 (`/api/v1/lecture-notes`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/lecture-notes?textbook_id=` | 某章节的讲义列表 | 登录用户 |
| POST | `/lecture-notes` | 上传讲义 (PDF/PPT) | 教师/管理员 |
| GET | `/lecture-notes/{id}` | 讲义详情 | 登录用户 |
| DELETE | `/lecture-notes/{id}` | 删除讲义 | 上传者/管理员 |

### 5.12 Eve Agent 模块 (`/eve/v1/`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/eve/v1/session` | 创建 Agent 会话 | 登录用户 |
| POST | `/eve/v1/session/{id}` | 发送后续消息 | 登录用户 |
| GET | `/eve/v1/session/{id}/stream` | 流式响应 (NDJSON) | 登录用户 |

### 5.13 模型供应商管理 (`/api/v1/providers`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/providers` | 获取所有供应商配置 | 管理员 |
| POST | `/providers` | 添加供应商 | 管理员 |
| PUT | `/providers/{id}` | 更新供应商配置 | 管理员 |
| DELETE | `/providers/{id}` | 删除供应商 | 管理员 |
| POST | `/providers/{id}/test` | 测试供应商连接 | 管理员 |
| GET | `/providers/scan` | 扫描所有供应商模型 + 检测思考强度 | 管理员 |
| GET | `/providers/{id}/scan` | 扫描指定供应商模型 | 管理员 |
| GET | `/providers/models/{model}/capabilities` | 获取模型能力 (思考强度/上下文窗口) | 管理员 |
| GET | `/providers/reasoning-levels` | 获取思考强度等级列表 | 管理员 |

> **litellm 统一模型网关**: 管理员在后台配置供应商 (Base URL + API Key + 模型列表)，
> 系统通过 litellm 自动路由调用。支持 OpenAI 兼容格式和 Anthropic 格式。
> - `litellm.supports_reasoning()` 检测模型是否支持思考强度
> - `litellm.model_prices_and_context_window` 获取模型元数据 (上下文窗口/成本)
> - `reasoning_effort` 参数统一传入，litellm 自动映射到各厂商 API

> **Eve Agent** 基于 [eve.dev](https://eve.dev) 框架，文件系统驱动：
> - `agent/instructions.md`: 角色定义 (学习助手 + 合规约束)
> - `agent/tools/`: 知识库检索、教材导航、书签管理、资源引用
> - `agent/channels/`: HTTP channel，对接 FastAPI 前端
>
> **模型统一调用**: 基于 litellm，管理员在后台配置供应商 (Base URL + API Key + 模型列表)，
> 系统自动路由到对应 API。支持 OpenAI 兼容格式和 Anthropic 格式。

### 5.8 OCR 模块 (`/api/v1/ocr`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/ocr/note` | 手写笔记识别 (返回 Markdown, SSE Stream) | 学生/教师 |
| POST | `/ocr/exam` | 试卷局部 OCR (裁剪图 → 文本) | 学生/教师 |

### 5.9 文件上传模块 (`/api/v1/upload`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | `/upload/presigned-url` | 获取 MinIO 预签名上传 URL | 登录用户 |
| POST | `/upload/image` | 上传图片 (小文件直接上传) | 登录用户 |
| GET | `/upload/preview/{path}` | 获取文件预签名访问 URL | 登录用户 |

### 5.10 管理后台模块 (`/api/v1/admin`)

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/admin/stats` | 系统统计数据 | 管理员 |
| GET | `/admin/users` | 用户列表 (支持搜索/分页/角色筛选) | 管理员 |
| PUT | `/admin/users/{id}/role` | 修改用户角色 | 管理员 |
| DELETE | `/admin/users/{id}` | 删除用户 | 管理员 |
| PUT | `/admin/settings` | 系统配置 (大模型参数等) | 管理员 |

---

## 6. 前端页面与组件架构

### 6.1 设计系统 (暖色调)

沿用 `warm-dashboard.tsx` 的色彩体系：

```css
/* globals.css 中定义 CSS 变量 */
:root {
  --color-primary: #4a9d9a;      /* 主色: 青绿 */
  --color-accent: #e8b86d;       /* 强调: 琥珀金 */
  --color-danger: #c17767;        /* 危险/警示: 赤陶红 */
  --color-muted: #6b8e8e;        /* 次要: 鼠尾草绿 */
  --color-background: #faf8f5;    /* 背景: 暖米白 */
  --color-surface: #ffffff;       /* 卡片: 白色 */
  --color-text-primary: #1f2937;  /* 主文字 */
  --color-text-secondary: #6b7280; /* 次文字 */
  --color-text-muted: #9ca3af;    /* 弱文字 */
  --color-border: #e5e7eb;        /* 边框 */
}
```

### 6.2 六大核心页面

#### 页面 1: 首页 / Discovery (`/`)

```
┌──────────────────────────────────────────────────────┐
│  Header: Logo + 全局搜索框 + 通知铃铛 + 用户头像      │
├──────────────────────────────────────────────────────┤
│  Banner: 系统介绍 / 公告                              │
├───────────────────────────┬──────────────────────────┤
│  推荐内容 Feed             │  排行榜看板              │
│  ┌─────────────────────┐  │  ┌────────────────────┐  │
│  │ 思维导图预览         │  │  │ 贡献排行           │  │
│  │ 收藏 128 · 查看 340  │  │  │ 1. 张三 - 42 收藏  │  │
│  ├─────────────────────┤  │  │ 2. 李四 - 38 收藏  │  │
│  │ 精选笔记预览        │  │  ├────────────────────┤  │
│  │ 收藏 96 · 查看 210   │  │  │ 最新微课           │  │
│  ├─────────────────────┤  │  │ [视频缩略图列表]   │  │
│  │ 最新微课            │  │  └────────────────────┘  │
│  │ [视频缩略图]        │  │                          │
│  └─────────────────────┘  │                          │
└───────────────────────────┴──────────────────────────┘
```

#### 页面 2: 教材知识树 (`/tree`)

```
┌──────────────────────────────────────────────────────┐
│  左侧树导航           │  右侧内容区                   │
│  数学                │  [课本图片轮播器]              │
│   ├ 必修一           │  ← 第1章 → 第2章 → 第3章 →   │
│   │ ├ 第1章          │  ─── 本章共享资源 ─────────   │
│   │ │ ├ 1.1         │  ┌──────┐ ┌──────┐ ┌──────┐  │
│   │ │ ├ 1.2         │  │ 导图1 │ │ 笔记1│ │ 视频1│  │
│   │ │ └ 1.3         │  │ 收藏45│ │ 收藏32│ │播放128│ │
│   │ ├ 第2章          │  └──────┘ └──────┘ └──────┘  │
│   └ 必修二           │  [查看全部 >]                  │
│  语文                │                                │
│  物理                │                                │
└──────────────────────────────────────────────────────┘
```

#### 页面 3: 创作工作台 (`/workspace`)

4 个子页面，Tab 切换: 思维导图 / 知识笔记 / 试卷框选 / 笔记转换

- 思维导图: Excalidraw 全功能画布
- 试卷框选: 左 fabric.js 画布 (框选) + 右 AI 结构化编辑器 (SSE 流式)
- 笔记转换: 左原图 + 右 Markdown 编辑器

#### 页面 4: 试卷库 + 微课视频 (`/exam`, `/video`)

- 试卷列表 → 全屏考试 (计时器 + 答题卡) → 批改结果
- 微课视频: HLS 播放器 + 关联章节 + 讲义下载 + 评论区

#### 页面 5: AI 助手 (`/ai`)

- 左侧: 助手切换 (费曼/知识问答) + 历史会话列表
- 右侧: 聊天界面 (SSE 流式 + Markdown/LaTeX 渲染 + 笔记引用)

#### 页面 6: 用户中心 + 管理后台 (`/dashboard`)

- 学生: 收藏 / 草稿 / 审核中 / 错题本 / 历史
- 教师: 待审核列表 (自动按科目过滤) + 原稿预览 + 通过/驳回
- 管理员: 统计面板 / 用户管理 / 系统设置

---

## 7. AI/OCR 管道设计

### 7.1 试卷框选 → OCR → LLM 结构化

```
前端上传试卷图片 → fabric.js 画布展示 → 用户拖拽框选
  → 生成相对坐标 (按画布缩放比例换算) {x, y, w, h}
  → POST /api/v1/exams/questions/crop
  → 后端 OpenCV 裁剪 → PaddleOCR 局部识别
  → DeepSeek API 结构化 (Prompt → JSON)
  → SSE 流式返回 → 双栏校对 (左图右文) → 保存入库
```

> **⚠️ Canvas 坐标缩放公式 (关键)**
>
> 手机拍照分辨率通常极大 (如 4000×3000)，前端 Canvas 会缩放到 ~800×600 展示。
> 学生在缩放后的画布上拉框，坐标是画布坐标，**必须**转换为原图坐标：
>
> ```
> ratio_x = box.x / canvas_display_width
> ratio_y = box.y / canvas_display_height
> ratio_w = box.w / canvas_display_width
> ratio_h = box.h / canvas_display_height
>
> original_box.x = ratio_x * original_image_width
> original_box.y = ratio_y * original_image_height
> original_box.w = ratio_w * original_image_width
> original_box.h = ratio_h * original_image_height
> ```
>
> 后端用 `original_box` 裁剪原图，才能精准切题。

### 7.2 手写笔记 → DeepSeek Vision → Markdown

```
学生上传手写照片 → OpenCV 预处理 (纠偏/去阴影/二值化)
  → DeepSeek Vision API (多模态识别)
  → 输出结构化 Markdown (多级标题/列表/LaTeX公式)
  → 双栏校对 (左原图右编辑器) → 挂载到教材树 → 进入审核
```

### 7.3 RAG 知识问答管道

```
审核通过的资源 → Celery 向量化任务 (本地加载 text2vec-base-chinese, 768维)
  → pgvector 余弦索引存储
  → 学生提问 → 余弦相似度检索 top 3 → 注入 Context
  → DeepSeek API (RAG Prompt) → SSE 流式返回
```

> **注意**: DeepSeek 不提供原生 Embedding API。向量化使用 Celery Worker 本地加载
> `shibing624/text2vec-base-chinese`（768 维，~400MB），避免调用第三方 Embedding 服务。

### 7.4 Eve Agent 智能助手 (eve.dev)

Eve 是文件系统驱动的持久化 Agent 框架，管理会话状态、工具调用和流式响应。

```
┌──────────────────────────────────────────────────┐
│  agent/                                          │
│  ├── instructions.md   # 角色定义 + 合规约束      │
│  ├── agent.ts          # DeepSeek 模型配置        │
│  ├── tools/                                      │
│  │   ├── search_knowledge.ts  # RAG 知识库检索    │
│  │   ├── navigate_tree.ts     # 教材树导航        │
│  │   ├── cite_resource.ts     # 引用共享资源      │
│  │   ├── manage_bookmarks.ts  # 书签管理          │
│  │   └── get_lecture_notes.ts # 教师讲义查询      │
│  └── channels/
│      └── http.ts              # HTTP channel      │
└──────────────────────────────────────────────────┘

用户提问 → Eve Session (POST /eve/v1/session)
  → instructions.md 约束: "你是学习助手，只回答学习相关问题"
  → Agent 自主选择工具:
      - 知识库检索: pgvector 余弦搜索 top 3
      - 教材导航: 返回当前章节路径 + 相关链接
      - 引用资源: 返回资源标题 + 链接 + 收藏数
      - 书签管理: 帮助用户添加/查看/删除书签
  → 流式返回 (NDJSON) → 前端实时渲染
```

**instructions.md 示例**:
```markdown
你是 CoStudy 智能学习助手。你的职责是帮助学生理解教材知识。

规则：
1. 你只能回答与学习、教材、考试相关的问题
2. 回答时引用具体资源，附上链接方便学生查看
3. 如果学生遇到困难，引导他们查看相关教材章节
4. 保持友好、耐心的语气，像一位辅导老师

工具说明：
- search_knowledge: 搜索知识库，查找相关笔记和思维导图
- navigate_tree: 在教材树中导航，定位到具体章节
- cite_resource: 引用共享资源，返回链接
- manage_bookmarks: 帮学生管理书签
- get_lecture_notes: 查询教师上传的讲义
```

### 7.5 对话合规性预检

在 Agent 处理用户输入前，**先用 DeepSeek 做一次合规性检查**：

```
用户输入 → compliance/check endpoint
  → DeepSeek API:
    Prompt: "判断以下用户输入是否与学习、教材、考试相关。
            只返回 JSON: {passed: bool, reason: string}"
  → passed=true → 正常调用 Eve Agent
  → passed=false → 返回友好提示:
    "🤖 抱歉，我只能回答学习相关的问题哦～
     你可以问我关于教材知识、考试准备、学习方法的问题！"
  → 记录到 chat_logs (compliance_passed, compliance_reason)
```

> **合规性检查规则**:
> - ✅ 通过: 教材知识、考试准备、学习方法、笔记编辑、作业问题
> - ❌ 拒绝: 闲聊、广告、政治敏感、暴力色情、技术破解

### 7.6 费曼学习助手

苏格拉底式引导: AI 要求学生用自己的话解释 → 指出理解不准确处 → 反复对话帮助掌握

### 7.7 视频转码管道

```
教师上传视频 → MinIO Presigned URL 直传 → 确认上传
  → Celery FFmpeg 转码 → HLS (.m3u8 + .ts) + 缩略图
  → 更新数据库 status=1, hls_url, thumbnail_url
```

### 7.8 书签导航

```
学生在教材树点击书签图标 → POST /bookmarks {textbook_id, label}
  → 书签列表展示在侧边栏底部
  → 点击书签 → 快速定位到对应章节
  → 支持自定义颜色和排序
```

### 7.9 教师讲义上传

```
教师在教材节点点击"上传讲义" → 选择 PDF/PPT 文件
  → MinIO Presigned URL 上传
  → POST /lecture-notes {textbook_id, title, file_type}
  → 学生在教材节点详情页查看/下载讲义
```

---

## 8. RBAC 权限模型

| 能力 | 学生 | 教师 | 管理员 |
|------|------|------|--------|
| 浏览教材树 | ✅ | ✅ | ✅ |
| 查看资源 | ✅ | ✅ | ✅ |
| 创建资源 | ✅ | ✅ | ✅ |
| 收藏资源 | ✅ | ✅ | ✅ |
| 书签章节 | ✅ | ✅ | ✅ |
| 在线测试 | ✅ | ✅ | ✅ |
| AI 问答 | ✅ | ✅ | ✅ |
| Eve Agent 对话 | ✅ | ✅ | ✅ |
| 查看教师讲义 | ✅ | ✅ | ✅ |
| 上传讲义 | ❌ | ✅ | ✅ |
| 上传微课视频 | ❌ | ✅ | ✅ |
| 审核本科目资源 | ❌ | ✅* | ✅ |
| 审核所有资源 | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |
| 系统配置 | ❌ | ❌ | ✅ |
| 管理教材树 | ❌ | ❌ | ✅ |

*教师垂直审核: `get_root_subject_id(resource.textbook_id) == user.subject_id`

---

## 9. 开发阶段规划

| 阶段 | 时间 | 内容 | 产出 |
|------|------|------|------|
| 0: 脚手架 | Week 1 | Next.js + FastAPI + DB 连接 + Tailwind + LXGW WenKai | 可运行的前后端骨架 |
| 1: 用户认证 | Week 2 | 注册/登录/JWT/角色 | 完整 Auth 流程 |
| 2: 教材树+首页 | Week 3-4 | 教材树 CRUD + Redis 缓存 + 首页推荐 + 排行 | 浏览教材树→查看资源 |
| 3: 创作+审核 | Week 5-7 | TipTap 富文本 + Excalidraw + 书签 + 审核流程 | 创作→审核→发布闭环 |
| 4: 试卷库 | Week 8-10 | OCR + DeepSeek 结构化 + 在线考试 + 批改 | 上传→识别→测试→批改 |
| 5: 微课视频 | Week 11 | 视频上传 + FFmpeg HLS 转码 + 播放器 | 教师上传→HLS 播放 |
| 6: AI 助手 | Week 12-14 | Eve Agent + 合规性预检 + RAG + 费曼助手 + 教师讲义 | Agent 对话 + 讲义系统 |
| 7: 管理+手写 | Week 15 | 管理后台 + 手写笔记 Vision 识别 | 管理功能 + 笔记转换 |
| 8: 部署优化 | Week 16 | Docker Compose + 性能优化 + 移动端适配 | 生产环境就绪 |
| 8: Docker | Week 15-16 | Docker Compose + Caddy HTTPS + 限流 + 备份 | 一键部署 |

---

## 10. Docker 部署方案

> 本阶段在所有功能开发完成后再实施

### 服务架构 (7 服务)

```yaml
services:
  frontend:      # Next.js 前端 (:3000)
  backend:       # FastAPI 后端 (:8000)
  celery_worker: # OCR + 视频转码 Worker
  postgres:      # PostgreSQL + pgvector (:5432)
  redis:         # Redis 7 (:6379)
  minio:         # MinIO 对象存储 (:9000/:9001)
  caddy:         # 反向代理 + HTTPS (:80/:443)
```

### 关键配置

- **PostgreSQL**: 使用 `pgvector/pgvector:pg16` 镜像，启用 pgvector 扩展
- **Redis**: 开启 AOF 持久化 (`--appendonly yes`)
- **MinIO**: 私有桶 + Presigned URL 访问
- **Celery Worker**: OCR 并发限制为 1-2，防止 CPU 过载
- **GPU 可选**: PaddleOCR 支持 `nvidia-container-toolkit` 加速
- **数据持久化**: PostgreSQL / Redis / MinIO 均挂载 named volumes

### 云服务器推荐配置

- **最低**: 4 核 8GB 内存 (CPU-only, 无 GPU)
- **推荐**: 8 核 16GB 内存
- **存储**: 100GB+ SSD
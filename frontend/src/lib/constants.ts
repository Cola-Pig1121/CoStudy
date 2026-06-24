/**
 * 全局常量
 */

/** 系统名称 */
export const APP_NAME = "CoStudy";
export const APP_TAGLINE = "校内学生知识共享系统";

/** 暖色调色板（与 globals.css 保持一致） */
export const COLORS = {
  primary: "#4a9d9a",
  accent: "#e8b86d",
  danger: "#c17767",
  muted: "#6b8e8e",
  background: "#faf8f5",
  surface: "#ffffff",
} as const;

/** 资源类型 */
export const RESOURCE_TYPES = {
  excalidraw: "思维导图",
  markdown: "知识笔记",
} as const;

/** 审核状态 */
export const RESOURCE_STATUS = {
  pending: 0,
  approved: 1,
  rejected: 2,
} as const;

/** 用户角色 */
export const USER_ROLES = {
  student: "学生",
  teacher: "教师",
  admin: "管理员",
} as const;

/** 侧边栏导航项 */
export const NAV_ITEMS = [
  { id: "home", label: "首页", href: "/" },
  { id: "tree", label: "教材知识树", href: "/tree" },
  { id: "workspace", label: "创作工作台", href: "/workspace/mindmap" },
  { id: "exam", label: "试卷库", href: "/exam" },
  { id: "video", label: "微课视频", href: "/video" },
  { id: "ai", label: "AI 助手", href: "/ai" },
  { id: "dashboard", label: "用户中心", href: "/dashboard" },
] as const;
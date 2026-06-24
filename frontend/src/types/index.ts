/**
 * 全局 TypeScript 类型定义
 */

// ── 用户与权限 ──
export type UserRole = "student" | "teacher" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  subject_id: number | null;
  created_at: string;
}

// ── 教材树 ──
export interface TextbookNode {
  id: number;
  name: string;
  level: number; // 0:科目, 1:教材, 2:单元, 3:章节
  parent_id: number | null;
  sort_order: number;
  description: string | null;
  image_urls: string[];
  children?: TextbookNode[];
  created_at: string;
}

// ── 共享资源 ──
export type ResourceType = "excalidraw" | "markdown";
export type ResourceStatus = 0 | 1 | 2; // 待审核 | 已通过 | 已拒绝

export interface SharedResource {
  id: string;
  textbook_id: number;
  user_id: number;
  title: string;
  type: ResourceType;
  content_path: string;
  preview_url: string | null;
  status: ResourceStatus;
  favorites_count: number;
  view_count: number;
  created_at: string;
  author?: User;
  textbook?: TextbookNode;
}

// ── 试卷与试题 ──
export type QuestionType = "选择题" | "填空题" | "解答题";

export interface ExamQuestion {
  id: string;
  paper_id: string;
  type: QuestionType;
  stem: string;
  options: string[];
  answer: string | null;
  explanation: string | null;
  difficulty: number;
  sort_order: number;
  bounding_box: { x: number; y: number; width: number; height: number } | null;
  cropped_image_url: string | null;
}

export interface ExamPaper {
  id: string;
  title: string;
  user_id: number;
  textbook_id: number | null;
  source_image_url: string | null;
  status: number;
  total_questions: number;
  time_limit_minutes: number;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  paper_id: string;
  user_id: number;
  answers: Record<string, string>;
  score: number | null;
  total_score: number | null;
  is_graded: boolean;
  started_at: string;
  submitted_at: string | null;
  grading_result: Record<string, unknown> | null;
}

// ── 微课视频 ──
export interface MicroCourseVideo {
  id: string;
  title: string;
  description: string | null;
  user_id: number;
  textbook_id: number | null;
  hls_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  status: number; // 0:转码中, 1:就绪, 2:失败
  view_count: number;
  created_at: string;
}

// ── AI 对话 ──
export type AssistantType = "feynman" | "knowledge_qa";

export interface ChatMessage {
  id: string;
  user_id: number;
  assistant_type: AssistantType;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  referenced_resource_id: string | null;
  created_at: string;
}
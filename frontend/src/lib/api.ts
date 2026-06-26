/**
 * API 客户端封装
 * 统一处理 baseURL、认证 Token、错误响应
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "";

/** 通用 API 错误 */
export class ApiError extends Error {
  status: number;
  code?: number;
  constructor(
    message: string,
    status: number,
    code?: number
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** 获取存储的 JWT Token（客户端环境） */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("costudy_token");
}

/** 统一请求封装 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { message?: string }).message ||
      `请求失败 (${res.status})`;
    throw new ApiError(message, res.status, (data as { code?: number }).code);
  }
  return data as T;
}

/** 标准响应包装 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

/** 分页响应 */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number>) => {
    const qs = params
      ? `?${new URLSearchParams(
          Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
            acc[k] = String(v);
            return acc;
          }, {})
        ).toString()}`
      : "";
    return request<T>(`${path}${qs}`);
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** 流式请求（SSE），用于 AI 对话 / OCR 结构化 */
export async function streamRequest(
  path: string,
  body: unknown,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new ApiError(`流式请求失败 (${res.status})`, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    // 解析 SSE 格式: data: {...}\n\n
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6);
        if (payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload);
          onChunk(parsed.content || payload);
        } catch {
          onChunk(payload);
        }
      }
    }
  }
}
/**
 * 客户端 JWT Token 管理
 */

const TOKEN_KEY = "costudy_token";
const REFRESH_KEY = "costudy_refresh_token";
const USER_KEY = "costudy_user";

/** 保存登录凭据 */
export function setAuth(
  token: string,
  refreshToken: string | null,
  user: unknown
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** 获取访问 Token */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** 获取刷新 Token */
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

/** 获取缓存的用户信息 */
export function getCachedUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 清除登录凭据 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

/** 是否已登录 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}
"use client";

/**
 * 认证 Context + Provider + useAuth Hook
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api } from "@/lib/api";
import { clearAuth, getCachedUser, setAuth } from "@/lib/auth";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (account: string, password: string) => Promise<User>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    display_name?: string;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // 初始化：从 localStorage 恢复，并校验 Token
  useEffect(() => {
    const cached = getCachedUser<User>();
    if (cached) {
      setState({ user: cached, loading: false, error: null });
      // 后台静默校验 (可选)
      api
        .get<User>("/api/v1/auth/me")
        .then((u) => setState({ user: u, loading: false, error: null }))
        .catch(() => {
          // Token 无效，清除
          clearAuth();
          setState({ user: null, loading: false, error: null });
        });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = useCallback(async (account: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.post<TokenResponse>("/api/v1/auth/login", {
        account,
        password,
      });
      setAuth(res.access_token, res.refresh_token, res.user);
      setState({ user: res.user, loading: false, error: null });
      return res.user;
    } catch (err) {
      const message = err instanceof Error ? err.message : "登录失败";
      setState({ user: null, loading: false, error: message });
      throw err;
    }
  }, []);

  const register = useCallback(
    async (data: {
      username: string;
      email: string;
      password: string;
      display_name?: string;
    }) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await api.post<TokenResponse>("/api/v1/auth/register", data);
        setAuth(res.access_token, res.refresh_token, res.user);
        setState({ user: res.user, loading: false, error: null });
        return res.user;
      } catch (err) {
        const message = err instanceof Error ? err.message : "注册失败";
        setState({ user: null, loading: false, error: message });
        throw err;
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearAuth();
    setState({ user: null, loading: false, error: null });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.get<User>("/api/v1/auth/me");
      setState({ user: u, loading: false, error: null });
    } catch {
      clearAuth();
      setState({ user: null, loading: false, error: null });
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, register, logout, refreshUser }),
    [state, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth 必须在 AuthProvider 内使用");
  }
  return ctx;
}
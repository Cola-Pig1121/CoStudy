"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";

/**
 * 全局 Providers 组合
 */
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
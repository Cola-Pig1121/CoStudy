"use client";

import { Sidebar } from "./sidebar";
import { TopHeader } from "./top-header";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * 全局布局壳：左侧 Sidebar (240px) + 右侧 (TopHeader + Content)。
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Sidebar />
      <div className="pl-[240px]">
        <TopHeader />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}

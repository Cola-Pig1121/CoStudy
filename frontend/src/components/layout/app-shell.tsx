"use client";

import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { TopHeader } from "./top-header";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { width, isMobile } = useSidebar();

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      <Sidebar />
      <div className="transition-all duration-300" style={{ paddingLeft: isMobile ? 0 : width }}>
        <TopHeader />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellInner>{children}</AppShellInner>
    </SidebarProvider>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  width: number;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: true,
  setCollapsed: () => {},
  width: 68,
  mobileOpen: false,
  setMobileOpen: () => {},
  isMobile: false,
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 移动端关闭 sidebar
  const setMobileOpenSafe = useCallback((v: boolean) => {
    setMobileOpen(v);
    if (!v) document.body.style.overflow = "";
    else document.body.style.overflow = "hidden";
  }, []);

  const width = collapsed ? 68 : 240;

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, width, mobileOpen, setMobileOpen: setMobileOpenSafe, isMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

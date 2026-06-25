"use client";

import { createContext, useContext, useState } from "react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  width: number;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: true,
  setCollapsed: () => {},
  width: 68,
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const width = collapsed ? 68 : 240;

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, width }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}

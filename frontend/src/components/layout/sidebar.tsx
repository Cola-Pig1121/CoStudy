"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Pencil,
  Settings,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "./sidebar-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "首页", href: "/", icon: Home, disabled: false },
  { label: "发现", href: "/discover", icon: Compass, disabled: true },
  { label: "学习", href: "/learn", icon: GraduationCap, disabled: true },
  { label: "知识树", href: "/tree", icon: Layers, disabled: false },
  { label: "创作", href: "/workspace/mindmap", icon: Pencil, disabled: false },
  { label: "AI 助手", href: "/ai", icon: Sparkles, disabled: true },
];

const BOTTOM_ITEMS = [
  { label: "设置", href: "/dashboard", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen, isMobile } = useSidebar();

  const collapsedWidth = collapsed ? "w-[68px]" : "w-[240px]";

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  return (
    <>
      {/* 移动端暗色遮罩 */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 bottom-0 bg-white border-r border-gray-100 flex flex-col z-50 transition-all duration-300",
          collapsedWidth,
          isMobile && !mobileOpen && "-translate-x-full"
        )}
      >
        {/* Logo + 折叠按钮 */}
        <div className="h-16 flex items-center border-b border-gray-100 shrink-0 px-3 gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#4a9d9a] flex items-center justify-center shrink-0">
            <BookOpen className="h-4.5 w-4.5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-gray-800 tracking-tight whitespace-nowrap">
              CoStudy
            </span>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors shrink-0",
              collapsed && "ml-0 mt-1"
            )}
            title={collapsed ? "展开导航" : "收起导航"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* 主导航 */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              if (item.disabled) {
                return (
                  <div key={item.href}
                    className={cn("flex items-center gap-3 rounded-xl text-sm text-gray-300 cursor-not-allowed",
                      collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5"
                    )} title={collapsed ? item.label : undefined}>
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <><span>{item.label}</span>
                    <span className="ml-auto text-[10px] text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded">即将</span></>}
                  </div>
                );
              }

              return (
                <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                  onClick={handleNavClick}
                  className={cn("flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                    collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                    active ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  )}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 底部 */}
        <div className="border-t border-gray-100 p-2 shrink-0">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={handleNavClick}
                title={collapsed ? item.label : undefined}
                className={cn("flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
                  collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                  active ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                )}>
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          <div className={cn("flex items-center gap-3 mt-1 rounded-xl bg-gray-50",
            collapsed ? "px-2 py-2 justify-center" : "px-3 py-2.5"
          )}>
            <div className="h-8 w-8 rounded-full bg-[#4a9d9a]/20 flex items-center justify-center text-sm font-medium text-[#4a9d9a] shrink-0">
              {user?.display_name?.[0] ?? user?.username?.[0] ?? "U"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{user?.display_name ?? user?.username ?? "用户"}</div>
                  <div className="text-xs text-gray-400 truncate">{user?.role === "admin" ? "管理员" : user?.role === "teacher" ? "教师" : "学生"}</div>
                </div>
                <button onClick={() => logout()}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-[#c17767] hover:bg-[#c17767]/10 transition-colors"
                  title="退出登录">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

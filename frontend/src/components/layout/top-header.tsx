"use client";

import { Bell, MessageCircle, Search, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function TopHeader() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-8 gap-6 shrink-0">
      {/* 居中搜索框 */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索教材、资源、笔记..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#e8b86d] focus:ring-2 focus:ring-[#e8b86d]/20 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* 右侧工具区 */}
      <div className="flex items-center gap-2 shrink-0">
        {/* 通知 */}
        <button className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#c17767] ring-2 ring-white" />
        </button>

        {/* 消息 */}
        <button className="relative p-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors">
          <MessageCircle className="h-5 w-5" />
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* 用户头像 */}
        <button className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="h-8 w-8 rounded-full bg-[#4a9d9a]/20 flex items-center justify-center text-sm font-medium text-[#4a9d9a]">
            {user?.display_name?.[0] ?? user?.username?.[0] ?? "U"}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">
            {user?.display_name ?? user?.username ?? "用户"}
          </span>
        </button>
      </div>
    </header>
  );
}

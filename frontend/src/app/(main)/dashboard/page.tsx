"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  FileEdit,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { USER_ROLES } from "@/lib/constants";

const studentNav = [
  { icon: Bookmark, label: "我的收藏", href: "/dashboard/favorites" },
  { icon: FileEdit, label: "我的创作", href: "/workspace/creatures" },
  { icon: FileEdit, label: "错题本", href: "/dashboard/errors" },
  { icon: History, label: "测试历史", href: "/dashboard/history" },
];

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#faf8f5]">
        <div className="text-gray-400 text-sm">加载中...</div>
      </div>
    );
  }

  const roleLabel = USER_ROLES[user.role as keyof typeof USER_ROLES] ?? user.role;

  return (
    <div className="min-h-full bg-[#faf8f5]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* 用户信息卡 */}
        <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] p-8 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4a9d9a] to-[#6b8e8e] flex items-center justify-center text-white text-2xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">
                {user.display_name || user.username}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-gray-400">@{user.username}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#4a9d9a]/10 text-[#4a9d9a] text-xs font-medium">
                  {user.role === "admin" ? (
                    <Shield className="h-3 w-3" />
                  ) : (
                    <LayoutDashboard className="h-3 w-3" />
                  )}
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{user.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#c17767] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </div>

        {/* 快速导航 */}
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          我的空间
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {studentNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-white border border-gray-100 p-6 hover:border-[#4a9d9a]/30 hover:shadow-lg transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#4a9d9a]/10 group-hover:bg-[#4a9d9a] flex items-center justify-center transition-colors">
                <item.icon className="h-6 w-6 text-[#4a9d9a] group-hover:text-white transition-colors" />
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-800">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* 教师/管理员入口 */}
        {(user.role === "teacher" || user.role === "admin") && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              管理功能
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/dashboard/admin"
                className="group flex items-center gap-4 rounded-2xl bg-white border border-gray-100 p-6 hover:border-[#e8b86d]/40 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#e8b86d]/10 group-hover:bg-[#e8b86d] flex items-center justify-center transition-colors">
                  <Shield className="h-6 w-6 text-[#e8b86d] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">内容审核</div>
                  <div className="text-xs text-gray-400">
                    {user.role === "teacher" ? "本科目审核" : "跨科目审核"}
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard/textbooks"
                className="group flex items-center gap-4 rounded-2xl bg-white border border-gray-100 p-6 hover:border-[#4a9d9a]/40 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4a9d9a]/10 group-hover:bg-[#4a9d9a] flex items-center justify-center transition-colors">
                  <Layers className="h-6 w-6 text-[#4a9d9a] group-hover:text-white transition-colors" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">教材管理</div>
                  <div className="text-xs text-gray-400">编辑知识树 + 上传课本图片</div>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

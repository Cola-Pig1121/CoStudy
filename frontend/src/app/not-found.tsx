"use client";

import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#faf8f5] px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl font-bold text-[#4a9d9a]/20 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">页面不存在</h1>
        <p className="text-gray-500 mb-8">
          你访问的页面可能已被移动、删除，或者地址输入有误。
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors text-sm font-medium"
          >
            <Home className="h-4 w-4" />
            返回首页
          </Link>
          <Link
            href="/tree"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <Search className="h-4 w-4" />
            浏览知识树
          </Link>
        </div>
      </div>
    </div>
  );
}

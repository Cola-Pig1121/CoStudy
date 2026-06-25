"use client";

import Link from "next/link";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex items-center justify-center bg-[#faf8f5] px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#c17767]/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-[#c17767]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">系统错误</h1>
          <p className="text-gray-500 mb-2">
            应用遇到了严重错误，无法正常加载。
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => reset()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors text-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              重试
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Home className="h-4 w-4" />
              返回首页
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

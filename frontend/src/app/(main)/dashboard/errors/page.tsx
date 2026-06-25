"use client";

import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

export default function ErrorsPage() {
  return (
    <div className="min-h-full bg-[#faf8f5]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" />返回
        </Link>
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Construction className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-600 mb-1">错题本</h2>
          <p className="text-sm text-gray-400">收集测试中的错题，集中复习</p>
          <p className="text-xs text-gray-300 mt-4">功能开发中，敬请期待</p>
        </div>
      </div>
    </div>
  );
}

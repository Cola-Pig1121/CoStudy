"use client";

import { Construction } from "lucide-react";

export default function NoteConvertPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-gray-400">
      <Construction className="h-12 w-12 mb-4 opacity-50" />
      <h2 className="text-lg font-medium text-gray-600 mb-1">笔记转换功能即将上线</h2>
      <p className="text-sm">上传手写笔记照片 → AI 识别 → 输出结构化 Markdown</p>
    </div>
  );
}

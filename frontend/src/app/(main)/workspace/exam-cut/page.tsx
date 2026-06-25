"use client";

import { Construction } from "lucide-react";

export default function ExamCutPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] text-gray-400">
      <Construction className="h-12 w-12 mb-4 opacity-50" />
      <h2 className="text-lg font-medium text-gray-600 mb-1">试卷框选功能即将上线</h2>
      <p className="text-sm">上传试卷图片 → 框选题目 → OCR 识别 → AI 结构化</p>
    </div>
  );
}

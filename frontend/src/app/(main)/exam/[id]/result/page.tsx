"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Trophy } from "lucide-react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Question {
  id: number;
  type: string;
  stem: string;
  options: string[];
  answer: string | null;
}

export default function ExamResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paperId = params.id;
  const attemptId = searchParams.get("attempt");
  const score = Number(searchParams.get("score") ?? 0);
  const total = Number(searchParams.get("total") ?? 0);

  return (
    <div className="p-8 max-w-[700px] mx-auto">
      <Link href="/exam" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] mb-6">
        <ArrowLeft className="h-4 w-4" />返回试卷库
      </Link>

      {/* 成绩卡 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center mb-6">
        <Trophy className="h-12 w-12 text-[#e8b86d] mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-800 mb-1">测试完成</h2>
        <div className="text-5xl font-bold my-4">
          <span className={score / total >= 0.6 ? "text-[#4a9d9a]" : "text-[#c17767]"}>{score}</span>
          <span className="text-lg text-gray-400"> / {total}</span>
        </div>
        <p className="text-sm text-gray-400">
          {score / total >= 0.8 ? "优秀！继续保持" : score / total >= 0.6 ? "及格，还有提升空间" : "需要加强复习"}
        </p>
      </div>

      {/* 答题卡概览 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-800 mb-4">答题卡</h3>
        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: Math.ceil(total / 10) }).map((_, i) => (
            <div key={i} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500">
              {i + 1}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">详细批改结果将在教师审核后显示</p>
      </div>
    </div>
  );
}

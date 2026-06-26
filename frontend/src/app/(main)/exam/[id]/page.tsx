"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Play,
  Send,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Question {
  id: number;
  type: string;
  stem: string;
  options: string[];
  answer: string | null;
  difficulty: number;
}

interface Paper {
  id: number;
  title: string;
  total_questions: number;
  time_limit_minutes: number;
}

interface Attempt {
  attempt_id: number;
  paper: Paper;
  questions: Question[];
  total_score: number;
}

export default function ExamTestPage() {
  const params = useParams();
  const paperId = Number(params.id);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  // 倒计时
  useEffect(() => {
    if (!attempt) return;
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt]);

  const startTest = async () => {
    setStarting(true);
    try {
      const data = await api.post<Attempt>(`/api/v1/exams/papers/${paperId}/start`, {});
      setAttempt(data);
      setRemaining((data.paper?.time_limit_minutes ?? 120) * 60);
    } catch (e: any) {
      alert(e?.detail ?? "开始测试失败");
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const result = await api.post<{ score: number; total_score: number }>(
        `/api/v1/exams/attempts/${attempt.attempt_id}/submit`, { answers }
      );
      router.push(`/exam/${paperId}/result?attempt=${attempt.attempt_id}&score=${result.score}&total=${result.total_score}`);
    } catch (e: any) {
      alert(e?.detail ?? "提交失败");
      setSubmitting(false);
    }
  }, [attempt, answers, paperId, submitting]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  if (loading || !user) return <div className="flex items-center justify-center h-[calc(100vh-64px)]"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;

  // 开始测试界面
  if (!attempt) {
    return (
      <div className="p-8 max-w-[600px] mx-auto">
        <Link href="/exam" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] mb-6"><ArrowLeft className="h-4 w-4" />返回试卷库</Link>
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <FileText className="h-12 w-12 text-[#e8b86d] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">准备开始测试</h2>
          <p className="text-sm text-gray-400 mb-6">试卷 ID: {paperId}</p>
          <button onClick={startTest} disabled={starting}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50 transition-colors">
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {starting ? "加载中..." : "开始测试"}
          </button>
        </div>
      </div>
    );
  }

  const questions = attempt.questions;
  const q = questions[currentQ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#faf8f5]">
      {/* 顶栏 */}
      <div className="bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (confirm("确定离开？当前进度将丢失")) router.push("/exam"); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-sm font-bold text-gray-800">{attempt.paper?.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn("flex items-center gap-1.5 text-sm font-mono",
            remaining < 300 ? "text-[#c17767]" : "text-gray-600")}>
            <Clock className="h-4 w-4" />
            {formatTime(remaining)}
          </div>
          <span className="text-xs text-gray-400">{currentQ + 1}/{questions.length}</span>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50">
            <Send className="h-4 w-4" />交卷</button>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-8 py-8">
        {q && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-bold text-[#4a9d9a]">第 {currentQ + 1} 题</span>
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-gray-100 text-gray-500">{q.type}</span>
              <span className="text-[11px] text-gray-400">难度 {q.difficulty}/5</span>
            </div>

            <div className="prose prose-sm prose-gray max-w-none mb-6">
              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.stem}</Markdown>
            </div>

            {/* 选项 (选择题) */}
            {q.type === "选择题" && q.options.length > 0 && (
              <div className="space-y-2 mb-6">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => setAnswers((prev) => ({ ...prev, [String(q.id)]: opt }))}
                    className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                      answers[String(q.id)] === opt
                        ? "border-[#4a9d9a] bg-[#4a9d9a]/5 text-[#4a9d9a] font-medium"
                        : "border-gray-200 hover:border-gray-300 text-gray-700")}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* 填空题 / 解答题 */}
            {q.type !== "选择题" && (
              <textarea
                value={answers[String(q.id)] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [String(q.id)]: e.target.value }))}
                placeholder={q.type === "填空题" ? "填写答案..." : "写出你的解答过程..."}
                className={cn("w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none resize-none",
                  q.type === "解答题" ? "h-40" : "h-20", "focus:border-[#4a9d9a]")}
              />
            )}

            {/* 导航 */}
            <div className="flex justify-between mt-6">
              <button onClick={() => setCurrentQ((v) => Math.max(0, v - 1))} disabled={currentQ === 0}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30">
                上一题</button>
              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ((v) => v + 1)}
                  className="px-4 py-2 text-sm rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90">
                  下一题</button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-4 py-2 text-sm rounded-xl bg-[#e8b86d] text-white hover:bg-[#e8b86d]/90 disabled:opacity-50">
                  <CheckCircle className="h-4 w-4 inline mr-1" />提交交卷</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

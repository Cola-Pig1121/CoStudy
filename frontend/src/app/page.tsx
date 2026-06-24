"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  FileText,
  PenTool,
  PlayCircle,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { APP_NAME, APP_TAGLINE, NAV_ITEMS } from "@/lib/constants";

interface HealthCheck {
  status: string;
  service: string;
  version: string;
  checks: {
    database: string;
    redis: string;
    storage: string;
  };
}

const features = [
  {
    icon: BookOpen,
    title: "教材知识树",
    desc: "树状结构管理科目、教材、单元、章节",
    color: "bg-[#4a9d9a]",
  },
  {
    icon: PenTool,
    title: "创作工作台",
    desc: "Excalidraw 思维导图 + 富文本笔记创作",
    color: "bg-[#e8b86d]",
  },
  {
    icon: FileText,
    title: "试卷库",
    desc: "OCR 识别 + AI 结构化 + 在线测试",
    color: "bg-[#c17767]",
  },
  {
    icon: PlayCircle,
    title: "微课视频",
    desc: "教师上传视频，HLS 流媒体播放",
    color: "bg-[#6b8e8e]",
  },
  {
    icon: Brain,
    title: "AI 助手",
    desc: "费曼学习 + RAG 知识问答",
    color: "bg-[#4a9d9a]",
  },
  {
    icon: Users,
    title: "共享社区",
    desc: "收藏排行、首页推荐、教师审核",
    color: "bg-[#e8b86d]",
  },
];

export default function Home() {
  const [health, setHealth] = useState<HealthCheck | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/health`)
      .then((r) => r.json())
      .then((d) => setHealth(d as HealthCheck))
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="min-h-full bg-[#faf8f5]">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#4a9d9a]/10 px-4 py-1.5 text-sm text-[#4a9d9a] mb-6">
          <Sparkles className="h-4 w-4" />
          <span>AI 驱动的校园知识共享平台</span>
        </div>
        <h1 className="text-5xl font-bold text-gray-800 mb-4">{APP_NAME}</h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">{APP_TAGLINE}</p>

        {/* 健康检查 */}
        <div className="inline-flex items-center gap-4 rounded-2xl bg-white shadow-xl shadow-black/[0.04] px-6 py-3">
          {health ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-[#4a9d9a]" />
              <span className="text-sm text-gray-600">
                后端 {health.version} · DB {health.checks.database === "ok" ? "✅" : "⚠️"} · Redis{" "}
                {health.checks.redis === "ok" ? "✅" : "⚠️"}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400">后端服务未连接（启动后端后刷新）</span>
          )}
        </div>
      </section>

      {/* 功能网格 */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                <f.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 导航 */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          快速入口
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-center justify-between rounded-xl bg-white border border-gray-100 px-4 py-3 hover:border-[#4a9d9a]/30 hover:shadow-lg transition-all"
            >
              <span className="text-sm font-medium text-gray-700 group-hover:text-[#4a9d9a] transition-colors">
                {item.label}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-[#4a9d9a] transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
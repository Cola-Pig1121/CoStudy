"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Flame,
  Heart,
  Layers,
  Loader2,
  PenTool,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/utils";
import type { SharedResource } from "@/types";

// ── 推荐资源横向卡片 ──

function RecommendedCard({ resource }: { resource: SharedResource }) {
  const typeConfig = {
    excalidraw: {
      label: "思维导图",
      color: "bg-[#4a9d9a]/10 text-[#4a9d9a]",
      icon: Layers,
    },
    markdown: {
      label: "知识笔记",
      color: "bg-[#e8b86d]/10 text-[#e8b86d]",
      icon: FileText,
    },
  } as const;
  const cfg = typeConfig[resource.type as keyof typeof typeConfig] ?? typeConfig.markdown;
  const Icon = cfg.icon;

  return (
    <Link
      href={`/tree`}
      className="group flex-shrink-0 w-[280px] bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:shadow-black/[0.06] hover:border-[#4a9d9a]/20 transition-all duration-300"
    >
      {/* 类型标签 */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.color}`}>
          <Icon className="h-3.5 w-3.5" />
          {cfg.label}
        </span>
        <span className="text-[11px] text-gray-400">
          {timeAgo(resource.created_at)}
        </span>
      </div>

      {/* 标题 */}
      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-3 group-hover:text-[#4a9d9a] transition-colors">
        {resource.title}
      </h3>

      {/* 底部统计 */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3 w-3" />
          {formatCount(resource.favorites_count)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {formatCount(resource.view_count)} 阅读
        </span>
      </div>
    </Link>
  );
}

// ── 排行榜项 ──

function LeaderboardItem({
  rank,
  resource,
}: {
  rank: number;
  resource: SharedResource;
}) {
  const rankColors = ["text-[#e8b86d]", "text-gray-400", "text-[#c17767]"];
  const rankBg = [
    "bg-[#e8b86d]/10",
    "bg-gray-100",
    "bg-[#c17767]/10",
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
      {/* 排名 */}
      <div
        className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
          rank <= 3
            ? `${rankBg[rank - 1]} ${rankColors[rank - 1]}`
            : "bg-gray-50 text-gray-500"
        }`}
      >
        {rank <= 3 ? (
          rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"
        ) : (
          rank
        )}
      </div>

      {/* 资源信息 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate group-hover:text-[#4a9d9a] transition-colors">
          {resource.title}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {resource.type === "excalidraw" ? "思维导图" : "知识笔记"}
        </div>
      </div>

      {/* 收藏数 */}
      <div className="flex items-center gap-1 text-sm font-semibold text-[#c17767] shrink-0">
        <Heart className="h-3.5 w-3.5 fill-current" />
        {resource.favorites_count}
      </div>
    </div>
  );
}

// ── 最新贡献卡片 ──

function ContributionCard({ resource }: { resource: SharedResource }) {
  const typeConfig = {
    excalidraw: { label: "思维导图", color: "text-[#4a9d9a]", bg: "bg-[#4a9d9a]/10" },
    markdown: { label: "知识笔记", color: "text-[#e8b86d]", bg: "bg-[#e8b86d]/10" },
  } as const;
  const cfg = typeConfig[resource.type as keyof typeof typeConfig] ?? typeConfig.markdown;

  return (
    <Link
      href="/tree"
      className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-black/[0.04] hover:border-[#4a9d9a]/20 transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
        <span className="text-[11px] text-gray-400">
          {timeAgo(resource.created_at)}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-3">
        {resource.title}
      </h3>
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Heart className="h-3 w-3" />
          {formatCount(resource.favorites_count)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {formatCount(resource.view_count)}
        </span>
      </div>
    </Link>
  );
}

// ── 主页面 ──

export default function HomePage() {
  const [recommended, setRecommended] = useState<SharedResource[]>([]);
  const [leadership, setLeadership] = useState<SharedResource[]>([]);
  const [latest, setLatest] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rec, lead, list] = await Promise.allSettled([
          api.get<SharedResource[]>("/api/v1/resources/recommended?limit=8"),
          api.get<SharedResource[]>("/api/v1/resources/leadership?limit=10"),
          api.get<{ items: SharedResource[] }>("/api/v1/resources?status=1&page_size=6"),
        ]);

        if (rec.status === "fulfilled") setRecommended(rec.value);
        if (lead.status === "fulfilled") setLeadership(lead.value);
        if (list.status === "fulfilled") setLatest(list.value.items ?? []);
      } catch {
        // 静默失败
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" />
      </div>
    );
  }

  const hasRecommendations = recommended.length > 0;
  const hasLeaderboard = leadership.length > 0;
  const hasLatest = latest.length > 0;

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      {/* ── 上层: 推荐资源 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#e8b86d]/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[#e8b86d]" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">推荐资源</h2>
          </div>
          <Link
            href="/tree"
            className="flex items-center gap-1 text-sm text-[#4a9d9a] hover:underline"
          >
            查看全部 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {hasRecommendations ? (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {recommended.map((r) => (
              <RecommendedCard key={r.id} resource={r} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
            <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">暂无推荐资源</p>
            <Link
              href="/workspace/mindmap"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-[#4a9d9a] hover:underline"
            >
              <PenTool className="h-3.5 w-3.5" />
              去创作第一份资源
            </Link>
          </div>
        )}
      </section>

      {/* ── 下层: 双栏 (贡献内容 + 排行榜) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* 左侧: 最新贡献 */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#4a9d9a]/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-[#4a9d9a]" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">最新贡献</h2>
            </div>
          </div>

          {hasLatest ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {latest.map((r) => (
                <ContributionCard key={r.id} resource={r} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">暂无共享资源</p>
              <p className="text-xs text-gray-300 mt-1">
                成为第一个分享知识的人
              </p>
            </div>
          )}
        </section>

        {/* 右侧: 排行榜 */}
        <section className="bg-white rounded-2xl border border-gray-100 p-5 h-fit lg:sticky lg:top-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#c17767]/10 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-[#c17767]" />
            </div>
            <h2 className="text-base font-bold text-gray-800">收藏排行榜</h2>
          </div>

          {hasLeaderboard ? (
            <div className="space-y-0.5">
              {leadership.map((r, i) => (
                <LeaderboardItem key={r.id} rank={i + 1} resource={r} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">暂无排行数据</p>
            </div>
          )}

          {/* 快速入口 */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link
              href="/tree"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#4a9d9a]/5 text-[#4a9d9a] text-sm font-medium hover:bg-[#4a9d9a]/10 transition-colors"
            >
              <Flame className="h-4 w-4" />
              浏览知识树
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

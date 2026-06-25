"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Edit3,
  FileText,
  Heart,
  Layers,
  Loader2,
  Send,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/utils";
import type { SharedResource } from "@/types";

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "草稿", color: "bg-gray-100 text-gray-500" },
  1: { label: "已通过", color: "bg-[#4a9d9a]/10 text-[#4a9d9a]" },
  2: { label: "已驳回", color: "bg-[#c17767]/10 text-[#c17767]" },
};

const TYPE_MAP: Record<string, { label: string; color: string; icon: typeof Layers }> = {
  excalidraw: { label: "思维导图", color: "text-[#4a9d9a]", icon: Layers },
  markdown: { label: "知识笔记", color: "text-[#e8b86d]", icon: FileText },
};

export default function DraftsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [resources, setResources] = useState<(SharedResource & { reject_reason?: string })[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [statusFilter, setStatusFilter] = useState<number | "all">("all");

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingData(true);
    const params = new URLSearchParams({ mine: "true", page_size: "50" });
    if (statusFilter !== "all") params.set("status", String(statusFilter));
    api.get<{ items: (SharedResource & { reject_reason?: string })[]; total: number }>(`/api/v1/resources?${params}`)
      .then((data) => { setResources((data.items ?? []) as any[]); setTotal(data.total ?? 0); })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [user, statusFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此资源？")) return;
    try {
      await api.delete(`/api/v1/resources/${id}`);
      setResources((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => prev - 1);
    } catch (e: any) { alert(e?.detail ?? "删除失败"); }
  };

  const handleSubmit = async (id: number) => {
    try {
      await api.post(`/api/v1/resources/${id}/submit`, {});
      setResources((prev) => prev.map((r) => r.id === id ? { ...r, status: 0 } : r));
    } catch (e: any) { alert(e?.detail ?? "提交失败"); }
  };

  if (loading || !user) {
    return <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;
  }

  const tabs = [
    { key: "all", label: "全部", count: total },
    { key: 0, label: "草稿", count: resources.filter((r) => r.status === 0).length },
    { key: 1, label: "已通过", count: resources.filter((r) => r.status === 1).length },
    { key: 2, label: "已驳回", count: resources.filter((r) => r.status === 2).length },
  ] as const;

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">我的创作</h1>
          <p className="text-sm text-gray-400 mt-1">管理你的思维导图和知识笔记</p>
        </div>
        <div className="flex gap-2">
          <Link href="/workspace/mindmap"
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">
            <Layers className="h-4 w-4" />新建导图</Link>
          <Link href="/workspace/notes"
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#e8b86d] text-white hover:bg-[#e8b86d]/90 transition-colors">
            <FileText className="h-4 w-4" />新建笔记</Link>
        </div>
      </div>

      {/* 状态标签页 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 列表 */}
      {loadingData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" />
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">还没有创作内容</p>
          <Link href="/workspace/mindmap"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">
            开始创作 <ArrowRight className="h-4 w-4" /></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => {
            const typeInfo = TYPE_MAP[r.type] ?? TYPE_MAP.markdown;
            const statusInfo = STATUS_MAP[r.status] ?? STATUS_MAP[0];
            const TypeIcon = typeInfo.icon;
            return (
              <div key={r.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-black/[0.04] transition-all group cursor-pointer"
                onClick={() => router.push(`/workspace/drafts/${r.id}`)}>
                <div className="flex items-start gap-4">
                  {/* 类型图标 */}
                  <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0`}>
                    <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-800 truncate">{r.title}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{typeInfo.label}</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3" />{formatCount(r.favorites_count)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3" />{formatCount(r.view_count)}
                      </span>
                      <span>{timeAgo(r.created_at)}</span>
                    </div>
                    {r.reject_reason && (
                      <div className="mt-2 text-xs text-[#c17767] bg-[#c17767]/5 rounded-lg px-3 py-1.5">
                        驳回原因：{r.reject_reason}
                      </div>
                    )}
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    {r.status === 0 && (
                      <button onClick={() => handleSubmit(r.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-[#4a9d9a]/10 text-[#4a9d9a] hover:bg-[#4a9d9a]/20 transition-colors">
                        <Send className="h-3 w-3" />提交审核
                      </button>
                    )}
                    {r.status === 2 && (
                      <button onClick={() => handleSubmit(r.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-[#e8b86d]/10 text-[#e8b86d] hover:bg-[#e8b86d]/20 transition-colors">
                        <Send className="h-3 w-3" />重新提交
                      </button>
                    )}
                    <button onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-[#c17767] hover:bg-[#c17767]/10 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

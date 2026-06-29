"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";

interface Resource {
  id: number;
  title: string;
  type: string;
  textbook_id: number | null;
  user_id: number;
  status: number;
  created_at: string;
}

interface ReviewLog {
  id: number;
  resource_id: number;
  reviewer_id: number;
  action: string;
  reason: string | null;
  created_at: string;
  resource_title: string | null;
  reviewer_name: string | null;
}

const STATUS_TABS = [
  { key: 0, label: "待审核", color: "text-[#e8b86d]" },
  { key: 1, label: "已通过", color: "text-[#4a9d9a]" },
  { key: 2, label: "已驳回", color: "text-[#c17767]" },
  { key: -1, label: "审核日志", color: "text-gray-500" },
];

export default function AdminReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [resources, setResources] = useState<Resource[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actioning, setActioning] = useState<number | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      if (tab === -1) {
        const data = await api.get<{ items: ReviewLog[] }>("/api/v1/review/logs");
        setLogs(data.items ?? []);
      } else {
        const data = await api.get<{ items: Resource[] }>("/api/v1/review/pending");
        // Filter by tab on client side
        setResources(data.items ?? []);
      }
    } catch {} finally { setLoadingData(false); }
  }, [tab]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleApprove = async (id: number) => {
    setActioning(id);
    try {
      await api.post(`/api/v1/review/${id}/approve`, {});
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) { alert(e?.detail ?? "审核失败"); }
    finally { setActioning(null); }
  };

  const handleReject = async (id: number) => {
    if (!rejectReason.trim()) return;
    setActioning(id);
    try {
      await api.post(`/api/v1/review/${id}/reject`, { reason: rejectReason.trim() });
      setResources((prev) => prev.filter((r) => r.id !== id));
      setRejectId(null); setRejectReason("");
    } catch (e: any) { alert(e?.detail ?? "驳回失败"); }
    finally { setActioning(null); }
  };

  if (loading || !user) return <div className="flex items-center justify-center h-[calc(100vh-64px)]"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;

  const filteredResources = tab === -1 ? [] : resources.filter((r) => r.status === tab);

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a]">
          <ArrowLeft className="h-4 w-4" />返回
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">内容审核</h1>
      </div>

      {/* 标签页 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
              tab === t.key ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t.label}
          </button>
        ))}
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>
      ) : tab === -1 ? (
        /* 审核日志 */
        logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">暂无审核记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-5 py-3 flex items-center gap-4">
                <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                  log.action === "approved" ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "bg-[#c17767]/10 text-[#c17767]")}>
                  {log.action === "approved" ? "通过" : "驳回"}
                </span>
                <span className="text-sm text-gray-700 truncate flex-1">{log.resource_title ?? `资源 #${log.resource_id}`}</span>
                {log.reason && <span className="text-xs text-gray-400 truncate max-w-[200px]">{log.reason}</span>}
                <span className="text-xs text-gray-400 shrink-0">{timeAgo(log.created_at)}</span>
              </div>
            ))}
          </div>
        )
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Check className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">暂无待审核内容</p>
        </div>
      ) : (
        /* 资源列表 */
        <div className="space-y-3">
          {filteredResources.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  r.type === "excalidraw" ? "bg-[#4a9d9a]/10" : "bg-[#e8b86d]/10")}>
                  {r.type === "excalidraw" ? <Layers className="h-5 w-5 text-[#4a9d9a]" /> : <FileText className="h-5 w-5 text-[#e8b86d]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-800 truncate">{r.title}</h3>
                  <div className="text-xs text-gray-400 mt-1">ID: {r.id} · {timeAgo(r.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tab === 0 && (
                    <>
                      <button onClick={() => handleApprove(r.id)} disabled={actioning === r.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50">
                        {actioning === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3" />}
                        通过
                      </button>
                      <button onClick={() => setRejectId(r.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[#c17767]/30 text-[#c17767] hover:bg-[#c17767]/5">
                        <ThumbsDown className="h-3 w-3" />驳回
                      </button>
                    </>
                  )}
                </div>
              </div>
              {/* 驳回原因输入 */}
              {rejectId === r.id && (
                <div className="mt-3 flex items-center gap-2">
                  <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="驳回原因..." autoFocus
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[#c17767]/30 outline-none focus:border-[#c17767]" />
                  <button onClick={() => handleReject(r.id)} disabled={!rejectReason.trim() || actioning === r.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[#c17767] text-white disabled:opacity-50">
                    确认驳回</button>
                  <button onClick={() => { setRejectId(null); setRejectReason(""); }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  FileText,
  Loader2,
  Play,
  Plus,
  Timer,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Paper {
  id: number;
  title: string;
  status: number;
  total_questions: number;
  time_limit_minutes: number;
  created_at: string;
}

export default function ExamListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ items: Paper[]; total: number }>("/api/v1/exams/papers")
      .then((d) => setPapers(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [user]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const paper = await api.post<{ id: number }>("/api/v1/exams/papers", { title: newTitle.trim(), time_limit_minutes: 120 });
      setNewTitle("");
      setShowCreate(false);
      router.push(`/exam/${paper.id}`);
    } catch (e: any) {
      alert(e?.detail ?? "创建失败");
    } finally {
      setCreating(false);
    }
  };

  if (loading || !user) return <div className="flex items-center justify-center h-[calc(100vh-64px)]"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">试卷库</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">
          <Plus className="h-4 w-4" />创建试卷</button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 flex items-center gap-3">
          <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            placeholder="试卷标题..." autoFocus
            className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-200 outline-none focus:border-[#4a9d9a]"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
          <button onClick={handleCreate} disabled={creating || !newTitle.trim()}
            className="px-4 py-2 text-sm rounded-xl bg-[#4a9d9a] text-white disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "创建"}</button>
        </div>
      )}

      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>
      ) : papers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-4">暂无试卷</p>
          <button onClick={() => setShowCreate(true)} className="text-sm text-[#4a9d9a] hover:underline">创建第一份试卷</button>
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map((p) => (
            <Link key={p.id} href={`/exam/${p.id}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-[#4a9d9a]/20 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-[#e8b86d]/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-[#e8b86d]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#4a9d9a] transition-colors">{p.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{p.total_questions} 题</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.time_limit_minutes} 分钟</span>
                </div>
              </div>
              <span className={cn("px-2.5 py-1 rounded-lg text-xs font-medium",
                p.status === 1 ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "bg-gray-100 text-gray-500")}>
                {p.status === 1 ? "已发布" : "编辑中"}
              </span>
              <Play className="h-4 w-4 text-gray-300 group-hover:text-[#4a9d9a] transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

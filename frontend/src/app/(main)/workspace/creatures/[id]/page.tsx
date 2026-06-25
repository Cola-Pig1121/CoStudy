"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import type { TextbookNode, SharedResource } from "@/types";
import type { ExcalidrawAPI } from "@/components/workspace/excalidraw-editor";
import { TipTapEditor } from "@/components/workspace/tiptap-editor";

const ExcalidrawWrapper = dynamic(
  () => import("@/components/workspace/excalidraw-editor").then((m) => m.ExcalidrawEditor),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-[#4a9d9a]" />
    </div>
  ) }
);

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "草稿", color: "bg-gray-100 text-gray-500" },
  1: { label: "已通过", color: "bg-[#4a9d9a]/10 text-[#4a9d9a]" },
  2: { label: "已驳回", color: "bg-[#c17767]/10 text-[#c17767]" },
};

export default function DraftDetailPage() {
  const params = useParams();
  const resourceId = Number(params.id);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [resource, setResource] = useState<(SharedResource & { content?: string; reject_reason?: string }) | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [textbookId, setTextbookId] = useState<number | null>(null);
  const [textbooks, setTextbooks] = useState<TextbookNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const excalidrawAPIRef = useRef<ExcalidrawAPI | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  useEffect(() => {
    if (!user || !resourceId) return;
    api.get<SharedResource & { content?: string; reject_reason?: string }>(`/api/v1/resources/${resourceId}`)
      .then((data) => {
        setResource(data);
        setTitle(data.title);
        // markdown content from backend is HTML
        setContent(data.content ?? "<p></p>");
        setTextbookId(data.textbook_id ?? null);
      })
      .catch(() => router.replace("/workspace/creatures"));
  }, [user, resourceId, router]);

  useEffect(() => {
    if (!user) return;
    api.get<TextbookNode[]>("/api/v1/textbooks/tree").then(setTextbooks).catch(() => {});
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      let finalContent = content;
      if (resource?.type === "excalidraw" && excalidrawAPIRef.current) {
        const elements = excalidrawAPIRef.current.getSceneElements();
        finalContent = JSON.stringify({ elements, appState: { viewBackgroundColor: "#ffffff" } });
      }
      await api.put(`/api/v1/resources/${resourceId}`, {
        title: title.trim(),
        content: finalContent,
        textbook_id: textbookId,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }, [title, content, textbookId, resourceId, resource]);

  const handleSubmitReview = useCallback(async () => {
    await handleSave();
    try {
      await api.post(`/api/v1/resources/${resourceId}/submit`, {});
      setResource((prev) => prev ? { ...prev, status: 0 } : prev);
    } catch (e: any) {
      alert(e?.detail ?? "提交失败");
    }
  }, [handleSave, resourceId]);

  const flatNodes = textbooks.flatMap(function flatten(n: TextbookNode): TextbookNode[] {
    return [n, ...(n.children?.flatMap(flatten) ?? [])];
  });

  if (loading || !user || !resource) {
    return <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;
  }

  const statusInfo = STATUS_MAP[resource.status] ?? STATUS_MAP[0];
  const isExcalidraw = resource.type === "excalidraw";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 工具栏 */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <Link href="/workspace/creatures" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          className="flex-1 text-lg font-medium text-gray-800 placeholder:text-gray-300 bg-transparent border-none outline-none" />
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>

        <div className="relative">
          <button onClick={() => setShowTree((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:border-[#4a9d9a]/40 transition-colors">
            <BookOpen className="h-4 w-4 text-[#4a9d9a]" />
            {textbookId ? flatNodes.find((n) => n.id === textbookId)?.name ?? "已选择" : "挂载到教材"}
          </button>
          {showTree && (
            <div className="absolute top-full right-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2">
              {textbookId && (
                <button onClick={() => { setTextbookId(null); setShowTree(false); }}
                  className="w-full text-left px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg">清除选择</button>
              )}
              {flatNodes.map((n) => (
                <button key={n.id} onClick={() => { setTextbookId(n.id); setShowTree(false); }}
                  className={`w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-[#4a9d9a]/10 transition-colors ${
                    textbookId === n.id ? "bg-[#4a9d9a]/10 text-[#4a9d9a] font-medium" : "text-gray-700"
                  }`} style={{ paddingLeft: `${12 + n.level * 16}px` }}>
                  {n.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-[#4a9d9a] flex items-center gap-1"><Sparkles className="h-3 w-3" /> 已保存</span>
          )}
          <button onClick={() => handleSave()} disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
            <Save className="h-4 w-4" />{saving ? "保存中..." : "保存"}</button>
          <button onClick={handleSubmitReview} disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50 transition-colors">
            <Send className="h-4 w-4" />提交审核</button>
        </div>
      </div>

      {/* 驳回原因 */}
      {resource.reject_reason && (
        <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-[#c17767]/5 border border-[#c17767]/20 text-sm text-[#c17767] shrink-0">
          驳回原因：{resource.reject_reason}
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 min-h-0">
        {isExcalidraw ? (
          <ExcalidrawWrapper onAPIReady={(api) => {
            excalidrawAPIRef.current = api;
            if (content) {
              try {
                const data = JSON.parse(content);
                if (data.elements) api.updateScene({ elements: data.elements });
              } catch {}
            }
          }} />
        ) : (
          <TipTapEditor content={content} onChange={setContent} placeholder="开始编辑笔记..." />
        )}
      </div>
    </div>
  );
}

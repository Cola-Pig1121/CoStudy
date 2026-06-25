"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TextbookNode } from "@/types";
import { TipTapEditor } from "@/components/workspace/tiptap-editor";

export default function NotesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [textbookId, setTextbookId] = useState<number | null>(null);
  const [textbooks, setTextbooks] = useState<TextbookNode[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTree, setShowTree] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<TextbookNode[]>("/api/v1/textbooks/tree").then(setTextbooks).catch(() => {});
  }, [user]);

  const handleSave = useCallback(async (asDraft = true) => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const resource = await api.post<{ id: number }>("/api/v1/resources", {
        title: title.trim(),
        type: "markdown",
        textbook_id: textbookId,
        content,
      });
      if (!asDraft) {
        await api.post(`/api/v1/resources/${resource.id}/submit`, {});
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  }, [title, content, textbookId]);

  const flatNodes = textbooks.flatMap(function flatten(n: TextbookNode): TextbookNode[] {
    return [n, ...(n.children?.flatMap(flatten) ?? [])];
  });

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* 工具栏 */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-100 shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="笔记标题..."
          className="flex-1 text-lg font-medium text-gray-800 placeholder:text-gray-300 bg-transparent border-none outline-none"
        />

        {/* 教材节点选择 */}
        <div className="relative">
          <button
            onClick={() => setShowTree((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:border-[#e8b86d]/40 transition-colors"
          >
            <BookOpen className="h-4 w-4 text-[#e8b86d]" />
            {textbookId
              ? flatNodes.find((n) => n.id === textbookId)?.name ?? "已选择"
              : "挂载到教材"}
          </button>
          {showTree && (
            <div className="absolute top-full right-0 mt-1 w-72 max-h-80 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-2">
              <div className="text-xs text-gray-400 px-2 py-1 mb-1">选择教材节点</div>
              {textbookId && (
                <button
                  onClick={() => { setTextbookId(null); setShowTree(false); }}
                  className="w-full text-left px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 rounded-lg"
                >
                  清除选择
                </button>
              )}
              {flatNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setTextbookId(n.id); setShowTree(false); }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-[#e8b86d]/10 transition-colors",
                    textbookId === n.id ? "bg-[#e8b86d]/10 text-[#e8b86d] font-medium" : "text-gray-700"
                  )}
                  style={{ paddingLeft: `${12 + n.level * 16}px` }}
                >
                  {n.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-[#e8b86d] flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> 已保存
            </span>
          )}
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存草稿"}
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#e8b86d] text-white hover:bg-[#e8b86d]/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
            提交审核
          </button>
        </div>
      </div>

      {/* TipTap 编辑器 */}
      <div className="flex-1 min-h-0">
        <TipTapEditor content={content} onChange={setContent} placeholder="开始编写笔记..." />
      </div>
    </div>
  );
}

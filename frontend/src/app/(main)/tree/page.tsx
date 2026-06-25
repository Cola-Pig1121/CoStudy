"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ImageOff,
  Layers,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { TextbookTree } from "@/components/tree/textbook-tree";
import type { TextbookNode } from "@/types";

const LEVEL_LABELS: Record<number, string> = {
  0: "科目",
  1: "教材",
  2: "单元",
  3: "章节",
};

export default function TreePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tree, setTree] = useState<TextbookNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 未登录重定向
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // 加载教材树
  useEffect(() => {
    if (!user) return;
    setLoadingTree(true);
    api
      .get<TextbookNode[]>("/api/v1/textbooks/tree")
      .then((data) => {
        setTree(data);
        // 默认选中第一个根科目
        if (data.length > 0 && selectedId === null) {
          setSelectedId(data[0].id);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoadingTree(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 扁平化查找选中节点（用于右侧详情）
  const selectedNode = useMemo(() => {
    if (selectedId === null) return null;
    const found: TextbookNode | undefined = undefined;
    const search = (nodes: TextbookNode[]): TextbookNode | undefined => {
      for (const n of nodes) {
        if (n.id === selectedId) return n;
        if (n.children) {
          const r = search(n.children);
          if (r) return r;
        }
      }
      return found;
    };
    return search(tree) ?? null;
  }, [tree, selectedId]);

  if (loading || !user) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#faf8f5]">
        <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#faf8f5]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
          </div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <BookOpen className="h-5 w-5 text-[#4a9d9a]" />
            教材知识树
          </h1>
        </div>

        {/* 双栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* 左侧树导航 */}
          <aside className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] p-4 h-fit lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <div className="flex items-center gap-2 px-2 pb-3 mb-2 border-b border-gray-100">
              <Layers className="h-4 w-4 text-[#4a9d9a]" />
              <span className="text-sm font-medium text-gray-600">知识结构</span>
            </div>
            {loadingTree ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-[#4a9d9a]" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-sm text-[#c17767]">{error}</div>
            ) : (
              <TextbookTree
                nodes={tree}
                selectedId={selectedId}
                onSelect={(n) => setSelectedId(n.id)}
              />
            )}
          </aside>

          {/* 右侧内容区 */}
          <main className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] p-8 min-h-[400px]">
            {selectedNode ? (
              <div className="space-y-6">
                {/* 面包屑 + 标题 */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#4a9d9a]/10 text-[#4a9d9a] font-medium">
                      {LEVEL_LABELS[selectedNode.level] ?? "节点"}
                    </span>
                    <ChevronRight className="h-3 w-3" />
                    <span>{selectedNode.name}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedNode.name}
                  </h2>
                  {selectedNode.description && (
                    <p className="text-sm text-gray-500 mt-2">
                      {selectedNode.description}
                    </p>
                  )}
                </div>

                {/* 课本图片轮播区 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                    课本图片
                  </h3>
                  {selectedNode.image_urls && selectedNode.image_urls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedNode.image_urls.map((url, i) => (
                        <div
                          key={i}
                          className="aspect-[3/4] rounded-xl bg-gray-100 overflow-hidden border border-gray-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`${selectedNode.name} - ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                      <ImageOff className="h-8 w-8 text-gray-300 mb-2" />
                      <span className="text-sm text-gray-400">暂无课本图片</span>
                    </div>
                  )}
                </div>

                {/* 本章共享资源（占位，阶段3接入） */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                      本章共享资源
                    </h3>
                    <Link
                      href="/workspace/mindmap"
                      className="text-xs text-[#4a9d9a] hover:underline"
                    >
                      去创作 →
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-gradient-to-br from-[#4a9d9a]/5 to-[#e8b86d]/5 border border-[#4a9d9a]/10 p-6">
                    <Sparkles className="h-6 w-6 text-[#e8b86d] shrink-0" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        资源共享功能即将上线
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        届时可在此查看该章节下的思维导图、笔记与微课视频
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  "flex flex-col items-center justify-center h-64 text-gray-400"
                )}
              >
                <BookOpen className="h-10 w-10 mb-3 opacity-40" />
                <span className="text-sm">从左侧选择一个节点查看详情</span>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TextbookNode } from "@/types";

const LEVEL_LABELS = ["科目", "教材", "单元", "章节"];
const LEVEL_COLORS = ["#4a9d9a", "#e8b86d", "#6b8e8e", "#c17767"];
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function flatten(nodes: TextbookNode[]): TextbookNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flatten(n.children) : [])]);
}

function TreeNode({
  node, selectedId, onSelect, onAddChild, onDelete, depth = 0,
}: {
  node: TextbookNode; selectedId: number | null;
  onSelect: (n: TextbookNode) => void;
  onAddChild: (parentId: number, level: number) => void;
  onDelete: (id: number) => void; depth?: number;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(true);
  const isSelected = selectedId === node.id;
  const color = LEVEL_COLORS[node.level] ?? "#6b8e8e";

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors text-sm",
          isSelected ? "bg-gray-100 font-medium" : "hover:bg-gray-50"
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            className="p-0.5 rounded hover:bg-gray-200">
            <ChevronRight className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", open && "rotate-90")} />
          </button>
        ) : <span className="w-[18px]" />}
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="flex-1 truncate">{node.name}</span>
        {node.level < 3 && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onAddChild(node.id, node.level + 1); }}
            className="p-0.5 rounded text-gray-300 hover:text-[#4a9d9a] hover:bg-[#4a9d9a]/10 opacity-0 group-hover:opacity-100 transition-opacity" title="添加子节点">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
          className="p-0.5 rounded text-gray-300 hover:text-[#c17767] hover:bg-[#c17767]/10 opacity-0 group-hover:opacity-100 transition-opacity" title="删除">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {hasChildren && open && node.children!.map((child) => (
        <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect}
          onAddChild={onAddChild} onDelete={onDelete} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function TextbooksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tree, setTree] = useState<TextbookNode[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingTree, setLoadingTree] = useState(true);
  const [showAddRoot, setShowAddRoot] = useState(false);
  const [newRootName, setNewRootName] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  const flatNodes = flatten(tree);
  const selectedNode = flatNodes.find((n) => n.id === selectedId) ?? null;

  const loadTree = useCallback(() => {
    api.get<TextbookNode[]>("/api/v1/textbooks/tree")
      .then(setTree).catch(() => {}).finally(() => setLoadingTree(false));
  }, []);

  useEffect(() => { if (user) loadTree(); }, [user, loadTree]);

  const handleAddRoot = async () => {
    if (!newRootName.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/v1/textbooks", {
        name: newRootName.trim(), level: 0,
        sort_order: flatNodes.filter((n) => n.level === 0).length,
      });
      setNewRootName(""); setShowAddRoot(false); loadTree();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleAddChild = async (parentId: number, level: number) => {
    const name = prompt(`输入${LEVEL_LABELS[level]}名称：`);
    if (!name?.trim()) return;
    try {
      await api.post("/api/v1/textbooks", {
        name: name.trim(), level, parent_id: parentId,
        sort_order: flatNodes.filter((n) => n.parent_id === parentId).length,
      });
      loadTree();
    } catch (e: any) { alert(e?.detail ?? "创建失败"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此节点？子节点将一并删除。")) return;
    try {
      await api.delete(`/api/v1/textbooks/${id}`);
      if (selectedId === id) setSelectedId(null);
      loadTree();
    } catch (e: any) { alert(e?.detail ?? "删除失败"); }
  };

  const handleSaveEdit = async () => {
    if (!selectedNode) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/textbooks/${selectedNode.id}`, {
        name: editName.trim() || undefined,
        description: editDesc || undefined,
      });
      loadTree();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleUpload = async (file: File) => {
    if (!selectedNode) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const token = localStorage.getItem("costudy_token");
      const resp = await fetch(`${API_BASE}/api/v1/textbooks/${selectedNode.id}/images`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.detail ?? "上传失败"); }
      loadTree();
    } catch (e: any) { alert(e?.message ?? "上传失败"); } finally { setUploading(false); }
  };

  const handleRemoveImage = async (url: string) => {
    if (!selectedNode) return;
    const newUrls = (selectedNode.image_urls ?? []).filter((u) => u !== url);
    setSaving(true);
    try {
      await api.put(`/api/v1/textbooks/${selectedNode.id}`, { image_urls: newUrls } as any);
      loadTree();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  if (loading || !user) {
    return <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] transition-colors">
          <ArrowLeft className="h-4 w-4" />返回
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">教材知识树管理</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* 左侧: 树 */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">知识结构</h2>
            <button onClick={() => setShowAddRoot(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">
              <Plus className="h-4 w-4" />添加学科
            </button>
          </div>
          {showAddRoot && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-[#4a9d9a]/5 rounded-xl">
              <input type="text" value={newRootName} onChange={(e) => setNewRootName(e.target.value)}
                placeholder="输入学科名称..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]"
                autoFocus onKeyDown={(e) => e.key === "Enter" && handleAddRoot()} />
              <button onClick={handleAddRoot} disabled={saving || !newRootName.trim()}
                className="px-3 py-1.5 text-sm rounded-lg bg-[#4a9d9a] text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "添加"}</button>
              <button onClick={() => { setShowAddRoot(false); setNewRootName(""); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" /></button>
            </div>
          )}
          {loadingTree ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#4a9d9a]" /></div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">暂无教材数据，点击"添加学科"开始构建</div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto border border-gray-100 rounded-xl p-2">
              {tree.map((node) => (
                <TreeNode key={node.id} node={node} selectedId={selectedId}
                  onSelect={(n) => { setSelectedId(n.id); setEditName(n.name); setEditDesc(n.description ?? ""); }}
                  onAddChild={handleAddChild} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </section>

        {/* 右侧: 编辑 + 图片 */}
        <div className="space-y-6">
          {selectedNode ? (
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-md text-xs font-medium text-white"
                  style={{ backgroundColor: LEVEL_COLORS[selectedNode.level] }}>{LEVEL_LABELS[selectedNode.level]}</span>
                <h3 className="text-base font-bold text-gray-800">编辑节点</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">名称</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">描述</label>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a] resize-none" placeholder="可选描述..." />
                </div>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50">
                  <Save className="h-4 w-4" />{saving ? "保存中..." : "保存修改"}</button>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
              从左侧选择一个节点进行编辑</section>
          )}

          {selectedNode && (
            <section className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-800">课本图片</h3>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#e8b86d] text-white hover:bg-[#e8b86d]/90 disabled:opacity-50 transition-colors">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}上传图片</button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
              </div>
              {selectedNode.image_urls && selectedNode.image_urls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {selectedNode.image_urls.map((url, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-100 aspect-[3/4]">
                      <img src={url.startsWith("http") ? url : `${API_BASE}${url}`}
                        alt={`${selectedNode!.name} - ${i + 1}`} className="w-full h-full object-cover" />
                      <button onClick={() => handleRemoveImage(url)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                  <ImagePlus className="h-8 w-8 text-gray-300 mb-2" />
                  <span className="text-sm text-gray-400">暂无课本图片</span>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

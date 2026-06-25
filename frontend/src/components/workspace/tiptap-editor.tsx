"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Quote,
  Redo,
  Sparkles,
  Undo,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ── 工具按钮 ── */
function Btn({
  onClick, active, disabled, children, title,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean;
  children: React.ReactNode; title?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        active ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
        disabled && "opacity-30 cursor-not-allowed"
      )}>
      {children}
    </button>
  );
}

/* ── AI 润色弹窗 ── */
function AIPolishMenu({ editor, onClose }: { editor: any; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (mode: string) => {
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to);
    if (!text.trim()) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const token = localStorage.getItem("costudy_token");
      const resp = await fetch(`${API_BASE}/api/v1/ai/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, mode }),
      });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.detail ?? "AI 服务异常"); }
      const data = await resp.json();
      setResult(data.result);
    } catch (e: any) { setError(e?.message ?? "请求失败"); }
    finally { setLoading(false); }
  };

  const apply = () => {
    if (!result) return;
    const { from, to } = editor.state.selection;
    editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
    onClose();
  };

  const modes = [
    { key: "polish", label: "润色", desc: "优化表达" },
    { key: "simplify", label: "简化", desc: "通俗易懂" },
    { key: "expand", label: "扩展", desc: "补充细节" },
    { key: "translate", label: "翻译", desc: "译为英文" },
  ];

  return (
    <div className="absolute top-full left-0 mt-2 w-[360px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#e8b86d]" />
          <span className="text-sm font-medium text-gray-700">AI 智能助手</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">关闭</button>
      </div>

      {/* 模式选择 */}
      <div className="flex gap-1.5 px-4 py-3">
        {modes.map((m) => (
          <button key={m.key} onClick={() => run(m.key)} disabled={loading}
            className="flex-1 py-2 rounded-xl border border-gray-200 hover:border-[#e8b86d]/40 hover:bg-[#e8b86d]/5 transition-colors disabled:opacity-50">
            <div className="text-sm font-medium text-gray-700">{m.label}</div>
            <div className="text-[10px] text-gray-400">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* 结果区 */}
      <div className="px-4 pb-4">
        {loading && (
          <div className="flex items-center justify-center py-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#e8b86d]" />AI 正在处理...
          </div>
        )}
        {error && <div className="text-sm text-[#c17767] bg-[#c17767]/5 rounded-xl px-3 py-2">{error}</div>}
        {result && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
              {result}
            </div>
            <button onClick={apply}
              className="w-full py-2 text-sm rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">
              应用替换
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 主编辑器组件 ── */
interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  const [showAI, setShowAI] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "开始编写笔记…" }),
      Image.configure({ inline: true, allowBase64: true }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-gray max-w-none focus:outline-none min-h-[400px] px-10 py-8 leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 顶部固定工具栏 */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-100 shrink-0 flex-wrap">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="加粗">
          <Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="斜体">
          <Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="行内代码">
          <Code className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="标题 1">
          <Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="标题 2">
          <Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="标题 3">
          <Heading3 className="h-4 w-4" /></Btn>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="无序列表">
          <List className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="有序列表">
          <ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="引用">
          <Quote className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线">
          <Minus className="h-4 w-4" /></Btn>
        <Btn onClick={() => { const url = prompt("输入图片 URL："); if (url) editor.chain().focus().setImage({ src: url }).run(); }} title="插入图片">
          <ImagePlus className="h-4 w-4" /></Btn>
        <div className="flex-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销">
          <Undo className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做">
          <Redo className="h-4 w-4" /></Btn>
      </div>

      {/* BubbleMenu: 选中文本时弹出 */}
      <BubbleMenu editor={editor}
        shouldShow={({ from, to }) => from !== to}
        options={{ placement: "top", offset: 8 }}>
        <div className="flex items-center gap-0.5 bg-white rounded-xl shadow-lg shadow-black/10 border border-gray-100 p-1">
          <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="加粗">
            <Bold className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="斜体">
            <Italic className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="代码">
            <Code className="h-4 w-4" /></Btn>
          <div className="w-px h-5 bg-gray-200 mx-0.5" />
          <div className="relative">
            <button type="button" onClick={() => setShowAI((v) => !v)}
              className={cn("flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors",
                showAI ? "bg-[#e8b86d]/10 text-[#e8b86d]" : "text-[#e8b86d] hover:bg-[#e8b86d]/10")}>
              <Sparkles className="h-3.5 w-3.5" />AI 助手</button>
            {showAI && <AIPolishMenu editor={editor} onClose={() => setShowAI(false)} />}
          </div>
        </div>
      </BubbleMenu>

      {/* FloatingMenu: 空行时弹出 */}
      <FloatingMenu editor={editor}
        shouldShow={({ editor }) => editor.isActive("paragraph") && editor.getText().trim() === ""}
        options={{ placement: "right-start", offset: 4 }}>
        <div className="flex items-center gap-0.5 bg-white rounded-xl shadow-lg shadow-black/10 border border-gray-100 p-1">
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="标题 1">
            <Heading1 className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="标题 2">
            <Heading2 className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} title="无序列表">
            <List className="h-4 w-4" /></Btn>
          <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用">
            <Quote className="h-4 w-4" /></Btn>
        </div>
      </FloatingMenu>

      {/* 编辑区 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

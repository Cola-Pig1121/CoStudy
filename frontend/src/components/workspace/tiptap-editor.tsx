"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Mathematics, { migrateMathStrings } from "@tiptap/extension-mathematics";
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
  Sigma,
  Sparkles,
  Undo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

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

/* ── LaTeX 参考手册 ── */
const LATEX_CATEGORIES = [
  {
    label: "基础",
    items: [
      { label: "分数", insert: "\\frac{a}{b}", preview: "\\frac{a}{b}" },
      { label: "上标", insert: "x^{2}", preview: "x^{2}" },
      { label: "下标", insert: "x_{i}", preview: "x_{i}" },
      { label: "根号", insert: "\\sqrt{x}", preview: "\\sqrt{x}" },
      { label: "n次根", insert: "\\sqrt[n]{x}", preview: "\\sqrt[n]{x}" },
    ],
  },
  {
    label: "希腊字母",
    items: [
      { label: "α", insert: "\\alpha", preview: "\\alpha" },
      { label: "β", insert: "\\beta", preview: "\\beta" },
      { label: "γ", insert: "\\gamma", preview: "\\gamma" },
      { label: "δ", insert: "\\delta", preview: "\\delta" },
      { label: "θ", insert: "\\theta", preview: "\\theta" },
      { label: "λ", insert: "\\lambda", preview: "\\lambda" },
      { label: "π", insert: "\\pi", preview: "\\pi" },
      { label: "σ", insert: "\\sigma", preview: "\\sigma" },
      { label: "φ", insert: "\\phi", preview: "\\phi" },
      { label: "ω", insert: "\\omega", preview: "\\omega" },
    ],
  },
  {
    label: "运算符",
    items: [
      { label: "±", insert: "\\pm", preview: "\\pm" },
      { label: "×", insert: "\\times", preview: "\\times" },
      { label: "÷", insert: "\\div", preview: "\\div" },
      { label: "≠", insert: "\\neq", preview: "\\neq" },
      { label: "≤", insert: "\\leq", preview: "\\leq" },
      { label: "≥", insert: "\\geq", preview: "\\geq" },
      { label: "≈", insert: "\\approx", preview: "\\approx" },
      { label: "∞", insert: "\\infty", preview: "\\infty" },
      { label: "∑", insert: "\\sum_{i=1}^{n}", preview: "\\sum_{i=1}^{n}" },
      { label: "∏", insert: "\\prod_{i=1}^{n}", preview: "\\prod_{i=1}^{n}" },
      { label: "∫", insert: "\\int_{a}^{b}", preview: "\\int_{a}^{b}" },
      { label: "lim", insert: "\\lim_{x \\to \\infty}", preview: "\\lim_{x \\to \\infty}" },
    ],
  },
  {
    label: "函数",
    items: [
      { label: "sin", insert: "\\sin", preview: "\\sin" },
      { label: "cos", insert: "\\cos", preview: "\\cos" },
      { label: "log", insert: "\\log", preview: "\\log" },
      { label: "ln", insert: "\\ln", preview: "\\ln" },
      { label: "max", insert: "\\max", preview: "\\max" },
      { label: "min", insert: "\\min", preview: "\\min" },
    ],
  },
  {
    label: "矩阵",
    items: [
      { label: "2×2", insert: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", preview: "(a b; c d)" },
      { label: "行列式", insert: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", preview: "|a b; c d|" },
    ],
  },
  {
    label: "常用公式",
    items: [
      { label: "勾股定理", insert: "a^{2} + b^{2} = c^{2}", preview: "a²+b²=c²" },
      { label: "一元二次", insert: "x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}", preview: "x=(-b±√(b²-4ac))/2a" },
      { label: "欧拉公式", insert: "e^{i\\pi} + 1 = 0", preview: "e^iπ+1=0" },
      { label: "三角函数", insert: "\\sin^{2}\\theta + \\cos^{2}\\theta = 1", preview: "sin²θ+cos²θ=1" },
    ],
  },
];

function LaTeXPanel({ editor, onClose }: { editor: any; onClose: () => void }) {
  const [search, setSearch] = useState("");

  const insert = (latex: string) => {
    editor.chain().focus().insertInlineMath({ latex }).run();
    onClose();
  };

  const filtered = LATEX_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !search || item.label.includes(search) || item.insert.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div className="absolute top-full left-0 mt-2 w-[420px] max-h-[500px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <Sigma className="h-4 w-4 text-[#e8b86d]" />
          <span className="text-sm font-medium text-gray-700">LaTeX 公式参考</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">关闭</button>
      </div>
      <div className="px-4 py-2 border-b border-gray-100 shrink-0">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索公式..." autoFocus
          className="w-full px-3 py-1.5 text-sm rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-[#e8b86d]" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {filtered.map((cat) => (
          <div key={cat.label}>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">{cat.label}</div>
            <div className="grid grid-cols-2 gap-1">
              {cat.items.map((item) => (
                <button key={item.label}
                  onClick={() => insert(item.insert)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm hover:bg-[#e8b86d]/5 hover:border-[#e8b86d]/30 border border-transparent transition-colors text-left">
                  <span className="text-gray-700 text-xs font-medium truncate">{item.label}</span>
                  <span className="text-[11px] text-gray-400 font-mono truncate ml-auto">{item.insert.slice(0, 20)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
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
      <div className="flex gap-1.5 px-4 py-3">
        {modes.map((m) => (
          <button key={m.key} onClick={() => run(m.key)} disabled={loading}
            className="flex-1 py-2 rounded-xl border border-gray-200 hover:border-[#e8b86d]/40 hover:bg-[#e8b86d]/5 transition-colors disabled:opacity-50">
            <div className="text-sm font-medium text-gray-700">{m.label}</div>
            <div className="text-[10px] text-gray-400">{m.desc}</div>
          </button>
        ))}
      </div>
      <div className="px-4 pb-4">
        {loading && (
          <div className="flex items-center justify-center py-6 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#e8b86d]" />AI 正在处理...
          </div>
        )}
        {error && <div className="text-sm text-[#c17767] bg-[#c17767]/5 rounded-xl px-3 py-2">{error}</div>}
        {result && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5 max-h-[200px] overflow-y-auto whitespace-pre-wrap">{result}</div>
            <button onClick={apply} className="w-full py-2 text-sm rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">应用替换</button>
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
  const [showLatex, setShowLatex] = useState(false);
  const [compositionTick, setCompositionTick] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "开始编写笔记…" }),
      Image.configure({ inline: true, allowBase64: true }),
      Mathematics.configure({
        katexOptions: {
          throwOnError: false,
          macros: { "\\R": "\\mathbb{R}", "\\N": "\\mathbb{N}" },
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "prose prose-gray max-w-none focus:outline-none min-h-[400px] px-10 py-8 leading-relaxed",
      },
      handleDOMEvents: {
        compositionend: () => {
          setCompositionTick((t) => t + 1);
          return false;
        },
      },
    },
    onCreate: ({ editor }) => {
      // 将已有 $...$ 文本迁移为 Math 节点
      migrateMathStrings(editor);
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
        <div className="w-px h-5 bg-gray-200 mx-1" />
        {/* LaTeX 公式按钮 */}
        <div className="relative">
          <Btn onClick={() => {
            const sel = editor.state.selection;
            if (sel.from !== sel.to) {
              const text = editor.state.doc.textBetween(sel.from, sel.to);
              editor.chain().focus().deleteRange(sel).insertInlineMath({ latex: text }).run();
            } else {
              editor.chain().focus().insertInlineMath({ latex: "\\cdot" }).run();
            }
          }} title="插入数学公式">
            <Sigma className="h-4 w-4" />
          </Btn>
        </div>
        <div className="relative">
          <Btn onClick={() => setShowLatex((v) => !v)} title="LaTeX 公式参考手册">
            <span className="text-xs font-mono">f(x)</span>
          </Btn>
          {showLatex && <LaTeXPanel editor={editor} onClose={() => setShowLatex(false)} />}
        </div>
        <div className="flex-1" />
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销">
          <Undo className="h-4 w-4" /></Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做">
          <Redo className="h-4 w-4" /></Btn>
      </div>

      {/* BubbleMenu: 选中文本时弹出 */}
      {editor && (
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
      )}

      {/* 编辑区 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

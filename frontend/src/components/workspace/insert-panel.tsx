"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import katex from "katex";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toPng } from "html-to-image";
import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Image as ImageIcon,
  Loader2,
  Sigma,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── LaTeX 参考手册 ── */
const LATEX_REF = [
  { label: "基础", open: true, items: [
    { label: "分数", tex: "\\frac{a}{b}" }, { label: "上标", tex: "x^{2}" },
    { label: "下标", tex: "x_{i}" }, { label: "根号", tex: "\\sqrt{x}" },
    { label: "n次根", tex: "\\sqrt[n]{x}" }, { label: "绝对值", tex: "|x|" },
    { label: "上下限", tex: "\\lim_{x \\to 0}" },
  ]},
  { label: "希腊字母", open: false, items: [
    { label: "α", tex: "\\alpha" }, { label: "β", tex: "\\beta" },
    { label: "γ", tex: "\\gamma" }, { label: "δ", tex: "\\delta" },
    { label: "θ", tex: "\\theta" }, { label: "λ", tex: "\\lambda" },
    { label: "π", tex: "\\pi" }, { label: "σ", tex: "\\sigma" },
    { label: "φ", tex: "\\phi" }, { label: "ω", tex: "\\omega" },
    { label: "Δ", tex: "\\Delta" }, { label: "Σ", tex: "\\Sigma" },
  ]},
  { label: "运算符", open: false, items: [
    { label: "±", tex: "\\pm" }, { label: "×", tex: "\\times" },
    { label: "÷", tex: "\\div" }, { label: "≠", tex: "\\neq" },
    { label: "≤", tex: "\\leq" }, { label: "≥", tex: "\\geq" },
    { label: "≈", tex: "\\approx" }, { label: "∞", tex: "\\infty" },
    { label: "∈", tex: "\\in" }, { label: "⊂", tex: "\\subset" },
    { label: "∪", tex: "\\cup" }, { label: "∩", tex: "\\cap" },
  ]},
  { label: "求和/积分", open: false, items: [
    { label: "∑ 求和", tex: "\\sum_{i=1}^{n} a_i" },
    { label: "∏ 连乘", tex: "\\prod_{i=1}^{n} a_i" },
    { label: "∫ 积分", tex: "\\int_{a}^{b} f(x) dx" },
    { label: "lim 极限", tex: "\\lim_{x \\to \\infty} f(x)" },
  ]},
  { label: "矩阵", open: false, items: [
    { label: "括号矩阵", tex: "\\begin{pmatrix} a & b \\\\\\\\ c & d \\end{pmatrix}" },
    { label: "行列式", tex: "\\begin{vmatrix} a & b \\\\\\\\ c & d \\end{vmatrix}" },
  ]},
  { label: "常用公式", open: false, items: [
    { label: "勾股定理", tex: "a^{2} + b^{2} = c^{2}" },
    { label: "一元二次", tex: "x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}" },
    { label: "欧拉公式", tex: "e^{i\\pi} + 1 = 0" },
    { label: "三角恒等式", tex: "\\sin^{2}\\theta + \\cos^{2}\\theta = 1" },
  ]},
];

const MD_REF = [
  { label: "文本格式", open: true, items: [
    { label: "加粗", syntax: "**粗体文本**" }, { label: "斜体", syntax: "*斜体文本*" },
    { label: "行内代码", syntax: "`代码`" }, { label: "删除线", syntax: "~~删除~~" },
  ]},
  { label: "标题", open: false, items: [
    { label: "一级标题", syntax: "# 标题" }, { label: "二级标题", syntax: "## 标题" },
  ]},
  { label: "列表", open: false, items: [
    { label: "无序列表", syntax: "- 项目 1\n- 项目 2" },
    { label: "有序列表", syntax: "1. 步骤一\n2. 步骤二" },
  ]},
  { label: "公式", open: false, items: [
    { label: "行内公式", syntax: "$E = mc^2$" },
    { label: "块级公式", syntax: "$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$" },
  ]},
  { label: "其他", open: false, items: [
    { label: "引用", syntax: "> 引用内容" }, { label: "分割线", syntax: "---" },
    { label: "链接", syntax: "[文字](https://example.com)" },
  ]},
];

function RefSection({ section, onInsert }: { section: { label: string; open: boolean; items: { label: string; tex?: string; syntax?: string }[] }; onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(section.open);
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {section.label}
      </button>
      {open && (
        <div className="px-3 pb-2 grid grid-cols-2 gap-1">
          {section.items.map((item) => (
            <button key={item.label} onClick={() => onInsert(item.tex ?? item.syntax ?? "")}
              className="text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#e8b86d]/5 border border-transparent hover:border-[#e8b86d]/30 transition-colors">
              <div className="font-medium text-gray-700 truncate">{item.label}</div>
              <div className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{(item.tex ?? item.syntax ?? "").slice(0, 25)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface InsertPanelProps {
  onClose: () => void;
  /** Excalidraw API 引用，用于直接插入元素到画布 */
  excalidrawAPI?: any;
}

export function InsertPanel({ onClose, excalidrawAPI }: InsertPanelProps) {
  const [mode, setMode] = useState<"latex" | "markdown">("latex");
  const [input, setInput] = useState("");
  const [rendering, setRendering] = useState(false);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const copySource = async () => {
    if (!input.trim()) return;
    try {
      await navigator.clipboard.writeText(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = input;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /** 将 LaTeX 公式插入 Excalidraw 画布 */
  const insertToCanvas = () => {
    if (!input.trim() || !excalidrawAPI) return;
    try {
      const text = mode === "latex" ? `$${input}$` : input;
      const elements = excalidrawAPI.getSceneElements() ?? [];
      const appState = excalidrawAPI.getAppState();
      const centerX = appState.scrollX ? -appState.scrollX + 400 : 400;
      const centerY = appState.scrollY ? -appState.scrollY + 300 : 300;

      // 用 convertToExcalidrawElements 创建文本元素
      // 这个函数由 Excalidraw 官方提供，能正确设置公式渲染所需的属性
      const newElements = convertToExcalidrawElements([
        {
          type: "text",
          x: centerX,
          y: centerY,
          text,
          fontSize: mode === "latex" ? 24 : 16,
          strokeColor: "#1e1e1e",
          backgroundColor: "transparent",
          textAlign: "center",
        },
      ]);

      excalidrawAPI.updateScene({ elements: [...elements, ...newElements as any] });
      onClose();
    } catch (e) {
      console.error("Insert to canvas failed:", e);
    }
  };

  const renderToImage = useCallback(async () => {
    if (!input.trim()) return;
    setRendering(true);
    try {
      // 创建隔离 div
      const renderDiv = document.createElement("div");
      renderDiv.style.cssText = "position:fixed;left:-9999px;top:0;padding:20px 28px;background:white;border-radius:8px;display:inline-block;max-width:700px;font-family:'LXGW WenKai',sans-serif;font-size:20px;color:#1e1e1e;";
      document.body.appendChild(renderDiv);

      if (mode === "latex") {
        renderDiv.innerHTML = katex.renderToString(input, { throwOnError: false, displayMode: true });
      } else {
        const { createRoot } = await import("react-dom/client");
        const root = createRoot(renderDiv);
        root.render(
          <div style={{ background: "white", padding: "4px" }}>
            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{input}</Markdown>
          </div>
        );
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }

      // toPng with fontEmbedCSS to avoid canvas taint
      const dataUrl = await toPng(renderDiv, {
        pixelRatio: 2,
        backgroundColor: "white",
        fontEmbedCSS: "inline",
        cacheBust: true,
      });

      // 清理
      if (mode === "markdown") renderDiv.innerHTML = "";
      document.body.removeChild(renderDiv);

      // 复制到剪贴板 (HTTPS 下可用)
      const resp = await fetch(dataUrl);
      const blob = await resp.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);

      setCopied(true);
      setRenderedImageUrl(dataUrl);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      console.error("Render/copy failed:", e);
      // 如果 clipboard 不可用（HTTP），fallback 为显示图片
      if (e?.name === "NotAllowedError" || e?.message?.includes("clipboard")) {
        alert("请通过 HTTPS 访问以使用复制功能。\n当前可通过「渲染预览」查看后截图粘贴。");
      }
    } finally {
      setRendering(false);
    }
  }, [input, mode]);

  const refData = mode === "latex" ? LATEX_REF : MD_REF;

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[560px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 z-50 overflow-hidden flex max-h-[600px]">
      {/* 左侧: 参考手册 */}
      <div className="w-[200px] border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-[#e8b86d]" />
          <span className="text-xs font-medium text-gray-600">参考手册</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {refData.map((section, i) => (
            <RefSection key={i} section={section} onInsert={(text) => setInput((prev) => prev ? prev + "\n" + text : text)} />
          ))}
        </div>
      </div>

      {/* 右侧: 输入 + 渲染图片 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex gap-1">
            <button onClick={() => { setMode("latex"); setInput(""); setRenderedImageUrl(null); }}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors", mode === "latex" ? "bg-[#e8b86d]/10 text-[#e8b86d]" : "text-gray-500 hover:bg-gray-100")}>
              <Sigma className="h-3.5 w-3.5 inline mr-1" />LaTeX</button>
            <button onClick={() => { setMode("markdown"); setInput(""); setRenderedImageUrl(null); }}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors", mode === "markdown" ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "text-gray-500 hover:bg-gray-100")}>
              <Type className="h-3.5 w-3.5 inline mr-1" />Markdown</button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        {/* 输入 */}
        <div className="px-4 pt-3">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "latex" ? "输入 LaTeX 公式…" : "输入 Markdown 文本…"}
            className="w-full h-16 px-3 py-2 text-xs font-mono rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-[#e8b86d] resize-none" />
        </div>

        {/* 渲染结果 */}
        <div className="px-4 pt-2 flex-1 overflow-y-auto">
          {rendering && (
            <div className="flex items-center justify-center py-4 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#e8b86d]" />渲染中…
            </div>
          )}
          {renderedImageUrl && !rendering && (
            <div className="border-2 border-dashed border-[#4a9d9a]/30 rounded-xl p-3 bg-[#4a9d9a]/3">
              <div className="text-[11px] text-[#4a9d9a] font-medium mb-2 flex items-center gap-1.5">
                {copied ? "✅ 已复制到剪贴板，在 Excalidraw 中 Ctrl+V 粘贴" : "渲染完成 · 点击下方按钮复制"}
              </div>
              <img src={renderedImageUrl} alt="rendered" className="max-w-full rounded-lg bg-white border border-gray-200 shadow-sm" />
            </div>
          )}
          {renderedHtml && !rendering && !renderedImageUrl && (
            <div className="border border-gray-200 rounded-xl p-4 bg-white">
              <div ref={previewRef} dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-4 py-3 mt-auto border-t border-gray-100 space-y-2">
          {excalidrawAPI && (
            <button onClick={insertToCanvas} disabled={!input.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-xl font-medium bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50 transition-colors">
              <Sigma className="h-4 w-4" />
              插入到画布
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={copySource} disabled={!input.trim()}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-xl font-medium transition-colors border",
                copied ? "border-[#4a9d9a] bg-[#4a9d9a]/10 text-[#4a9d9a]" : "border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50")}>
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copied ? "已复制" : "复制源码"}
            </button>
            <button onClick={renderToImage} disabled={!input.trim() || rendering}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-xl font-medium transition-colors",
                rendering ? "bg-[#e8b86d]/20 text-[#e8b86d]" : "bg-[#e8b86d] text-white hover:bg-[#e8b86d]/90 disabled:opacity-50")}>
              {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {rendering ? "渲染中…" : "复制为图片"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

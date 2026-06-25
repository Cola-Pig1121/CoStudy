"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import katex from "katex";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toSvg } from "html-to-image";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
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

interface InsertPanelProps { onClose: () => void; }

export function InsertPanel({ onClose }: InsertPanelProps) {
  const [mode, setMode] = useState<"latex" | "markdown">("latex");
  const [input, setInput] = useState("");
  const [rendering, setRendering] = useState(false);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const renderToImage = useCallback(async () => {
    if (!input.trim()) return;
    setRendering(true);
    const t0 = performance.now();
    try {
      const renderDiv = document.createElement("div");
      renderDiv.style.cssText = "position:fixed;left:-9999px;top:0;padding:16px 24px;background:white;border-radius:8px;display:inline-block;max-width:700px;font-family:'LXGW WenKai',sans-serif;font-size:16px;color:#1f2937;";
      document.body.appendChild(renderDiv);

      if (mode === "latex") {
        // KaTeX 同步渲染，无需等待
        renderDiv.innerHTML = katex.renderToString(input, { throwOnError: false, displayMode: true });
      } else {
        const { createRoot } = await import("react-dom/client");
        const root = createRoot(renderDiv);
        root.render(
          <div style={{ background: "white", padding: "4px", borderRadius: "8px" }}>
            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{input}</Markdown>
          </div>
        );
        // 只等一帧让 React 提交 DOM
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }

      // toSvg（不用 canvas，无 CORS/taint 问题）
      const svgStr = await toSvg(renderDiv, { backgroundColor: "white", fontEmbedCSS: "inline" });

      // 清理
      if (mode === "markdown") renderDiv.innerHTML = "";
      document.body.removeChild(renderDiv);

      const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      setRenderedImageUrl(URL.createObjectURL(svgBlob));
      console.log(`Rendered in ${Math.round(performance.now() - t0)}ms`);
    } catch (e) {
      console.error("Render failed:", e);
      setRenderedImageUrl(null);
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

        {/* 渲染结果图片 */}
        <div className="px-4 pt-2 flex-1 overflow-y-auto">
          {renderedImageUrl && !rendering && (
            <div className="border-2 border-dashed border-[#4a9d9a]/30 rounded-xl p-3 bg-[#4a9d9a]/3">
              <div className="text-[11px] text-[#4a9d9a] font-medium mb-2 flex items-center gap-1.5">
                ✅ 右键下方图片 → 复制图片 → 粘贴到 Excalidraw
              </div>
              <img src={renderedImageUrl} alt="rendered" className="max-w-full rounded-lg bg-white border border-gray-200 shadow-sm" />
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-4 py-3 mt-auto border-t border-gray-100">
          <button onClick={renderToImage} disabled={!input.trim() || rendering}
            className={cn("w-full flex items-center justify-center gap-1.5 py-2.5 text-sm rounded-xl font-medium transition-colors",
              rendering ? "bg-[#e8b86d]/20 text-[#e8b86d]" : "bg-[#e8b86d] text-white hover:bg-[#e8b86d]/90 disabled:opacity-50")}>
            {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sigma className="h-4 w-4" />}
            {rendering ? "渲染中…" : renderedImageUrl ? "重新生成" : "生成图片"}
          </button>
        </div>
      </div>
    </div>
  );
}

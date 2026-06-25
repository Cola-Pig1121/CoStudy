"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import katex from "katex";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { toPng } from "html-to-image";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Sigma,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── LaTeX 参考手册数据 ── */
const LATEX_REF = [
  {
    label: "基础", open: true,
    items: [
      { label: "分数", tex: "\\frac{a}{b}" },
      { label: "上标", tex: "x^{2}" },
      { label: "下标", tex: "x_{i}" },
      { label: "根号", tex: "\\sqrt{x}" },
      { label: "n次根", tex: "\\sqrt[n]{x}" },
      { label: "绝对值", tex: "|x|" },
      { label: "上下限", tex: "\\lim_{x \\to 0}" },
    ],
  },
  {
    label: "希腊字母", open: false,
    items: [
      { label: "α", tex: "\\alpha" }, { label: "β", tex: "\\beta" },
      { label: "γ", tex: "\\gamma" }, { label: "δ", tex: "\\delta" },
      { label: "θ", tex: "\\theta" }, { label: "λ", tex: "\\lambda" },
      { label: "π", tex: "\\pi" }, { label: "σ", tex: "\\sigma" },
      { label: "φ", tex: "\\phi" }, { label: "ω", tex: "\\omega" },
      { label: "Δ", tex: "\\Delta" }, { label: "Σ", tex: "\\Sigma" },
    ],
  },
  {
    label: "运算符", open: false,
    items: [
      { label: "±", tex: "\\pm" }, { label: "×", tex: "\\times" },
      { label: "÷", tex: "\\div" }, { label: "≠", tex: "\\neq" },
      { label: "≤", tex: "\\leq" }, { label: "≥", tex: "\\geq" },
      { label: "≈", tex: "\\approx" }, { label: "∞", tex: "\\infty" },
      { label: "∈", tex: "\\in" }, { label: "⊂", tex: "\\subset" },
      { label: "∪", tex: "\\cup" }, { label: "∩", tex: "\\cap" },
    ],
  },
  {
    label: "求和/积分", open: false,
    items: [
      { label: "∑ 求和", tex: "\\sum_{i=1}^{n} a_i" },
      { label: "∏ 连乘", tex: "\\prod_{i=1}^{n} a_i" },
      { label: "∫ 积分", tex: "\\int_{a}^{b} f(x) dx" },
      { label: "∬ 二重积分", tex: "\\iint_D f(x,y) dxdy" },
      { label: "lim 极限", tex: "\\lim_{x \\to \\infty} f(x)" },
    ],
  },
  {
    label: "矩阵", open: false,
    items: [
      { label: "括号矩阵", tex: "\\begin{pmatrix} a & b \\\\\\\\ c & d \\end{pmatrix}" },
      { label: "方括矩阵", tex: "\\begin{bmatrix} a & b \\\\\\\\ c & d \\end{bmatrix}" },
      { label: "行列式", tex: "\\begin{vmatrix} a & b \\\\\\\\ c & d \\end{vmatrix}" },
      { label: "3×3 矩阵", tex: "\\begin{pmatrix} 1 & 0 & 0 \\\\\\\\ 0 & 1 & 0 \\\\\\\\ 0 & 0 & 1 \\end{pmatrix}" },
    ],
  },
  {
    label: "常用公式", open: false,
    items: [
      { label: "勾股定理", tex: "a^{2} + b^{2} = c^{2}" },
      { label: "一元二次求根", tex: "x = \\frac{-b \\pm \\sqrt{b^{2}-4ac}}{2a}" },
      { label: "欧拉公式", tex: "e^{i\\pi} + 1 = 0" },
      { label: "三角恒等式", tex: "\\sin^{2}\\theta + \\cos^{2}\\theta = 1" },
      { label: "二项式定理", tex: "(a+b)^{n} = \\sum_{k=0}^{n} \\binom{n}{k} a^{k} b^{n-k}" },
      { label: "等差数列求和", tex: "S_n = \\frac{n(a_1 + a_n)}{2}" },
      { label: "等比数列求和", tex: "S_n = \\frac{a_1(1-q^n)}{1-q}" },
      { label: "导数定义", tex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}" },
    ],
  },
];

/* ── Markdown 参考手册 ── */
const MD_REF = [
  {
    label: "文本格式", open: true,
    items: [
      { label: "加粗", syntax: "**粗体文本**" },
      { label: "斜体", syntax: "*斜体文本*" },
      { label: "行内代码", syntax: "`代码`" },
      { label: "删除线", syntax: "~~删除~~" },
    ],
  },
  {
    label: "标题", open: false,
    items: [
      { label: "一级标题", syntax: "# 标题" },
      { label: "二级标题", syntax: "## 标题" },
      { label: "三级标题", syntax: "### 标题" },
    ],
  },
  {
    label: "列表", open: false,
    items: [
      { label: "无序列表", syntax: "- 项目 1\n- 项目 2" },
      { label: "有序列表", syntax: "1. 步骤一\n2. 步骤二" },
      { label: "任务列表", syntax: "- [x] 已完成\n- [ ] 待办" },
    ],
  },
  {
    label: "公式", open: false,
    items: [
      { label: "行内公式", syntax: "$E = mc^2$" },
      { label: "块级公式", syntax: "$$\n\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\n$$" },
    ],
  },
  {
    label: "其他", open: false,
    items: [
      { label: "引用", syntax: "> 引用内容" },
      { label: "分割线", syntax: "---" },
      { label: "链接", syntax: "[文字](https://example.com)" },
      { label: "图片", syntax: "![alt](url)" },
    ],
  },
];

function RefSection({ section, onInsert }: { section: { label: string; open: boolean; items: { label: string; tex?: string; syntax?: string }[] }; onInsert: (text: string) => void }) {
  const [open, setOpen] = useState(section.open);
  return (
    <div className="border-b border-gray-50 last:border-0">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {section.label}
      </button>
      {open && (
        <div className="px-3 pb-2 grid grid-cols-2 gap-1">
          {section.items.map((item) => (
            <button key={item.label}
              onClick={() => onInsert(item.tex ?? item.syntax ?? "")}
              className="text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#e8b86d]/5 hover:border-[#e8b86d]/30 border border-transparent transition-colors">
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
  /** 如果提供，则直接插入到 Excalidraw 画布（跳过剪贴板） */
  excalidrawAPI?: any;
}

export function InsertPanel({ onClose, excalidrawAPI }: InsertPanelProps) {
  const [mode, setMode] = useState<"latex" | "markdown">("latex");
  const [input, setInput] = useState("");
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRef, setShowRef] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  const renderToClipboard = async () => {
    if (!input.trim()) return;
    setCopying(true);
    try {
      // 创建一个隔离的隐藏 div 来渲染（避免 Excalidraw canvas 干扰）
      const renderDiv = document.createElement("div");
      renderDiv.style.cssText = "position:fixed;left:-9999px;top:0;padding:24px;background:white;border-radius:8px;display:inline-block;max-width:700px;font-family:'LXGW WenKai',sans-serif;";
      document.body.appendChild(renderDiv);

      if (mode === "latex") {
        renderDiv.innerHTML = katex.renderToString(input, { throwOnError: false, displayMode: true });
        renderDiv.style.fontSize = "24px";
      } else {
        // Markdown: 用 react-markdown 渲染的 HTML
        // 创建一个临时 React root
        const { createRoot } = await import("react-dom/client");
        const root = createRoot(renderDiv);
        root.render(
          <div style={{ fontSize: "16px", color: "#1f2937", background: "white", padding: "12px", borderRadius: "8px", maxWidth: "600px" }}>
            <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{input}</Markdown>
          </div>
        );
        // 等待 React 渲染 + KaTeX 加载字体
        await new Promise((r) => setTimeout(r, 200));
      }

      // 从隔离 div 截图
      const dataUrl = await toPng(renderDiv, {
        pixelRatio: 3,
        backgroundColor: "white",
      });

      // 清理
      document.body.removeChild(renderDiv);

      // 打开新窗口
      openImageInTab(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Render failed:", e);
    } finally {
      setCopying(false);
    }
  };

  const openImageInTab = (dataUrl: string) => {
    const newWindow = window.open("", "_blank");
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${mode === "latex" ? "LaTeX 公式" : "Markdown"} - CoStudy</title>
          <style>
            body { margin:0; display:flex; justify-content:center; align-items:center;
                   min-height:100vh; background:#f5f5f5; }
            img { max-width:90vw; max-height:90vh; border-radius:8px; box-shadow:0 4px 24px rgba(0,0,0,0.1); }
            .hint { position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
                    background:rgba(0,0,0,0.7); color:white; padding:8px 20px; border-radius:20px; font-size:13px; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="rendered" />
          <div class="hint">右键图片 → 复制图片 → 回到 Excalidraw 粘贴</div>
        </body>
        </html>`);
      newWindow.document.close();
    }
  };

  const insertRef = (text: string) => {
    setInput((prev) => prev ? prev + "\n" + text : text);
  };

  const renderLatex = (tex: string) => {
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: true });
    } catch {
      return `<span style="color:#c17767">公式错误</span>`;
    }
  };

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
            <RefSection key={i} section={section} onInsert={insertRef} />
          ))}
        </div>
      </div>

      {/* 右侧: 输入 + 预览 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <div className="flex gap-1">
            <button onClick={() => { setMode("latex"); setInput(""); }}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                mode === "latex" ? "bg-[#e8b86d]/10 text-[#e8b86d]" : "text-gray-500 hover:bg-gray-100")}>
              <Sigma className="h-3.5 w-3.5 inline mr-1" />LaTeX
            </button>
            <button onClick={() => { setMode("markdown"); setInput(""); }}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                mode === "markdown" ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "text-gray-500 hover:bg-gray-100")}>
              <Type className="h-3.5 w-3.5 inline mr-1" />Markdown
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        {/* 输入 */}
        <div className="px-4 pt-3">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "latex" ? "输入 LaTeX 公式…" : "输入 Markdown 文本…"}
            className="w-full h-16 px-3 py-2 text-xs font-mono rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-[#e8b86d] resize-none" />
        </div>

        {/* 预览 */}
        {input.trim() && (
          <div className="px-4 pt-2">
            <div className="text-[10px] text-gray-400 mb-1">预览 · 点击"复制图片"后在 Excalidraw 中 Ctrl+V 粘贴</div>
            <div ref={previewRef} className="p-3 rounded-xl bg-white border border-gray-100 min-h-[36px] overflow-auto inline-block max-w-full">
              {mode === "latex" ? (
                <div dangerouslySetInnerHTML={{ __html: renderLatex(input) }} />
              ) : (
                <div className="prose prose-sm prose-gray max-w-none">
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{input}</Markdown>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 复制按钮 */}
        <div className="px-4 py-3 mt-auto">
          <button onClick={renderToClipboard} disabled={!input.trim() || copying}
            className={cn("w-full flex items-center justify-center gap-1.5 py-2 text-sm rounded-xl font-medium transition-colors",
              copied ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50")}>
            {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "已打开新窗口" : "渲染并打开"}
          </button>
        </div>
      </div>
    </div>
  );
}

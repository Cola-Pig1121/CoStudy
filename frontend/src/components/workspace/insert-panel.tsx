"use client";

import { useRef, useState } from "react";
import katex from "katex";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  Check,
  Copy,
  Image,
  Loader2,
  Sigma,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InsertPanelProps {
  onClose: () => void;
}

export function InsertPanel({ onClose }: InsertPanelProps) {
  const [mode, setMode] = useState<"latex" | "markdown">("latex");
  const [input, setInput] = useState("");
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const renderToImage = async () => {
    if (!previewRef.current || !input.trim()) return;
    setCopying(true);
    try {
      // 使用 html2canvas 思路：将 DOM 渲染到 Canvas
      const el = previewRef.current;

      // 创建一个临时 div 来测量内容尺寸
      const rect = el.getBoundingClientRect();
      const canvas = document.createElement("canvas");
      const scale = 2; // 高清
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;

      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      // 序列化 DOM 为 SVG foreignObject
      const data = new XMLSerializer().serializeToString(el);
      const svgStr = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="
              font-family: 'LXGW WenKai', sans-serif;
              font-size: 16px;
              color: #1f2937;
              background: white;
              padding: 12px;
              border-radius: 8px;
              display: inline-block;
              max-width: 600px;
            ">
              ${data}
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new window.Image();
      const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      img.onload = async () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob(async (blob) => {
          if (!blob) { setCopying(false); return; }
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // fallback: 下载
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = mode === "latex" ? "formula.png" : "markdown.png";
            a.click();
            URL.revokeObjectURL(a.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
          setCopying(false);
        }, "image/png");
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        // fallback: 直接用 canvas 绘制纯文本
        fallbackRender(canvas, ctx, el, rect, scale);
        setCopying(false);
      };

      img.src = url;
    } catch {
      setCopying(false);
    }
  };

  const fallbackRender = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    el: HTMLElement,
    rect: DOMRect,
    scale: number
  ) => {
    // 简单的纯文本渲染 fallback
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1f2937";
    ctx.font = "16px 'LXGW WenKai', sans-serif";
    const lines = (el.textContent ?? "").split("\n");
    lines.forEach((line, i) => {
      ctx.fillText(line, 12, 28 + i * 24);
    });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "render.png";
        a.click();
      }
    }, "image/png");
  };

  const renderLatex = (tex: string) => {
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: true });
    } catch {
      return `<span style="color:#c17767">公式错误</span>`;
    }
  };

  return (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[480px] bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 z-50 overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => { setMode("latex"); setInput(""); }}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
              mode === "latex" ? "bg-[#e8b86d]/10 text-[#e8b86d]" : "text-gray-500 hover:bg-gray-100"
            )}
          >
            <Sigma className="h-4 w-4 inline mr-1" />
            LaTeX 公式
          </button>
          <button
            onClick={() => { setMode("markdown"); setInput(""); }}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
              mode === "markdown" ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "text-gray-500 hover:bg-gray-100"
            )}
          >
            <Type className="h-4 w-4 inline mr-1" />
            Markdown
          </button>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 输入区 */}
      <div className="px-4 pt-3">
        {mode === "latex" ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 LaTeX 公式，例如：\frac{-b \pm \sqrt{b^2-4ac}}{2a}"
            className="w-full h-20 px-3 py-2 text-sm font-mono rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-[#e8b86d] resize-none"
          />
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 Markdown 文本，支持标题、列表、**加粗**、$公式$..."
            className="w-full h-20 px-3 py-2 text-sm font-mono rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-[#e8b86d] resize-none"
          />
        )}
      </div>

      {/* 预览区 */}
      {input.trim() && (
        <div className="px-4 pt-3">
          <div className="text-xs text-gray-400 mb-1.5">预览</div>
          <div
            ref={previewRef}
            className="p-3 rounded-xl bg-white border border-gray-100 min-h-[40px] overflow-auto"
          >
            {mode === "latex" ? (
              <div dangerouslySetInnerHTML={{ __html: renderLatex(input) }} />
            ) : (
              <div className="prose prose-sm prose-gray max-w-none">
                <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {input}
                </Markdown>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {mode === "latex"
            ? "输入公式 → 预览 → 复制图片 → 在 Excalidraw 中 Ctrl+V 粘贴"
            : "输入 Markdown → 预览 → 复制图片 → 在 Excalidraw 中 Ctrl+V 粘贴"}
        </p>
        <button
          onClick={renderToImage}
          disabled={!input.trim() || copying}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl font-medium transition-colors",
            copied
              ? "bg-[#4a9d9a]/10 text-[#4a9d9a]"
              : "bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50"
          )}
        >
          {copying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "已复制，去粘贴" : "复制图片"}
        </button>
      </div>
    </div>
  );
}

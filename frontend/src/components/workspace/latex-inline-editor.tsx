"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LatexInlineEditorProps {
  initialLatex: string;
  pos: number;
  type: "inline" | "block";
  onUpdate: (latex: string, pos: number, type: "inline" | "block") => void;
  onCancel: () => void;
}

export function LatexInlineEditor({
  initialLatex,
  pos,
  type,
  onUpdate,
  onCancel,
}: LatexInlineEditorProps) {
  const [latex, setLatex] = useState(initialLatex);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动聚焦
  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  // Escape 取消
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (latex.trim()) onUpdate(latex.trim(), pos, type);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [latex, pos, type, onUpdate, onCancel]);

  const renderPreview = useCallback((tex: string) => {
    if (!tex.trim()) return '<span style="color:#9ca3af">预览</span>';
    try {
      return katex.renderToString(tex, { throwOnError: false, displayMode: type === "block" });
    } catch {
      return '<span style="color:#c17767">公式语法错误</span>';
    }
  }, [type]);

  return (
    <div
      ref={containerRef}
      className="inline-flex flex-col rounded-xl border border-[#4a9d9a]/30 bg-white shadow-lg shadow-[#4a9d9a]/5 overflow-hidden z-50"
      style={{ minWidth: type === "block" ? 400 : 280, maxWidth: 600 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 标签 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#4a9d9a]/5 border-b border-[#4a9d9a]/10">
        <span className="text-[10px] font-medium text-[#4a9d9a] uppercase tracking-wider">
          {type === "block" ? "块级公式" : "行内公式"} · Ctrl+Enter 确认
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onCancel()}
            className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            onClick={() => latex.trim() && onUpdate(latex.trim(), pos, type)}
            disabled={!latex.trim()}
            className="p-1 rounded-md text-white bg-[#4a9d9a] hover:bg-[#4a9d9a]/90 disabled:opacity-30 transition-colors"
          >
            <Check className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 输入区 */}
      <div className="px-3 py-2">
        <textarea
          ref={textareaRef}
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          className={cn(
            "w-full px-2 py-1.5 text-sm font-mono rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-[#4a9d9a] resize-none transition-colors",
            type === "block" ? "min-h-[60px]" : "min-h-[32px]"
          )}
          placeholder="输入 LaTeX 公式..."
        />
      </div>

      {/* 预览区 */}
      {latex.trim() && (
        <div className={cn(
          "px-3 pb-2",
          type === "block" ? "text-center" : ""
        )}>
          <div className="text-[10px] text-gray-400 mb-1">预览</div>
          <div
            className={cn(
              "p-2 rounded-lg bg-white border border-gray-100 overflow-auto",
              type === "block" ? "py-4" : "py-1"
            )}
            dangerouslySetInnerHTML={{ __html: renderPreview(latex) }}
          />
        </div>
      )}
    </div>
  );
}

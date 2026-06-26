"use client";

import { useCallback, useRef, useState } from "react";
import { Globe, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

type InsertMode = "upload" | "url" | "embed";

interface MediaInsertProps {
  onInsert: (type: "image" | "iframe", src: string, title?: string) => void;
  onClose: () => void;
}

export function MediaInsert({ onInsert, onClose }: MediaInsertProps) {
  const [mode, setMode] = useState<InsertMode>("upload");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingPct, setUploadingPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > 500 * 1024 * 1024) {
      alert("文件大小不能超过 500MB");
      return;
    }
    setUploading(true);
    setUploadingPct(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("costudy_token");

      // 使用 XMLHttpRequest 实现上传进度
      const result = await new Promise<{ url: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/v1/upload/image`);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadingPct(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
          else reject(new Error(JSON.parse(xhr.responseText).detail ?? "上传失败"));
        };
        xhr.onerror = () => reject(new Error("网络错误"));
        xhr.send(fd);
      });

      onInsert("image", result.url, file.name);
      onClose();
    } catch (e: any) {
      alert(e?.message ?? "上传失败");
    } finally {
      setUploading(false);
      setUploadingPct(0);
    }
  }, [onInsert, onClose]);

  const handleInsertUrl = () => {
    if (!url.trim()) return;
    if (mode === "embed") {
      onInsert("iframe", url.trim(), title.trim() || "嵌入内容");
    } else {
      onInsert("image", url.trim(), title.trim() || undefined);
    }
    onClose();
  };

  const tabs = [
    { key: "upload" as const, label: "本地上传", icon: Upload },
    { key: "url" as const, label: "图片链接", icon: ImagePlus },
    { key: "embed" as const, label: "网页嵌入", icon: Globe },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-800">插入媒体</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex gap-1 px-5 pt-3">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setMode(t.key)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  mode === t.key ? "bg-[#4a9d9a]/10 text-[#4a9d9a]" : "text-gray-500 hover:bg-gray-100")}>
                <Icon className="h-3.5 w-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        <div className="px-5 py-4">
          {mode === "upload" && (
            <div className="space-y-3">
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  uploading ? "border-[#4a9d9a]/40 bg-[#4a9d9a]/5" : "border-gray-200 hover:border-[#4a9d9a]/40 hover:bg-gray-50"
                )}
              >
                {uploading ? (
                  <div className="space-y-2">
                    <Loader2 className="h-8 w-8 text-[#4a9d9a] animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">上传中 {uploadingPct}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#4a9d9a] h-1.5 rounded-full transition-all" style={{ width: `${uploadingPct}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">点击选择图片，或拖拽文件到此处</p>
                    <p className="text-xs text-gray-400 mt-1">支持 JPG / PNG / WebP / GIF / SVG，最大 500MB</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
            </div>
          )}

          {(mode === "url" || mode === "embed") && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">
                  {mode === "embed" ? "嵌入 URL" : "图片 URL"}
                </label>
                <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder={mode === "embed"
                    ? "https://www.youtube.com/watch?v=... 或 https://player.bilibili.com/..."
                    : "https://example.com/image.jpg"}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">标题（可选）</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="图片/嵌入内容的描述"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]" />
              </div>
              {mode === "embed" && (
                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <p>支持的嵌入平台：</p>
                  <p className="mt-1 font-mono">YouTube · Bilibili · Vimeo · 通用 iframe</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {(mode === "url" || mode === "embed") && (
          <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-200 transition-colors">取消</button>
            <button onClick={handleInsertUrl} disabled={!url.trim()}
              className="px-4 py-2 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50 transition-colors">
              插入
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

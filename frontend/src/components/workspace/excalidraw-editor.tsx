"use client";

import { useCallback, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

/** Excalidraw 命令式 API（精简类型） */
export interface ExcalidrawAPI {
  getSceneElements: () => readonly any[];
  updateScene: (opts: { elements?: readonly any[] }) => void;
}

interface ExcalidrawEditorProps {
  onAPIReady?: (api: ExcalidrawAPI) => void;
  initialData?: { elements?: any[]; appState?: Record<string, any> } | null;
}

/**
 * Excalidraw 画布封装（纯客户端组件）。
 * - langCode="zh-CN" 中文化
 * - 通过 initialData 加载已有内容
 * - 通过 onAPIReady 回调暴露命令式 API
 */
export function ExcalidrawEditor({ onAPIReady, initialData }: ExcalidrawEditorProps) {
  const apiRef = useRef<ExcalidrawAPI | null>(null);

  const handleReady = useCallback(
    (excalidrawAPI: ExcalidrawAPI) => {
      apiRef.current = excalidrawAPI;
      onAPIReady?.(excalidrawAPI);
    },
    [onAPIReady]
  );

  return (
    <div className="w-full h-full">
      <Excalidraw
        excalidrawAPI={handleReady}
        langCode="zh-CN"
        initialData={initialData ?? undefined}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
          },
        }}
        theme="light"
      />
    </div>
  );
}

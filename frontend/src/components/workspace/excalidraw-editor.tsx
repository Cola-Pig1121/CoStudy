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
}

/**
 * Excalidraw 画布封装（纯客户端组件）。
 * 通过 onAPIReady 回调暴露 excalidrawAPI。
 */
export function ExcalidrawEditor({ onAPIReady }: ExcalidrawEditorProps) {
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
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
          },
        }}
        theme="light"
        initialData={{
          appState: { viewBackgroundColor: "#ffffff" },
        }}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TextbookNode } from "@/types";

interface TextbookTreeProps {
  nodes: TextbookNode[];
  selectedId: number | null;
  onSelect: (node: TextbookNode) => void;
}

/** 层级缩进与图标颜色 */
const LEVEL_STYLES: Record<number, { indent: string; dot: string }> = {
  0: { indent: "", dot: "bg-[#4a9d9a]" },
  1: { indent: "ml-4", dot: "bg-[#e8b86d]" },
  2: { indent: "ml-8", dot: "bg-[#6b8e8e]" },
  3: { indent: "ml-12", dot: "bg-[#c17767]" },
};

function TreeNode({
  node,
  selectedId,
  onSelect,
}: {
  node: TextbookNode;
  selectedId: number | null;
  onSelect: (node: TextbookNode) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const [open, setOpen] = useState(true);
  const style = LEVEL_STYLES[node.level] ?? LEVEL_STYLES[3];
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors",
          style.indent,
          isSelected
            ? "bg-[#4a9d9a]/10 text-[#4a9d9a]"
            : "hover:bg-gray-100 text-gray-700"
        )}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="p-0.5 rounded hover:bg-gray-200"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 text-gray-400 transition-transform",
                open && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-[18px]" />
        )}
        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
        <span className="text-sm truncate flex-1">{node.name}</span>
      </div>
      {hasChildren && open && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TextbookTree({ nodes, selectedId, onSelect }: TextbookTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Layers className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-sm">暂无教材数据</span>
      </div>
    );
  }
  return (
    <nav className="space-y-0.5">
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}

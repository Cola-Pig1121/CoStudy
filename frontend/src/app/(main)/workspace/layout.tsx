"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "creatures", label: "我的创作", href: "/workspace/creatures", color: "text-gray-700", disabled: false },
  { id: "mindmap", label: "思维导图", href: "/workspace/mindmap", color: "text-[#4a9d9a]", disabled: false },
  { id: "notes", label: "知识笔记", href: "/workspace/notes", color: "text-[#e8b86d]", disabled: false },
  { id: "exam-cut", label: "试卷框选", href: "/workspace/exam-cut", color: "text-[#c17767]", disabled: true },
  { id: "note-convert", label: "笔记转换", href: "/workspace/note-convert", color: "text-[#6b8e8e]", disabled: true },
];

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-full bg-[#faf8f5] flex flex-col">
      {/* 标签栏 */}
      <div className="bg-white border-b border-gray-100 px-6">
        <div className="mx-auto max-w-6xl flex items-center gap-1">
          <span className="text-sm font-medium text-gray-400 mr-4">创作工作台</span>
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.id}
                href={tab.disabled ? "#" : tab.href}
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                  active
                    ? `${tab.color} border-current`
                    : tab.disabled
                    ? "text-gray-300 border-transparent cursor-not-allowed"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                )}
                onClick={(e) => tab.disabled && e.preventDefault()}
              >
                {tab.label}
                {tab.disabled && (
                  <span className="ml-1 text-[10px] text-gray-300">即将上线</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 内容区 - 减去 AppShell Header 64px + TabBar ~50px */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

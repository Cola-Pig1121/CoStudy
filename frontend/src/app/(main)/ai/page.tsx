"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Brain,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface Conversation {
  conversation_id: string;
  last_message: string;
  last_role: string;
  created_at: string | null;
}

const ASSISTANT_TYPES = [
  { id: "ai_chat" as const, label: "AI 助手", icon: Bot, desc: "通用学习助手" },
  { id: "feynman" as const, label: "费曼助手", icon: Brain, desc: "引导式学习" },
  { id: "knowledge_qa" as const, label: "知识问答", icon: FileText, desc: "教材知识解答" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function AIPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [assistantType, setAssistantType] = useState<"ai_chat" | "feynman" | "knowledge_qa">("ai_chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(() => Math.random().toString(36).slice(2, 18));
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [reasoningEffort, setReasoningEffort] = useState<string>("medium");
  const [showReasoning, setShowReasoning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // 加载对话历史
  useEffect(() => {
    if (!user) return;
    fetch(`${API_BASE}/api/v1/ai/conversations?assistant_type=${assistantType}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("costudy_token")}` },
    }).then(r => r.json()).then(d => setConversations(d.items ?? [])).catch(() => {});
  }, [user, assistantType]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const token = localStorage.getItem("costudy_token");
      const resp = await fetch(`${API_BASE}/api/v1/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg.content, conversation_id: conversationId, assistant_type: assistantType, reasoning_effort: reasoningEffort || undefined }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail ?? "请求失败");
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMsg.content += data.content;
              setMessages(prev => [...prev]);
            }
            if (data.error) {
              assistantMsg.content += `\n\n⚠️ ${data.error}`;
              setMessages(prev => [...prev]);
            }
            if (data.done) break;
          } catch {}
        }
      }

      // 刷新对话列表
      fetch(`${API_BASE}/api/v1/ai/conversations?assistant_type=${assistantType}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(d => setConversations(d.items ?? [])).catch(() => {});

    } catch (e: any) {
      assistantMsg.content = `⚠️ ${e?.message ?? "发送失败"}`;
      setMessages(prev => [...prev]);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, assistantType]);

  const newConversation = () => {
    setMessages([]);
    setConversationId(Math.random().toString(36).slice(2, 18));
  };

  const loadConversation = async (convId: string) => {
    const token = localStorage.getItem("costudy_token");
    const resp = await fetch(`${API_BASE}/api/v1/ai/conversations/${convId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    setMessages(data.map((m: any) => ({ role: m.role, content: m.content, created_at: m.created_at })));
    setConversationId(convId);
  };

  if (loading || !user) {
    return <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* 左侧边栏 */}
      <aside className={cn(
        "w-72 bg-white border-r border-gray-100 flex flex-col shrink-0 transition-all",
        !showSidebar && "w-0 overflow-hidden"
      )}>
        {/* 助手切换 */}
        <div className="p-3 border-b border-gray-100 space-y-1">
          {ASSISTANT_TYPES.map((at) => {
            const Icon = at.icon;
            return (
              <button key={at.id} onClick={() => { setAssistantType(at.id); setMessages([]); setConversationId(Math.random().toString(36).slice(2, 18)); }}
                className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors",
                  assistantType === at.id ? "bg-[#4a9d9a]/10 text-[#4a9d9a] font-medium" : "text-gray-600 hover:bg-gray-50")}>
                <Icon className="h-4 w-4 shrink-0" />
                <div className="text-left">
                  <div>{at.label}</div>
                  <div className="text-[10px] text-gray-400">{at.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 新建对话 */}
        <button onClick={newConversation}
          className="mx-3 mt-3 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">
          <Sparkles className="h-3.5 w-3.5" />新对话
        </button>

        {/* 历史列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider px-2 mb-2">历史对话</div>
          {conversations.map((c) => (
            <button key={c.conversation_id}
              onClick={() => loadConversation(c.conversation_id)}
              className={cn("w-full text-left px-3 py-2 rounded-xl text-sm transition-colors",
                conversationId === c.conversation_id ? "bg-gray-100" : "hover:bg-gray-50")}>
              <div className="text-gray-700 truncate">{c.last_message}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {c.created_at ? new Date(c.created_at).toLocaleString("zh-CN") : ""}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* 右侧聊天区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶栏 */}
        <div className="h-12 border-b border-gray-100 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setShowSidebar((v) => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <ArrowLeft className={cn("h-4 w-4 transition-transform", showSidebar && "rotate-180")} />
          </button>
          <h2 className="text-sm font-bold text-gray-800">
            {ASSISTANT_TYPES.find((a) => a.id === assistantType)?.label}
          </h2>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <Bot className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">开始和 AI 助手对话吧</p>
              <p className="text-xs text-gray-300 mt-1">我会帮助你理解教材知识、解答问题</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-[#4a9d9a] text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-gray max-w-none">
                    <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {msg.content || ""}
                    </Markdown>
                  </div>
                ) : (
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                )}
              </div>
            </div>
          ))}
          {sending && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-[#4a9d9a]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="border-t border-gray-100 p-4 shrink-0">
          {/* 思考强度选择器 */}
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2">
            <button onClick={() => setShowReasoning((v) => !v)}
              className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
              💭 思考强度
            </button>
            {showReasoning && (
              <div className="flex gap-1">
                {["low", "medium", "high"].map((level) => (
                  <button key={level} onClick={() => setReasoningEffort(level)}
                    className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors",
                      reasoningEffort === level ? "bg-[#e8b86d]/10 text-[#e8b86d]" : "text-gray-400 hover:bg-gray-100")}>
                    {level === "low" ? "快速" : level === "medium" ? "标准" : "深度"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="输入你的问题..."
              rows={1}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-[#4a9d9a] resize-none max-h-32"
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending}
              className="p-2.5 rounded-xl bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50 transition-colors shrink-0">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

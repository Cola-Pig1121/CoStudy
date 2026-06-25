"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle,
  Globe,
  Loader2,
  Plus,
  Server,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Provider {
  id: number;
  name: string;
  base_url: string;
  api_key_masked: string;
  api_format: string;
  models: string[];
  is_active: boolean;
  is_default: boolean;
}

const API_FORMATS = [
  { value: "openai", label: "OpenAI 兼容 (/v1/chat/completions)" },
  { value: "anthropic", label: "Anthropic Messages (/v1/messages)" },
];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formKey, setFormKey] = useState("");
  const [formFormat, setFormFormat] = useState("openai");
  const [formModels, setFormModels] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);
  useEffect(() => { if (user?.role === "admin") loadProviders(); }, [user]);

  const loadProviders = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await api.get<Provider[]>("/api/v1/providers");
      setProviders(data as any);
    } catch {} finally { setLoadingData(false); }
  }, []);

  const handleAdd = async () => {
    if (!formName.trim() || !formUrl.trim() || !formKey.trim()) return;
    setSaving(true);
    try {
      const models = formModels.split("\n").map((m) => m.trim()).filter(Boolean);
      await api.post("/api/v1/providers", {
        name: formName.trim(), base_url: formUrl.trim(),
        api_key: formKey.trim(), api_format: formFormat, models,
      });
      setShowAdd(false); resetForm(); loadProviders();
    } catch (e: any) { alert(e?.detail ?? "添加失败"); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确认删除此供应商？")) return;
    try { await api.delete(`/api/v1/providers/${id}`); loadProviders(); }
    catch (e: any) { alert(e?.detail ?? "删除失败"); }
  };

  const handleTest = async (id: number) => {
    setTesting(id);
    try {
      const result = await api.post<any>(`/api/v1/providers/${id}/test`, {});
      alert(result.success ? `✅ 连接成功！模型返回: ${result.response}` : `❌ 连接失败: ${result.error}`);
    } catch (e: any) { alert(`❌ ${e?.detail ?? e?.message}`); } finally { setTesting(null); }
  };

  const handleToggleDefault = async (id: number) => {
    try { await api.put(`/api/v1/providers/${id}`, { is_default: true }); loadProviders(); } catch {}
  };

  const resetForm = () => { setFormName(""); setFormUrl(""); setFormKey(""); setFormFormat("openai"); setFormModels(""); };

  if (loading || !user) return <div className="flex items-center justify-center h-[calc(100vh-64px)]"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;
  if (user.role !== "admin") return <div className="flex items-center justify-center h-[calc(100vh-64px)] text-gray-400">仅管理员可访问</div>;

  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] transition-colors">
          <ArrowLeft className="h-4 w-4" />返回</Link>
        <h1 className="text-2xl font-bold text-gray-800">AI 模型管理</h1>
      </div>

      <div className="bg-[#4a9d9a]/5 border border-[#4a9d9a]/20 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-[#4a9d9a] mt-0.5 shrink-0" />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">基于 litellm 的统一模型管理</p>
            <p className="text-gray-500">配置供应商后，系统通过 litellm 自动路由调用。支持 OpenAI 兼容接口和 Anthropic 格式。</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">供应商列表</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 transition-colors">
          <Plus className="h-4 w-4" />添加供应商</button>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-[#4a9d9a]" /></div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <Server className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-3">尚未配置任何模型供应商</p>
          <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90">
            <Plus className="h-4 w-4" />添加第一个供应商</button>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <div key={p.id} className={cn("bg-white rounded-2xl border p-5 transition-all", p.is_default ? "border-[#4a9d9a]/40 shadow-lg shadow-[#4a9d9a]/5" : "border-gray-100")}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", p.is_default ? "bg-[#4a9d9a]/10" : "bg-gray-100")}>
                    <Globe className={cn("h-5 w-5", p.is_default ? "text-[#4a9d9a]" : "text-gray-400")} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-800">{p.name}</h3>
                      {p.is_default && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#4a9d9a]/10 text-[#4a9d9a]">默认</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{p.base_url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleTest(p.id)} disabled={testing === p.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:border-[#4a9d9a]/40 hover:bg-[#4a9d9a]/5 transition-colors disabled:opacity-50">
                    {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}测试连接</button>
                  {!p.is_default && <button onClick={() => handleToggleDefault(p.id)} className="px-2.5 py-1.5 text-xs rounded-lg text-gray-500 hover:bg-gray-100">设为默认</button>}
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#c17767] hover:bg-[#c17767]/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.models.map((m) => <span key={m} className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-gray-100 text-gray-600">{m}</span>)}
              </div>
              <div className="mt-2 text-[11px] text-gray-400">API 格式: {p.api_format} · Key: {p.api_key_masked}</div>
            </div>
          ))}
        </div>
      )}

      {/* 添加弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">添加模型供应商</h3>
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">名称</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="如: DeepSeek, MiniMax, 智谱 GLM"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Base URL</label>
                <input type="text" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">API Key</label>
                <input type="password" value={formKey} onChange={(e) => setFormKey(e.target.value)} placeholder="输入 API Key"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">API 格式</label>
                <select value={formFormat} onChange={(e) => setFormFormat(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]">
                  {API_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">模型列表</label>
                <textarea value={formModels} onChange={(e) => setFormModels(e.target.value)}
                  placeholder={"每行一个模型名称，例如:\ndeepseek-chat\ndeepseek-reasoner"}
                  rows={3} className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a] resize-none" />
                <p className="text-xs text-gray-400 mt-1">每行一个</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 text-sm rounded-lg text-gray-500 hover:bg-gray-200">取消</button>
              <button onClick={handleAdd} disabled={saving || !formName.trim() || !formUrl.trim() || !formKey.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {saving ? "添加中..." : "添加供应商"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

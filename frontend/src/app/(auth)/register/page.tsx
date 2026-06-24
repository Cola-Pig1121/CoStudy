"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    display_name: "",
    password: "",
    confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        display_name: form.display_name || undefined,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">注册</h1>
        <p className="text-sm text-gray-400 mt-1">创建你的 CoStudy 学习账号</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-[#c17767]/10 px-4 py-3 text-sm text-[#c17767]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            用户名
          </label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            required
            minLength={3}
            maxLength={50}
            autoComplete="username"
            placeholder="3-50 个字符"
            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4a9d9a]/30 focus:border-[#4a9d9a] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            邮箱
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            autoComplete="email"
            placeholder="you@school.edu"
            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4a9d9a]/30 focus:border-[#4a9d9a] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            显示名称 <span className="text-gray-400 font-normal">(可选)</span>
          </label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => update("display_name", e.target.value)}
            maxLength={100}
            placeholder="显示给别人的名字"
            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4a9d9a]/30 focus:border-[#4a9d9a] transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            密码
          </label>
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="至少 6 位"
              className="w-full px-4 py-2.5 pr-11 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4a9d9a]/30 focus:border-[#4a9d9a] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            确认密码
          </label>
          <input
            type={showPwd ? "text" : "password"}
            value={form.confirm}
            onChange={(e) => update("confirm", e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            placeholder="再次输入密码"
            className="w-full px-4 py-2.5 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4a9d9a]/30 focus:border-[#4a9d9a] transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-[#4a9d9a] text-white py-3 rounded-xl font-medium shadow-lg shadow-[#4a9d9a]/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0"
        >
          <UserPlus className="h-4 w-4" />
          {submitting ? "注册中..." : "注册"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        已有账号？{" "}
        <Link
          href="/login"
          className="text-[#4a9d9a] font-medium hover:underline"
        >
          去登录
        </Link>
      </p>
    </div>
  );
}
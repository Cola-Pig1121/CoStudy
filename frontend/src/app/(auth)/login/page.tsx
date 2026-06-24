"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(account, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-black/[0.04] p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">登录</h1>
        <p className="text-sm text-gray-400 mt-1">使用用户名或邮箱登录你的账号</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-[#c17767]/10 px-4 py-3 text-sm text-[#c17767]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            账号
          </label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
            autoComplete="username"
            placeholder="用户名或邮箱"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-[#4a9d9a] text-white py-3 rounded-xl font-medium shadow-lg shadow-[#4a9d9a]/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:translate-y-0"
        >
          <LogIn className="h-4 w-4" />
          {submitting ? "登录中..." : "登录"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400 mt-6">
        还没有账号？{" "}
        <Link
          href="/register"
          className="text-[#4a9d9a] font-medium hover:underline"
        >
          立即注册
        </Link>
      </p>
    </div>
  );
}
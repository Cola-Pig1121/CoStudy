"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Save,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 密码修改
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? "");
      setEmail(user.email ?? "");
      setAvatarUrl(user.avatar_url ?? "");
    }
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await api.put("/api/v1/auth/profile", {
        display_name: displayName.trim(),
      });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      alert(e?.detail ?? "保存失败");
    } finally {
      setSaving(false);
    }
  }, [displayName, refreshUser]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("costudy_token");
      const resp = await fetch(`${API_BASE}/api/v1/auth/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!resp.ok) throw new Error("上传失败");
      const data = await resp.json();
      setAvatarUrl(data.avatar_url);
      await refreshUser();
    } catch (e: any) {
      alert(e?.message ?? "头像上传失败");
    } finally {
      setUploadingAvatar(false);
    }
  }, [refreshUser]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      alert("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      alert("新密码至少 6 位");
      return;
    }
    setChangingPw(true);
    try {
      await api.put("/api/v1/auth/password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e: any) {
      alert(e?.detail ?? "修改失败");
    } finally {
      setChangingPw(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[700px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">个人设置</h1>
      </div>

      <div className="space-y-6">
        {/* 头像 */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">头像</h2>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-[#4a9d9a]/20 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl.startsWith("http") ? avatarUrl : `${API_BASE}${avatarUrl}`}
                    alt="头像"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 text-[#4a9d9a]" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarUpload(f);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="text-sm text-gray-500">
              <p>点击头像上传新图片</p>
              <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG，建议 200×200 像素</p>
            </div>
          </div>
        </section>

        {/* 基本信息 */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">用户名</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">用户名不可修改</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">显示名称</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="你的显示名称"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">邮箱</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">邮箱不可修改</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving || !displayName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#4a9d9a] text-white hover:bg-[#4a9d9a]/90 disabled:opacity-50 transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? "保存中..." : "保存修改"}
              </button>
              {saved && (
                <span className="text-xs text-[#4a9d9a]">✓ 已保存</span>
              )}
            </div>
          </div>
        </section>

        {/* 修改密码 */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4">修改密码</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">当前密码</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="输入当前密码"
                  className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">新密码</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1 block">确认新密码</label>
              <input
                type={showNewPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-[#4a9d9a]"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleChangePassword}
                disabled={changingPw || !currentPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-[#c17767] text-white hover:bg-[#c17767]/90 disabled:opacity-50 transition-colors"
              >
                {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {changingPw ? "修改中..." : "修改密码"}
              </button>
              {pwSaved && (
                <span className="text-xs text-[#4a9d9a]">✓ 密码已修改</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Eye,
  Film,
  Loader2,
  Plus,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatCount, timeAgo } from "@/lib/utils";

interface Video {
  id: number;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  view_count: number;
  status: number;
  created_at: string;
}

export default function VideoListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ items: Video[]; total: number }>("/api/v1/videos")
      .then((d) => setVideos(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [user]);

  const formatDuration = (s: number | null) => {
    if (!s) return "--:--";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  if (loading || !user) return <div className="flex items-center justify-center h-[calc(100vh-64px)]"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">微课视频</h1>
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Film className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">暂无微课视频</p>
          <p className="text-xs text-gray-300 mt-1">教师可以上传教学视频到对应章节</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <Link key={v.id} href={`/video/${v.id}`}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#4a9d9a]/20 transition-all group">
              {/* 缩略图占位 */}
              <div className="aspect-video bg-gradient-to-br from-[#4a9d9a]/10 to-[#e8b86d]/10 flex items-center justify-center">
                <Film className="h-10 w-10 text-gray-300" />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#4a9d9a] transition-colors">{v.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {v.duration_seconds && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(v.duration_seconds)}</span>}
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatCount(v.view_count)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, Film, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";
import { formatCount } from "@/lib/utils";

interface VideoDetail {
  id: number;
  title: string;
  description: string | null;
  hls_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  view_count: number;
  status: number;
}

export default function VideoPlayerPage() {
  const params = useParams();
  const videoId = Number(params.id);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<VideoDetail>(`/api/v1/videos/${videoId}`)
      .then(setVideo)
      .catch(() => router.replace("/video"))
      .finally(() => setLoadingData(false));
  }, [user, videoId]);

  if (loading || !user) return <div className="flex items-center justify-center h-[calc(100vh-64px)]"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;

  if (loadingData) {
    return <div className="flex items-center justify-center h-[calc(100vh-64px)]"><Loader2 className="h-6 w-6 animate-spin text-[#4a9d9a]" /></div>;
  }

  if (!video) {
    return (
      <div className="p-8 max-w-[800px] mx-auto">
        <Link href="/video" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] mb-6"><ArrowLeft className="h-4 w-4" />返回视频列表</Link>
        <div className="text-center py-20"><p className="text-gray-400">视频不存在</p></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <Link href="/video" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4a9d9a] mb-6"><ArrowLeft className="h-4 w-4" />返回视频列表</Link>

      {/* 视频播放器 */}
      <div className="bg-black rounded-2xl overflow-hidden mb-6 aspect-video flex items-center justify-center">
        {video.hls_url ? (
          <video
            src={video.hls_url}
            controls
            className="w-full h-full"
            poster={video.thumbnail_url ?? undefined}
          />
        ) : (
          <div className="flex flex-col items-center text-gray-400">
            <Film className="h-16 w-16 mb-3 opacity-50" />
            <p className="text-sm">视频暂不可用</p>
          </div>
        )}
      </div>

      {/* 视频信息 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-2">{video.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatCount(video.view_count)} 次观看</span>
        </div>
        {video.description && (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{video.description}</p>
        )}
      </div>
    </div>
  );
}

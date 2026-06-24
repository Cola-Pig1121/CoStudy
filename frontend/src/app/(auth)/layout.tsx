"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 认证页面共享布局（已登录用户重定向到 dashboard）
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-full flex items-center justify-center bg-[#faf8f5] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#4a9d9a] font-bold text-2xl"
          >
            <Sparkles className="h-7 w-7" />
            {APP_NAME}
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
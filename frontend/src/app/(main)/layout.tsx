"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/hooks/use-auth";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-[#4a9d9a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

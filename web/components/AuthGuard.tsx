"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * AuthGuard — wraps protected page content.
 * If the user is not logged in (after hydration), redirects to /login.
 * Shows nothing while auth is loading to avoid flash of content.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Still loading — show nothing (avoids flash of protected content)
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--bg, #09090b)",
          color: "var(--text-muted, #666)",
          fontSize: 14,
          gap: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            border: "2px solid rgba(59,150,245,0.2)",
            borderTopColor: "var(--primary, #3b96f5)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        Loading…
      </div>
    );
  }

  // Not authenticated — don't render content (redirect is happening)
  if (!user) {
    return null;
  }

  return <>{children}</>;
}

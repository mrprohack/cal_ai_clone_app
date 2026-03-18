"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "@/lib/auth-context";
import { ReactNode } from "react";

const url =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  "https://placeholder-not-connected.convex.cloud";

const convex = new ConvexReactClient(url);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>{children}</AuthProvider>
    </ConvexProvider>
  );
}

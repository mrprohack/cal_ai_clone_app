"use client";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Use a placeholder URL so the ConvexProvider context always exists.
// When the real NEXT_PUBLIC_CONVEX_URL is set, the app connects live.
// Without it, useQuery/useMutation hooks return undefined (loading state) gracefully.
const url =
  process.env.NEXT_PUBLIC_CONVEX_URL ||
  "https://placeholder-not-connected.convex.cloud";

const convex = new ConvexReactClient(url);

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

const space = Space_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cal AI — Smart Fitness Tracker",
  description: "AI-powered calorie tracking and fitness coaching.",
};

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function Providers({ children }: { children: React.ReactNode }) {
  if (!clerkKey) {
    // No Clerk key — render without auth (dev mode / demo)
    return <ConvexClientProvider>{children}</ConvexClientProvider>;
  }
  return (
    <ClerkProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ClerkProvider>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={space.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

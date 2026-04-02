import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Barlow_Condensed } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

/* Self-hosted via next/font — zero network RTT at runtime */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  preload: true,
  variable: "--font-heading",
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Cal AI — Smart Fitness Tracker",
  description: "AI-powered calorie tracking and fitness coaching.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cal AI",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${spaceGrotesk.className} ${barlowCondensed.variable}`}>
        {/* React 18 managed stylesheet hoisting */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
          precedence="default"
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

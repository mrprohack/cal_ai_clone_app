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
  maximumScale: 1,
  userScalable: false,
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
        {/* Preconnect cuts ~150 ms off the icon-font download */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Material Symbols — display=swap prevents icon FOIT */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className={`${spaceGrotesk.className} ${barlowCondensed.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

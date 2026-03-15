"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", label: "🏠 Today" },
  { href: "/log", label: "📷 Log" },
  { href: "/progress", label: "📸 Progress" },
  { href: "/chat", label: "🤖 FitBot" },
  { href: "/profile", label: "👤 Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <span>Cal</span><span className={styles.logoAccent}>AI</span>
      </Link>
      <div className={styles.links}>
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${pathname?.startsWith(href) ? styles.active : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

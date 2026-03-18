"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today",    icon: "home" },
  { href: "/log",       label: "Log",      icon: "restaurant" },
  { href: "/progress",  label: "Progress", icon: "trending_up" },
  { href: "/chat",      label: "FitBot",   icon: "smart_toy" },
  { href: "/profile",   label: "Profile",  icon: "person" },
];

export function Navbar() {
  const pathname  = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
      {/* Logo */}
      <Link href="/" className={styles.logo}>
        <div className={styles.logoMark}>
          <span className="material-symbols-outlined">fitness_center</span>
        </div>
        <span className={styles.logoText}>
          Cal<span className={styles.logoAccent}>AI</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className={styles.links}>
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.link} ${isActive ? styles.active : ""}`}
            >
              <span className={`material-symbols-outlined ${styles.linkIcon}`}>
                {icon}
              </span>
              <span className={styles.linkLabel}>{label}</span>
              {isActive && <span className={styles.activePip} />}
            </Link>
          );
        })}
      </div>

      {/* Right CTA */}
      <Link href="/log" className={styles.logCta}>
        <span className="material-symbols-outlined">add_circle</span>
        Log Meal
      </Link>
    </nav>
  );
}

"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Today",      icon: "home" },
  { href: "/log",        label: "Log",        icon: "restaurant" },
  { href: "/progress",   label: "Progress",   icon: "trending_up" },
  { href: "/body-scan",  label: "Body Scan",  icon: "body_system" },
  { href: "/meal-plan",  label: "Meal Plan",  icon: "restaurant_menu" },
  { href: "/plans",      label: "Plans",      icon: "workspace_premium" },
  { href: "/chat",       label: "FitBot",     icon: "smart_toy" },
  { href: "/profile",    label: "Profile",    icon: "person" },
];

export function Navbar() {
  const pathname  = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && !user.onboarded) {
      router.replace("/onboarding");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Scroll the active mobile nav item into view if it's off-screen
    const activeEl = document.querySelector(`.${styles.mobileActive}`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [pathname]);

  return (
    <>
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

        {/* Desktop Nav links */}
        <div className={styles.desktopLinks}>
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

        {/* Desktop Right CTA */}
        <Link href="/log" className={styles.logCta}>
          <span className="material-symbols-outlined">add_circle</span>
          Log Meal
        </Link>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className={styles.mobileBottomNav}>
        <div className={styles.mobileLinksItems}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isActive = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.mobileLink} ${isActive ? styles.mobileActive : ""}`}
              >
                <div className={styles.mobileIconWrapper}>
                  <span className={`material-symbols-outlined ${styles.mobileIcon}`}>
                    {icon}
                  </span>
                </div>
                <span className={styles.mobileLabel}>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

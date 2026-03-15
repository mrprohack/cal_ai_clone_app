import Link from "next/link";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <main className={styles.main}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.badge}>AI-Powered · Real-Time · Free to Start</div>
        <h1 className={styles.heroTitle}>
          Track Fitness<br />
          <span className={styles.heroAccent}>With AI</span>
        </h1>
        <p className={styles.heroDesc}>
          Snap a photo of any meal, get instant calorie & macro breakdowns.
          Weekly AI progress photo analysis. Fitness coach always ready.
        </p>
        <div className={styles.heroActions}>
          <Link href="/dashboard" className={styles.ctaPrimary}>
            🚀 Open Dashboard
          </Link>
          <Link href="/chat" className={styles.ctaSecondary}>
            🤖 Try FitBot
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className={styles.features}>
        {[
          { icon: "📷", title: "Food Photo Scan", desc: "GPT-4o Vision identifies every food item, serving size, and macros in seconds." },
          { icon: "📸", title: "Weekly Progress AI", desc: "Submit a weekly photo. AI compares it side-by-side with last week and describes your gains." },
          { icon: "🤖", title: "Fitness AI Coach", desc: "FitBot only answers fitness and nutrition questions — no distractions, just results." },
          { icon: "📊", title: "Real-Time Dashboard", desc: "Live calorie ring, macro bars, and meal history that update the moment you log." },
        ].map((f) => (
          <div key={f.title} className={styles.featureCard}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <h3 className={styles.featureTitle}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

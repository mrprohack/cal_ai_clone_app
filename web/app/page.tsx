import Link from "next/link";
import styles from "./page.module.css";

const FEATURES = [
  {
    icon: "📷",
    tag: "Vision AI",
    title: "Snap & Track",
    desc: "GPT-4o Vision reads every ingredient, serving size, and macro from a single photo — in under 3 seconds.",
    color: "blue",
  },
  {
    icon: "📸",
    tag: "Weekly Analysis",
    title: "Progress Photos",
    desc: "Submit a weekly photo. AI compares it side-by-side with last week and gives you a real coach-level breakdown.",
    color: "green",
  },
  {
    icon: "🤖",
    tag: "AI Coach",
    title: "FitBot",
    desc: "A focused nutrition & fitness AI that stays on topic. No fluff, just science-backed answers.",
    color: "purple",
  },
  {
    icon: "📊",
    tag: "Live Data",
    title: "Real-Time Dashboard",
    desc: "Calorie rings, macro bars, and meal history that update live the moment you log.",
    color: "orange",
  },
];

const STATS = [
  { value: "3s",     label: "AI scan speed" },
  { value: "98%",    label: "Macro accuracy" },
  { value: "2,000+", label: "Happy users" },
  { value: "Free",   label: "To get started" },
];

export default function LandingPage() {
  return (
    <main className={styles.main}>
      {/* ── HERO ── */}
      <section className={styles.hero}>
        {/* Ambient background blobs */}
        <div className={styles.blobBlue}  aria-hidden />
        <div className={styles.blobGreen} aria-hidden />

        <div className={styles.heroInner}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            AI-Powered · Real-Time · Free to Start
          </div>

          <h1 className={styles.heroTitle}>
            Track Fitness<br />
            <span className={styles.heroGradient}>With AI</span>
          </h1>

          <p className={styles.heroDesc}>
            Snap a photo of any meal, get instant calorie &amp; macro breakdowns.
            Weekly AI progress photo analysis. Your AI fitness coach, always ready.
          </p>

          <div className={styles.heroActions}>
            <Link href="/signup" id="hero-signup" className={styles.ctaPrimary}>
              <span className="material-symbols-outlined">rocket_launch</span>
              Get Started Free
            </Link>
            <Link href="/login" id="hero-login" className={styles.ctaSecondary}>
              <span className="material-symbols-outlined">login</span>
              Log In
            </Link>
          </div>

          {/* Social proof */}
          <div className={styles.socialProof}>
            <div className={styles.avatars} aria-label="Happy users">
              {["1", "2", "3", "4"].map((n) => (
                <div key={n} className={styles.avatar}>
                  {n === "4" ? "+2k" : ""}
                </div>
              ))}
            </div>
            <p className={styles.socialText}>
              <strong>2,000+</strong> athletes already tracking smarter
            </p>
          </div>
        </div>

        {/* Hero visual — mock phone card */}
        <div className={styles.heroVisual} aria-hidden>
          <div className={styles.heroCard}>
            <div className={styles.heroCardHeader}>
              <span className={styles.heroCardTitle}>Today's Intake</span>
              <span className={styles.heroCardDate}>Today</span>
            </div>
            <div className={styles.heroRing}>
              <svg viewBox="0 0 120 120" className={styles.heroRingSvg}>
                <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8"
                  stroke="rgba(59,150,245,0.15)" />
                <circle cx="60" cy="60" r="50" fill="none" strokeWidth="8"
                  stroke="var(--primary)" strokeLinecap="round"
                  strokeDasharray="314" strokeDashoffset="78"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                  className={styles.heroRingProgress} />
              </svg>
              <div className={styles.heroRingCenter}>
                <span className={styles.heroRingValue}>1,847</span>
                <span className={styles.heroRingLabel}>kcal</span>
              </div>
            </div>
            <div className={styles.heroMacros}>
              {[
                { label: "Protein", pct: 72, color: "var(--protein)" },
                { label: "Carbs",   pct: 88, color: "var(--carbs)" },
                { label: "Fat",     pct: 55, color: "var(--fat)" },
              ].map((m) => (
                <div key={m.label} className={styles.heroMacroRow}>
                  <span className={styles.heroMacroLabel}>{m.label}</span>
                  <div className={styles.heroMacroTrack}>
                    <div
                      className={styles.heroMacroFill}
                      style={{ width: `${m.pct}%`, background: m.color }}
                    />
                  </div>
                  <span className={styles.heroMacroPct}>{m.pct}%</span>
                </div>
              ))}
            </div>
            <div className={styles.heroCardScan}>
              <span className="material-symbols-outlined">center_focus_strong</span>
              Scan next meal with AI →
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <section className={styles.statsStrip}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.statItem}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      {/* ── FEATURES ── */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <h2 className={styles.featuresTitle}>Everything you need to hit your goals</h2>
          <p className={styles.featuresSubtitle}>
            Built around AI from day one — not bolted on as an afterthought.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={`${styles.featureCard} ${styles[`feat_${f.color}`]}`}>
              <div className={styles.featureTopRow}>
                <span className={styles.featureEmoji}>{f.icon}</span>
                <span className={styles.featureTag}>{f.tag}</span>
              </div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className={styles.bottomCta}>
        <div className={styles.bottomCtaGlow} aria-hidden />
        <h2 className={styles.bottomCtaTitle}>Ready to transform your body?</h2>
        <p className={styles.bottomCtaDesc}>
          Join thousands of athletes using AI to eat smarter, train harder, and track effortlessly.
        </p>
        <Link href="/signup" id="bottom-cta-btn" className={styles.ctaPrimary}>
          <span className="material-symbols-outlined">bolt</span>
          Sign Up Free — No Credit Card
        </Link>
      </section>
    </main>
  );
}

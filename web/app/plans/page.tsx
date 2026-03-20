"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { Id } from "@/convex/_generated/dataModel";
import styles from "./Plans.module.css";

/* ══════════════════════════════════════════════
   PLAN CONFIG
══════════════════════════════════════════════ */
type PlanId = "free" | "pro" | "ultra";

const PLANS = [
  {
    id: "free" as PlanId,
    name: "Free",
    price: 0,
    tagline: "Start tracking today",
    color: "#4d6075",
    glow: "rgba(77,96,117,0.3)",
    gradient: "linear-gradient(135deg,rgba(77,96,117,.15),rgba(77,96,117,.04))",
    icon: "emoji_nature",
    badge: null,
    features: [
      { label: "AI meal scans",        value: "5 / day",      icon: "linked_camera" },
      { label: "Calorie tracking",     value: "✓",            icon: "local_fire_department" },
      { label: "Macro tracking",       value: "Basic",        icon: "bar_chart" },
      { label: "Meal history",         value: "7 days",       icon: "history" },
      { label: "FitBot AI coach",      value: "10 msgs/day",  icon: "smart_toy" },
      { label: "Progress charts",      value: "—",            icon: "trending_up",  dim: true },
      { label: "Custom goals",         value: "—",            icon: "target",       dim: true },
      { label: "Export data",          value: "—",            icon: "download",     dim: true },
    ],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    price: 9,
    tagline: "For serious athletes",
    color: "#3b96f5",
    glow: "rgba(59,150,245,0.35)",
    gradient: "linear-gradient(135deg,rgba(59,150,245,.18),rgba(59,150,245,.04))",
    icon: "bolt",
    badge: "Most Popular",
    features: [
      { label: "AI meal scans",        value: "Unlimited",    icon: "linked_camera" },
      { label: "Calorie tracking",     value: "✓",            icon: "local_fire_department" },
      { label: "Macro tracking",       value: "Advanced",     icon: "bar_chart" },
      { label: "Meal history",         value: "Unlimited",    icon: "history" },
      { label: "FitBot AI coach",      value: "Unlimited",    icon: "smart_toy" },
      { label: "Progress charts",      value: "✓",            icon: "trending_up" },
      { label: "Custom goals",         value: "✓",            icon: "target" },
      { label: "Export data",          value: "CSV / PDF",    icon: "download" },
    ],
  },
  {
    id: "ultra" as PlanId,
    name: "Ultra",
    price: 19,
    tagline: "Peak performance mode",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.35)",
    gradient: "linear-gradient(135deg,rgba(168,85,247,.18),rgba(168,85,247,.04))",
    icon: "rocket_launch",
    badge: "Best Value",
    features: [
      { label: "Everything in Pro",    value: "✓",            icon: "check_circle" },
      { label: "Body scan analysis",   value: "✓",            icon: "person_search" },
      { label: "Weekly AI insights",   value: "✓",            icon: "auto_awesome" },
      { label: "Meal planning",        value: "AI-generated", icon: "menu_book" },
      { label: "Priority AI",          value: "✓",            icon: "speed" },
      { label: "Dedicated support",    value: "24/7",         icon: "support_agent" },
      { label: "Early feature access", value: "✓",            icon: "new_releases" },
      { label: "Custom macros AI",     value: "✓",            icon: "tune" },
    ],
  },
] as const;

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function PlansPage() {
  const { user }    = useAuth();
  const userId      = user?._id ? (user._id as unknown as Id<"users">) : null;

  const planInfo    = useQuery(
    api.users.getUserPlan,
    userId ? { userId } : "skip"
  );
  const doUpdatePlan = useMutation(api.users.updatePlan);

  const currentPlan: PlanId = (planInfo?.plan as PlanId) ?? "free";

  const [loading, setLoading] = useState<PlanId | null>(null);
  const [success, setSuccess] = useState<PlanId | null>(null);
  const [annual, setAnnual]   = useState(false);

  async function handleSelect(planId: PlanId) {
    if (!userId || planId === currentPlan) return;
    setLoading(planId);
    try {
      await doUpdatePlan({ userId, plan: planId });
      setSuccess(planId);
      setTimeout(() => setSuccess(null), 3500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  const annualDiscount = 0.2;

  return (
    <div className={styles.page}>
      <Navbar />

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroContent}>
          <span className={styles.heroPill}>
            <span className="material-symbols-outlined">workspace_premium</span>
            Upgrade Your Journey
          </span>
          <h1 className={styles.heroTitle}>
            Choose Your<br />
            <span className={styles.heroGradient}>Power Level</span>
          </h1>
          <p className={styles.heroSub}>
            Unlock unlimited AI meal analysis, advanced analytics, and a personal nutrition coach.
          </p>

          {/* Billing toggle */}
          <div className={styles.billingToggle}>
            <span className={!annual ? styles.billingActive : styles.billingInactive}>Monthly</span>
            <button
              className={`${styles.toggleBg} ${annual ? styles.toggleOn : ""}`}
              onClick={() => setAnnual((v) => !v)}
              role="switch"
              aria-checked={annual}
              aria-label="Switch billing period"
            >
              <span className={styles.toggleThumb} />
            </button>
            <span className={annual ? styles.billingActive : styles.billingInactive}>
              Annual
              <span className={styles.saveBadge}>Save 20%</span>
            </span>
          </div>
        </div>
      </section>

      {/* ── Pricing cards ── */}
      <section className={styles.cardsSection}>
        <div className={styles.cardsGrid}>
          {PLANS.map((plan) => {
            const isActive  = currentPlan === plan.id;
            const isLoading = loading === plan.id;
            const isSuccess = success === plan.id;
            const price     = plan.price === 0
              ? 0
              : annual
                ? Math.round(plan.price * (1 - annualDiscount))
                : plan.price;

            return (
              <div
                key={plan.id}
                className={`${styles.card} ${isActive ? styles.cardActive : ""} ${plan.badge ? styles.cardFeatured : ""}`}
                style={{ "--plan-color": plan.color, "--plan-glow": plan.glow } as React.CSSProperties}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div className={styles.cardBadge} style={{ background: plan.color }}>
                    <span className="material-symbols-outlined">workspace_premium</span>
                    {plan.badge}
                  </div>
                )}

                {/* Current plan indicator */}
                {isActive && (
                  <div className={styles.currentBadge}>
                    <span className="material-symbols-outlined">check_circle</span>
                    Current Plan
                  </div>
                )}

                {/* Card header */}
                <div className={styles.cardHeader} style={{ background: plan.gradient }}>
                  <div className={styles.planIconWrap} style={{ background: `${plan.color}22`, borderColor: `${plan.color}44` }}>
                    <span className="material-symbols-outlined" style={{ color: plan.color, fontSize: 26 }}>
                      {plan.icon}
                    </span>
                  </div>
                  <div>
                    <div className={styles.planName} style={{ color: plan.color }}>{plan.name}</div>
                    <div className={styles.planTagline}>{plan.tagline}</div>
                  </div>
                </div>

                {/* Price */}
                <div className={styles.priceBlock}>
                  {plan.price === 0 ? (
                    <div className={styles.priceRow}>
                      <span className={styles.priceFree}>Free</span>
                      <span className={styles.pricePeriod}>forever</span>
                    </div>
                  ) : (
                    <div className={styles.priceRow}>
                      <span className={styles.priceCurrency}>$</span>
                      <span className={styles.priceNum}>{price}</span>
                      <span className={styles.pricePeriod}>
                        {annual ? "/ mo, billed annually" : "/ month"}
                      </span>
                    </div>
                  )}
                  {annual && plan.price > 0 && (
                    <div className={styles.priceAnnualNote}>
                      ${price * 12} / year · saves ${(plan.price - price) * 12}
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className={styles.featureList} role="list">
                  {plan.features.map((f) => (
                    <li
                      key={f.label}
                      className={`${styles.featureItem} ${"dim" in f && f.dim ? styles.featureDim : ""}`}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ color: "dim" in f && f.dim ? "var(--text-dim)" : plan.color }}
                      >
                        {f.icon}
                      </span>
                      <span className={styles.featureLabel}>{f.label}</span>
                      <span
                        className={styles.featureValue}
                        style={{ color: "dim" in f && f.dim ? "var(--text-dim)" : "var(--text-secondary)" }}
                      >
                        {f.value}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  className={`${styles.ctaBtn} ${isActive ? styles.ctaBtnActive : ""} ${isSuccess ? styles.ctaBtnSuccess : ""}`}
                  style={
                    isActive || isSuccess
                      ? {}
                      : { background: plan.color, boxShadow: `0 6px 24px ${plan.glow}` }
                  }
                  onClick={() => handleSelect(plan.id)}
                  disabled={isActive || isLoading || !userId}
                  id={`plan-select-${plan.id}`}
                  aria-label={`Select ${plan.name} plan`}
                >
                  {isLoading ? (
                    <><div className={styles.spin} />Activating…</>
                  ) : isSuccess ? (
                    <><span className="material-symbols-outlined">check_circle</span>Plan Activated!</>
                  ) : isActive ? (
                    <><span className="material-symbols-outlined">check</span>Current Plan</>
                  ) : plan.price === 0 ? (
                    <><span className="material-symbols-outlined">arrow_downward</span>Downgrade to Free</>
                  ) : (
                    <><span className="material-symbols-outlined">rocket_launch</span>Get {plan.name}</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Guarantee strip ── */}
      <section className={styles.footer}>
        <div className={styles.guaranteeRow}>
          {[
            { icon: "shield",         text: "Cancel anytime, no questions asked" },
            { icon: "lock",           text: "Secure payment, data encrypted" },
            { icon: "replay",         text: "30-day money-back guarantee" },
            { icon: "support_agent",  text: "24/7 support for Pro & Ultra" },
          ].map(({ icon, text }) => (
            <div key={text} className={styles.guaranteeItem}>
              <span className="material-symbols-outlined">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

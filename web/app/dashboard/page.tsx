"use client";
export const dynamic = "force-dynamic";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import styles from "./Dashboard.module.css";

/* ─── Animated Double Ring ─── */
function DoubleRing({
  cals, calTarget, protein, proteinTarget,
}: {
  cals: number; calTarget: number; protein: number; proteinTarget: number;
}) {
  const calPct = Math.min((cals / calTarget) * 100, 100) || 0;
  const proPct = Math.min((protein / proteinTarget) * 100, 100) || 0;

  const outerCirc = 2 * Math.PI * 95;
  const innerCirc = 2 * Math.PI * 72;
  const outerOffset = outerCirc * (1 - calPct / 100);
  const innerOffset = innerCirc * (1 - proPct / 100);
  const remaining  = Math.max(0, calTarget - cals);

  return (
    <div className={styles.ringWrap}>
      <svg viewBox="0 0 240 240" className={styles.ringSvg}>
        {/* Outer track */}
        <circle cx="120" cy="120" r="95" fill="none" strokeWidth="14" stroke="rgba(59,150,245,0.12)" />
        {/* Outer progress – calories */}
        <circle
          cx="120" cy="120" r="95" fill="none"
          strokeWidth="14" strokeLinecap="round"
          strokeDasharray={outerCirc} strokeDashoffset={outerOffset}
          stroke="var(--primary)"
          style={{ filter: "drop-shadow(0 0 10px rgba(59,150,245,0.5))" }}
          className={styles.ringTransition}
        />
        {/* Inner track */}
        <circle cx="120" cy="120" r="72" fill="none" strokeWidth="10" stroke="rgba(16,229,107,0.12)" />
        {/* Inner progress – protein */}
        <circle
          cx="120" cy="120" r="72" fill="none"
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={innerCirc} strokeDashoffset={innerOffset}
          stroke="var(--accent-green)"
          style={{ filter: "drop-shadow(0 0 8px rgba(16,229,107,0.5))" }}
          className={styles.ringTransition}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringVal}>{Math.round(cals)}</span>
        <span className={styles.ringUnit}>kcal</span>
        <span className={styles.ringRemain}>{Math.round(remaining)} left</span>
      </div>
      {/* Legend */}
      <div className={styles.ringLegend}>
        <div className={styles.ringLegendItem}>
          <div className={styles.legendDot} style={{ background: "var(--primary)" }} />
          <span>Calories</span>
        </div>
        <div className={styles.ringLegendItem}>
          <div className={styles.legendDot} style={{ background: "var(--accent-green)" }} />
          <span>Protein</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Macro Bar ─── */
function MacroBar({
  label, current, target, color, emoji,
}: {
  label: string; current: number; target: number; color: string; emoji: string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return (
    <div className={styles.macroBar}>
      <div className={styles.macroBarTop}>
        <span className={styles.macroEmoji}>{emoji}</span>
        <span className={styles.macroBarLabel}>{label}</span>
        <span className={styles.macroBarValue} style={{ color }}>
          {Math.round(current)}<small>g</small>
        </span>
        <span className={styles.macroBarTarget}>/ {target}g</span>
      </div>
      <div className={styles.macroTrack}>
        <div
          className={styles.macroFill}
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}60` }}
        />
      </div>
      <span className={styles.macroPct}>{Math.round(pct)}%</span>
    </div>
  );
}

/* ─── Stat Chip ─── */
function StatChip({ icon, label, value, color = "var(--text)" }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <div className={styles.statChip}>
      <span className={`material-symbols-outlined ${styles.statChipIcon}`} style={{ color }}>{icon}</span>
      <div>
        <div className={styles.statChipValue} style={{ color }}>{value}</div>
        <div className={styles.statChipLabel}>{label}</div>
      </div>
    </div>
  );
}

/* ─── Week Bar Chart ─── */
function WeekChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className={styles.weekChart}>
      {data.map((v, i) => {
        const pct = (v / max) * 100;
        return (
          <div key={days[i]} className={styles.weekBar}>
            <div className={styles.weekBarTrack}>
              <div
                className={`${styles.weekBarFill} ${i === todayIdx ? styles.weekBarFillActive : ""}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className={`${styles.weekDay} ${i === todayIdx ? styles.weekDayActive : ""}`}>{days[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main Page ─── */
export default function DashboardPage() {
  const today   = new Date().toISOString().split("T")[0];
  const meals   = useQuery(api.meals.getTodayMeals, { date: today }) ?? [];
  const summary = useQuery(api.daily.getDailySummary, { date: today });
  const user    = useQuery(api.users.getMe);

  const calorieTarget = (user as any)?.dailyCalorieTarget ?? 2000;
  const proteinTarget = (user as any)?.dailyProteinTarget ?? 150;
  const consumed  = summary?.totalCalories ?? 0;
  const protein   = summary?.totalProtein  ?? 0;
  const carbs     = summary?.totalCarbs    ?? 0;
  const fat       = summary?.totalFat      ?? 0;
  const carbsTarget = Math.round(calorieTarget * 0.45 / 4);
  const fatTarget   = Math.round(calorieTarget * 0.25 / 9);
  const burned      = summary?.workoutDone ? 450 : 0;
  const net         = consumed - burned;

  // Mock weekly data
  const weekData = [1650, 1900, 2100, 1780, net, 0, 0].slice(0, 7);

  return (
    <div className={styles.page}>
      <Navbar />

      <div className={styles.container}>
        {/* ── Greeting bar ── */}
        <div className={styles.greetBar}>
          <div>
            <h1 className={styles.greetTitle}>
              Good {getTimeOfDay()}, {(user as any)?.name?.split(" ")[0] || "Champ"} 👋
            </h1>
            <p className={styles.greetSub}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className={styles.greetChips}>
            <StatChip icon="local_fire_department" label="Consumed" value={`${Math.round(consumed)} kcal`} color="var(--primary)" />
            <StatChip icon="fitness_center"        label="Burned"   value={`${burned} kcal`}              color="var(--accent-green)" />
            <StatChip icon="balance"               label="Net"      value={`${Math.round(net)} kcal`}     color={net < calorieTarget ? "var(--accent-green)" : "var(--fat)"} />
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className={styles.mainGrid}>
          {/* ── Ring + Macros card ── */}
          <div className={`${styles.glassCard} ${styles.ringCard}`}>
            <div className={styles.cardLabel}>Daily Progress</div>
            <div className={styles.ringMacroWrap}>
              <DoubleRing
                cals={consumed} calTarget={calorieTarget}
                protein={protein} proteinTarget={proteinTarget}
              />
              <div className={styles.macrosColumn}>
                <MacroBar label="Protein" current={protein} target={proteinTarget} color="var(--protein)"  emoji="🥩" />
                <MacroBar label="Carbs"   current={carbs}   target={carbsTarget}  color="var(--carbs)"   emoji="🌾" />
                <MacroBar label="Fat"     current={fat}      target={fatTarget}    color="var(--fat)"     emoji="🥑" />
                <MacroBar label="Burned"  current={burned}   target={600}          color="var(--primary)" emoji="🔥" />
              </div>
            </div>
          </div>

          {/* ── Scan Action card ── */}
          <Link href="/log" className={`${styles.scanCard}`} id="dash-scan-btn">
            <div className={styles.scanGlow} aria-hidden />
            <span className={`material-symbols-outlined ${styles.scanBg}`} aria-hidden>center_focus_strong</span>
            <div className={styles.scanIconBox}>
              <span className="material-symbols-outlined">linked_camera</span>
            </div>
            <h3 className={styles.scanTitle}>Log Meal with AI</h3>
            <p className={styles.scanSub}>Snap a photo · Get instant macros · Zero effort</p>
            <div className={styles.scanCta}>
              <span>Scan Now</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </div>
          </Link>
        </div>

        {/* ── Today's Meals ── */}
        <section>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Today's Meals</h2>
            <Link href="/log" className={styles.sectionLink}>
              View All <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          </div>
          <div className={styles.mealRow}>
            {meals.map((meal: any, idx: number) => {
              const tagClasses = [styles.tagBreakfast, styles.tagLunch, styles.tagDinner, styles.tagSnack];
              const fallbackImgs = [
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800&auto=format&fit=crop",
                "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
              ];
              return (
                <div key={meal._id} className={styles.mealCard}>
                  <img
                    src={meal.imageUrl || fallbackImgs[idx % 4]}
                    alt={meal.mealType}
                    className={styles.mealImg}
                  />
                  <div className={styles.mealOverlay} />
                  <div className={styles.mealContent}>
                    <span className={`${styles.mealTag} ${tagClasses[idx % 4]}`}>{meal.mealType}</span>
                    <h4 className={styles.mealName}>{meal.name}</h4>
                    <p className={styles.mealMeta}>{Math.round(meal.calories)} kcal · {Math.round(meal.proteinG)}g protein</p>
                  </div>
                </div>
              );
            })}
            {/* Add a meal card */}
            <Link href="/log" className={styles.addMealCard} id="dash-add-meal">
              <span className={`material-symbols-outlined ${styles.addMealIcon}`}>add_circle</span>
              <span className={styles.addMealText}>Log Next Meal</span>
            </Link>
          </div>
        </section>

        {/* ── Bottom Row ── */}
        <div className={styles.bottomRow}>
          {/* Progress card */}
          <div className={styles.glassCard}>
            <div className={styles.cardLabel}>Body Progress</div>
            <div className={styles.progressWeight}>
              <span className={styles.progressWeightVal}>{(user as any)?.weight ? (user as any).weight + " kg" : "--"}</span>
              <span className={styles.progressWeightLabel}>Current Weight</span>
            </div>
            <div className={styles.progressPhotos}>
              {[
                { label: "Initial", date: "OCT 12", active: false, src: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=400&auto=format&fit=crop" },
                { label: "Current", date: "TODAY",  active: true,  src: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=400&auto=format&fit=crop" },
              ].map((p) => (
                <div key={p.label} className={styles.photoCol}>
                  <div className={`${styles.photoBox} ${p.active ? styles.photoBoxActive : ""}`}>
                    <img src={p.src} alt={p.label} className={styles.photoImg} />
                    <span className={`${styles.photoDate} ${p.active ? styles.photoDateActive : ""}`}>{p.date}</span>
                  </div>
                  <span className={`${styles.photoLabel} ${p.active ? styles.photoLabelActive : ""}`}>{p.label}</span>
                </div>
              ))}
            </div>
            <Link href="/progress" className={styles.updateBtn}>
              <span className="material-symbols-outlined">camera_alt</span>
              Update Progress Photo
            </Link>
          </div>

          {/* Weekly chart + AI insights */}
          <div className={styles.insightsCol}>
            {/* AI tips */}
            <div className={styles.glassCard}>
              <div className={styles.cardLabel}>AI Insights</div>
              <div className={styles.insightList}>
                <div className={`${styles.insight} ${styles.insightBlue}`}>
                  <span className={`material-symbols-outlined ${styles.insightIcon}`}>psychology</span>
                  <div>
                    <strong>Protein Status</strong>
                    <p>
                      {protein < proteinTarget * 0.5
                        ? "You're behind on protein today. Try adding Greek yogurt or chicken."
                        : `Great! You're at ${Math.round((protein / proteinTarget) * 100)}% of your protein goal. Keep it up!`}
                    </p>
                  </div>
                </div>
                <div className={`${styles.insight} ${styles.insightGreen}`}>
                  <span className={`material-symbols-outlined ${styles.insightIcon}`}>trending_down</span>
                  <div>
                    <strong>Calorie Balance</strong>
                    <p>
                      {consumed < calorieTarget
                        ? `${Math.round(calorieTarget - consumed)} kcal remaining today — ideal for a slight deficit.`
                        : "You've reached your calorie target. Avoid late-night snacking!"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly chart */}
            <div className={styles.glassCard}>
              <div className={styles.cardLabel}>
                <span className={`material-symbols-outlined ${styles.chartIcon}`}>analytics</span>
                Weekly Calorie Trend
              </div>
              <WeekChart data={weekData} />
            </div>
          </div>
        </div>
      </div>

      {/* FitBot FAB */}
      <Link href="/chat" className={styles.fab} id="dash-fitbot-fab">
        <div className={styles.fabGlow} aria-hidden />
        <div className={styles.fabInner}>
          <span className={`material-symbols-outlined ${styles.fabIcon}`}>smart_toy</span>
          <span className={styles.fabBadge} />
        </div>
        <div className={styles.fabTooltip}>
          <div className={styles.fabTooltipTitle}>FitBot AI</div>
          <div className={styles.fabTooltipText}>
            "{(user as any)?.name?.split(" ")[0] || "Hey"}! I'm ready to help with macros, workouts &amp; more."
          </div>
          <div className={styles.fabTooltipArrow} />
        </div>
      </Link>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

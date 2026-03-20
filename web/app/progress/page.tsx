"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import styles from "./Progress.module.css";

/* ── Types ── */
type Period = "7d" | "30d" | "90d";

/* ── Period helpers ── */
function getPeriodDays(p: Period): number {
  return p === "7d" ? 7 : p === "30d" ? 30 : 90;
}

function getFromDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return d.toISOString().split("T")[0];
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/* ── Day label helpers ── */
function buildDayLabels(trend: { date: string; calories: number }[], period: Period): string[] {
  if (period === "7d") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return trend.map((t) => days[new Date(t.date).getDay()]);
  }
  if (period === "30d") {
    return trend.map((_, i) => (i % 5 === 0 ? `D${i + 1}` : ""));
  }
  // 90d — show month/week labels
  return trend.map((t, i) => (i % 14 === 0 ? new Date(t.date).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""));
}

/* ── Loading skeleton ── */
function Skeleton({ w = "100%", h = 24 }: { w?: string; h?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 8,
        background: "var(--surface-elevated)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

/* ── Main Page ── */
export default function ProgressPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const { user } = useAuth();

  const days = getPeriodDays(period);
  const today = getToday();
  const fromDate = getFromDate(days);

  // All backend queries are skipped until we have a userId
  const userId = user?._id as any;
  const skip = !userId ? "skip" : undefined;

  const stats = useQuery(
    api.progress.getStats,
    skip ?? { userId, fromDate, toDate: today }
  );

  const trendRaw = useQuery(
    api.progress.getCalorieTrend,
    skip ?? { userId, fromDate, toDate: today }
  );

  const macros = useQuery(
    api.progress.getMacroTotals,
    skip ?? { userId, fromDate, toDate: today }
  );

  const achievements = useQuery(
    api.progress.getAchievements,
    skip ?? { userId }
  );

  const weightHistory = useQuery(
    api.progress.getWeightHistory,
    skip ?? { userId, fromDate: getFromDate(90), toDate: today }
  );

  // ── Derived chart values ──
  const trend = trendRaw ?? [];
  const dayLabels = useMemo(() => buildDayLabels(trend, period), [trend, period]);

  // For bar chart: cap display at 30 bars to avoid overflow on 90d
  const displayTrend = useMemo(() => {
    if (period === "90d") {
      // sample every 3rd day
      return trend.filter((_, i) => i % 3 === 0);
    }
    return trend;
  }, [trend, period]);
  const displayLabels = useMemo(() => buildDayLabels(displayTrend, period), [displayTrend, period]);

  const maxCal = Math.max(...displayTrend.map((t) => t.calories), 100);
  const calorieGoal = user?.calorieGoal ?? 2000;

  // ── Stat cards ──
  const statCards = [
    {
      label: "Avg Calories",
      value: stats ? stats.avgCalories.toLocaleString() : "--",
      unit: "kcal",
      icon: "local_fire_department",
      color: "var(--primary)",
    },
    {
      label: "Avg Protein",
      value: stats ? String(stats.avgProtein) : "--",
      unit: "g/day",
      icon: "fitness_center",
      color: "var(--protein)",
    },
    {
      label: "Days Logged",
      value: stats ? `${stats.daysLogged}` : "--",
      unit: `/ ${stats?.totalDays ?? days}`,
      icon: "calendar_today",
      color: "var(--accent-green)",
    },
    {
      label: "Streak",
      value: stats ? String(stats.streak) : "--",
      unit: "days",
      icon: "bolt",
      color: "var(--accent-purple)",
    },
  ];

  const isLoading = !user || stats === undefined || trendRaw === undefined || macros === undefined;

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Your Progress</h1>
            <p className={styles.subtitle}>Track your journey — every macro logged counts</p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              className={styles.periodTab}
              style={{ display: "flex", gap: "6px", alignItems: "center", background: "var(--primary)", color: "#000", fontWeight: 700 }}
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: "Cal AI Progress",
                    text: `I'm on a ${stats?.streak || 0}-day streak on Cal AI! 🔥 Tracking my macros has never been easier.`,
                    url: window.location.origin,
                  }).catch(console.error);
                } else {
                  alert("Sharing is not supported on this browser.");
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>ios_share</span>
              Share
            </button>
            <div className={styles.periodTabs} id="progress-period">
              {(["7d", "30d", "90d"] as Period[]).map((p) => (
                <button
                  key={p}
                  className={`${styles.periodTab} ${period === p ? styles.periodTabActive : ""}`}
                  onClick={() => setPeriod(p)}
                  id={`progress-period-${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className={styles.statsGrid} id="progress-stats">
          {statCards.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${s.color}22`, color: s.color }}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <div>
                <div className={styles.statVal}>
                  {isLoading ? <Skeleton w="60px" h={22} /> : s.value}
                  {!isLoading && <span className={styles.statUnit}>{s.unit}</span>}
                </div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.mainGrid}>
          {/* Left column */}
          <div className={styles.leftCol}>

            {/* Calorie chart */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">bar_chart</span>
                <strong>Calorie Trend</strong>
                <span className={styles.cardChip}>Last {days} Days</span>
              </div>

              <div className={styles.chartArea} id="progress-calorie-chart">
                {isLoading ? (
                  <Skeleton h={180} />
                ) : (
                  <>
                    <div className={styles.barChart}>
                      {displayTrend.map((item, i) => {
                        const pct = maxCal > 0 ? (item.calories / maxCal) * 100 : 0;
                        const isToday = item.date === today;
                        return (
                          <div key={item.date} className={styles.barWrap} title={`${item.date}: ${item.calories} kcal`}>
                            {item.calories > 0 && (
                              <div className={styles.barLabel}>{item.calories > 999 ? `${Math.round(item.calories / 100) / 10}k` : item.calories}</div>
                            )}
                            <div className={styles.barTrack}>
                              <div
                                className={`${styles.barFill} ${isToday ? styles.barFillToday : ""}`}
                                style={{ height: `${pct}%` }}
                              />
                            </div>
                            {displayLabels[i] && (
                              <div className={`${styles.barDay} ${isToday ? styles.barDayActive : ""}`}>
                                {displayLabels[i]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.goalLine}>
                      <span>Goal: {calorieGoal.toLocaleString()} kcal</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Macro breakdown */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">donut_large</span>
                <strong>Macro Split</strong>
                <span className={styles.cardChip}>Period Average</span>
              </div>
              {isLoading ? (
                <Skeleton h={160} />
              ) : macros && (macros.totalProtein + macros.totalCarbs + macros.totalFat) > 0 ? (
                <div className={styles.macroRow}>
                  {[
                    {
                      label: "Protein",
                      pct: macros.proteinPct,
                      grams: `${macros.avgProtein}g/day`,
                      color: "var(--protein)",
                    },
                    {
                      label: "Carbs",
                      pct: macros.carbsPct,
                      grams: `${macros.avgCarbs}g/day`,
                      color: "var(--carbs)",
                    },
                    {
                      label: "Fat",
                      pct: macros.fatPct,
                      grams: `${macros.avgFat}g/day`,
                      color: "var(--fat)",
                    },
                  ].map((m) => (
                    <div key={m.label} className={styles.macroItem}>
                      <div className={styles.macroBar}>
                        <div
                          className={styles.macroBarFill}
                          style={{ height: `${m.pct * 1.6}px`, background: m.color }}
                        />
                      </div>
                      <div className={styles.macroName} style={{ color: m.color }}>{m.label}</div>
                      <div className={styles.macroPct}>{m.pct}%</div>
                      <div className={styles.macroGrams}>{m.grams}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 14 }}>
                  No macro data for this period yet.
                  <br />Start logging meals to see your breakdown.
                </div>
              )}
            </div>

            {/* Weight history (if available) */}
            {weightHistory && weightHistory.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className="material-symbols-outlined">monitor_weight</span>
                  <strong>Weight History</strong>
                  <span className={styles.cardChip}>Last 90 Days</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {weightHistory.slice(-7).map((w) => (
                    <div key={w.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface-elevated)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                      <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                        {new Date(w.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </span>
                      <span style={{ fontWeight: 800, color: "var(--primary)" }}>{w.weightKg} kg</span>
                    </div>
                  ))}
                  {weightHistory.length > 1 && (() => {
                    const first = weightHistory[0].weightKg;
                    const last = weightHistory[weightHistory.length - 1].weightKg;
                    const diff = +(last - first).toFixed(1);
                    const color = diff < 0 ? "var(--accent-green)" : diff > 0 ? "var(--fat)" : "var(--text-muted)";
                    return (
                      <div style={{ textAlign: "center", fontSize: 12, color, fontWeight: 700, marginTop: 4 }}>
                        {diff > 0 ? "+" : ""}{diff} kg since start
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className={styles.rightCol}>

            {/* Summary card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">insights</span>
                <strong>Period Summary</strong>
              </div>
              {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...Array(4)].map((_, i) => <Skeleton key={i} h={36} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    {
                      label: "Total Calories",
                      value: `${((stats?.avgCalories ?? 0) * (stats?.daysLogged ?? 0)).toLocaleString()} kcal`,
                      icon: "🔥",
                    },
                    {
                      label: "Total Protein",
                      value: `${macros?.totalProtein ?? 0} g`,
                      icon: "💪",
                    },
                    {
                      label: "Total Carbs",
                      value: `${macros?.totalCarbs ?? 0} g`,
                      icon: "🌾",
                    },
                    {
                      label: "Total Fat",
                      value: `${macros?.totalFat ?? 0} g`,
                      icon: "🥑",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "var(--surface-elevated)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontWeight: 600 }}>
                        <span>{row.icon}</span> {row.label}
                      </span>
                      <span style={{ fontWeight: 800 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">emoji_events</span>
                <strong>Achievements</strong>
                {achievements && (
                  <span className={styles.cardChip}>
                    {achievements.filter((a) => a.earned).length} / {achievements.length}
                  </span>
                )}
              </div>
              <div className={styles.achieveGrid} id="progress-achievements">
                {isLoading || !achievements ? (
                  [...Array(6)].map((_, i) => <Skeleton key={i} h={52} />)
                ) : (
                  achievements.map((a) => (
                    <div
                      key={a.label}
                      className={`${styles.achieveItem} ${a.earned ? styles.achieveItemEarned : ""}`}
                      title={a.description}
                    >
                      <span className={styles.achieveEmoji}>{a.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.achieveLabel}>{a.label}</div>
                        {!a.earned && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                            {a.progress}/{a.goal}
                          </div>
                        )}
                      </div>
                      {!a.earned && <span className={styles.achieveLock}>🔒</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Consistency heatmap (simple version) */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">grid_on</span>
                <strong>Logging Consistency</strong>
                <span className={styles.cardChip}>Last 7 Days</span>
              </div>
              {isLoading ? (
                <Skeleton h={60} />
              ) : (
                <ConsistencyRow
                  trend={trend.slice(-7)}
                  calorieGoal={calorieGoal}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Consistency row component ── */
function ConsistencyRow({
  trend,
  calorieGoal,
}: {
  trend: { date: string; calories: number }[];
  calorieGoal: number;
}) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Build 7 slots ending at today
  const slots: { label: string; calories: number; date: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = days[(d.getDay() + 6) % 7];
    const match = trend.find((t) => t.date === dateStr);
    slots.push({ label: dayName, calories: match?.calories ?? 0, date: dateStr });
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {slots.map((slot) => {
        const pct = Math.min(slot.calories / calorieGoal, 1);
        const color =
          slot.calories === 0
            ? "var(--surface-elevated)"
            : pct >= 0.9
            ? "var(--primary)"
            : pct >= 0.5
            ? "rgba(59,150,245,0.4)"
            : "rgba(59,150,245,0.15)";
        return (
          <div
            key={slot.date}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
            title={`${slot.date}: ${slot.calories} kcal`}
          >
            <div
              style={{
                width: "100%",
                aspectRatio: "1",
                borderRadius: 6,
                background: color,
                border: "1px solid var(--border)",
                transition: "background 0.3s",
              }}
            />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>{slot.label}</span>
          </div>
        );
      })}
    </div>
  );
}

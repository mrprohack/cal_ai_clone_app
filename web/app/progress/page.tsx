"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import styles from "./Progress.module.css";

/* ── Types ── */
type Period = "7d" | "30d" | "90d";

/* ── Mock data ── */
const WEEKLY_CALS = [1840, 2100, 1780, 2240, 1980, 2050, 1920];
const DAY_LABELS  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MAX_CAL     = 2500;

const STATS = [
  { label: "Avg Calories",   value: "1,987",   unit: "kcal",  icon: "local_fire_department", color: "var(--primary)" },
  { label: "Avg Protein",    value: "142",      unit: "g/day", icon: "fitness_center",         color: "var(--protein)" },
  { label: "Days Logged",    value: "23",       unit: "/ 30",  icon: "calendar_today",         color: "var(--accent-green)" },
  { label: "Streak",         value: "7",        unit: "days",  icon: "bolt",                   color: "var(--accent-purple)" },
];

const ACHIEVEMENTS = [
  { label: "7-Day Streak",       icon: "🔥", earned: true  },
  { label: "Protein Champion",   icon: "💪", earned: true  },
  { label: "First Scan",         icon: "📸", earned: true  },
  { label: "30-Day Consistency", icon: "🏅", earned: false },
  { label: "1000 Meals Logged",  icon: "🍽️", earned: false },
  { label: "Perfect Week",       icon: "⭐", earned: false },
];

const PROGRESS_PHOTOS = [
  { date: "Oct 12",  label: "Start",   bg: "#1c2a1c" },
  { date: "Nov 01",  label: "Month 1", bg: "#1a2230" },
  { date: "Nov 15",  label: "6 weeks", bg: "#201d2e" },
  { date: "Mar 18",  label: "Today",   bg: "#1e2825" },
];

export default function ProgressPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const cals = WEEKLY_CALS;

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
          <div className={styles.periodTabs} id="progress-period">
            {(["7d","30d","90d"] as Period[]).map((p) => (
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

        {/* Stat cards */}
        <div className={styles.statsGrid} id="progress-stats">
          {STATS.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${s.color}22`, color: s.color }}>
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <div>
                <div className={styles.statVal}>
                  {s.value}<span className={styles.statUnit}>{s.unit}</span>
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
                <span className={styles.cardChip}>Last 7 Days</span>
              </div>

              <div className={styles.chartArea} id="progress-calorie-chart">
                <div className={styles.barChart}>
                  {cals.map((val, i) => {
                    const pct = (val / MAX_CAL) * 100;
                    const isToday = i === 6;
                    return (
                      <div key={i} className={styles.barWrap}>
                        <div className={styles.barLabel}>{val.toLocaleString()}</div>
                        <div className={styles.barTrack}>
                          <div
                            className={`${styles.barFill} ${isToday ? styles.barFillToday : ""}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <div className={`${styles.barDay} ${isToday ? styles.barDayActive : ""}`}>{DAY_LABELS[i]}</div>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.goalLine}>
                  <span>Goal: 2,000 kcal</span>
                </div>
              </div>
            </div>

            {/* Macro breakdown */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">donut_large</span>
                <strong>Weekly Macro Split</strong>
              </div>
              <div className={styles.macroRow}>
                {[
                  { label: "Protein", pct: 30, grams: "142g", color: "var(--protein)" },
                  { label: "Carbs",   pct: 45, grams: "248g", color: "var(--carbs)"   },
                  { label: "Fat",     pct: 25, grams: "55g",  color: "var(--fat)"     },
                ].map((m) => (
                  <div key={m.label} className={styles.macroItem}>
                    <div className={styles.macroBar}>
                      <div className={styles.macroBarFill} style={{ height: `${m.pct * 2}px`, background: m.color }} />
                    </div>
                    <div className={styles.macroName} style={{ color: m.color }}>{m.label}</div>
                    <div className={styles.macroPct}>{m.pct}%</div>
                    <div className={styles.macroGrams}>{m.grams}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className={styles.rightCol}>
            {/* Progress photos */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">photo_library</span>
                <strong>Body Progress</strong>
                <button className={styles.addPhotoBtn} id="progress-add-photo">
                  <span className="material-symbols-outlined">add_a_photo</span>
                  Add
                </button>
              </div>
              <div className={styles.photoGrid} id="progress-photos">
                {PROGRESS_PHOTOS.map((ph) => (
                  <div key={ph.date} className={styles.photoCard}>
                    <div className={styles.photoImg} style={{ background: ph.bg }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3, color: "#fff" }}>person</span>
                    </div>
                    <div className={styles.photoDate}>{ph.date}</div>
                    <div className={styles.photoLabel}>{ph.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className="material-symbols-outlined">emoji_events</span>
                <strong>Achievements</strong>
                <span className={styles.cardChip}>3 / 6</span>
              </div>
              <div className={styles.achieveGrid} id="progress-achievements">
                {ACHIEVEMENTS.map((a) => (
                  <div key={a.label} className={`${styles.achieveItem} ${a.earned ? styles.achieveItemEarned : ""}`}>
                    <span className={styles.achieveEmoji}>{a.icon}</span>
                    <span className={styles.achieveLabel}>{a.label}</span>
                    {!a.earned && <span className={styles.achieveLock}>🔒</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

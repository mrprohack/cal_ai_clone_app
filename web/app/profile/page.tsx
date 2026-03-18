"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import styles from "./Profile.module.css";

type Tab = "goals" | "account" | "notifications" | "premium";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "goals",         label: "Goals",         icon: "track_changes" },
  { id: "account",       label: "Account",        icon: "manage_accounts" },
  { id: "notifications", label: "Notifications",  icon: "notifications" },
  { id: "premium",       label: "Premium",        icon: "workspace_premium" },
];

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("goals");

  /* Goal state */
  const [calories, setCalories]   = useState(2000);
  const [protein,  setProtein]    = useState(150);
  const [carbs,    setCarbs]      = useState(225);
  const [fat,      setFat]        = useState(56);
  const [weight,   setWeight]     = useState(75);
  const [saved,    setSaved]      = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.container}>
        {/* Profile card */}
        <div className={styles.profileCard} id="profile-card">
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              <span className="material-symbols-outlined">person</span>
            </div>
            <button className={styles.avatarEditBtn} id="profile-edit-avatar">
              <span className="material-symbols-outlined">photo_camera</span>
            </button>
          </div>
          <div className={styles.profileInfo}>
            <h2 className={styles.profileName}>Champ ✌️</h2>
            <p className={styles.profileEmail}>champ@calfuel.ai</p>
            <div className={styles.profileBadges}>
              <span className={styles.badge} style={{ background: "rgba(16,229,107,0.15)", color: "var(--accent-green)" }}>
                🔥 7-Day Streak
              </span>
              <span className={styles.badge} style={{ background: "rgba(139,92,246,0.15)", color: "var(--accent-purple)" }}>
                ⭐ Pro Member
              </span>
              <span className={styles.badge} style={{ background: "rgba(59,130,246,0.15)", color: "var(--primary-light)" }}>
                💪 Protein Champion
              </span>
            </div>
          </div>
          <div className={styles.profileStats}>
            <div className={styles.profileStat}><span className={styles.profileStatNum}>23</span><span className={styles.profileStatLbl}>Days Logged</span></div>
            <div className={styles.profileStat}><span className={styles.profileStatNum}>142</span><span className={styles.profileStatLbl}>Meals Scanned</span></div>
            <div className={styles.profileStat}><span className={styles.profileStatNum}>4.2kg</span><span className={styles.profileStatLbl}>Lost</span></div>
          </div>
        </div>

        <div className={styles.mainGrid}>
          {/* Tabs */}
          <nav className={styles.tabs} id="profile-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ""}`}
                onClick={() => setTab(t.id)}
                id={`profile-tab-${t.id}`}
              >
                <span className="material-symbols-outlined">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Tab panels */}
          <div className={styles.panel}>
            {tab === "goals" && (
              <div className={styles.goalsPanel}>
                <h3 className={styles.panelTitle}>Nutrition Goals</h3>
                <p className={styles.panelSub}>Fine-tune your daily targets. FitBot adapts its advice accordingly.</p>

                <div className={styles.goalsList}>
                  {[
                    { label: "Daily Calories", unit: "kcal", val: calories, set: setCalories, min: 1200, max: 4000, step: 50, icon: "🔥" },
                    { label: "Protein",         unit: "g",    val: protein,  set: setProtein,  min: 40,   max: 300,  step: 5,  icon: "💪" },
                    { label: "Carbohydrates",   unit: "g",    val: carbs,    set: setCarbs,    min: 50,   max: 500,  step: 5,  icon: "🌾" },
                    { label: "Fat",             unit: "g",    val: fat,      set: setFat,      min: 20,   max: 200,  step: 2,  icon: "🥑" },
                    { label: "Body Weight",     unit: "kg",   val: weight,   set: setWeight,   min: 30,   max: 200,  step: 0.5,icon: "⚖️" },
                  ].map((g) => (
                    <div key={g.label} className={styles.goalRow} id={`profile-goal-${g.label.toLowerCase().replace(/\s+/g,"-")}`}>
                      <div className={styles.goalLeft}>
                        <span className={styles.goalEmoji}>{g.icon}</span>
                        <div>
                          <div className={styles.goalLabel}>{g.label}</div>
                          <div className={styles.goalUnit}>{g.unit}/day</div>
                        </div>
                      </div>
                      <div className={styles.goalRight}>
                        <button className={styles.numBtn} onClick={() => g.set(Math.max(g.min, g.val - g.step))}>−</button>
                        <span className={styles.goalVal}>{g.val}{g.unit}</span>
                        <button className={styles.numBtn} onClick={() => g.set(Math.min(g.max, g.val + g.step))}>+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <button className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ""}`} onClick={handleSave} id="profile-save-goals">
                  {saved
                    ? <><span className="material-symbols-outlined">check</span>Saved!</>
                    : <><span className="material-symbols-outlined">save</span>Save Goals</>
                  }
                </button>
              </div>
            )}

            {tab === "account" && (
              <div className={styles.accountPanel}>
                <h3 className={styles.panelTitle}>Account Details</h3>
                <div className={styles.fieldList}>
                  {[
                    { label: "Display Name",  val: "Champ",                     id: "profile-name-field"  },
                    { label: "Email",         val: "champ@calfuel.ai",           id: "profile-email-field" },
                    { label: "Date of Birth", val: "Jan 15, 1995",               id: "profile-dob-field"   },
                    { label: "Height",        val: "178 cm",                     id: "profile-height-field"},
                    { label: "Activity Level",val: "Moderately Active (4x/wk)",  id: "profile-activity-field" },
                    { label: "Goal",          val: "Lose weight, maintain muscle",id: "profile-goal-field" },
                  ].map((f) => (
                    <div key={f.label} className={styles.fieldRow} id={f.id}>
                      <span className={styles.fieldLabel}>{f.label}</span>
                      <div className={styles.fieldVal}>
                        <span>{f.val}</span>
                        <button className={styles.editBtn}>
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className={styles.dangerBtn} id="profile-delete-account">
                  <span className="material-symbols-outlined">delete_forever</span>
                  Delete Account
                </button>
              </div>
            )}

            {tab === "notifications" && (
              <div className={styles.notifPanel}>
                <h3 className={styles.panelTitle}>Notifications</h3>
                {[
                  { label: "Daily Calorie Reminder",    sub: "Get nudged if you haven't logged by 8 pm", on: true  },
                  { label: "Streak Alerts",             sub: "Be warned before losing your streak",       on: true  },
                  { label: "Weekly Progress Report",    sub: "Summary every Sunday morning",              on: true  },
                  { label: "FitBot Tips",               sub: "Daily AI nutrition tip",                    on: false },
                  { label: "New Feature Announcements", sub: "Stay up to date with CalAI",                on: false },
                ].map((n) => (
                  <div key={n.label} className={styles.notifRow} id={`profile-notif-${n.label.toLowerCase().replace(/\s+/g,"-")}`}>
                    <div>
                      <div className={styles.notifLabel}>{n.label}</div>
                      <div className={styles.notifSub}>{n.sub}</div>
                    </div>
                    <label className={styles.toggle}>
                      <input type="checkbox" defaultChecked={n.on} className={styles.toggleInput} />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {tab === "premium" && (
              <div className={styles.premiumPanel}>
                <div className={styles.premiumBanner}>
                  <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#f59e0b" }}>workspace_premium</span>
                  <h3 className={styles.premiumTitle}>You're on CalAI Pro ⭐</h3>
                  <p className={styles.premiumSub}>Renews on April 18, 2025 · $9.99/month</p>
                </div>
                <div className={styles.premiumFeatures}>
                  {[
                    "Unlimited AI meal scans",
                    "FitBot personalised coaching",
                    "Advanced macro analytics",
                    "Progress photo storage (unlimited)",
                    "Custom goal setting",
                    "Priority support",
                  ].map((f) => (
                    <div key={f} className={styles.premiumFeature}>
                      <span className="material-symbols-outlined" style={{ color: "var(--accent-green)" }}>check_circle</span>
                      {f}
                    </div>
                  ))}
                </div>
                <button className={styles.manageBtn} id="profile-manage-subscription">
                  Manage Subscription
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

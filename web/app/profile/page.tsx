"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { updateProfile, deleteAccount as doDeleteAccount, exportData, getUserPlan } from "@/lib/actions/users";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import styles from "./Profile.module.css";
import { AuthGuard } from "@/components/AuthGuard";

type Tab = "goals" | "account" | "notifications" | "premium";
type SaveState = "idle" | "saving" | "done" | "error";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "goals",         label: "Goals",        icon: "track_changes"      },
  { id: "account",       label: "Account",       icon: "manage_accounts"    },
  { id: "notifications", label: "Notifications", icon: "notifications"      },
  { id: "premium",       label: "Premium",       icon: "workspace_premium"  },
];

/* ─────────────────────────────────────────────
   Skeleton shimmer block
───────────────────────────────────────────── */
function Skeleton({ w = "100%", h = "16px", radius = "8px", style }: { w?: string; h?: string; radius?: string; style?: React.CSSProperties }) {
  return <div className={styles.skeleton} style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

/* ─────────────────────────────────────────────
   Inline editable field (account tab)
───────────────────────────────────────────── */
function EditableField({
  label, value, id, onSave, type = "text", loading,
}: {
  label: string; value: string; id: string;
  onSave: (v: string) => void; type?: string; loading?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() { onSave(draft.trim() || value); setEditing(false); }
  function cancel()  { setDraft(value); setEditing(false); }

  if (loading) {
    return (
      <div className={styles.fieldRow} id={id}>
        <Skeleton w="110px" h="13px" />
        <Skeleton w="160px" h="13px" />
      </div>
    );
  }

  return (
    <div className={styles.fieldRow} id={id}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={styles.fieldVal}>
        {editing ? (
          <>
            <input
              ref={inputRef}
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  commit();
                if (e.key === "Escape") cancel();
              }}
              className={styles.fieldInput}
            />
            <button className={`${styles.editBtn} ${styles.editBtnConfirm}`} onClick={commit} title="Save">
              <span className="material-symbols-outlined">check</span>
            </button>
            <button className={styles.editBtn} onClick={cancel} title="Cancel">
              <span className="material-symbols-outlined">close</span>
            </button>
          </>
        ) : (
          <>
            <span className={styles.fieldValueText}>{value || "—"}</span>
            <button className={styles.editBtn} onClick={() => setEditing(true)} title="Edit">
              <span className="material-symbols-outlined">edit</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Numeric goal stepper row
───────────────────────────────────────────── */
function GoalRow({
  label, unit, val, setVal, min, max, step, icon, id, loading,
}: {
  label: string; unit: string; val: number; setVal: (v: number) => void;
  min: number; max: number; step: number; icon: string; id: string; loading?: boolean;
}) {
  const [localVal, setLocalVal] = useState(String(val));

  useEffect(() => {
    setLocalVal(String(val));
  }, [val]);

  function nudge(delta: number) {
    const newVal = Math.min(max, Math.max(min, parseFloat((val + delta).toFixed(1))));
    setVal(newVal);
  }

  function handleBlur() {
    let num = parseFloat(localVal);
    if (isNaN(num)) num = min;
    const clamped = Math.min(max, Math.max(min, num));
    setVal(clamped);
    setLocalVal(String(clamped));
  }

  if (loading) {
    return (
      <div className={styles.goalRow} id={id}>
        <div className={styles.goalLeft}>
          <Skeleton w="28px" h="28px" radius="50%" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton w="100px" h="13px" />
            <Skeleton w="50px"  h="11px" />
          </div>
        </div>
        <div className={styles.goalRight}>
          <Skeleton w="32px" h="32px" radius="50%" />
          <Skeleton w="80px" h="20px" radius="6px" />
          <Skeleton w="32px" h="32px" radius="50%" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.goalRow} id={id}>
      <div className={styles.goalLeft}>
        <span className={styles.goalEmoji}>{icon}</span>
        <div>
          <div className={styles.goalLabel}>{label}</div>
          <div className={styles.goalUnit}>{unit}/day</div>
        </div>
      </div>
      <div className={styles.goalRight}>
        <button
          className={styles.numBtn}
          onClick={() => nudge(-step)}
          disabled={val <= min}
          aria-label={`Decrease ${label}`}
        >−</button>
        <div className={styles.goalInputWrapper}>
          <input
            type="number"
            className={styles.goalInput}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === "Enter" && handleBlur()}
          />
          <span className={styles.goalInputUnit}>{unit}</span>
        </div>
        <button
          className={styles.numBtn}
          onClick={() => nudge(step)}
          disabled={val >= max}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toast notification
───────────────────────────────────────────── */
function Toast({ msg, type, visible }: { msg: string; type: "success" | "error"; visible: boolean }) {
  return (
    <div className={`${styles.toast} ${styles[`toast_${type}`]} ${visible ? styles.toastVisible : ""}`}>
      <span className="material-symbols-outlined">
        {type === "success" ? "check_circle" : "error"}
      </span>
      {msg}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const userId = user?.id ? Number(user.id) : null;

  const [planInfo, setPlanInfo] = useState<any>(null);

  const fetchPlan = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await getUserPlan(userId);
      setPlanInfo(res);
    } catch (err) {
      console.error("fetchPlan error:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const currentPlan = (planInfo?.plan ?? "free") as "free" | "pro" | "ultra";

  const PLAN_META = {
    free:  { label: "Free",  color: "var(--text-muted)",    icon: "emoji_nature",       glow: "rgba(77,96,117,.15)"   },
    pro:   { label: "Pro",   color: "var(--primary-light)", icon: "bolt",               glow: "rgba(59,150,245,.15)"  },
    ultra: { label: "Ultra", color: "#c084fc",              icon: "rocket_launch",      glow: "rgba(168,85,247,.15)"  },
  } as const;
  const meta = PLAN_META[currentPlan];

  const [tab, setTab] = useState<Tab>("goals");

  /* Goals */
  const [calories, setCalories] = useState(2000);
  const [protein,  setProtein]  = useState(150);
  const [carbs,    setCarbs]    = useState(225);
  const [fat,      setFat]      = useState(56);
  const [weight,   setWeight]   = useState(75);

  /* Account */
  const [displayName, setDisplayName] = useState("");
  const [userEmail,   setUserEmail]   = useState("");
  const [heightCm,    setHeightCm]    = useState("");
  const [ageYears,    setAgeYears]    = useState("");
  const [gender,      setGender]      = useState("");

  /* UI state */
  const [saveState,  setSaveState]  = useState<SaveState>("idle");
  const [toastMsg,   setToastMsg]   = useState("");
  const [toastType,  setToastType]  = useState<"success" | "error">("success");
  const [toastShow,  setToastShow]  = useState(false);
  const [exporting,  setExporting]  = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  /* Hydrate from user */
  useEffect(() => {
    if (!user) return;
    setCalories(user.calorieGoal ?? 2000);
    setProtein(user.proteinGoal  ?? 150);
    setCarbs(user.carbsGoal      ?? 225);
    setFat(user.fatGoal          ?? 56);
    if (user.weightKg) setWeight(user.weightKg);
    setDisplayName(user.name     ?? "");
    setUserEmail(user.email      ?? "");
    if (user.heightCm)  setHeightCm(String(user.heightCm));
    if (user.ageYears)  setAgeYears(String(user.ageYears));
    if (user.gender)    setGender(user.gender);
  }, [user]);

  function showToast(msg: string, type: "success" | "error") {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastType(type);
    setToastShow(true);
    toastTimer.current = setTimeout(() => setToastShow(false), 3200);
  }

  async function handleSave() {
    if (saveState === "saving") return;
    setSaveState("saving");
    try {
      if (userId) {
        await updateProfile(userId, {
          calorieGoal: calories,
          proteinGoal: protein,
          carbsGoal:   carbs,
          fatGoal:     fat,
          weightKg:    weight,
        });
      }
      setSaveState("done");
      showToast("Goals saved successfully!", "success");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (e: unknown) {
      setSaveState("error");
      showToast(e instanceof Error ? e.message : "Failed to save goals.", "error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  async function saveAccountField(field: string, value: string) {
    if (!userId) return;
    const patch: Record<string, unknown> = {};
    if (field === "name")     { patch.name     = value; setDisplayName(value); }
    if (field === "heightCm") { patch.heightCm = Number(value); setHeightCm(value); }
    if (field === "ageYears") { patch.ageYears = Number(value); setAgeYears(value); }
    if (field === "gender")   { patch.gender   = value; setGender(value); }
    try {
      await updateProfile(userId, patch);
      showToast("Profile updated!", "success");
    } catch {
      showToast("Could not save change.", "error");
    }
  }

  async function handleExport() {
    if (!userId) return;
    setExporting(true);
    try {
      const data = await exportData(userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cal_ai_export_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Data exported!", "success");
    } catch {
      showToast("Failed to export data.", "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Are you sure? This will permanently delete all your data and cannot be undone.")) return;
    if (!userId) return;
    setDeleting(true);
    try {
      await doDeleteAccount(userId);
      await signOut();
      window.location.href = "/";
    } catch {
      showToast("Failed to delete account.", "error");
      setDeleting(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
      window.location.href = "/";
    } catch {
      showToast("Failed to log out.", "error");
    }
  }

  const initials = displayName.trim()
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AuthGuard>
      <div className={styles.page}>
        <Navbar />

        {/* Toast */}
        <Toast msg={toastMsg} type={toastType} visible={toastShow} />

        <div className={styles.container}>

          {/* ── Profile hero card ── */}
          <div className={styles.profileCard} id="profile-card">
            <div className={styles.avatarWrap}>
              <div className={styles.avatar}>
                {authLoading
                  ? <Skeleton w="80px" h="80px" radius="50%" />
                  : <span style={{ fontWeight: 900, fontSize: "1.6rem", letterSpacing: "-0.02em" }}>
                      {initials || "?"}
                    </span>
                }
              </div>
              {!authLoading && (
                <button className={styles.avatarEditBtn} id="profile-edit-avatar" title="Change photo">
                  <span className="material-symbols-outlined">photo_camera</span>
                </button>
              )}
            </div>

            <div className={styles.profileInfo}>
              {authLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Skeleton w="180px" h="22px" radius="6px" />
                  <Skeleton w="130px" h="14px" radius="6px" />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Skeleton w="90px" h="22px" radius="100px" />
                    <Skeleton w="80px" h="22px" radius="100px" />
                    <Skeleton w="110px" h="22px" radius="100px" />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className={styles.profileName}>{displayName || "Champ"} ✌️</h2>
                  <p className={styles.profileEmail}>{userEmail}</p>
                  <div className={styles.profileBadges}>
                    <span className={styles.badge} style={{ background: "rgba(16,229,107,0.15)", color: "var(--accent-green)" }}>
                      🔥 7-Day Streak
                    </span>
                    {/* Live plan badge — links to /plans */}
                    <Link href="/plans" className={styles.badge} style={{ background: meta.glow, color: meta.color, textDecoration: "none" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{meta.icon}</span>
                      {meta.label} Plan
                    </Link>
                    <span className={styles.badge} style={{ background: "rgba(59,130,246,0.15)", color: "var(--primary-light)" }}>
                      💪 Protein Champion
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className={styles.profileStats}>
              {authLoading ? (
                <>
                  <div className={styles.profileStat}><Skeleton w="40px" h="24px" radius="6px" /><Skeleton w="60px" h="11px" radius="4px" style={{ marginTop: 6 }} /></div>
                  <div className={styles.profileStat}><Skeleton w="40px" h="24px" radius="6px" /><Skeleton w="70px" h="11px" radius="4px" style={{ marginTop: 6 }} /></div>
                  <div className={styles.profileStat}><Skeleton w="50px" h="24px" radius="6px" /><Skeleton w="80px" h="11px" radius="4px" style={{ marginTop: 6 }} /></div>
                </>
              ) : (
                <>
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatNum}>—</span>
                    <span className={styles.profileStatLbl}>Days Logged</span>
                  </div>
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatNum}>—</span>
                    <span className={styles.profileStatLbl}>Meals Scanned</span>
                  </div>
                  <div className={styles.profileStat}>
                    <span className={styles.profileStatNum}>{weight} kg</span>
                    <span className={styles.profileStatLbl}>Current Weight</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Main content grid ── */}
          <div className={styles.mainGrid}>

            {/* Sidebar tabs */}
            <nav className={styles.tabs} id="profile-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ""}`}
                  onClick={() => setTab(t.id)}
                  id={`profile-tab-${t.id}`}
                >
                  <span className="material-symbols-outlined">{t.icon}</span>
                  <span className={styles.tabLabel}>{t.label}</span>
                </button>
              ))}
            </nav>

            {/* Panel */}
            <div className={styles.panel}>

              {/* ── Goals ── */}
              {tab === "goals" && (
                <div className={styles.goalsPanel}>
                  <h3 className={styles.panelTitle}>Nutrition Goals</h3>
                  <p className={styles.panelSub}>Fine-tune your daily targets. FitBot adapts its advice accordingly.</p>

                  <div className={styles.goalsList}>
                    <GoalRow loading={authLoading} label="Daily Calories" unit="kcal" val={calories} setVal={setCalories} min={1200} max={4000}  step={50}  icon="🔥" id="profile-goal-daily-calories" />
                    <GoalRow loading={authLoading} label="Protein"        unit="g"    val={protein}  setVal={setProtein}  min={40}   max={300}   step={5}   icon="💪" id="profile-goal-protein" />
                    <GoalRow loading={authLoading} label="Carbohydrates"  unit="g"    val={carbs}    setVal={setCarbs}    min={50}   max={500}   step={5}   icon="🌾" id="profile-goal-carbohydrates" />
                    <GoalRow loading={authLoading} label="Fat"            unit="g"    val={fat}      setVal={setFat}      min={20}   max={200}   step={2}   icon="🥑" id="profile-goal-fat" />
                    <GoalRow loading={authLoading} label="Body Weight"    unit="kg"   val={weight}   setVal={setWeight}   min={30}   max={200}   step={0.5} icon="⚖️" id="profile-goal-body-weight" />
                  </div>

                  <button
                    className={`${styles.saveBtn} ${styles[`saveBtn_${saveState}`]}`}
                    onClick={handleSave}
                    id="profile-save-goals"
                    disabled={saveState === "saving" || authLoading}
                  >
                    {saveState === "saving" && (
                      <span className={styles.spinner} />
                    )}
                    {saveState === "done" && (
                      <><span className="material-symbols-outlined">check</span>Saved!</>
                    )}
                    {saveState === "error" && (
                      <><span className="material-symbols-outlined">error</span>Try Again</>
                    )}
                    {saveState === "idle" && (
                      <><span className="material-symbols-outlined">save</span>Save Goals</>
                    )}
                  </button>
                </div>
              )}

              {/* ── Account ── */}
              {tab === "account" && (
                <div className={styles.accountPanel}>
                  <h3 className={styles.panelTitle}>Account Details</h3>
                  <div className={styles.fieldList}>
                    <EditableField loading={authLoading} label="Display Name" value={displayName} id="profile-name-field"
                      onSave={(v) => saveAccountField("name", v)} />
                    <div className={styles.fieldRow} id="profile-email-field">
                      {authLoading
                        ? <><Skeleton w="100px" h="13px" /><Skeleton w="150px" h="13px" /></>
                        : <><span className={styles.fieldLabel}>Email</span>
                            <div className={styles.fieldVal}><span className={styles.fieldValueText}>{userEmail}</span></div></>
                      }
                    </div>
                    <EditableField loading={authLoading} label="Age (years)" value={ageYears} id="profile-age-field" type="number"
                      onSave={(v) => saveAccountField("ageYears", v)} />
                    <EditableField loading={authLoading} label="Height (cm)" value={heightCm} id="profile-height-field" type="number"
                      onSave={(v) => saveAccountField("heightCm", v)} />
                    <EditableField loading={authLoading} label="Gender" value={gender} id="profile-gender-field"
                      onSave={(v) => saveAccountField("gender", v)} />
                  </div>
                  
                  <h3 className={styles.panelTitle} style={{ marginTop: 24, paddingBottom: 12, borderBottom: "1px solid var(--border)", fontSize: "16px" }}>Data Management</h3>
                  <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
                    <button className={styles.manageBtn} disabled={exporting} onClick={handleExport} id="profile-export-data" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)", color: "var(--text)" }}>
                      {exporting ? <span className={styles.spinner} /> : <span className="material-symbols-outlined">download</span>}
                      {exporting ? "Exporting..." : "Export Data (JSON)"}
                    </button>
                    <button className={styles.manageBtn} onClick={handleLogout} id="profile-logout-btn" style={{ background: "var(--surface-elevated)", borderColor: "var(--border)", color: "var(--text)" }}>
                      <span className="material-symbols-outlined">logout</span>
                      Log Out
                    </button>
                    <button className={styles.dangerBtn} disabled={deleting} onClick={handleDeleteAccount} id="profile-delete-account">
                      {deleting ? <span className={styles.spinner} style={{ borderColor: "rgba(239,68,68,0.3)", borderTopColor: "#ef4444" }} /> : <span className="material-symbols-outlined">delete_forever</span>}
                      {deleting ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Notifications ── */}
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
                    <div key={n.label} className={styles.notifRow} id={`profile-notif-${n.label.toLowerCase().replace(/\s+/g, "-")}`}>
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

              {/* ── Premium ── */}
              {tab === "premium" && (
                <div className={styles.premiumPanel}>
                  <div className={styles.premiumBanner}>
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: meta.color }}>
                      {meta.icon}
                    </span>
                    <h3 className={styles.premiumTitle}>
                      {currentPlan === "free"
                        ? "You're on the Free Plan"
                        : `You're on CalAI ${meta.label} ⭐`
                      }
                    </h3>
                    <p className={styles.premiumSub}>
                      {currentPlan === "free"
                        ? "Upgrade to unlock unlimited AI scans, advanced analytics and more."
                        : currentPlan === "pro"
                          ? "Pro plan active · $9/month"
                          : "Ultra plan active · $19/month"
                      }
                    </p>
                  </div>

                  {currentPlan !== "free" && (
                    <div className={styles.premiumFeatures}>
                      {(currentPlan === "pro"
                        ? [
                            "Unlimited AI meal scans",
                            "FitBot personalised coaching",
                            "Advanced macro analytics",
                            "Custom goal setting",
                            "Progress charts",
                            "Export CSV / PDF",
                          ]
                        : [
                            "Everything in Pro",
                            "Body scan AI analysis",
                            "Weekly AI insights",
                            "AI meal planning",
                            "Priority AI responses",
                            "24/7 dedicated support",
                          ]
                      ).map((f) => (
                        <div key={f} className={styles.premiumFeature}>
                          <span className="material-symbols-outlined" style={{ color: "var(--accent-green)" }}>check_circle</span>
                          {f}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* CTA buttons */}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {currentPlan === "free" ? (
                      <Link href="/plans" className={styles.manageBtn} id="profile-upgrade-btn"
                        style={{ background: "var(--primary)", color: "#fff", boxShadow: "0 6px 24px rgba(59,150,245,.3)", textDecoration: "none" }}>
                        <span className="material-symbols-outlined">rocket_launch</span>
                        Upgrade Now
                      </Link>
                    ) : (
                      <Link href="/plans" className={styles.manageBtn} id="profile-manage-subscription"
                        style={{ textDecoration: "none" }}>
                        <span className="material-symbols-outlined">workspace_premium</span>
                        Manage Subscription
                      </Link>
                    )}
                    {currentPlan !== "ultra" && (
                      <Link href="/plans" className={styles.manageBtn} id="profile-view-plans"
                        style={{ background: "var(--surface-elevated)", borderColor: "var(--border)", textDecoration: "none" }}>
                        <span className="material-symbols-outlined">compare_arrows</span>
                        View All Plans
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

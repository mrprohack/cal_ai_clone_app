"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
// mealPlans actions → fetch /api/mealPlans.php
import { Navbar } from "@/components/Navbar";
import styles from "./MealPlan.module.css";
import { AuthGuard } from "@/components/AuthGuard";

/* ── Types ── */
interface MealItem {
  mealType: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSize: string;
  ingredients: string[];
  prepTime: string;
  instructions: string;
}

interface DayPlan {
  dayName: string;
  dayNumber: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: MealItem[];
  waterGoalMl: number;
  tips: string;
}

interface ShoppingList {
  proteins: string[];
  carbs: string[];
  vegetables: string[];
  fruits: string[];
  dairy: string[];
  other: string[];
}

interface MealPlan {
  planName: string;
  dailyCalorieTarget: number;
  days: DayPlan[];
  shoppingList: ShoppingList;
  weeklyTotals: { avgCalories: number; avgProtein: number; avgCarbs: number; avgFat: number };
  nutritionTips: string[];
  estimatedCost: string;
}

interface SavedPlan {
  id: number;
  planName: string;
  createdDate: string;
  calorieTarget: number;
  isPinned?: boolean;
  planJson: string;
  createdAt: number;
}

const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: "☀️",
  lunch: "🫙",
  dinner: "🍽️",
  snack: "🍎",
};

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "var(--accent-yellow)",
  lunch: "var(--primary)",
  dinner: "var(--accent-purple)",
  snack: "var(--accent-green)",
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ── Macro pill ── */
function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <span className={styles.macroPill} style={{ borderColor: color, color }}>
      {value}{unit} <span style={{ opacity: 0.6, fontSize: 10 }}>{label}</span>
    </span>
  );
}

/* ── Ring chart ── */
function MacroRing({
  protein, carbs, fat,
}: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  if (total === 0) return null;

  const pPct = (protein * 4 / total) * 100;
  const cPct = (carbs * 4 / total) * 100;
  const fPct = 100 - pPct - cPct;

  const r = 40;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const segments = [
    { pct: pPct, color: "var(--protein)", label: "P" },
    { pct: cPct, color: "var(--carbs)", label: "C" },
    { pct: fPct, color: "var(--fat)", label: "F" },
  ];

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      {segments.map((seg) => {
        const len = (seg.pct / 100) * circ;
        const el = (
          <circle
            key={seg.label}
            cx="50" cy="50" r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="16"
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

/* ── Main Page ── */
export default function MealPlanPage() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);

  const fetchPlans = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch('/api/mealPlans.php?action=listPlans', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({userId}) });
      const data = await res.json();
      setSavedPlans(data.plans as SavedPlan[] || []);
    } catch (err) {
      console.error("fetchPlans error:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [activeTab, setActiveTab] = useState<"plan" | "shopping" | "saved">("plan");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [selectedSavedPlan, setSelectedSavedPlan] = useState<SavedPlan | null>(null);

  // Dietary preferences
  const [preferences, setPreferences] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [customPref, setCustomPref] = useState("");

  const PREF_OPTIONS = ["High Protein", "Mediterranean", "Asian Fusion", "Comfort Food", "Quick & Easy", "Budget-Friendly"];
  const RESTRICTION_OPTIONS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "No Pork", "No Shellfish", "Nut-Free", "Low Sodium"];

  const togglePref = useCallback((p: string) => {
    setPreferences((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }, []);

  const toggleRestriction = useCallback((r: string) => {
    setRestrictions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError("");
    setSaved(false);
    setPlan(null);

    try {
      const allPrefs = customPref ? [...preferences, customPref] : preferences;
      const res = await fetch("/api/meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calorieGoal: user?.calorieGoal ?? 2000,
          proteinGoal: user?.proteinGoal ?? 150,
          carbsGoal: user?.carbsGoal ?? 200,
          fatGoal: user?.fatGoal ?? 65,
          preferences: allPrefs,
          restrictions,
          userName: user?.name?.split(" ")[0] ?? "there",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPlan(data as MealPlan);
      setActiveDay(0);
      setActiveTab("plan");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !plan) return;
    setSaving(true);
    try {
      await fetch('/api/mealPlans.php?action=savePlan', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, planJson: JSON.stringify(plan), planName: plan.planName, calorieTarget: plan.dailyCalorieTarget })});
      setSaved(true);
      fetchPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const loadSavedPlan = (saved: SavedPlan) => {
    try {
      const loaded = JSON.parse(saved.planJson) as MealPlan;
      setPlan(loaded);
      setActiveDay(0);
      setActiveTab("plan");
      setSelectedSavedPlan(null);
      setSaved(true);
    } catch {
      setError("Failed to load plan");
    }
  };

  const handleDeletePlan = async (p: SavedPlan) => {
    if (!userId) return;
    if (!confirm("Delete this plan?")) return;
    await fetch('/api/mealPlans.php?action=removePlan', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: p.id, userId})});
    fetchPlans();
    if (selectedSavedPlan?.id === p.id) setSelectedSavedPlan(null);
  };

  const handleTogglePin = async (p: SavedPlan) => {
    if (!userId) return;
    await fetch('/api/mealPlans.php?action=togglePin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: p.id, userId})});
    fetchPlans();
  };

  return (
    <AuthGuard>
      <div className={styles.page}>
        <Navbar />
        <div className={styles.container}>

          {/* Header */}
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>
                <span className="material-symbols-outlined" style={{ verticalAlign: "middle", marginRight: 8, color: "var(--primary)" }}>
                  restaurant_menu
                </span>
                AI Meal Planner
              </h1>
              <p className={styles.subtitle}>
                Generate a complete, personalized 7-day meal plan tailored to your macros
              </p>
            </div>

            {savedPlans && savedPlans.length > 0 && (
              <button
                className={styles.savedPlansBtn}
                onClick={() => setActiveTab("saved")}
                id="meal-plan-saved-btn"
              >
                <span className="material-symbols-outlined">history</span>
                Saved Plans ({savedPlans.length})
              </button>
            )}
          </div>

          {/* Config panel */}
          <div className={styles.configCard}>
            <div className={styles.configHeader}>
              <span className="material-symbols-outlined">tune</span>
              <strong>Plan Configuration</strong>
              <div className={styles.targetChips}>
                <span className={styles.targetChip}>🔥 {user?.calorieGoal ?? 2000} kcal</span>
                <span className={styles.targetChip} style={{ color: "var(--protein)" }}>💪 {user?.proteinGoal ?? 150}g P</span>
                <span className={styles.targetChip} style={{ color: "var(--carbs)" }}>🌾 {user?.carbsGoal ?? 200}g C</span>
                <span className={styles.targetChip} style={{ color: "var(--fat)" }}>🥑 {user?.fatGoal ?? 65}g F</span>
                <a href="/profile" className={styles.editTargets}>Edit Goals →</a>
              </div>
            </div>

            <div className={styles.prefSection}>
              <div className={styles.prefGroup}>
                <label className={styles.prefLabel}>Preferences</label>
                <div className={styles.prefTags}>
                  {PREF_OPTIONS.map((p) => (
                    <button
                      key={p}
                      className={`${styles.prefTag} ${preferences.includes(p) ? styles.prefTagActive : ""}`}
                      onClick={() => togglePref(p)}
                      id={`meal-pref-${p.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.prefGroup}>
                <label className={styles.prefLabel}>Dietary Restrictions</label>
                <div className={styles.prefTags}>
                  {RESTRICTION_OPTIONS.map((r) => (
                    <button
                      key={r}
                      className={`${styles.prefTag} ${styles.prefTagRestriction} ${restrictions.includes(r) ? styles.prefTagRestrictionActive : ""}`}
                      onClick={() => toggleRestriction(r)}
                      id={`meal-restrict-${r.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.customPrefRow}>
                <input
                  type="text"
                  className={styles.customPrefInput}
                  placeholder="Custom preference (e.g. 'Indian cuisine', 'meal prep friendly')…"
                  value={customPref}
                  onChange={(e) => setCustomPref(e.target.value)}
                  id="meal-plan-custom-pref"
                />
                <button
                  className={styles.generateBtn}
                  onClick={generate}
                  disabled={generating}
                  id="meal-plan-generate-btn"
                >
                  {generating ? (
                    <>
                      <span className={styles.spinner}>⟳</span>
                      Generating…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">auto_awesome</span>
                      Generate 7-Day Plan
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}
          </div>

          {/* Loading state */}
          {generating && (
            <div className={styles.loadingCard}>
              <div className={styles.loadingInner}>
                <div className={styles.loadingPulse} />
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--primary)", position: "relative" }}>
                  auto_awesome
                </span>
                <h2>Creating your 7-Day Plan…</h2>
                <p>AI Chef is crafting personalized meals, calculating exact macros,<br />and building your shopping list</p>
                <div className={styles.loadingSteps}>
                  {["Analyzing your goals", "Selecting meals", "Balancing macros", "Building shopping list"].map((step, i) => (
                    <div key={step} className={styles.loadingStep} style={{ animationDelay: `${i * 0.4}s` }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>done</span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Plan tabs */}
          {plan && !generating && (
            <>
              <div className={styles.planTabs}>
                <button
                  className={`${styles.planTab} ${activeTab === "plan" ? styles.planTabActive : ""}`}
                  onClick={() => setActiveTab("plan")}
                  id="meal-tab-plan"
                >
                  <span className="material-symbols-outlined">calendar_view_week</span>
                  7-Day Plan
                </button>
                <button
                  className={`${styles.planTab} ${activeTab === "shopping" ? styles.planTabActive : ""}`}
                  onClick={() => setActiveTab("shopping")}
                  id="meal-tab-shopping"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  Shopping List
                </button>
                {!saved ? (
                  <button
                    className={`${styles.planTab} ${styles.planTabSave}`}
                    onClick={handleSave}
                    disabled={saving}
                    id="meal-tab-save"
                  >
                    <span className="material-symbols-outlined">bookmark</span>
                    {saving ? "Saving…" : "Save Plan"}
                  </button>
                ) : (
                  <div className={styles.savedTag}>
                    <span className="material-symbols-outlined">check_circle</span>
                    Saved
                  </div>
                )}
              </div>

              {activeTab === "plan" && (
                <div className={styles.planSection}>
                  {/* Day selector */}
                  <div className={styles.daySelector}>
                    {DAYS_OF_WEEK.map((day, i) => {
                      const dayData = plan.days.find((d) => d.dayNumber === i + 1 || d.dayName === day);
                      return (
                        <button
                          key={day}
                          className={`${styles.dayBtn} ${activeDay === i ? styles.dayBtnActive : ""}`}
                          onClick={() => { setActiveDay(i); setExpandedMeal(null); }}
                          id={`meal-day-${i}`}
                        >
                          <span className={styles.dayBtnLabel}>{day.slice(0, 3)}</span>
                          {dayData && <span className={styles.dayBtnCal}>{dayData.totalCalories} kcal</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Day detail */}
                  {plan.days[activeDay] && (
                    <DayDetail
                      day={plan.days[activeDay]}
                      expandedMeal={expandedMeal}
                      onToggleMeal={setExpandedMeal}
                      calorieGoal={user?.calorieGoal ?? 2000}
                    />
                  )}

                  {/* Nutrition tips */}
                  {plan.nutritionTips && plan.nutritionTips.length > 0 && (
                    <div className={styles.tipsCard}>
                      <div className={styles.tipsHeader}>
                        <span className="material-symbols-outlined">tips_and_updates</span>
                        <strong>Nutrition Tips for the Week</strong>
                      </div>
                      <div className={styles.tipsList}>
                        {plan.nutritionTips.map((tip) => (
                          <div key={tip} className={styles.tipItem}>
                            <span style={{ color: "var(--primary)" }}>💡</span>
                            {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "shopping" && (
                <ShoppingListView shoppingList={plan.shoppingList} estimatedCost={plan.estimatedCost} />
              )}
            </>
          )}

          {/* Saved plans tab */}
          {activeTab === "saved" && (
            <SavedPlansView
              plans={(savedPlans ?? []) as SavedPlan[]}
              onLoad={loadSavedPlan}
              onDelete={handleDeletePlan}
              onPin={handleTogglePin}
              onClose={() => setActiveTab("plan")}
            />
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

/* ── Day Detail Component ── */
function DayDetail({
  day,
  expandedMeal,
  onToggleMeal,
  calorieGoal,
}: {
  day: DayPlan;
  expandedMeal: string | null;
  onToggleMeal: (key: string | null) => void;
  calorieGoal: number;
}) {
  const calPct = Math.min((day.totalCalories / calorieGoal) * 100, 100);

  return (
    <div className={styles.dayDetail}>
      {/* Day summary */}
      <div className={styles.daySummary}>
        <div className={styles.daySummaryLeft}>
          <h2 className={styles.dayTitle}>{day.dayName}</h2>
          <div className={styles.dayMacros}>
            <MacroPill label="P" value={day.totalProtein} unit="g" color="var(--protein)" />
            <MacroPill label="C" value={day.totalCarbs} unit="g" color="var(--carbs)" />
            <MacroPill label="F" value={day.totalFat} unit="g" color="var(--fat)" />
            <span className={styles.waterGoal}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle" }}>water_drop</span>
              {(day.waterGoalMl / 1000).toFixed(1)}L
            </span>
          </div>
          <div className={styles.calBar}>
            <div className={styles.calBarTrack}>
              <div
                className={styles.calBarFill}
                style={{ width: `${calPct}%`, background: calPct > 105 ? "var(--fat)" : "var(--primary)" }}
              />
            </div>
            <span className={styles.calBarLabel}>{day.totalCalories} / {calorieGoal} kcal</span>
          </div>
        </div>
        <MacroRing protein={day.totalProtein} carbs={day.totalCarbs} fat={day.totalFat} />
      </div>

      {/* Meals */}
      <div className={styles.mealList}>
        {day.meals.map((meal) => {
          const key = `${day.dayName}-${meal.mealType}`;
          const isExpanded = expandedMeal === key;
          const typeColor = MEAL_TYPE_COLORS[meal.mealType.toLowerCase()] ?? "var(--primary)";
          const typeIcon = MEAL_TYPE_ICONS[meal.mealType.toLowerCase()] ?? "🍴";

          return (
            <div
              key={key}
              className={`${styles.mealCard} ${isExpanded ? styles.mealCardExpanded : ""}`}
              id={`meal-${key}`}
            >
              <button
                className={styles.mealCardHeader}
                onClick={() => onToggleMeal(isExpanded ? null : key)}
                aria-expanded={isExpanded}
              >
                <div className={styles.mealTypeTag} style={{ background: `${typeColor}22`, color: typeColor }}>
                  {typeIcon} {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                </div>
                <div className={styles.mealMain}>
                  <span className={styles.mealName}>{meal.name}</span>
                  <span className={styles.mealMeta}>{meal.servingSize} · ⏱ {meal.prepTime}</span>
                </div>
                <div className={styles.mealCalTag}>{meal.calories} kcal</div>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>
                  expand_more
                </span>
              </button>

              {isExpanded && (
                <div className={styles.mealCardBody}>
                  <div className={styles.mealNutrients}>
                    <MacroPill label="P" value={meal.proteinG} unit="g" color="var(--protein)" />
                    <MacroPill label="C" value={meal.carbsG} unit="g" color="var(--carbs)" />
                    <MacroPill label="F" value={meal.fatG} unit="g" color="var(--fat)" />
                  </div>

                  <div className={styles.mealSection}>
                    <div className={styles.mealSectionTitle}>
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>format_list_bulleted</span>
                      Ingredients
                    </div>
                    <ul className={styles.ingredientList}>
                      {meal.ingredients.map((ing) => (
                        <li key={ing} className={styles.ingredientItem}>
                          <span style={{ color: "var(--accent-green)", fontSize: 12 }}>✓</span> {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {meal.instructions && (
                    <div className={styles.mealSection}>
                      <div className={styles.mealSectionTitle}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>menu_book</span>
                        Instructions
                      </div>
                      <p className={styles.instructions}>{meal.instructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {day.tips && (
        <div className={styles.dayTip}>
          <span>💡</span> {day.tips}
        </div>
      )}
    </div>
  );
}

/* ── Shopping List ── */
function ShoppingListView({ shoppingList, estimatedCost }: { shoppingList: ShoppingList; estimatedCost: string }) {
  const sections: { title: string; icon: string; items: string[] }[] = [
    { title: "Proteins", icon: "💪", items: shoppingList.proteins ?? [] },
    { title: "Carbs & Grains", icon: "🌾", items: shoppingList.carbs ?? [] },
    { title: "Vegetables", icon: "🥦", items: shoppingList.vegetables ?? [] },
    { title: "Fruits", icon: "🍎", items: shoppingList.fruits ?? [] },
    { title: "Dairy & Eggs", icon: "🥚", items: shoppingList.dairy ?? [] },
    { title: "Other", icon: "🛒", items: shoppingList.other ?? [] },
  ].filter((s) => s.items.length > 0);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (item: string) => setChecked((prev) => {
    const next = new Set(prev);
    next.has(item) ? next.delete(item) : next.add(item);
    return next;
  });

  return (
    <div className={styles.shoppingView}>
      <div className={styles.shoppingHeader}>
        <h2 className={styles.shoppingTitle}>
          <span className="material-symbols-outlined">shopping_cart</span>
          Weekly Shopping List
        </h2>
        <div className={styles.costBadge}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>attach_money</span>
          {estimatedCost}
        </div>
      </div>

      <div className={styles.shoppingGrid}>
        {sections.map((sec) => (
          <div key={sec.title} className={styles.shoppingSection}>
            <div className={styles.shoppingSectionTitle}>{sec.icon} {sec.title}</div>
            {sec.items.map((item) => (
              <label key={item} className={styles.shoppingItem}>
                <input
                  type="checkbox"
                  className={styles.shoppingCheckbox}
                  checked={checked.has(item)}
                  onChange={() => toggle(item)}
                />
                <span style={{ textDecoration: checked.has(item) ? "line-through" : "none", color: checked.has(item) ? "var(--text-muted)" : "inherit" }}>
                  {item}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.shoppingProgress}>
        <span>{checked.size} / {sections.reduce((a, s) => a + s.items.length, 0)} items checked</span>
        <div className={styles.shoppingProgressTrack}>
          <div
            className={styles.shoppingProgressFill}
            style={{ width: `${(checked.size / Math.max(1, sections.reduce((a, s) => a + s.items.length, 0))) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Saved Plans ── */
function SavedPlansView({
  plans,
  onLoad,
  onDelete,
  onPin,
  onClose,
}: {
  plans: SavedPlan[];
  onLoad: (p: SavedPlan) => void;
  onDelete: (p: SavedPlan) => void;
  onPin: (p: SavedPlan) => void;
  onClose: () => void;
}) {
  const sorted = [...plans].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);

  return (
    <div className={styles.savedPlansView}>
      <div className={styles.savedPlansHeader}>
        <h2 className={styles.shoppingTitle}>
          <span className="material-symbols-outlined">bookmarks</span>
          Saved Meal Plans
        </h2>
        <button className={styles.closeBtn} onClick={onClose} id="meal-saved-close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.emptyPlans}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: "var(--border)" }}>restaurant_menu</span>
          <p>No saved plans yet. Generate your first plan!</p>
        </div>
      ) : (
        <div className={styles.savedPlansList}>
          {sorted.map((p) => (
            <div key={p.id} className={`${styles.savedPlanCard} ${p.isPinned ? styles.savedPlanCardPinned : ""}`}>
              {p.isPinned && <div className={styles.pinnedBadge}>📌 Pinned</div>}
              <div className={styles.savedPlanInfo}>
                <h3 className={styles.savedPlanName}>{p.planName}</h3>
                <p className={styles.savedPlanMeta}>
                  {new Date(p.createdDate).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })} · {p.calorieTarget.toLocaleString()} kcal/day
                </p>
              </div>
              <div className={styles.savedPlanActions}>
                <button
                  className={styles.iconBtn}
                  onClick={() => onPin(p)}
                  aria-label={p.isPinned ? "Unpin" : "Pin plan"}
                  title={p.isPinned ? "Unpin" : "Pin plan"}
                >
                  <span className="material-symbols-outlined">{p.isPinned ? "push_pin" : "push_pin"}</span>
                </button>
                <button
                  className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                  onClick={() => onDelete(p)}
                  aria-label="Delete plan"
                  title="Delete plan"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
                <button
                  className={styles.loadPlanBtn}
                  onClick={() => onLoad(p)}
                  id={`meal-load-${p.id}`}
                >
                  <span className="material-symbols-outlined">open_in_new</span>
                  Load Plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

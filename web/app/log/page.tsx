"use client";

/* ── AI result type ── */
interface AiMealResult {
  name: string;
  confidence: number;
  servingSize: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
}

import { useState, useRef, useCallback, useEffect } from "react";
import { Meals, Progress } from "@/lib/phpApi";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import styles from "./Log.module.css";
import { AuthGuard } from "@/components/AuthGuard";

/* ═══════════════════════════════════════════════════════════
   CONSTANTS & TYPES
═══════════════════════════════════════════════════════════ */
const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast", icon: "☀️", color: "#fbbf24", gradient: "linear-gradient(135deg,#fbbf2430,#fbbf2408)" },
  { id: "lunch",     label: "Lunch",     icon: "🌤️", color: "#3b96f5", gradient: "linear-gradient(135deg,#3b96f530,#3b96f508)" },
  { id: "dinner",    label: "Dinner",    icon: "🌙", color: "#a855f7", gradient: "linear-gradient(135deg,#a855f730,#a855f708)" },
  { id: "snack",     label: "Snack",     icon: "🍎", color: "#10e56b", gradient: "linear-gradient(135deg,#10e56b30,#10e56b08)" },
] as const;

type MealTypeId = typeof MEAL_TYPES[number]["id"];

const FOOD_CATEGORIES = ["All", "Protein", "Carbs", "Fats", "Dairy", "Fruits", "Vegetables", "Snacks", "Drinks"] as const;
type FoodCategory = typeof FOOD_CATEGORIES[number];

export interface DBFood {
  _id?: string;
  name: string;
  cals: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
  cat?: string;
}

type ScanState = "idle" | "uploading" | "analysing" | "done" | "error";

interface ManualForm {
  name: string; calories: string; protein: string; carbs: string; fat: string; servingSize: string;
}
const emptyForm: ManualForm = { name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "" };

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════ */

/** Animated arc ring for calorie progress */
function CalRing({ pct, cals, goal, isOver }: { pct: number; cals: number; goal: number; isOver: boolean }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct / 100, 1));
  return (
    <div className={styles.ringWrap} aria-label={`${Math.round(cals)} of ${goal} calories`}>
      <svg viewBox="0 0 120 120" className={styles.ringSvg}>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" stroke="rgba(255,255,255,0.06)" />
        <circle
          cx="60" cy="60" r={r}
          fill="none" strokeWidth="9"
          stroke={isOver ? "#fb923c" : "#3b96f5"}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "60px 60px",
            transition: "stroke-dashoffset 0.7s cubic-bezier(.34,1.56,.64,1), stroke 0.3s",
            filter: `drop-shadow(0 0 8px ${isOver ? "rgba(251,146,60,.6)" : "rgba(59,150,245,.6)"})`,
          }}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringCals} style={{ color: isOver ? "var(--fat)" : "var(--primary)" }}>
          {Math.round(cals).toLocaleString()}
        </span>
        <span className={styles.ringUnit}>kcal</span>
        <span className={styles.ringRemain} style={{ color: isOver ? "var(--fat)" : "var(--text-muted)" }}>
          {isOver ? `+${Math.round(cals - goal)}` : `${Math.round(goal - cals)} left`}
        </span>
      </div>
    </div>
  );
}

/** Slim horizontal macro bar */
function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className={styles.macroBarRow}>
      <span className={styles.macroBarLabel}>{label}</span>
      <div className={styles.macroBarTrack}>
        <div
          className={styles.macroBarFill}
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
      <span className={styles.macroBarValue} style={{ color }}>{Math.round(value)}g</span>
    </div>
  );
}

/** Logged meal row — compact, swipe-friendly */
function MealRow({ meal, onDelete }: { meal: any; onDelete: (id: number) => void }) {
  const [confirm, setConfirm] = useState(false);
  const meta = MEAL_TYPES.find((m) => m.id === meal.mealType) ?? MEAL_TYPES[0];
  return (
    <div className={styles.mealRow}>
      <div className={styles.mealRowLeft}>
        <div className={styles.mealRowDot} style={{ background: meta.color }} />
        <div>
          <div className={styles.mealRowName}>{meal.name}</div>
          <div className={styles.mealRowMeta} style={{ color: meta.color }}>
            {meta.icon} {meta.label}
            <span className={styles.mealRowDivider}>·</span>
            <span style={{ color: "var(--text-muted)" }}>
              {Math.round(meal.proteinG)}P · {Math.round(meal.carbsG)}C · {Math.round(meal.fatG)}F
            </span>
          </div>
        </div>
      </div>
      <div className={styles.mealRowRight}>
        <span className={styles.mealRowCals}>{Math.round(meal.calories)}</span>
        <span className={styles.mealRowKcal}>kcal</span>
        {confirm ? (
          <div className={styles.mealRowConfirm}>
            <button className={styles.confirmYes} onClick={() => onDelete(meal.id)} aria-label="Confirm delete">
              <span className="material-symbols-outlined">check</span>
            </button>
            <button className={styles.confirmNo} onClick={() => setConfirm(false)} aria-label="Cancel">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ) : (
          <button className={styles.mealRowDel} onClick={() => setConfirm(true)} aria-label="Delete meal">
            <span className="material-symbols-outlined">delete_outline</span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Camera-frame corner brackets SVG */
function CameraFrame() {
  const L = 24; const S = 3;
  const points = [
    { x: 16, y: 16, rx: S, dx: L, dy: 0, dx2: 0, dy2: L },
    { x: 84, y: 16, rx: S, dx: -L, dy: 0, dx2: 0, dy2: L },
    { x: 16, y: 84, rx: S, dx: L, dy: 0, dx2: 0, dy2: -L },
    { x: 84, y: 84, rx: S, dx: -L, dy: 0, dx2: 0, dy2: -L },
  ];
  return (
    <svg viewBox="0 0 100 100" className={styles.cameraFrame} aria-hidden>
      {points.map(({ x, y, dx, dy, dx2, dy2 }, i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x + dx} y2={y + dy} stroke="#3b96f5" strokeWidth={S} strokeLinecap="round" />
          <line x1={x} y1={y} x2={x + dx2} y2={y + dy2} stroke="#3b96f5" strokeWidth={S} strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

/** Quick-add food card — clicking just selects the food; parent opens qty picker */
function FoodCard({ food, onSelect, isSelected, adding }: {
  food: DBFood;
  onSelect: () => void;
  isSelected: boolean;
  adding: boolean;
}) {
  return (
    <div
      className={`${styles.foodCard} ${isSelected ? styles.foodCardSelected : ""}`}
      role="listitem"
    >
      <span className={styles.foodCardEmoji}>{food.emoji}</span>
      <div className={styles.foodCardBody}>
        <div className={styles.foodCardName}>{food.name}</div>
        <div className={styles.foodCardMacros}>
          <span style={{ color: "var(--primary)" }}>{food.cals}</span>
          <span style={{ color: "var(--text-dim)" }}>kcal</span>
          <span className={styles.foodCardSep} />
          <span style={{ color: "var(--accent-green)" }}>{food.protein}P</span>
          <span style={{ color: "var(--accent-purple)" }}>{food.carbs}C</span>
          <span style={{ color: "var(--fat)" }}>{food.fat}F</span>
        </div>
      </div>
      <button
        className={`${styles.foodCardBtn} ${isSelected ? styles.foodCardBtnActive : ""}`}
        onClick={onSelect}
        disabled={adding}
        aria-label={`Select ${food.name}`}
      >
        <span className="material-symbols-outlined">
          {isSelected ? "expand_less" : "add"}
        </span>
      </button>
    </div>
  );
}

/* ── Quantity Picker ─────────────────────────────────────────────────────── */
type QtyMode = "servings" | "grams";

function QuantityPicker({ food, onConfirm, onCancel, saving }: {
  food: DBFood;
  onConfirm: (food: DBFood, qty: number, mode: QtyMode) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [mode, setMode]         = useState<QtyMode>("grams");
  const [servings, setServings] = useState(1);
  const [grams, setGrams]       = useState("100");

  /* how many times the per-serving macros should be multiplied */
  const multiplier = mode === "servings"
    ? servings
    : (parseFloat(grams) || 0) / 100; // base values are per-100 g equivalent of 1 serving

  const scaled = {
    cals:    Math.round(food.cals    * multiplier),
    protein: Math.round(food.protein * multiplier),
    carbs:   Math.round(food.carbs   * multiplier),
    fat:     Math.round(food.fat     * multiplier),
  };

  const servingLabel = mode === "servings"
    ? `${servings} serving${servings !== 1 ? "s" : ""}`
    : `${grams || 0}g`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div className={styles.qtyPicker} role="dialog" aria-modal="true" aria-label="Set quantity">
      {/* Header */}
      <div className={styles.qtyHeader}>
        <span className={styles.qtyFoodEmoji}>{food.emoji}</span>
        <div className={styles.qtyFoodInfo}>
          <span className={styles.qtyFoodName}>{food.name}</span>
          <span className={styles.qtyFoodBase}>{food.cals} kcal · {food.protein}g P per serving</span>
        </div>
        <button className={styles.qtyCancelIcon} onClick={onCancel} aria-label="Cancel">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Mode toggle */}
      <div className={styles.qtyModeRow} role="group" aria-label="Measure by">
        <button
          className={`${styles.qtyModeBtn} ${mode === "servings" ? styles.qtyModeBtnActive : ""}`}
          onClick={() => setMode("servings")}
          aria-pressed={mode === "servings"}
        >
          <span className="material-symbols-outlined">dinner_dining</span>
          Servings
        </button>
        <button
          className={`${styles.qtyModeBtn} ${mode === "grams" ? styles.qtyModeBtnActive : ""}`}
          onClick={() => setMode("grams")}
          aria-pressed={mode === "grams"}
        >
          <span className="material-symbols-outlined">scale</span>
          By weight
        </button>
      </div>

      {/* Input area */}
      {mode === "servings" ? (
        <div className={styles.qtyStepper}>
          <button
            className={styles.qtyStep}
            onClick={() => setServings((s) => Math.max(0.5, parseFloat((s - 0.5).toFixed(1))))}
            aria-label="Decrease"
          >
            <span className="material-symbols-outlined">remove</span>
          </button>
          <div className={styles.qtyStepVal}>
            <span className={styles.qtyStepNum}>{servings}</span>
            <span className={styles.qtyStepUnit}>serving{servings !== 1 ? "s" : ""}</span>
          </div>
          <button
            className={styles.qtyStep}
            onClick={() => setServings((s) => parseFloat((s + 0.5).toFixed(1)))}
            aria-label="Increase"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      ) : (
        <div className={styles.qtyGramsRow}>
          <input
            className={styles.qtyGramsInput}
            type="number"
            min="1"
            step="1"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            aria-label="Weight in grams"
            autoFocus
          />
          <span className={styles.qtyGramsUnit}>g</span>
        </div>
      )}

      {/* Live macro preview */}
      <div className={styles.qtyPreview} aria-live="polite">
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--primary)" }}>{scaled.cals}</span>
          <span className={styles.qtyPreviewKey}>kcal</span>
        </div>
        <div className={styles.qtyPreviewDiv} />
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--accent-green)" }}>{scaled.protein}g</span>
          <span className={styles.qtyPreviewKey}>Protein</span>
        </div>
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--accent-purple)" }}>{scaled.carbs}g</span>
          <span className={styles.qtyPreviewKey}>Carbs</span>
        </div>
        <div className={styles.qtyPreviewItem}>
          <span className={styles.qtyPreviewVal} style={{ color: "var(--fat)" }}>{scaled.fat}g</span>
          <span className={styles.qtyPreviewKey}>Fat</span>
        </div>
      </div>

      {/* Confirm */}
      <button
        className={styles.qtyConfirmBtn}
        onClick={() => onConfirm(food, mode === "servings" ? servings : multiplier, mode)}
        disabled={saving || (mode === "grams" && (!parseFloat(grams) || parseFloat(grams) <= 0))}
        id="qty-confirm-btn"
      >
        {saving
          ? <><div className={styles.spinSm} />Logging…</>
          : <><span className="material-symbols-outlined">add_circle</span>Log {servingLabel} of {food.name}</>
        }
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function LogPage() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;
  const today = new Date().toISOString().split("T")[0];

  /* ── State ── */
  const [mealType, setMealType]     = useState<MealTypeId>("breakfast");
  const [scanState, setScanState]   = useState<ScanState>("idle");
  const [preview, setPreview]       = useState<string | null>(null);
  const [aiResult, setAiResult]     = useState<AiMealResult | null>(null);
  const [scanQty, setScanQty]       = useState<number>(1);
  const [scanError, setScanError]   = useState<string | null>(null);
  const [query, setQuery]           = useState("");
  const [foodCat, setFoodCat]       = useState<FoodCategory>("All");
  const [addMode, setAddMode]       = useState<"search" | "recent">("search");
  const [pendingFood, setPendingFood] = useState<DBFood | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [form, setForm]             = useState<ManualForm>(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  /* ── State for data ── */
  const [meals, setMeals] = useState<any[]>([]);
  const [displayedFoods, setDisplayedFoods] = useState<DBFood[]>([]);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);

  const fetchMeals = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await Meals.byDate(userId, today);
      setMeals(res || []);
    } catch (err) {
      console.error("fetchMeals error:", err);
    }
  }, [userId, today]);

  const fetchFoods = useCallback(async () => {
    try {
      const res = await fetch('/api/foods.php?action=search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({query, category: foodCat})});
      const data = await res.json();
      setDisplayedFoods(data.foods || []);
    } catch (err) {
      console.error("fetchFoods error:", err);
    }
  }, [query, foodCat]);

  const fetchRecent = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await Meals.getRecent(userId);
      setRecentFoods(res || []);
    } catch (err) {
      console.error("fetchRecent error:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  /* Auto-select meal type by time of day */
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 10) setMealType("breakfast");
    else if (h < 14) setMealType("lunch");
    else if (h < 19) setMealType("dinner");
    else setMealType("snack");
  }, []);

  /* Trap focus in modal */
  useEffect(() => {
    if (!showManual) return;
    const el = document.getElementById("manual-name");
    el?.focus();
    const trap = (e: KeyboardEvent) => { if (e.key === "Escape") setShowManual(false); };
    window.addEventListener("keydown", trap);
    return () => window.removeEventListener("keydown", trap);
  }, [showManual]);

  /* ── Derived ── */
  const todayTotals = (meals as any[]).reduce(
    (acc, m) => ({ cals: acc.cals + (m.calories ?? 0), protein: acc.protein + (m.proteinG ?? 0), carbs: acc.carbs + (m.carbsG ?? 0), fat: acc.fat + (m.fatG ?? 0) }),
    { cals: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calorieGoal  = user?.calorieGoal  ?? 2000;
  const proteinGoal  = user?.proteinGoal  ?? 150;
  const carbsGoal    = user?.carbsGoal    ?? 220;
  const fatGoal      = user?.fatGoal      ?? 65;
  const calPct       = Math.min((todayTotals.cals / calorieGoal) * 100, 100);
  const isOverGoal   = todayTotals.cals > calorieGoal;

  const activeMealMeta = MEAL_TYPES.find((m) => m.id === mealType)!;

  /* ── Helpers ── */
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function syncProgress(dCals = 0, dP = 0, dC = 0, dF = 0) {
    if (!userId) return;
    await Progress.upsert({
      userId, date: today,
      caloriesConsumed: Math.round(todayTotals.cals + dCals),
      proteinConsumed:  Math.round(todayTotals.protein + dP),
      carbsConsumed:    Math.round(todayTotals.carbs   + dC),
      fatConsumed:      Math.round(todayTotals.fat     + dF),
    });
  }

  function openQtyPicker(food: DBFood) {
    setPendingFood(food);
  }

  /* ── Confirmed add with quantity ── */
  const handleConfirmAdd = useCallback(async (
    food: DBFood,
    multiplier: number,
    mode: QtyMode
  ) => {
    if (!userId) return;
    const cals    = Math.round(food.cals    * multiplier);
    const protein = Math.round(food.protein * multiplier);
    const carbs   = Math.round(food.carbs   * multiplier);
    const fat     = Math.round(food.fat     * multiplier);
    const serving = mode === "servings"
      ? `${multiplier} serving${multiplier !== 1 ? "s" : ""}`
      : `${Math.round(multiplier * 100)}g`;
    setSaving(true);
    try {
      await Meals.log({
        userId, name: food.name, mealType,
        calories: cals, proteinG: protein, carbsG: carbs, fatG: fat,
        servingSize: serving,
        date: today, loggedAt: Date.now(), aiGenerated: false,
      });
      await syncProgress(cals, protein, carbs, fat);
      fetchMeals();
      fetchRecent();
      setPendingFood(null);
      showToast(`${food.emoji} ${food.name} logged!`);
    } catch { showToast("Failed to log food", "error"); }
    finally { setSaving(false); }
  }, [userId, mealType, today, todayTotals]);

  /* keep old handleQuickAdd (used nowhere now but avoids unused-var error if any ref exists) */
  const handleQuickAdd = handleConfirmAdd;
  void handleQuickAdd;


  /* ── Manual submit ── */
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !form.name) return;
    const cals = parseFloat(form.calories) || 0, protein = parseFloat(form.protein) || 0;
    const carbs = parseFloat(form.carbs) || 0, fat = parseFloat(form.fat) || 0;
    setSaving(true);
    try {
      await Meals.log({ userId, name: form.name, mealType, calories: cals, proteinG: protein, carbsG: carbs, fatG: fat, servingSize: form.servingSize || "1 serving", date: today, loggedAt: Date.now(), aiGenerated: false });
      await syncProgress(cals, protein, carbs, fat);
      fetchMeals();
      fetchRecent();
      setForm(emptyForm); setShowManual(false);
      showToast(`✓ ${form.name} logged`);
    } catch { showToast("Failed to save", "error"); }
    finally { setSaving(false); }
  }

  /* ── Delete ── */
  async function handleDelete(id: number) {
    const meal = (meals as any[]).find((m) => m.id === id);
    await Meals.remove(id);
    if (userId && meal) {
      await Progress.upsert({ userId, date: today,
        caloriesConsumed: Math.max(0, Math.round(todayTotals.cals    - (meal.calories ?? 0))),
        proteinConsumed:  Math.max(0, Math.round(todayTotals.protein  - (meal.proteinG ?? 0))),
        carbsConsumed:    Math.max(0, Math.round(todayTotals.carbs    - (meal.carbsG   ?? 0))),
        fatConsumed:      Math.max(0, Math.round(todayTotals.fat      - (meal.fatG     ?? 0))),
      });
    }
    fetchMeals();
    showToast("Meal removed");
  }

  /* ── Drag & drop for desktop scan ── */
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    // Reuse the same analysis pipeline
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileRef.current) {
      // Trigger the same FileReader flow
      const fakeEvent = { target: { files: dt.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFile(fakeEvent);
    }
  }

  /* ── Scan ── */
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setAiResult(null);
    setScanQty(1);
    setScanError(null);
    setScanState("uploading");

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // Convert file to base64
        const dataUrl   = reader.result as string;
        const base64    = dataUrl.split(",")[1];
        const mimeType  = file.type || "image/jpeg";

        setScanState("analysing");

        const res = await fetch("/api/analyze-meal", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ imageBase64: base64, mimeType }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const data: AiMealResult = await res.json();
        setAiResult(data);
        setScanState("done");
      } catch (err: any) {
        console.error("[analyze-meal]", err);
        setScanError(err?.message ?? "AI analysis failed");
        setScanState("error");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleLogScan() {
    if (!userId || !aiResult) return;
    setSaving(true);
    const cals = Math.round(aiResult.calories * scanQty);
    const pro  = Math.round(aiResult.proteinG * scanQty);
    const carb = Math.round(aiResult.carbsG * scanQty);
    const fat  = Math.round(aiResult.fatG * scanQty);
    try {
      await Meals.log({
        userId,
        name:        aiResult.name,
        mealType,
        calories:    cals,
        proteinG:    pro,
        carbsG:      carb,
        fatG:        fat,
        servingSize: scanQty === 1 ? aiResult.servingSize : `${scanQty}x ${aiResult.servingSize}`,
        date:        today,
        loggedAt:    Date.now(),
        aiGenerated: true,
      });
      await syncProgress(cals, pro, carb, fat);
      fetchMeals();
      fetchRecent();
      setPreview(null);
      setAiResult(null);
      setScanState("idle");
      if (fileRef.current) fileRef.current.value = "";
      showToast(`🤖 ${aiResult.name} logged!`);
    } finally { setSaving(false); }
  }

  function resetScan() {
    setPreview(null);
    setAiResult(null);
    setScanQty(1);
    setScanError(null);
    setScanState("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <AuthGuard>
      <div className={styles.page}>
        <Navbar />

        {/* ── Global toast ── */}
        {toast && (
          <div
            className={`${styles.toast} ${toast.type === "error" ? styles.toastError : ""}`}
            role="status"
            aria-live="polite"
          >
            <span className="material-symbols-outlined">
              {toast.type === "error" ? "error" : "check_circle"}
            </span>
            {toast.msg}
          </div>
        )}

        <div className={styles.container}>

          {/* ═══════════════════════════
              HEADER
          ═══════════════════════════ */}
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Log Your Meal</h1>
              <p className={styles.subtitle}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </p>
            </div>
            <button
              className={styles.manualEntryBtn}
              onClick={() => setShowManual(true)}
              id="log-manual-entry-btn"
              aria-label="Open manual food entry"
            >
              <span className="material-symbols-outlined">edit_note</span>
              <span>Manual Entry</span>
            </button>
          </header>

          {/* ═══════════════════════════
              DAILY STATS HERO
          ═══════════════════════════ */}
          <section className={styles.statsHero} id="log-today-bar" aria-label="Today's nutrition summary">
            <CalRing pct={calPct} cals={todayTotals.cals} goal={calorieGoal} isOver={isOverGoal} />
            <div className={styles.macroBarsCol}>
              <div className={styles.macroBarsTitle}>
                <span className="material-symbols-outlined">bar_chart</span>
                Today's Macros
              </div>
              <MacroBar label="Protein" value={todayTotals.protein} target={proteinGoal} color="var(--accent-green)"  />
              <MacroBar label="Carbs"   value={todayTotals.carbs}   target={carbsGoal}   color="var(--accent-purple)" />
              <MacroBar label="Fat"     value={todayTotals.fat}      target={fatGoal}     color="var(--fat)"           />
            </div>
            <div className={styles.heroMeta}>
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaVal}>{meals.length}</span>
                <span className={styles.heroMetaKey}>Meals</span>
              </div>
              <div className={styles.heroMetaDivider} />
              <div className={styles.heroMetaItem}>
                <span className={styles.heroMetaVal} style={{ color: isOverGoal ? "var(--fat)" : "var(--accent-green)" }}>
                  {isOverGoal ? "Over" : "On track"}
                </span>
                <span className={styles.heroMetaKey}>Status</span>
              </div>
            </div>
          </section>

          {/* ── Meal type selector ── */}
          <nav className={styles.mealTypeNav} aria-label="Meal type">
            {MEAL_TYPES.map((m) => {
              const active = mealType === m.id;
              return (
                <button
                  key={m.id}
                  className={`${styles.mealTypeTab} ${active ? styles.mealTypeTabActive : ""}`}
                  style={active ? { background: m.gradient, borderColor: m.color + "55", color: m.color } : {}}
                  onClick={() => setMealType(m.id)}
                  id={`log-meal-${m.id}`}
                  aria-pressed={active}
                >
                  <span className={styles.mealTypeTabIcon}>{m.icon}</span>
                  <span className={styles.mealTypeTabLabel}>{m.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ── Scan zone ── */}
          <section className={styles.scanSection} aria-label="AI meal scanner">
            <input ref={fileRef} type="file" accept="image/*" capture="environment"
              className={styles.fileInput} onChange={handleFile} id="log-file-input" />
            
            {scanState === "idle" && (
              <div
                className={`${styles.scanBanner} ${isDragOver ? styles.scanBannerDrag : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
                aria-label="Tap to scan your meal with AI"
                id="log-scan-zone"
              >
                <div className={styles.bannerGlow} aria-hidden />
                <div className={styles.bannerIconRing}>
                  <span className={`material-symbols-outlined ${styles.bannerIcon}`}>linked_camera</span>
                </div>
                <div className={styles.bannerCopy}>
                  <div className={styles.bannerTitle}>Snap Your Meal</div>
                  <div className={styles.bannerSub}>AI identifies every ingredient &amp; macro in seconds</div>
                </div>
                <div className={styles.bannerBadges}>
                  <span className={`${styles.scanBadge} ${styles.scanBadgeBlue}`}>Llama 4</span>
                  <span className={`${styles.scanBadge} ${styles.scanBadgeGreen}`}>&lt;5s</span>
                </div>
              </div>
            )}

            {scanState !== "idle" && (
                <div className={styles.scanZone} id="log-scan-zone-active">
                    {preview && (
                        <div className={styles.previewWrap}>
                            <img src={preview} alt="Meal preview" className={styles.previewImg} />
                            {(scanState === "uploading" || scanState === "analysing") && (
                                <div className={styles.scanOverlay}>
                                    <div className={styles.scanSpinner} />
                                    <span>{scanState === "uploading" ? "Uploading..." : "AI parsing..."}</span>
                                </div>
                            )}
                            {scanState === "error" && (
                                <div className={styles.scanErrorOverlay}>
                                    <span>{scanError}</span>
                                    <button onClick={resetScan}>Retry</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {scanState === "done" && aiResult && (
                <div className={styles.resultCard}>
                    <h3>{aiResult.name}</h3>
                    <div className={styles.resultQtyWrap}>
                        <button onClick={() => setScanQty(q => Math.max(0.5, q - 0.5))}>–</button>
                        <span>{scanQty}</span>
                        <button onClick={() => setScanQty(q => q + 0.5)}>+</button>
                    </div>
                    <div className={styles.resultMacrosRow}>
                        <div>{Math.round(aiResult.calories * scanQty)} kcal</div>
                        <div>{Math.round(aiResult.proteinG * scanQty)}g P</div>
                    </div>
                    <button className={styles.scanLogBtn} onClick={handleLogScan} disabled={saving}>
                        {saving ? "Logging..." : "Log Meal"}
                    </button>
                    <button onClick={resetScan}>Cancel</button>
                </div>
            )}
          </section>

          {/* ── Main grid ── */}
          <div className={styles.mainGrid}>
            <div className={styles.leftCol}>
                <div className={styles.mealsCard}>
                    <div className={styles.mealsCardHeader}>
                        <strong>Today's Meals</strong>
                    </div>
                    <div className={styles.mealsList}>
                        {meals.map((m: any) => (
                            <MealRow key={m.id} meal={m} onDelete={handleDelete} />
                        ))}
                    </div>
                </div>
            </div>
            <aside className={styles.rightCol}>
                <div className={styles.searchWrap}>
                    <input 
                        placeholder="Search foods..." 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                    />
                </div>
                <div className={styles.foodGrid}>
                    {displayedFoods.map((f) => (
                        <div key={f.name}>
                            <FoodCard 
                                food={f} 
                                onSelect={() => setPendingFood(pendingFood?.name === f.name ? null : f)}
                                isSelected={pendingFood?.name === f.name}
                                adding={saving}
                            />
                            {pendingFood?.name === f.name && (
                                <QuantityPicker 
                                    food={f}
                                    onConfirm={handleConfirmAdd}
                                    onCancel={() => setPendingFood(null)}
                                    saving={saving}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </aside>
          </div>
        </div>

        {showManual && (
            <div className={styles.backdrop} onClick={() => setShowManual(false)}>
                <div className={styles.modal} onClick={e => e.stopPropagation()}>
                    <form onSubmit={handleManualSubmit}>
                        <input placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                        <input placeholder="Kcal" type="number" value={form.calories} onChange={e => setForm({...form, calories: e.target.value})} required />
                        <button type="submit" disabled={saving}>Log</button>
                    </form>
                </div>
            </div>
        )}
      </div>
    </AuthGuard>
  );
}

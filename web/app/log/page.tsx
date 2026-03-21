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
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import styles from "./Log.module.css";

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
function MealRow({ meal, onDelete }: { meal: any; onDelete: (id: string) => void }) {
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
            <button className={styles.confirmYes} onClick={() => onDelete(meal._id)} aria-label="Confirm delete">
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
  const [mode, setMode]         = useState<QtyMode>("servings");
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
  const userId = user?._id as any;
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
  const [pendingFood, setPendingFood] = useState<DBFood | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [form, setForm]             = useState<ManualForm>(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  /* ── Convex ── */
  const meals          = useQuery(api.meals.byDate, userId ? { userId, date: today } : "skip") ?? [];
  const logMeal        = useMutation(api.meals.log);
  const removeMeal     = useMutation(api.meals.remove);
  const upsertProgress = useMutation(api.progress.upsert);

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

  const displayedFoodsResult = useQuery(api.foods.search, { searchQuery: query, category: foodCat });
  const displayedFoods: DBFood[] = displayedFoodsResult ?? [];

  const activeMealMeta = MEAL_TYPES.find((m) => m.id === mealType)!;

  /* ── Helpers ── */
  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }

  async function syncProgress(dCals = 0, dP = 0, dC = 0, dF = 0) {
    if (!userId) return;
    await upsertProgress({
      userId, date: today,
      caloriesConsumed: Math.round(todayTotals.cals + dCals),
      proteinConsumed:  Math.round(todayTotals.protein + dP),
      carbsConsumed:    Math.round(todayTotals.carbs   + dC),
      fatConsumed:      Math.round(todayTotals.fat     + dF),
      recordedAt: Date.now(),
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
      await logMeal({
        userId, name: food.name, mealType,
        calories: cals, proteinG: protein, carbsG: carbs, fatG: fat,
        servingSize: serving,
        date: today, loggedAt: Date.now(), aiGenerated: false,
      });
      await syncProgress(cals, protein, carbs, fat);
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
      await logMeal({ userId, name: form.name, mealType, calories: cals, proteinG: protein, carbsG: carbs, fatG: fat, servingSize: form.servingSize || "1 serving", date: today, loggedAt: Date.now(), aiGenerated: false });
      await syncProgress(cals, protein, carbs, fat);
      setForm(emptyForm); setShowManual(false);
      showToast(`✓ ${form.name} logged`);
    } catch { showToast("Failed to save", "error"); }
    finally { setSaving(false); }
  }

  /* ── Delete ── */
  async function handleDelete(id: string) {
    const meal = (meals as any[]).find((m) => m._id === id);
    await removeMeal({ id: id as any });
    if (userId && meal) {
      await upsertProgress({ userId, date: today,
        caloriesConsumed: Math.max(0, Math.round(todayTotals.cals    - (meal.calories ?? 0))),
        proteinConsumed:  Math.max(0, Math.round(todayTotals.protein  - (meal.proteinG ?? 0))),
        carbsConsumed:    Math.max(0, Math.round(todayTotals.carbs    - (meal.carbsG   ?? 0))),
        fatConsumed:      Math.max(0, Math.round(todayTotals.fat      - (meal.fatG     ?? 0))),
        recordedAt: Date.now(),
      });
    }
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
      await logMeal({
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
          {/* Ring */}
          <CalRing pct={calPct} cals={todayTotals.cals} goal={calorieGoal} isOver={isOverGoal} />

          {/* Macro bars */}
          <div className={styles.macroBarsCol}>
            <div className={styles.macroBarsTitle}>
              <span className="material-symbols-outlined">bar_chart</span>
              Today's Macros
            </div>
            <MacroBar label="Protein" value={todayTotals.protein} target={proteinGoal} color="var(--accent-green)"  />
            <MacroBar label="Carbs"   value={todayTotals.carbs}   target={carbsGoal}   color="var(--accent-purple)" />
            <MacroBar label="Fat"     value={todayTotals.fat}      target={fatGoal}     color="var(--fat)"           />
          </div>

          {/* Meal count + streak badge */}
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

        {/* ═══════════════════════════
            MEAL TYPE SELECTOR
        ═══════════════════════════ */}
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
                {active && <span className={styles.mealTypeTabIndicator} style={{ background: m.color }} />}
              </button>
            );
          })}
        </nav>

        {/* ═══════════════════════════
            SNAP YOUR MEAL — full-width, above grid
        ═══════════════════════════ */}
        <section className={styles.scanSection} aria-label="AI meal scanner">
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            className={styles.fileInput} onChange={handleFile} id="log-file-input" />

          {/* ── IDLE: compact horizontal CTA ── */}
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
              {/* Ambient glow */}
              <div className={styles.bannerGlow} aria-hidden />

              {/* Icon ring */}
              <div className={styles.bannerIconRing}>
                <span className={`material-symbols-outlined ${styles.bannerIcon}`}>linked_camera</span>
              </div>

              {/* Copy */}
              <div className={styles.bannerCopy}>
                <div className={styles.bannerTitle}>Snap Your Meal</div>
                <div className={styles.bannerSub}>AI identifies every ingredient &amp; macro in seconds</div>
                <div className={styles.bannerDesktopHint}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>upload_file</span>
                  drag &amp; drop a photo, or tap to browse
                </div>
              </div>

              {/* Badges */}
              <div className={styles.bannerBadges}>
                <span className={`${styles.scanBadge} ${styles.scanBadgeBlue}`}>
                  <span className="material-symbols-outlined">bolt</span>Llama 4
                </span>
                <span className={`${styles.scanBadge} ${styles.scanBadgeGreen}`}>
                  <span className="material-symbols-outlined">speed</span>&lt;5s
                </span>
              </div>

              {/* CTA */}
              <button
                className={styles.bannerCta}
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                id="log-scan-cta"
                tabIndex={-1}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined">photo_camera</span>
                <span className={styles.bannerCtaLabel}>Scan Meal</span>
              </button>
            </div>
          )}

          {/* ── ACTIVE: full scan zone (uploading / analysing) ── */}
          {scanState !== "idle" && (
            <div
              className={`${styles.scanZone} ${isDragOver ? styles.scanZoneDragOver : ""}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              id="log-scan-zone-active"
            >
              <div className={styles.scanGlow1} aria-hidden />
              <div className={styles.scanGlow2} aria-hidden />

              {preview && (
                <div className={styles.previewWrap}>
                  <img src={preview} alt="Your meal photo" className={styles.previewImg} />
                  {(scanState === "uploading" || scanState === "analysing") && (
                    <div className={styles.scanOverlay}>
                      <div className={styles.scanBeam} aria-hidden />
                      <div className={styles.scanPill}>
                        <div className={styles.scanSpinner} />
                        <span>{scanState === "uploading" ? "Uploading photo…" : "AI analyzing food…"}</span>
                      </div>
                    </div>
                  )}
                  {scanState === "error" && (
                    <div className={styles.scanErrorOverlay}>
                      <span className="material-symbols-outlined" style={{ fontSize: 40 }}>error_outline</span>
                      <span style={{ fontWeight: 800 }}>{scanError}</span>
                      <button className={styles.retryBtn} onClick={resetScan}>Try again</button>
                    </div>
                  )}
                  {scanState === "done" && (
                    <div className={styles.scanDone}>
                      <span className={`material-symbols-outlined ${styles.scanDoneIcon}`}>check_circle</span>
                      <span>Analysis complete!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── RESULT CARD ── */}
          {scanState === "done" && aiResult && (
            <div className={styles.resultCard} role="region" aria-label="AI analysis result">
              <div className={styles.resultHeader}>
                <span className={styles.resultChip}>{activeMealMeta.label}</span>
                <div className={styles.resultTitleRow}>
                  <h3 className={styles.resultName}>{aiResult.name}</h3>
                  <div className={styles.resultQtyWrap}>
                    <button className={styles.qtyBtn} onClick={() => setScanQty(q => Math.max(0.5, q - 0.5))}>–</button>
                    <span className={styles.qtyVal}>{scanQty}</span>
                    <button className={styles.qtyBtn} onClick={() => setScanQty(q => q + 0.5)}>+</button>
                  </div>
                </div>
              </div>

              <div className={styles.resultMacroGrid}>
                {([
                  { label: "Calories", val: Math.round(aiResult.calories * scanQty),      icon: "local_fire_department",  color: "var(--text)",   bg: "var(--surface)" },
                  { label: "Carbs",    val: Math.round(aiResult.carbsG * scanQty) + "g",    icon: "eco",                    color: "var(--text)",   bg: "var(--surface)" },
                  { label: "Protein",  val: Math.round(aiResult.proteinG * scanQty) + "g",  icon: "egg_alt",                color: "var(--text)",   bg: "var(--surface)" },
                  { label: "Fats",     val: Math.round(aiResult.fatG * scanQty) + "g",      icon: "water_drop",             color: "var(--text)",   bg: "var(--surface)" },
                ] as const).map((m) => (
                  <div key={m.label} className={styles.resultMacroCell2}>
                    <div className={styles.macroCellIcon} style={{ color: m.color, background: m.bg }}>
                      <span className="material-symbols-outlined">{m.icon}</span>
                    </div>
                    <div className={styles.macroCellData}>
                      <span className={styles.macroCellLabel}>{m.label}</span>
                      <span className={styles.macroCellVal}>{m.val}</span>
                    </div>
                    <span className="material-symbols-outlined" style={{ marginLeft: "auto", fontSize: "14px", color: "var(--text-muted)" }}>edit</span>
                  </div>
                ))}
              </div>

              {/* Health Score */}
              <div className={styles.healthScoreRow}>
                <div className={styles.healthScoreIcon}>
                  <span className="material-symbols-outlined">favorite</span>
                </div>
                <div className={styles.healthScoreDetail}>
                  <div className={styles.healthScoreTop}>
                    <span className={styles.healthScoreLabel}>Health score</span>
                    <span className={styles.healthScoreVal}>{Math.round(aiResult.confidence / 10)}/10</span>
                  </div>
                  <div className={styles.healthScoreBar}>
                    <div className={styles.healthScoreFill} style={{ width: `${aiResult.confidence}%` }}></div>
                  </div>
                </div>
              </div>

              <div className={styles.resultActions2}>
                <button className={styles.fixBtn} onClick={resetScan}>
                  <span className="material-symbols-outlined">auto_awesome</span> Fix Results
                </button>
                <button className={styles.doneBtn} id="log-confirm-btn"
                  onClick={handleLogScan} disabled={saving || !userId}>
                  {saving ? "Saving..." : "Done"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ═══════════════════════════
            MAIN GRID
        ═══════════════════════════ */}
        <div className={styles.mainGrid}>

          {/* ────────────────────────
              LEFT — MEALS ONLY
          ──────────────────────── */}
          <div className={styles.leftCol}>
            {/* ── Today's logged meals ── */}
            <div className={styles.mealsCard}>
              <div className={styles.mealsCardHeader}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>receipt_long</span>
                <strong>Today's Meals</strong>
                {meals.length > 0 && (
                  <span className={styles.mealsBadge}>{meals.length}</span>
                )}
                <span className={styles.mealsTotalCals} style={{ color: isOverGoal ? "var(--fat)" : "var(--primary)" }}>
                  {Math.round(todayTotals.cals).toLocaleString()} kcal
                </span>
              </div>

              {meals.length === 0 ? (
                <div className={styles.emptyState} id="log-empty-state">
                  <div className={styles.emptyIcon}>
                    <span className="material-symbols-outlined">no_meals</span>
                  </div>
                  <p className={styles.emptyTitle}>Nothing logged yet</p>
                  <p className={styles.emptySub}>Snap a photo or quick-add a food to start tracking</p>
                </div>
              ) : (
                <div className={styles.mealsList} id="log-meal-list">
                  {(meals as any[]).map((meal) => (
                    <MealRow key={meal._id} meal={meal} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ────────────────────────
              RIGHT — FOOD SEARCH
          ──────────────────────── */}
          <aside className={styles.rightCol}>

            {/* Search header */}
            <div className={styles.quickAddCard}>
              <div className={styles.quickAddHeader}>
                <span className="material-symbols-outlined" style={{ color: "var(--accent-yellow)" }}>flash_on</span>
                <h3 className={styles.quickAddTitle}>Quick Add</h3>
                <span className={styles.quickAddSub}>log in one tap</span>
              </div>

              {/* Search box */}
              <div className={styles.searchWrap}>
                <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                <input
                  className={styles.searchInput}
                  placeholder="Search foods…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  id="log-search-input"
                  aria-label="Search foods"
                />
                {query && (
                  <button className={styles.searchClear} onClick={() => setQuery("")} aria-label="Clear search">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>

              {/* Category filter tabs */}
              <div className={styles.catTabs} role="tablist" aria-label="Food categories">
                {FOOD_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={foodCat === cat}
                    className={`${styles.catTab} ${foodCat === cat ? styles.catTabActive : ""}`}
                    onClick={() => setFoodCat(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Food cards */}
              <div className={styles.foodGrid} role="list">
                {displayedFoods.length === 0 ? (
                  <div className={styles.noResults}>
                    <span className="material-symbols-outlined">search_off</span>
                    No results for "{query}"
                  </div>
                ) : (
                  displayedFoods.map((food) => (
                    <div key={food.name}>
                      <FoodCard
                        food={food}
                        onSelect={() => setPendingFood(
                          pendingFood?.name === food.name ? null : food
                        )}
                        isSelected={pendingFood?.name === food.name}
                        adding={saving}
                      />
                      {/* Inline quantity picker — slides open below the selected card */}
                      {pendingFood?.name === food.name && (
                        <QuantityPicker
                          food={food}
                          onConfirm={handleConfirmAdd}
                          onCancel={() => setPendingFood(null)}
                          saving={saving}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Manual entry CTA */}
            <button
              className={styles.manualCard}
              onClick={() => setShowManual(true)}
              id="log-open-manual"
              aria-label="Open manual food entry form"
            >
              <div className={styles.manualCardGlow} aria-hidden />
              <span className={`material-symbols-outlined ${styles.manualCardIcon}`}>edit_note</span>
              <div className={styles.manualCardText}>
                <span className={styles.manualCardTitle}>Custom Food Entry</span>
                <span className={styles.manualCardSub}>Enter exact nutrition data</span>
              </div>
              <span className="material-symbols-outlined" style={{ color: "var(--text-muted)", marginLeft: "auto", fontSize: 20 }}>
                arrow_forward_ios
              </span>
            </button>

            {/* Active meal type indicator */}
            <div
              className={styles.activeTypeBanner}
              style={{ background: activeMealMeta.gradient, borderColor: activeMealMeta.color + "44" }}
            >
              <span style={{ fontSize: 22 }}>{activeMealMeta.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: activeMealMeta.color }}>{activeMealMeta.label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Foods will be logged here</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ═════════════════════════════════════════════
          MANUAL ENTRY MODAL
      ═════════════════════════════════════════════ */}
      {showManual && (
        <div
          className={styles.backdrop}
          onClick={() => setShowManual(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Manual food entry"
          id="log-manual-modal"
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderGlow} aria-hidden />
              <div>
                <h2 className={styles.modalTitle}>Log Food Manually</h2>
                <p className={styles.modalSub}>Enter exact nutritional data</p>
              </div>
              <button className={styles.modalCloseBtn} onClick={() => setShowManual(false)} aria-label="Close modal">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className={styles.modalBody}>

              {/* Inline meal type in modal */}
              <div className={styles.modalMealRow} role="group" aria-label="Select meal type">
                {MEAL_TYPES.map((m) => {
                  const active = mealType === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.modalMealBtn} ${active ? styles.modalMealBtnActive : ""}`}
                      style={active ? { borderColor: m.color + "77", background: m.gradient, color: m.color } : {}}
                      onClick={() => setMealType(m.id)}
                      aria-pressed={active}
                    >
                      {m.icon} {m.label}
                    </button>
                  );
                })}
              </div>

              {/* Name */}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="manual-name">Food Name *</label>
                <input id="manual-name" className={styles.fieldInput}
                  placeholder="e.g. Grilled Chicken Salad"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required autoComplete="off" />
              </div>

              {/* Serving */}
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="manual-serving">Serving Size</label>
                <input id="manual-serving" className={styles.fieldInput}
                  placeholder="e.g. 1 bowl, 200g"
                  value={form.servingSize} onChange={(e) => setForm((f) => ({ ...f, servingSize: e.target.value }))} />
              </div>

              {/* Macro grid */}
              <div className={styles.macroInputGrid}>
                {[
                  { key: "calories", label: "Calories", unit: "kcal", color: "var(--primary)",        id: "manual-cals"    },
                  { key: "protein",  label: "Protein",  unit: "g",    color: "var(--accent-green)",   id: "manual-protein" },
                  { key: "carbs",    label: "Carbs",    unit: "g",    color: "var(--accent-purple)",  id: "manual-carbs"   },
                  { key: "fat",      label: "Fat",      unit: "g",    color: "var(--fat)",             id: "manual-fat"     },
                ].map(({ key, label, unit, color, id }) => (
                  <div key={key} className={styles.macroInputCell}>
                    <label className={styles.macroInputLabel} htmlFor={id} style={{ color }}>{label}</label>
                    <div className={styles.macroInputWrap} style={{ "--macro-color": color } as any}>
                      <input id={id} type="number" min="0" step="0.1"
                        className={styles.macroInput}
                        placeholder="0"
                        value={form[key as keyof ManualForm]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                      <span className={styles.macroInputUnit}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live preview strip */}
              {(parseFloat(form.calories) > 0 || parseFloat(form.protein) > 0) && (
                <div className={styles.livePreview} aria-live="polite" aria-label="Nutritional preview">
                  <span className={styles.livePreviewLabel}>Preview</span>
                  <span style={{ fontWeight: 900, color: "var(--primary)" }}>{Math.round(parseFloat(form.calories)||0)} kcal</span>
                  <span className={styles.dot}>·</span>
                  <span style={{ color: "var(--accent-green)",  fontWeight: 700 }}>{Math.round(parseFloat(form.protein)||0)}g P</span>
                  <span style={{ color: "var(--accent-purple)", fontWeight: 700 }}>{Math.round(parseFloat(form.carbs)||0)}g C</span>
                  <span style={{ color: "var(--fat)",           fontWeight: 700 }}>{Math.round(parseFloat(form.fat)||0)}g F</span>
                </div>
              )}

              {/* Actions */}
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn}
                  onClick={() => { setShowManual(false); setForm(emptyForm); }}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}
                  disabled={saving || !userId || !form.name} id="log-manual-submit">
                  {saving
                    ? <><div className={styles.spinSm} />Saving…</>
                    : <><span className="material-symbols-outlined">add_circle</span>Log Meal</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile sticky scan FAB ── */}
      <button
        className={styles.mobileFab}
        onClick={() => fileRef.current?.click()}
        aria-label="Scan meal with camera"
        id="log-mobile-fab"
      >
        <span className="material-symbols-outlined">linked_camera</span>
        <span className={styles.mobileFabLabel}>Scan Meal</span>
      </button>
    </div>
  );
}

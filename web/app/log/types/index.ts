/**
 * Centralized TypeScript types for the log page
 * Extracted from the monolithic page.tsx for better maintainability
 */

/* ═══════════════════════════════════════════════════════════
AI ANALYSIS TYPES
═══════════════════════════════════════════════════════════ */

export interface AiMealResult {
  name: string
  confidence: number
  servingSize: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  notes: string
  /** Individual ingredient breakdown with per-item macros */
  ingredients?: AiIngredient[]
  /** AI suggestions for meal improvements */
  suggestions?: string[]
}

export interface AiIngredient {
  name: string
  quantity: string
  calories: number
  confidence: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}

/* ═══════════════════════════════════════════════════════════
MEAL TYPE SYSTEM
═══════════════════════════════════════════════════════════ */

export const MEAL_TYPES = [
  {
    id: "breakfast" as const,
    label: "Breakfast",
    icon: "☀️",
    color: "#fbbf24",
    gradient: "linear-gradient(135deg,#fbbf2430,#fbbf2408)",
  },
  {
    id: "lunch" as const,
    label: "Lunch",
    icon: "🌤️",
    color: "#3b96f5",
    gradient: "linear-gradient(135deg,#3b96f530,#3b96f508)",
  },
  {
    id: "dinner" as const,
    label: "Dinner",
    icon: "🌙",
    color: "#a855f7",
    gradient: "linear-gradient(135deg,#a855f730,#a855f708)",
  },
  {
    id: "snack" as const,
    label: "Snack",
    icon: "🍎",
    color: "#10e56b",
    gradient: "linear-gradient(135deg,#10e56b30,#10e56b08)",
  },
] as const

export type MealTypeId = typeof MEAL_TYPES[number]["id"]

export interface MealTypeMeta {
  id: MealTypeId
  label: string
  icon: string
  color: string
  gradient: string
}

/* ═══════════════════════════════════════════════════════════
FOOD CATEGORY SYSTEM
═══════════════════════════════════════════════════════════ */

export const FOOD_CATEGORIES = [
  "All",
  "Protein",
  "Carbs",
  "Fats",
  "Dairy",
  "Fruits",
  "Vegetables",
  "Snacks",
  "Drinks",
] as const

export type FoodCategory = typeof FOOD_CATEGORIES[number]

/* ═══════════════════════════════════════════════════════════
DATABASE FOOD TYPES
═══════════════════════════════════════════════════════════ */

export interface DBFood {
  _id?: string
  name: string
  cals: number
  protein: number
  carbs: number
  fat: number
  emoji: string
  cat?: string
}

/* ═══════════════════════════════════════════════════════════
SCAN STATE TYPES
═══════════════════════════════════════════════════════════ */

export type ScanState = "idle" | "uploading" | "analysing" | "done" | "error"

/* ═══════════════════════════════════════════════════════════
MANUAL ENTRY FORM
═══════════════════════════════════════════════════════════ */

export interface ManualForm {
  name: string
  calories: string
  protein: string
  carbs: string
  fat: string
  servingSize: string
}

export const EMPTY_FORM: ManualForm = {
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  servingSize: "",
}

/* ═══════════════════════════════════════════════════════════
QUANTITY PICKER
═══════════════════════════════════════════════════════════ */

export type QtyMode = "servings" | "grams"

export interface ScaledMacros {
  cals: number
  protein: number
  carbs: number
  fat: number
}

/* ═══════════════════════════════════════════════════════════
PROGRESS & STATS
═══════════════════════════════════════════════════════════ */

export interface DailyTotals {
  cals: number
  protein: number
  carbs: number
  fat: number
}

/* ═══════════════════════════════════════════════════════════
COMPONENT PROPS
═══════════════════════════════════════════════════════════ */

export interface DailyStatsHeroProps {
  meals: any[]
  calorieGoal: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
}

export interface CalRingProps {
  pct: number
  cals: number
  goal: number
  isOver: boolean
}

export interface MacroBarProps {
  label: string
  value: number
  target: number
  color: string
}

export interface MealRowProps {
  meal: any
  onDelete: (id: string) => void
}

export interface FoodCardProps {
  food: DBFood
  onSelect: () => void
  isSelected: boolean
  adding: boolean
}

export interface QuantityPickerProps {
  food: DBFood
  onConfirm: (food: DBFood, multiplier: number, mode: QtyMode) => void
  onCancel: () => void
  saving: boolean
}

/* ═══════════════════════════════════════════════════════════
HOOK RETURN TYPES
═══════════════════════════════════════════════════════════ */

export interface UseMealLoggingReturn {
  handleLog: (data: any) => Promise<void>
  handleDelete: (id: string) => Promise<void>
  handleLogManual: (data: ManualForm & { mealType: MealTypeId }) => Promise<void>
  saving: boolean
}

export interface UseFoodSearchReturn {
  query: string
  setQuery: (q: string) => void
  filteredFoods: DBFood[]
  aiSuggestions: DBFood[]
  loading: boolean
}

export interface UseAIScanReturn {
  scanState: ScanState
  preview: string | null
  aiResult: AiMealResult | null
  error: string | null
  isQualified: boolean
  handleFileSelect: (file: File) => void
  handleAnalyse: () => Promise<void>
  handleReset: () => void
  setError: (msg: string | null) => void
}

export interface UseProgressSyncReturn {
  syncProgress: (delta: Partial<DailyTotals>) => Promise<void>
  todayTotals: DailyTotals
}

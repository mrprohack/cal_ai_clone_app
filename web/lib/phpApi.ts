/**
 * Cal AI — PHP API Client
 *
 * Replaces all Server Actions with fetch() calls to /api/*.php endpoints.
 * Works in both: local dev (proxied to localhost:8000) and production (Hostinger PHP).
 */

const BASE = typeof window !== "undefined" ? "" : "";

async function call<T = any>(endpoint: string, action: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}/api/${endpoint}.php?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `API error ${res.status}`);
  }
  return res.json();
}

/* ─────────────────────────────────────────────
   AUTH
───────────────────────────────────────────── */
export const Auth = {
  signUp: (name: string, email: string, password: string) =>
    call("auth", "signUp", { name, email, password }),

  signIn: (email: string, password: string) =>
    call("auth", "signIn", { email, password }),

  signOut: (token: string) =>
    call("auth", "signOut", { token }),

  getSessionUser: (token: string) =>
    call("auth", "getSessionUser", { token }),
};

/* ─────────────────────────────────────────────
   USERS
───────────────────────────────────────────── */
export const Users = {
  getById: (userId: number) =>
    call<{ user: any }>("users", "getById", { userId }).then((r) => r.user),

  updateProfile: (userId: number, fields: object) =>
    call("users", "updateProfile", { userId, fields }),

  completeOnboarding: (userId: number, args: object) =>
    call("users", "completeOnboarding", { userId, args }),

  updatePlan: (userId: number, plan: string) =>
    call("users", "updatePlan", { userId, plan }),

  getUserPlan: (userId: number) =>
    call("users", "getUserPlan", { userId }),

  deleteAccount: (userId: number) =>
    call("users", "deleteAccount", { userId }),

  exportData: (userId: number) =>
    call("users", "exportData", { userId }),
};

/* ─────────────────────────────────────────────
   MEALS
───────────────────────────────────────────── */
export const Meals = {
  log: (args: object) =>
    call<{ id: number }>("meals", "log", { args }),

  byDate: (userId: number, date: string) =>
    call<{ meals: any[] }>("meals", "byDate", { userId, date }).then((r) => r.meals ?? []),

  remove: (id: number) =>
    call("meals", "remove", { id }),

  getTodayMeals: (userId: number, date: string) =>
    call<{ meals: any[] }>("meals", "byDate", { userId, date }).then((r) => r.meals ?? []),

  getRecent: (userId: number, limit = 20) =>
    call<{ meals: any[] }>("meals", "getRecent", { userId, limit }).then((r) => r.meals ?? []),

  range: (userId: number, fromDate: string, toDate: string) =>
    call<{ meals: any[] }>("meals", "range", { userId, fromDate, toDate }).then((r) => r.meals ?? []),
};

/* ─────────────────────────────────────────────
   PROGRESS
───────────────────────────────────────────── */
export const Progress = {
  logWater: (userId: number, date: string, waterMl: number) =>
    call("progress", "logWater", { userId, date, waterMl }),

  upsert: (args: object) =>
    call("progress", "upsert", { args }),

  getDailyProgress: (userId: number, date: string) =>
    call<{ progress: any }>("progress", "getDailyProgress", { userId, date }).then((r) => r.progress),

  getStats: (userId: number, fromDate: string, toDate: string) =>
    call("progress", "getStats", { userId, fromDate, toDate }),

  range: (userId: number, fromDate: string, toDate: string) =>
    call<{ rows: any[] }>("progress", "range", { userId, fromDate, toDate }).then((r) => r.rows ?? []),

  getCalorieTrend: async (userId: number, fromDate: string, toDate: string) => {
    const meals = await Meals.range(userId, fromDate, toDate);
    const byDay: Record<string, number> = {};
    meals.forEach((m: any) => { byDay[m.date] = (byDay[m.date] ?? 0) + Number(m.calories); });
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, calories]) => ({ date, calories }));
  },

  getMacroTotals: async (userId: number, fromDate: string, toDate: string) => {
    const meals = await Meals.range(userId, fromDate, toDate);
    let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCals = 0;
    meals.forEach((m: any) => {
      totalProtein += Number(m.proteinG); totalCarbs += Number(m.carbsG);
      totalFat += Number(m.fatG); totalCals += Number(m.calories);
    });
    const days = meals.reduce((acc: Set<string>, m: any) => acc.add(m.date), new Set<string>()).size || 1;
    const kcal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9 || 1;
    return {
      totalProtein: Math.round(totalProtein), totalCarbs: Math.round(totalCarbs), totalFat: Math.round(totalFat),
      avgProtein: Math.round(totalProtein / days), avgCarbs: Math.round(totalCarbs / days), avgFat: Math.round(totalFat / days),
      proteinPct: Math.round((totalProtein * 4 / kcal) * 100),
      carbsPct: Math.round((totalCarbs * 4 / kcal) * 100),
      fatPct: Math.round((totalFat * 9 / kcal) * 100),
    };
  },

  getAchievements: async (userId: number) => {
    const res = await call<{ achievements: any[] }>("progress", "getAchievements", { userId }).catch(() => ({ achievements: [] }));
    return res.achievements ?? [];
  },

  getWeightHistory: (userId: number, fromDate: string, toDate: string) =>
    Progress.range(userId, fromDate, toDate).then((rows) =>
      rows.filter((r: any) => r.weightKg != null).map((r: any) => ({ date: r.date, weightKg: Number(r.weightKg) }))
    ),

  logWeight: (userId: number, date: string, weightKg: number) =>
    call("progress", "logWeight", { userId, date, weightKg }),
};

/* ─────────────────────────────────────────────
   DAILY SUMMARY (computed from meals)
───────────────────────────────────────────── */
export async function getDailySummary(userId: number, date: string) {
  const meals = await Meals.byDate(userId, date);
  const totalCalories = meals.reduce((s: number, m: any) => s + Number(m.calories), 0);
  const totalProtein  = meals.reduce((s: number, m: any) => s + Number(m.proteinG), 0);
  const totalCarbs    = meals.reduce((s: number, m: any) => s + Number(m.carbsG), 0);
  const totalFat      = meals.reduce((s: number, m: any) => s + Number(m.fatG), 0);
  return { totalCalories, totalProtein, totalCarbs, totalFat };
}

/* ─────────────────────────────────────────────
   CALORIE TREND (computed from progress range)
───────────────────────────────────────────── */
export async function getCalorieTrend(userId: number, fromDate: string, toDate: string) {
  const stats = await Progress.getStats(userId, fromDate, toDate);
  // The PHP endpoint doesn't return per-day data in trend format yet — we'll fetch directly
  const res = await call<{ rows: any[] }>("progress", "getDailyProgress", { userId, date: toDate });
  // Return simplified: PHP getStats lacks per-day breakdown, use meals range instead
  const meals = await Meals.range(userId, fromDate, toDate);
  const byDay: Record<string, number> = {};
  meals.forEach((m: any) => {
    byDay[m.date] = (byDay[m.date] ?? 0) + Number(m.calories);
  });
  return Object.entries(byDay).map(([date, calories]) => ({ date, calories }));
}

export async function getWeightHistory(userId: number, fromDate: string, toDate: string) {
  // Uses the progress range and filters weight entries
  const rows = await Progress.range(userId, fromDate, toDate);
  return rows
    .filter((r: any) => r.weightKg != null)
    .map((r: any) => ({ date: r.date, weightKg: Number(r.weightKg) }));
}

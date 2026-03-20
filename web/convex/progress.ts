import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Cal AI — Progress Convex Backend
 *
 * Queries
 * ───────
 * getStats        — aggregate stats (avg cals, avg protein, days logged, streak)
 * getCalorieTrend — daily calorie array for N days (7/30/90)
 * getMacroTotals  — total protein/carbs/fat for a date range
 * getWeightHistory — weight entries sorted ascending
 *
 * Mutations
 * ─────────
 * upsert  — upsert a daily progress snapshot (called from log page)
 * logWeight — quick weight-only entry
 */

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Upsert a daily progress snapshot */
export const upsert = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    weightKg: v.optional(v.number()),
    caloriesConsumed: v.number(),
    proteinConsumed: v.number(),
    carbsConsumed: v.number(),
    fatConsumed: v.number(),
    waterMl: v.optional(v.number()),
    steps: v.optional(v.number()),
    recordedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_user_date", (q) =>
        (q as any).eq("userId", args.userId).eq("date", args.date)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("progress", args);
  },
});

/** Log just a body weight entry for the given date */
export const logWeight = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    weightKg: v.number(),
  },
  handler: async (ctx, { userId, date, weightKg }) => {
    const existing = await ctx.db
      .query("progress")
      .withIndex("by_user_date", (q) =>
        (q as any).eq("userId", userId).eq("date", date)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { weightKg });
      return existing._id;
    }
    return await ctx.db.insert("progress", {
      userId,
      date,
      weightKg,
      caloriesConsumed: 0,
      proteinConsumed: 0,
      carbsConsumed: 0,
      fatConsumed: 0,
      recordedAt: Date.now(),
    });
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Get progress rows for a user over date range */
export const range = query({
  args: { userId: v.id("users"), fromDate: v.string(), toDate: v.string() },
  handler: async (ctx, { userId, fromDate, toDate }) => {
    return await ctx.db
      .query("progress")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("date"), fromDate))
      .filter((q) => q.lte(q.field("date"), toDate))
      .order("asc")
      .collect();
  },
});

/**
 * Get aggregate stats for a user over a period.
 * Returns: avgCalories, avgProtein, daysLogged, streak, total days in period.
 */
export const getStats = query({
  args: {
    userId: v.id("users"),
    /** ISO date string of the first day of the period */
    fromDate: v.string(),
    /** ISO date string of today (inclusive) */
    toDate: v.string(),
  },
  handler: async (ctx, { userId, fromDate, toDate }) => {
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("date"), fromDate))
      .filter((q) => q.lte(q.field("date"), toDate))
      .order("asc")
      .collect();

    const logged = rows.filter((r) => r.caloriesConsumed > 0);
    const daysLogged = logged.length;
    const avgCalories =
      daysLogged > 0
        ? Math.round(logged.reduce((s, r) => s + r.caloriesConsumed, 0) / daysLogged)
        : 0;
    const avgProtein =
      daysLogged > 0
        ? Math.round(logged.reduce((s, r) => s + r.proteinConsumed, 0) / daysLogged)
        : 0;

    // Compute current streak (consecutive days ending at toDate)
    // Build a Set of logged dates
    const loggedDates = new Set(logged.map((r) => r.date));
    let streak = 0;
    const cursor = new Date(toDate);
    while (true) {
      const dateStr = cursor.toISOString().split("T")[0];
      if (loggedDates.has(dateStr)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    // Period total days
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const totalDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

    return { avgCalories, avgProtein, daysLogged, streak, totalDays };
  },
});

/**
 * Get the daily calorie array (one value per day) for a given period.
 * Days with no data are returned as 0.
 */
export const getCalorieTrend = query({
  args: {
    userId: v.id("users"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, { userId, fromDate, toDate }) => {
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("date"), fromDate))
      .filter((q) => q.lte(q.field("date"), toDate))
      .order("asc")
      .collect();

    // Build a map for O(1) look-up
    const map = new Map(rows.map((r) => [r.date, r.caloriesConsumed]));

    // Generate full date array
    const result: { date: string; calories: number }[] = [];
    const cursor = new Date(fromDate);
    const end = new Date(toDate);
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0];
      result.push({ date: dateStr, calories: map.get(dateStr) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  },
});

/**
 * Get cumulative macro totals for a given period.
 * Returns total protein, carbs, fat, and percentages.
 */
export const getMacroTotals = query({
  args: {
    userId: v.id("users"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, { userId, fromDate, toDate }) => {
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("date"), fromDate))
      .filter((q) => q.lte(q.field("date"), toDate))
      .collect();

    const totalProtein = rows.reduce((s, r) => s + r.proteinConsumed, 0);
    const totalCarbs   = rows.reduce((s, r) => s + r.carbsConsumed, 0);
    const totalFat     = rows.reduce((s, r) => s + r.fatConsumed, 0);

    // Calories from macros (4/4/9 kcal per g)
    const proteinCals = totalProtein * 4;
    const carbsCals   = totalCarbs   * 4;
    const fatCals     = totalFat     * 9;
    const macroCalTotal = proteinCals + carbsCals + fatCals;

    const proteinPct = macroCalTotal > 0 ? Math.round((proteinCals / macroCalTotal) * 100) : 0;
    const carbsPct   = macroCalTotal > 0 ? Math.round((carbsCals   / macroCalTotal) * 100) : 0;
    const fatPct     = macroCalTotal > 0 ? Math.round((fatCals     / macroCalTotal) * 100) : 0;

    const daysLogged = rows.filter((r) => r.caloriesConsumed > 0).length;

    return {
      totalProtein: Math.round(totalProtein),
      totalCarbs:   Math.round(totalCarbs),
      totalFat:     Math.round(totalFat),
      avgProtein:   daysLogged > 0 ? Math.round(totalProtein / daysLogged) : 0,
      avgCarbs:     daysLogged > 0 ? Math.round(totalCarbs / daysLogged)   : 0,
      avgFat:       daysLogged > 0 ? Math.round(totalFat / daysLogged)     : 0,
      proteinPct,
      carbsPct,
      fatPct,
    };
  },
});

/**
 * Get weight history sorted ascending (for a weight-trend chart).
 * Only returns rows where weightKg is set.
 */
export const getWeightHistory = query({
  args: {
    userId: v.id("users"),
    fromDate: v.string(),
    toDate: v.string(),
  },
  handler: async (ctx, { userId, fromDate, toDate }) => {
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("date"), fromDate))
      .filter((q) => q.lte(q.field("date"), toDate))
      .order("asc")
      .collect();

    return rows
      .filter((r) => r.weightKg !== undefined)
      .map((r) => ({ date: r.date, weightKg: r.weightKg! }));
  },
});

/**
 * Compute achievements based on real data.
 * Returns a list of achievement objects with earned status.
 */
export const getAchievements = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const allRows = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const loggedRows = allRows.filter((r) => r.caloriesConsumed > 0);
    const totalDaysLogged = loggedRows.length;
    const totalMeals = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()
      .then((m) => m.length);

    // Streak calculation
    const loggedDates = new Set(loggedRows.map((r) => r.date));
    const today = new Date().toISOString().split("T")[0];
    let streak = 0;
    const cur = new Date(today);
    while (loggedDates.has(cur.toISOString().split("T")[0])) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }

    // Check if any day hit protein goal (need user goals — use 150g default)
    const user = await ctx.db.get(userId);
    const proteinGoal = user?.proteinGoal ?? 150;
    const proteinDays = loggedRows.filter((r) => r.proteinConsumed >= proteinGoal).length;

    // "Perfect week" = 7 consecutive logged days
    const hasAiScan = totalMeals > 0; // simplified: any meal logged via app

    return [
      {
        label: "7-Day Streak",
        icon: "🔥",
        description: "Log meals 7 days in a row",
        earned: streak >= 7,
        progress: Math.min(streak, 7),
        goal: 7,
      },
      {
        label: "Protein Champion",
        icon: "💪",
        description: `Hit your ${proteinGoal}g protein goal`,
        earned: proteinDays >= 3,
        progress: Math.min(proteinDays, 3),
        goal: 3,
      },
      {
        label: "First Meal Logged",
        icon: "📸",
        description: "Log your very first meal",
        earned: totalMeals >= 1,
        progress: Math.min(totalMeals, 1),
        goal: 1,
      },
      {
        label: "30-Day Consistency",
        icon: "🏅",
        description: "Log meals for 30 days total",
        earned: totalDaysLogged >= 30,
        progress: Math.min(totalDaysLogged, 30),
        goal: 30,
      },
      {
        label: "100 Meals Logged",
        icon: "🍽️",
        description: "Log 100 total meals",
        earned: totalMeals >= 100,
        progress: Math.min(totalMeals, 100),
        goal: 100,
      },
      {
        label: "Perfect Week",
        icon: "⭐",
        description: "Log meals every day for a full week",
        earned: streak >= 7,
        progress: Math.min(streak, 7),
        goal: 7,
      },
    ];
  },
});

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getDailySummary = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    return await ctx.db
      .query("dailySummaries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .unique();
  },
});

export const getWeekView = query({
  args: { startDate: v.string() },
  handler: async (ctx, { startDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    // Build 7-day date array
    const dates: string[] = [];
    const start = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    const summaries = await Promise.all(
      dates.map((date) =>
        ctx.db
          .query("dailySummaries")
          .withIndex("by_user_date", (q) =>
            q.eq("userId", user._id).eq("date", date)
          )
          .unique()
          .then((s) => s ?? { date, totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 })
      )
    );

    return summaries;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

// Called internally whenever meals change — recalculates daily totals
export const upsertSummary = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Sum all meals for this date
    const meals = await ctx.db
      .query("meals")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .collect();

    const totals = meals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.totalCalories,
        protein: acc.protein + m.totalProtein,
        carbs: acc.carbs + m.totalCarbs,
        fat: acc.fat + m.totalFat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const existing = await ctx.db
      .query("dailySummaries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
      });
    } else {
      await ctx.db.insert("dailySummaries", {
        userId: user._id,
        date,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        waterMl: 0,
        workoutDone: false,
      });
    }
  },
});

export const updateDailyExtras = mutation({
  args: {
    date: v.string(),
    waterMl: v.optional(v.number()),
    workoutDone: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("dailySummaries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .unique();

    const patch: Partial<{
      waterMl: number;
      workoutDone: boolean;
      notes: string;
    }> = {};
    if (args.waterMl !== undefined) patch.waterMl = args.waterMl;
    if (args.workoutDone !== undefined) patch.workoutDone = args.workoutDone;
    if (args.notes !== undefined) patch.notes = args.notes;

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("dailySummaries", {
        userId: user._id,
        date: args.date,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        ...patch,
      });
    }
  },
});

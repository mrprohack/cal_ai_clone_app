import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Log a meal entry */
export const log = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    mealType: v.string(),
    calories: v.number(),
    proteinG: v.number(),
    carbsG: v.number(),
    fatG: v.number(),
    servingSize: v.optional(v.string()),
    date: v.string(),
    loggedAt: v.number(),
    aiGenerated: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("meals", args);
  },
});

/** Get all meals for a user on a specific date */
export const byDate = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    return await ctx.db
      .query("meals")
      .withIndex("by_user_date", (q) =>
        (q as any).eq("userId", userId).eq("date", date)
      )
      .order("asc")
      .collect();
  },
});

/** Delete a meal */
export const remove = mutation({
  args: { id: v.id("meals") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/** Get all meals for a given date (used by dashboard) */
export const getTodayMeals = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    return await ctx.db
      .query("meals")
      .filter((q) => q.eq(q.field("date"), date))
      .order("asc")
      .collect();
  },
});

/** Get all meals in a date range */
export const range = query({
  args: { userId: v.id("users"), fromDate: v.string(), toDate: v.string() },
  handler: async (ctx, { userId, fromDate, toDate }) => {
    return await ctx.db
      .query("meals")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("date"), fromDate))
      .filter((q) => q.lte(q.field("date"), toDate))
      .order("asc")
      .collect();
  },
});

/** Get a user's recently logged unique meals */
export const getRecent = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, { userId, limit = 20 }) => {
    const pastMeals = await ctx.db
      .query("meals")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);

    const seen = new Set<string>();
    const recentFoods: any[] = [];
    
    for (const m of pastMeals) {
      if (!seen.has(m.name)) {
        seen.add(m.name);
        recentFoods.push({
          name: m.name,
          cals: m.calories,
          protein: m.proteinG,
          carbs: m.carbsG,
          fat: m.fatG,
          emoji: "🍽️",
        });
        if (recentFoods.length >= limit) break;
      }
    }
    return recentFoods;
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

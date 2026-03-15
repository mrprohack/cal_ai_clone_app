import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getCheckInHistory = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const checkIns = await ctx.db
      .query("weeklyCheckIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      checkIns.map(async (c) => ({
        ...c,
        photoUrl: await ctx.storage.getUrl(c.photoStorageId),
      }))
    );
  },
});

export const getLatestCheckIn = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const latest = await ctx.db
      .query("weeklyCheckIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!latest) return null;
    return {
      ...latest,
      photoUrl: await ctx.storage.getUrl(latest.photoStorageId),
    };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const saveCheckIn = mutation({
  args: {
    weekNumber: v.number(),
    year: v.number(),
    photoStorageId: v.id("_storage"),
    weightKg: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("weeklyCheckIns", {
      userId: user._id,
      weekNumber: args.weekNumber,
      year: args.year,
      photoStorageId: args.photoStorageId,
      weightKg: args.weightKg,
    });
  },
});

export const updateCheckInAnalysis = mutation({
  args: {
    checkInId: v.id("weeklyCheckIns"),
    aiAnalysis: v.string(),
    diffVsPreviousWeek: v.optional(v.string()),
    avgDailyCalories: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.checkInId, {
      aiAnalysis: args.aiAnalysis,
      diffVsPreviousWeek: args.diffVsPreviousWeek,
      avgDailyCalories: args.avgDailyCalories,
    });
  },
});

// ─── AI Action ───────────────────────────────────────────────────────────────

// analyzeProgressPhoto moved to checkin_actions.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Save a generated meal plan */
export const savePlan = mutation({
  args: {
    userId: v.id("users"),
    planJson: v.string(),
    planName: v.string(),
    calorieTarget: v.number(),
  },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split("T")[0];
    return await ctx.db.insert("mealPlans", {
      userId: args.userId,
      createdDate: today,
      planJson: args.planJson,
      planName: args.planName,
      calorieTarget: args.calorieTarget,
      isPinned: false,
      createdAt: Date.now(),
    });
  },
});

/** List all meal plans for a user */
export const listPlans = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return plans.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Get the most recent meal plan */
export const getLatestPlan = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("mealPlans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (plans.length === 0) return null;
    return plans.sort((a, b) => b.createdAt - a.createdAt)[0];
  },
});

/** Toggle pin status for a plan */
export const togglePin = mutation({
  args: { planId: v.id("mealPlans"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== args.userId) throw new Error("Not found");
    await ctx.db.patch(args.planId, { isPinned: !plan.isPinned });
  },
});

/** Delete a meal plan */
export const removePlan = mutation({
  args: { planId: v.id("mealPlans"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== args.userId) throw new Error("Not found");
    await ctx.db.delete(args.planId);
  },
});

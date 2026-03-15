import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getMe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const createOrUpdateUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { name, email }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { name, email });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      name,
      email,
    });
  },
});

export const updateProfile = mutation({
  args: {
    age: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    goalType: v.optional(
      v.union(
        v.literal("lose_weight"),
        v.literal("gain_muscle"),
        v.literal("maintain")
      )
    ),
    dailyCalorieTarget: v.optional(v.number()),
    dailyProteinTarget: v.optional(v.number()),
    weekStartDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const patch: Record<string, unknown> = {};
    if (args.age !== undefined) patch.age = args.age;
    if (args.weightKg !== undefined) patch.weightKg = args.weightKg;
    if (args.heightCm !== undefined) patch.heightCm = args.heightCm;
    if (args.goalType !== undefined) patch.goalType = args.goalType;
    if (args.dailyCalorieTarget !== undefined) patch.dailyCalorieTarget = args.dailyCalorieTarget;
    if (args.dailyProteinTarget !== undefined) patch.dailyProteinTarget = args.dailyProteinTarget;
    if (args.weekStartDay !== undefined) patch.weekStartDay = args.weekStartDay;

    await ctx.db.patch(user._id, patch);
  },
});

// ─── Calorie Target Calculator ────────────────────────────────────────────
// Simple Mifflin-St Jeor estimate (server-side helper)

export const suggestCalorieTarget = mutation({
  args: {
    age: v.number(),
    weightKg: v.number(),
    heightCm: v.number(),
    sex: v.union(v.literal("male"), v.literal("female")),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("light"),
      v.literal("moderate"),
      v.literal("active"),
      v.literal("very_active")
    ),
    goalType: v.union(
      v.literal("lose_weight"),
      v.literal("gain_muscle"),
      v.literal("maintain")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Mifflin-St Jeor BMR
    let bmr: number;
    if (args.sex === "male") {
      bmr = 10 * args.weightKg + 6.25 * args.heightCm - 5 * args.age + 5;
    } else {
      bmr = 10 * args.weightKg + 6.25 * args.heightCm - 5 * args.age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = Math.round(bmr * activityMultipliers[args.activityLevel]);
    const goalAdjust = {
      lose_weight: -500,
      gain_muscle: +300,
      maintain: 0,
    };

    const dailyCalorieTarget = tdee + goalAdjust[args.goalType];
    const dailyProteinTarget = Math.round(args.weightKg * 2.0); // 2g/kg bodyweight

    // Auto-save targets
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (user) {
      await ctx.db.patch(user._id, {
        age: args.age,
        weightKg: args.weightKg,
        heightCm: args.heightCm,
        goalType: args.goalType,
        dailyCalorieTarget,
        dailyProteinTarget,
      });
    }

    return { dailyCalorieTarget, dailyProteinTarget, tdee };
  },
});

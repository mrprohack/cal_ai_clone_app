/**
 * Cal AI — User queries & mutations
 *
 * getMe           — current user via session token (auth-context)
 * getById         — user by Convex ID
 * updateProfile   — persist profile changes (goals, bio data)
 * updatePlan      — set the user's subscription plan
 * getUserPlan     — get just the plan info for a user
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get the current user by session token.
 * The frontend passes the token from localStorage.
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    // In the current auth setup the client passes the token via
    // the auth-context `getSessionUser` query. For the dashboard
    // shortcut we return null (no session-aware middleware yet).
    // The dashboard will fall back to defaults.
    return null;
  },
});

/**
 * Get user by ID (for internal dashboard use)
 */
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  },
});

/**
 * Update profile fields for the currently-logged-in user.
 * All fields are optional — only supplied fields are patched.
 */
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    calorieGoal: v.optional(v.number()),
    proteinGoal: v.optional(v.number()),
    carbsGoal: v.optional(v.number()),
    fatGoal: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    ageYears: v.optional(v.number()),
    gender: v.optional(v.string()),
  },
  handler: async (ctx, { userId, ...fields }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Build patch object with only the supplied fields
    const patch: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) patch[key] = val;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId, patch);
    }
  },
});

/**
 * Complete onboarding: calculates BMR/TDEE and sets macro goals
 */
export const completeOnboarding = mutation({
  args: {
    userId: v.id("users"),
    gender: v.string(),
    ageYears: v.number(),
    heightCm: v.number(),
    weightKg: v.number(),
    activityLevel: v.string(), // "sedentary", "light", "moderate", "active"
    goal: v.string(), // "lose", "maintain", "gain"
  },
  handler: async (ctx, args) => {
    const { userId, gender, ageYears, heightCm, weightKg, activityLevel, goal } = args;
    
    // Mifflin-St Jeor Equation
    let bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
    bmr += gender === "male" ? 5 : -161;
    
    // Activity Multipliers
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725
    };
    const tdee = bmr * (multipliers[activityLevel] || 1.2);
    
    // Goals
    const goalMods: Record<string, number> = { lose: -500, maintain: 0, gain: 500 };
    let calorieGoal = Math.round(tdee + (goalMods[goal] || 0));
    
    // Minimums
    if (gender === "male" && calorieGoal < 1500) calorieGoal = 1500;
    if (gender === "female" && calorieGoal < 1200) calorieGoal = 1200;
    
    // Macros
    const proteinGoal = Math.round(weightKg * 2.2); // ~2.2g per kg for high protein
    const fatGoal = Math.round((calorieGoal * 0.25) / 9); // 25% of calories
    const carbsGoal = Math.round((calorieGoal - (proteinGoal * 4) - (fatGoal * 9)) / 4);

    await ctx.db.patch(userId, {
      gender, ageYears, heightCm, weightKg,
      calorieGoal, proteinGoal, carbsGoal, fatGoal,
      onboarded: true
    });
  }
});

/** ─── Plan management ──────────────────────────────────────── */

/**
 * Set the user's subscription plan.
 * In a real app this would be gated by a payment webhook.
 */
export const updatePlan = mutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("ultra")),
  },
  handler: async (ctx, { userId, plan }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userId, {
      plan,
      planActivatedAt: Date.now(),
      planExpiresAt:
        plan === "free"
          ? undefined
          : Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return { plan };
  },
});

/**
 * Get plan info for a user (safe — no password hash returned).
 */
export const getUserPlan = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      plan: (user.plan ?? "free") as "free" | "pro" | "ultra",
      planActivatedAt: user.planActivatedAt,
      planExpiresAt: user.planExpiresAt,
    };
  },
});

/** ─── Account Management ───────────────────────────────────── */

export const deleteAccount = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // 1. Delete user
    await ctx.db.delete(userId);
    // 2. Delete meals
    const meals = await ctx.db.query("meals").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const meal of meals) { await ctx.db.delete(meal._id); }
    // 3. Delete progress
    const progress = await ctx.db.query("progress").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const p of progress) { await ctx.db.delete(p._id); }
    // 4. Delete sessions
    const sessions = await ctx.db.query("sessions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    for (const s of sessions) { await ctx.db.delete(s._id); }
  }
});

export const exportData = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const { passwordHash, ...safeUser } = user;
    
    const meals = await ctx.db.query("meals").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const progress = await ctx.db.query("progress").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    
    return {
      user: safeUser,
      meals,
      progress
    };
  }
});

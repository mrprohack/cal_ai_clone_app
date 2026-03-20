/**
 * Cal AI — User queries & mutations
 *
 * getMe           — current user via session token (auth-context)
 * getById         — user by Convex ID
 * updateProfile   — persist profile changes (goals, bio data)
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

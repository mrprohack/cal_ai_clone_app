/**
 * Cal AI — User queries
 *
 * getMe: returns the current user from session token (via auth context).
 *        For now, uses getSessionUser pattern with token from args.
 */
import { query } from "./_generated/server";
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

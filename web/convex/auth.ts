/**
 * Cal AI — Convex Auth Functions
 *
 * Pattern: Password hash in an Action (which can call crypto APIs),
 * then store via runMutation. Token-based sessions.
 *
 * Exported functions:
 *   queries    — getSessionUser  (public, used by client)
 *   actions    — signUp, signIn, signOut
 *
 * Internal (not callable from client):
 *   internalQueries  — getUserByEmail
 *   internalMutations — createUser, createSession, deleteSession
 */
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/* ────────────────────────────────────────────────────────────
   Internal helpers (mutations / queries used ONLY by actions)
───────────────────────────────────────────────────────────── */

/** Look up a user by email (used inside actions) */
export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
  },
});

/** Insert a new user row (called from signUp action) */
export const createUser = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    passwordHash: v.string(),
    calorieGoal: v.number(),
    proteinGoal: v.number(),
    carbsGoal: v.number(),
    fatGoal: v.number(),
  },
  handler: async (ctx, args) => {
    // Guard: unique email
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) throw new Error("EMAIL_EXISTS");

    return await ctx.db.insert("users", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/** Insert a session row and return the token */
export const createSession = internalMutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessions", {
      ...args,
      createdAt: Date.now(),
    });
    return args.token;
  },
});

/** Delete a session by token (logout) */
export const deleteSession = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});

/* ────────────────────────────────────────────────────────────
   Public queries (callable from client)
───────────────────────────────────────────────────────────── */

/** Look up the user attached to a session token */
export const getSessionUser = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!token) return null;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    // strip password hash from returned object
    const { passwordHash: _ph, ...safeUser } = user;
    return safeUser;
  },
});

/* ────────────────────────────────────────────────────────────
   Public actions (hash passwords, call external crypto)
───────────────────────────────────────────────────────────── */

/** Simple 64-char hex token generator (no external dep) */
function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Very lightweight password stretching using SubtleCrypto PBKDF2 */
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode("calai-salt-v1"), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compare a plaintext password to a stored hash */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const h = await hashPassword(password);
  return h === hash;
}

/* ── signUp ── */
export const signUp = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { name, email, password }): Promise<{ token: string; userId: string }> => {
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    const passwordHash = await hashPassword(password);

    let userId: Id<"users">;
    try {
      userId = await ctx.runMutation(internal.auth.createUser, {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        calorieGoal: 2000,
        proteinGoal: 150,
        carbsGoal: 200,
        fatGoal: 65,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("EMAIL_EXISTS")) throw new Error("An account with this email already exists.");
      throw e;
    }

    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    await ctx.runMutation(internal.auth.createSession, {
      userId,
      token,
      expiresAt,
    });
    return { token, userId };
  },
});

/* ── signIn ── */
export const signIn = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, { email, password }): Promise<{ token: string; userId: string }> => {
    const user = await ctx.runQuery(internal.auth.getUserByEmail, {
      email: email.toLowerCase().trim(),
    });
    if (!user) throw new Error("Invalid email or password.");

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new Error("Invalid email or password.");

    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    await ctx.runMutation(internal.auth.createSession, {
      userId: user._id,
      token,
      expiresAt,
    });
    return { token, userId: user._id };
  },
});

/* ── signOut ── */
export const signOut = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<{ ok: boolean }> => {
    await ctx.runMutation(internal.auth.deleteSession, { token });
    return { ok: true };
  },
});

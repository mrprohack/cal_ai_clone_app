import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Cal AI — Convex Database Schema
 *
 * Tables
 * ──────
 * users     — app accounts (email + hashed password)
 * sessions  — active login sessions (token-based)
 * meals     — food log entries per user
 * progress  — daily macro/weight snapshots per user
 */
export default defineSchema({
  /* ── Users ───────────────────────────────────────────── */
  users: defineTable({
    name: v.string(),
    email: v.string(),
    /** bcrypt hash of the password — never store plaintext */
    passwordHash: v.string(),
    avatarUrl: v.optional(v.string()),
    /** kcal / day target */
    calorieGoal: v.number(),
    /** grams / day targets */
    proteinGoal: v.number(),
    carbsGoal: v.number(),
    fatGoal: v.number(),
    /** "male" | "female" | "other" */
    gender: v.optional(v.string()),
    ageYears: v.optional(v.number()),
    heightCm: v.optional(v.number()),
    weightKg: v.optional(v.number()),
    onboarded: v.optional(v.boolean()),
    createdAt: v.number(),
    /** Subscription plan */
    plan: v.optional(
      v.union(v.literal("free"), v.literal("pro"), v.literal("ultra"))
    ),
    planActivatedAt: v.optional(v.number()),
    planExpiresAt: v.optional(v.number()),
  })
    .index("by_email", ["email"]),

  /* ── Sessions ─────────────────────────────────────────── */
  sessions: defineTable({
    userId: v.id("users"),
    /** random 64-char hex token stored in the client cookie */
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  /* ── Meals ────────────────────────────────────────────── */
  meals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    /** "breakfast" | "lunch" | "dinner" | "snack" */
    mealType: v.string(),
    calories: v.number(),
    proteinG: v.number(),
    carbsG: v.number(),
    fatG: v.number(),
    servingSize: v.optional(v.string()),
    /** ISO date string: "2026-03-18" */
    date: v.string(),
    loggedAt: v.number(),
    aiGenerated: v.optional(v.boolean()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  /* ── Progress ─────────────────────────────────────────── */
  progress: defineTable({
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
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  /* ── Foods (Quick Add) ────────────────────────────────────────────── */
  foods: defineTable({
    name: v.string(),
    cals: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    emoji: v.string(),
    cat: v.string(),
  }).searchIndex("search_name", {
    searchField: "name",
    filterFields: ["cat"],
  }),

  /* ── Body Progress Photos ─────────────────────────────────────────── */
  bodyPhotos: defineTable({
    userId: v.id("users"),
    /** ISO date string: "2026-03-20" */
    date: v.string(),
    /** Base64 thumbnail (small, stored for display) */
    imageData: v.optional(v.string()),
    /** AI analysis result as serialized JSON string */
    analysis: v.optional(v.string()),
    /** Week number tag e.g. "Week 1", "Week 4" */
    weekLabel: v.optional(v.string()),
    /** User notes for this check-in */
    notes: v.optional(v.string()),
    recordedAt: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  /* ── AI Meal Plans ────────────────────────────────────────────────── */
  mealPlans: defineTable({
    userId: v.id("users"),
    /** ISO date of plan creation */
    createdDate: v.string(),
    /** Plan JSON from AI serialized as string */
    planJson: v.string(),
    /** Human-readable plan name */
    planName: v.string(),
    /** Calorie target used for generation */
    calorieTarget: v.number(),
    /** Whether the user has pinned/saved this plan */
    isPinned: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "createdDate"]),
});

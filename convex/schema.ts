import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
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
    weekStartDay: v.optional(v.number()), // 0=Sun, 1=Mon
    // Subscription plan
    plan: v.optional(
      v.union(v.literal("free"), v.literal("pro"), v.literal("ultra"))
    ),
    planExpiresAt: v.optional(v.number()), // unix ms — null = never expires (free)
    planActivatedAt: v.optional(v.number()),
  }).index("by_clerk_id", ["clerkId"]),

  meals: defineTable({
    userId: v.id("users"),
    date: v.string(), // "2026-03-14"
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
    photoStorageId: v.optional(v.id("_storage")),
    foods: v.array(
      v.object({
        name: v.string(),
        servingGrams: v.number(),
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
      })
    ),
    totalCalories: v.number(),
    totalProtein: v.number(),
    totalCarbs: v.number(),
    totalFat: v.number(),
    aiConfidence: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user", ["userId"]),

  dailySummaries: defineTable({
    userId: v.id("users"),
    date: v.string(),
    totalCalories: v.number(),
    totalProtein: v.number(),
    totalCarbs: v.number(),
    totalFat: v.number(),
    waterMl: v.optional(v.number()),
    workoutDone: v.optional(v.boolean()),
    notes: v.optional(v.string()),
  }).index("by_user_date", ["userId", "date"]),

  weeklyCheckIns: defineTable({
    userId: v.id("users"),
    weekNumber: v.number(),
    year: v.number(),
    photoStorageId: v.id("_storage"),
    weightKg: v.optional(v.number()),
    aiAnalysis: v.optional(v.string()),
    diffVsPreviousWeek: v.optional(v.string()),
    avgDailyCalories: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  chatMessages: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  }).index("by_user", ["userId"]),
});

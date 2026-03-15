import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getTodayMeals = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    return await ctx.db
      .query("meals")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .collect();
  },
});

export const getMealsForDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const all = await ctx.db
      .query("meals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return all.filter((m) => m.date >= startDate && m.date <= endDate);
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const logMealManual = mutation({
  args: {
    date: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
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
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const totals = args.foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs,
        fat: acc.fat + f.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const mealId = await ctx.db.insert("meals", {
      userId: user._id,
      date: args.date,
      mealType: args.mealType,
      foods: args.foods,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      notes: args.notes,
    });

    // Update daily summary
    await ctx.runMutation(api.daily.upsertSummary, { date: args.date });

    return mealId;
  },
});

export const saveMealFromAI = mutation({
  args: {
    date: v.string(),
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
    aiConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const totals = args.foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs,
        fat: acc.fat + f.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const mealId = await ctx.db.insert("meals", {
      userId: user._id,
      date: args.date,
      mealType: args.mealType,
      photoStorageId: args.photoStorageId,
      foods: args.foods,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
      aiConfidence: args.aiConfidence,
    });

    await ctx.runMutation(api.daily.upsertSummary, { date: args.date });

    return mealId;
  },
});

export const deleteMeal = mutation({
  args: { mealId: v.id("meals") },
  handler: async (ctx, { mealId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const meal = await ctx.db.get(mealId);
    if (!meal) throw new Error("Meal not found");

    await ctx.db.delete(mealId);
    await ctx.runMutation(api.daily.upsertSummary, { date: meal.date });
  },
});

// ─── AI Action ───────────────────────────────────────────────────────────────

export const analyzeFoodPhoto = action({
  args: {
    storageId: v.id("_storage"),
    date: v.string(),
    mealType: v.union(
      v.literal("breakfast"),
      v.literal("lunch"),
      v.literal("dinner"),
      v.literal("snack")
    ),
  },
  handler: async (ctx, { storageId, date, mealType }) => {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Get file URL from Convex storage
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Could not get photo URL");

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a professional nutritionist. Analyze this food photo and identify all visible foods.
Return ONLY valid JSON in this exact format, no extra text:
{
  "foods": [
    {
      "name": "food name",
      "servingGrams": 150,
      "calories": 250,
      "protein": 12,
      "carbs": 30,
      "fat": 8
    }
  ],
  "confidence": 0.85
}
Be accurate with macronutrients. If multiple items are visible, list each separately.`,
            },
            {
              type: "image_url",
              image_url: { url, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 800,
    });

    const raw = response.choices[0].message.content ?? "{}";
    let parsed: {
      foods: Array<{
        name: string;
        servingGrams: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }>;
      confidence: number;
    };

    try {
      // Strip markdown code fences if present
      const clean = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      throw new Error("AI returned invalid JSON: " + raw);
    }

    // Save the analyzed meal
    await ctx.runMutation(api.meals.saveMealFromAI, {
      date,
      mealType,
      photoStorageId: storageId,
      foods: parsed.foods,
      aiConfidence: parsed.confidence,
    });

    return parsed;
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

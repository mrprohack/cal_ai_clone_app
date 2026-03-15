import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Fitness AI Assistant ─────────────────────────────────────────────────
// System prompt strictly limits AI to fitness/nutrition topics

const FITNESS_SYSTEM_PROMPT = `You are FitBot, a certified personal trainer and sports nutritionist.

You ONLY answer questions about:
- Workout programming (strength, cardio, HIIT, flexibility)
- Nutrition, macronutrients, calories, meal planning
- Weight loss, muscle gain, body recomposition strategies
- Exercise form and technique
- Recovery: sleep, rest days, injury prevention
- Supplements relevant to fitness (protein, creatine, etc.)
- Motivation and mindset related to fitness goals

If the user asks about ANYTHING outside fitness and nutrition (news, coding, weather, relationships, finance, etc.), respond EXACTLY with:
"I'm your dedicated fitness coach! 💪 I can only help with fitness and nutrition topics. Try asking me about your workout plan, meal prep, or how to reach your fitness goals!"

Always be:
- Encouraging and motivating
- Science-backed (cite principles, not specific studies)
- Concise and actionable
- Aware that the user may be a beginner`;

// ─── Queries ────────────────────────────────────────────────────────────────

export const getChatHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("asc")
      .take(limit);

    return messages;
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const saveMessage = mutation({
  args: {
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, { role, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("chatMessages", {
      userId: user._id,
      role,
      content,
    });
  },
});

export const clearChat = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    await Promise.all(messages.map((m) => ctx.db.delete(m._id)));
  },
});

// ─── AI Action ───────────────────────────────────────────────────────────────

// sendMessage moved to chat_actions.ts

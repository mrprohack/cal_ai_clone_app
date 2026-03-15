import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
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

export const sendMessage = action({
  args: { userMessage: v.string() },
  handler: async (ctx, { userMessage }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Get user profile for context
    const user = await ctx.runQuery(api.users.getMe);

    // Save user message
    await ctx.runMutation(api.chat.saveMessage, {
      role: "user",
      content: userMessage,
    });

    // Get recent chat history for context (last 20 messages)
    const history = await ctx.runQuery(api.chat.getChatHistory, { limit: 20 });

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Build context message about user's goals
    const userContext = user
      ? `\n\nUser context: Goal is to ${user.goalType ?? "maintain"}, daily calorie target: ${user.dailyCalorieTarget ?? "not set"} kcal, protein target: ${user.dailyProteinTarget ?? "not set"}g.`
      : "";

    const messages = [
      { role: "system" as const, content: FITNESS_SYSTEM_PROMPT + userContext },
      ...history.slice(-18).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0].message.content ?? "Sorry, I couldn't generate a response.";

    // Save assistant response
    await ctx.runMutation(api.chat.saveMessage, {
      role: "assistant",
      content: assistantMessage,
    });

    return assistantMessage;
  },
});

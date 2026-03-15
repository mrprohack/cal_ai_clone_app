"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

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

export const sendMessage = action({
  args: { userMessage: v.string() },
  handler: async (ctx, { userMessage }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.runQuery(api.users.getMe);

    await ctx.runMutation(api.chat.saveMessage, {
      role: "user",
      content: userMessage,
    });

    const history = await ctx.runQuery(api.chat.getChatHistory, { limit: 20 });

    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userContext = user
      ? `\n\nUser context: Goal is to ${user.goalType ?? "maintain"}, daily calorie target: ${user.dailyCalorieTarget ?? "not set"} kcal, protein target: ${user.dailyProteinTarget ?? "not set"}g.`
      : "";

    const messages = [
      { role: "system" as const, content: FITNESS_SYSTEM_PROMPT + userContext },
      ...history.slice(-18).map((m: any) => ({
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

    await ctx.runMutation(api.chat.saveMessage, {
      role: "assistant",
      content: assistantMessage,
    });

    return assistantMessage;
  },
});

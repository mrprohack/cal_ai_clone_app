"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

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
      const clean = raw.replace(/```json?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      throw new Error("AI returned invalid JSON: " + raw);
    }

    // Removed automatic save so that client can edit before confirming
    return parsed;

  },
});

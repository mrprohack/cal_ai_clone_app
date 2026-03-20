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
    const { default: Groq } = await import("groq-sdk");
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Get file URL from Convex storage
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Could not get photo URL");

    const response = await client.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
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
              image_url: { url },
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

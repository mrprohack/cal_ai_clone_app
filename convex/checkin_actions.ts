"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const analyzeProgressPhoto = action({
  args: {
    checkInId: v.id("weeklyCheckIns"),
    currentPhotoStorageId: v.id("_storage"),
    previousPhotoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { checkInId, currentPhotoStorageId, previousPhotoStorageId }) => {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const currentUrl = await ctx.storage.getUrl(currentPhotoStorageId);
    if (!currentUrl) throw new Error("Could not get current photo URL");

    let diffAnalysis: string | undefined;

    if (previousPhotoStorageId) {
      const prevUrl = await ctx.storage.getUrl(previousPhotoStorageId);
      if (prevUrl) {
        const diffResponse = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are a professional fitness coach analyzing weekly progress photos.
The FIRST image is from LAST WEEK, and the SECOND image is from THIS WEEK.
Compare the two photos and describe visible body composition changes.
Focus on: muscle definition, posture, visible fat loss or muscle gain.
Be encouraging, specific, and honest. Keep it to 2-3 sentences.
Start with "This week, ..."`,
                },
                { type: "image_url", image_url: { url: prevUrl, detail: "high" } },
                { type: "image_url", image_url: { url: currentUrl, detail: "high" } },
              ],
            },
          ],
          max_tokens: 300,
        });
        diffAnalysis = diffResponse.choices[0].message.content ?? undefined;
      }
    }

    const analysisResponse = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are a professional fitness coach. Analyze this progress photo.
Provide a brief, encouraging assessment of the person's current physique and any recommendations.
Keep it to 2-3 sentences. Be positive and motivating.`,
            },
            { type: "image_url", image_url: { url: currentUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 300,
    });

    const aiAnalysis = analysisResponse.choices[0].message.content ?? "";

    await ctx.runMutation(api.checkins.updateCheckInAnalysis, {
      checkInId,
      aiAnalysis,
      diffVsPreviousWeek: diffAnalysis,
    });

    return { aiAnalysis, diffVsPreviousWeek: diffAnalysis };
  },
});

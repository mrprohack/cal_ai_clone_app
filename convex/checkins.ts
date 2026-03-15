import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// ─── Queries ────────────────────────────────────────────────────────────────

export const getCheckInHistory = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const checkIns = await ctx.db
      .query("weeklyCheckIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      checkIns.map(async (c) => ({
        ...c,
        photoUrl: await ctx.storage.getUrl(c.photoStorageId),
      }))
    );
  },
});

export const getLatestCheckIn = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    const latest = await ctx.db
      .query("weeklyCheckIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (!latest) return null;
    return {
      ...latest,
      photoUrl: await ctx.storage.getUrl(latest.photoStorageId),
    };
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

export const saveCheckIn = mutation({
  args: {
    weekNumber: v.number(),
    year: v.number(),
    photoStorageId: v.id("_storage"),
    weightKg: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("weeklyCheckIns", {
      userId: user._id,
      weekNumber: args.weekNumber,
      year: args.year,
      photoStorageId: args.photoStorageId,
      weightKg: args.weightKg,
    });
  },
});

export const updateCheckInAnalysis = mutation({
  args: {
    checkInId: v.id("weeklyCheckIns"),
    aiAnalysis: v.string(),
    diffVsPreviousWeek: v.optional(v.string()),
    avgDailyCalories: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.checkInId, {
      aiAnalysis: args.aiAnalysis,
      diffVsPreviousWeek: args.diffVsPreviousWeek,
      avgDailyCalories: args.avgDailyCalories,
    });
  },
});

// ─── AI Action ───────────────────────────────────────────────────────────────

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

    // Compare with previous week if available
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

    // General AI analysis of current photo
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

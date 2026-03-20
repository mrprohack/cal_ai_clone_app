import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Save a new body photo check-in with optional AI analysis */
export const savePhoto = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    imageData: v.optional(v.string()),
    analysis: v.optional(v.string()),
    weekLabel: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bodyPhotos")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();

    if (existing) {
      // Update existing entry for this date
      await ctx.db.patch(existing._id, {
        imageData: args.imageData ?? existing.imageData,
        analysis: args.analysis ?? existing.analysis,
        weekLabel: args.weekLabel ?? existing.weekLabel,
        notes: args.notes ?? existing.notes,
      });
      return existing._id;
    }

    return await ctx.db.insert("bodyPhotos", {
      userId: args.userId,
      date: args.date,
      imageData: args.imageData,
      analysis: args.analysis,
      weekLabel: args.weekLabel,
      notes: args.notes,
      recordedAt: Date.now(),
    });
  },
});

/** Get all body photos for a user (ordered by date, newest first) */
export const listPhotos = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("bodyPhotos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return photos.sort((a, b) => b.date.localeCompare(a.date));
  },
});

/** Get the last N weeks of body photos for the weekly view */
export const getWeeklyPhotos = query({
  args: { userId: v.id("users"), weeks: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const weeksBack = args.weeks ?? 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - weeksBack * 7);
    const fromStr = fromDate.toISOString().split("T")[0];

    const photos = await ctx.db
      .query("bodyPhotos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return photos
      .filter((p) => p.date >= fromStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

/** Delete a body photo entry */
export const removePhoto = mutation({
  args: { photoId: v.id("bodyPhotos"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo || photo.userId !== args.userId) throw new Error("Not found");
    await ctx.db.delete(args.photoId);
  },
});

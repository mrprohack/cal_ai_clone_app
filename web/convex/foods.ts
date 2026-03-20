import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Return a maximum of 50 items for quick add, 
    // it's practically enough for quick lists without killing performance.
    return await ctx.db.query("foods").take(50);
  },
});

export const search = query({
  args: {
    searchQuery: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("foods");
    
    // First, text search if query provided
    if (args.searchQuery) {
      const searchRes = await ctx.db
        .query("foods")
        .withSearchIndex("search_name", (q2) => {
          const s = q2.search("name", args.searchQuery);
          return args.category && args.category !== "All"
            ? s.eq("cat", args.category)
            : s;
        })
        .take(50);
      return searchRes;
    }

    // Filter by cat if no search query
    if (args.category && args.category !== "All") {
      return await ctx.db
        .query("foods")
        .filter((q) => q.eq(q.field("cat"), args.category))
        .take(50);
    }
    
    // If no filter, just return first 50
    return await ctx.db.query("foods").take(50);
  },
});

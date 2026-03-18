/**
 * Cal AI — Daily Summary query
 *
 * Computes totals from all meals on a given date for
 * the dashboard's calorie / macro summary display.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get aggregated daily nutrition summary for a given date.
 * Sums up all meals logged by all users for that date.
 * (In production you'd scope this to the authenticated user.)
 */
export const getDailySummary = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    // Get ALL meals for this date (across all users for now)
    const meals = await ctx.db
      .query("meals")
      .filter((q) => q.eq(q.field("date"), date))
      .collect();

    const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
    const totalProtein  = meals.reduce((sum, m) => sum + m.proteinG, 0);
    const totalCarbs    = meals.reduce((sum, m) => sum + m.carbsG, 0);
    const totalFat      = meals.reduce((sum, m) => sum + m.fatG, 0);

    return {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      mealCount: meals.length,
      workoutDone: false, // placeholder — no workout tracking yet
    };
  },
});

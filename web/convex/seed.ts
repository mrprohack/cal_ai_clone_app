/**
 * Cal AI — Seed Data
 *
 * Run via CLI:  npx convex run seed:run
 *
 * Creates a demo user account:
 *   Email    : demo@calai.app
 *   Password : Demo1234!
 *
 * Also seeds 7 sample meals and 3 progress days.
 */
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

/* Same hash function as in auth.ts — keep in sync */
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode("calai-salt-v1"), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const run = action({
  args: {},
  handler: async (ctx) => {
    const email = "demo@calai.app";
    const password = "Demo1234!";

    // Don't duplicate if already exists
    const existing = await ctx.runQuery(internal.auth.getUserByEmail, { email });
    if (existing) {
      return { status: "already_exists", email };
    }

    const passwordHash = await hashPassword(password);

    const userId = await ctx.runMutation(internal.auth.createUser, {
      name: "Demo User",
      email,
      passwordHash,
      calorieGoal: 2200,
      proteinGoal: 160,
      carbsGoal: 220,
      fatGoal: 70,
    });

    // Seed meals for the last 3 days
    const today = new Date();
    const dates = [0, 1, 2].map((d) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - d);
      return dt.toISOString().split("T")[0];
    });

    const meals = [
      { date: dates[0], name: "Oatmeal with berries",       mealType: "breakfast", calories: 320,  proteinG: 12, carbsG: 52, fatG: 6  },
      { date: dates[0], name: "Grilled chicken salad",      mealType: "lunch",     calories: 450,  proteinG: 42, carbsG: 18, fatG: 14 },
      { date: dates[0], name: "Protein shake",              mealType: "snack",     calories: 180,  proteinG: 30, carbsG: 10, fatG: 2  },
      { date: dates[0], name: "Salmon with sweet potato",   mealType: "dinner",    calories: 620,  proteinG: 48, carbsG: 55, fatG: 16 },
      { date: dates[1], name: "Greek yogurt parfait",       mealType: "breakfast", calories: 280,  proteinG: 20, carbsG: 34, fatG: 5  },
      { date: dates[1], name: "Turkey & avocado wrap",      mealType: "lunch",     calories: 530,  proteinG: 38, carbsG: 42, fatG: 18 },
      { date: dates[2], name: "Scrambled eggs on toast",    mealType: "breakfast", calories: 360,  proteinG: 22, carbsG: 30, fatG: 14 },
    ];

    for (const meal of meals) {
      await ctx.runMutation(api.meals.log, {
        userId: userId as any,
        ...meal,
        servingSize: "1 serving",
        loggedAt: Date.now(),
        aiGenerated: false,
      });
    }

    // Seed progress snapshots
    const progressRows = [
      { date: dates[0], weightKg: 81.2, caloriesConsumed: 1570, proteinConsumed: 132, carbsConsumed: 135, fatConsumed: 38, waterMl: 2100, steps: 9200 },
      { date: dates[1], weightKg: 81.5, caloriesConsumed: 1810, proteinConsumed: 158, carbsConsumed: 176, fatConsumed: 23, waterMl: 2400, steps: 8100 },
      { date: dates[2], weightKg: 81.8, caloriesConsumed: 360,  proteinConsumed:  22, carbsConsumed:  30, fatConsumed: 14, waterMl:  500, steps: 1100 },
    ];

    for (const row of progressRows) {
      await ctx.runMutation(api.progress.upsert, {
        userId: userId as any,
        ...row,
        recordedAt: Date.now(),
      });
    }

    return { status: "seeded", email, password };
  },
});

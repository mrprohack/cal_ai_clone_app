"use server";

import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Progress {
  id: number;
  userId: number;
  date: string;
  weightKg?: number;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  waterMl?: number;
  steps?: number;
  recordedAt: number;
}

/** Log water intake */
export async function logWater(userId: number, date: string, waterMl: number): Promise<number> {
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id, waterMl FROM progress WHERE userId = ? AND date = ?",
    [userId, date]
  );

  if (existing.length > 0) {
    const row = existing[0];
    const newWater = (row.waterMl ?? 0) + waterMl;
    await pool.query(
      "UPDATE progress SET waterMl = ? WHERE id = ?",
      [newWater, row.id]
    );
    return row.id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO progress (userId, date, waterMl, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, recordedAt) 
     VALUES (?, ?, ?, 0, 0, 0, 0, ?)`,
    [userId, date, waterMl, Date.now()]
  );

  return result.insertId;
}

/** Upsert a daily progress snapshot */
export async function upsert(args: Omit<Progress, 'id' | 'recordedAt'> & { recordedAt?: number }): Promise<number> {
  const { userId, date, weightKg, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, waterMl, steps } = args;
  const recordedAt = args.recordedAt || Date.now();

  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM progress WHERE userId = ? AND date = ?",
    [userId, date]
  );

  if (existing.length > 0) {
    const row = existing[0];
    await pool.query(
      `UPDATE progress SET 
        weightKg = ?, caloriesConsumed = ?, proteinConsumed = ?, carbsConsumed = ?, fatConsumed = ?, waterMl = ?, steps = ?, recordedAt = ? 
       WHERE id = ?`,
      [weightKg !== undefined ? weightKg : null, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, waterMl !== undefined ? waterMl : null, steps !== undefined ? steps : null, recordedAt, row.id]
    );
    return row.id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO progress (userId, date, weightKg, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, waterMl, steps, recordedAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, date, weightKg !== undefined ? weightKg : null, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, waterMl !== undefined ? waterMl : null, steps !== undefined ? steps : null, recordedAt]
  );

  return result.insertId;
}

/** Log just a body weight entry */
export async function logWeight(userId: number, date: string, weightKg: number): Promise<number> {
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM progress WHERE userId = ? AND date = ?",
    [userId, date]
  );

  if (existing.length > 0) {
    const row = existing[0];
    await pool.query(
      "UPDATE progress SET weightKg = ? WHERE id = ?",
      [weightKg, row.id]
    );
    return row.id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO progress (userId, date, weightKg, caloriesConsumed, proteinConsumed, carbsConsumed, fatConsumed, recordedAt) 
     VALUES (?, ?, ?, 0, 0, 0, 0, ?)`,
    [userId, date, weightKg, Date.now()]
  );

  return result.insertId;
}

/** Get specific daily progress snapshot */
export async function getDailyProgress(userId: number, date: string): Promise<Progress | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM progress WHERE userId = ? AND date = ?",
    [userId, date]
  );

  if (rows.length === 0) return null;
  return rows[0] as Progress;
}

/** Get progress rows over range */
export async function range(userId: number, fromDate: string, toDate: string): Promise<Progress[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM progress WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date ASC",
    [userId, fromDate, toDate]
  );

  return rows as Progress[];
}

/** Get aggregates */
export async function getStats(userId: number, fromDate: string, toDate: string): Promise<any> {
  const rows = await range(userId, fromDate, toDate);

  const logged = rows.filter((r) => r.caloriesConsumed > 0);
  const daysLogged = logged.length;
  const totalCalories = logged.reduce((s, r) => s + r.caloriesConsumed, 0);
  const avgCalories = daysLogged > 0 ? Math.round(totalCalories / daysLogged) : 0;
  const avgProtein = daysLogged > 0 ? Math.round(logged.reduce((s, r) => s + r.proteinConsumed, 0) / daysLogged) : 0;

  // Streak compute
  const loggedDates = new Set(logged.map((r) => r.date));
  let streak = 0;
  const cursor = new Date(toDate);
  while (true) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (loggedDates.has(dateStr)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);
  const totalDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;

  return { avgCalories, avgProtein, daysLogged, streak, totalDays, totalCalories };
}

/** Daily calorie array */
export async function getCalorieTrend(userId: number, fromDate: string, toDate: string): Promise<{ date: string; calories: number }[]> {
  const rows = await range(userId, fromDate, toDate);
  const map = new Map(rows.map((r) => [r.date, r.caloriesConsumed]));

  const result: { date: string; calories: number }[] = [];
  const cursor = new Date(fromDate);
  const end = new Date(toDate);

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    result.push({ date: dateStr, calories: map.get(dateStr) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/** Macro totals */
export async function getMacroTotals(userId: number, fromDate: string, toDate: string): Promise<any> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT proteinConsumed, carbsConsumed, fatConsumed, caloriesConsumed FROM progress WHERE userId = ? AND date >= ? AND date <= ?",
    [userId, fromDate, toDate]
  );

  const totalProtein = rows.reduce((s, r) => s + Number(r.proteinConsumed), 0);
  const totalCarbs   = rows.reduce((s, r) => s + Number(r.carbsConsumed), 0);
  const totalFat     = rows.reduce((s, r) => s + Number(r.fatConsumed), 0);

  const proteinCals = totalProtein * 4;
  const carbsCals   = totalCarbs * 4;
  const fatCals     = totalFat * 9;
  const macroCalTotal = proteinCals + carbsCals + fatCals;

  const proteinPct = macroCalTotal > 0 ? Math.round((proteinCals / macroCalTotal) * 100) : 0;
  const carbsPct   = macroCalTotal > 0 ? Math.round((carbsCals / macroCalTotal) * 100) : 0;
  const fatPct     = macroCalTotal > 0 ? Math.round((fatCals / macroCalTotal) * 100) : 0;

  const daysLogged = rows.filter((r) => r.caloriesConsumed > 0).length;

  return {
    totalProtein: Math.round(totalProtein),
    totalCarbs:   Math.round(totalCarbs),
    totalFat:     Math.round(totalFat),
    avgProtein:   daysLogged > 0 ? Math.round(totalProtein / daysLogged) : 0,
    avgCarbs:     daysLogged > 0 ? Math.round(totalCarbs / daysLogged) : 0,
    avgFat:       daysLogged > 0 ? Math.round(totalFat / daysLogged) : 0,
    proteinPct,
    carbsPct,
    fatPct,
  };
}

/** Weight history */
export async function getWeightHistory(userId: number, fromDate: string, toDate: string): Promise<{ date: string; weightKg: number }[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT date, weightKg FROM progress WHERE userId = ? AND date >= ? AND date <= ? AND weightKg IS NOT NULL ORDER BY date ASC",
    [userId, fromDate, toDate]
  );

  return rows.map((r) => ({ date: r.date, weightKg: Number(r.weightKg) }));
}

/** Achievements */
export async function getAchievements(userId: number): Promise<any[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT date, caloriesConsumed, proteinConsumed FROM progress WHERE userId = ? AND caloriesConsumed > 0 ORDER BY date DESC",
    [userId]
  );

  const [[{ totalMeals }]] = await pool.query<any[]>(
    "SELECT COUNT(*) as totalMeals FROM meals WHERE userId = ?",
    [userId]
  );

  const streakRows = await range(userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], new Date().toISOString().split("T")[0]);
  const loggedDates = new Set(streakRows.filter(r => r.caloriesConsumed > 0).map(r => r.date));

  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  const cur = new Date(today);
  while (loggedDates.has(cur.toISOString().split("T")[0])) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  const [users] = await pool.query<RowDataPacket[]>("SELECT proteinGoal FROM users WHERE id = ?", [userId]);
  const proteinGoal = users[0]?.proteinGoal ?? 150;
  const proteinDays = rows.filter((r) => r.proteinConsumed >= proteinGoal).length;

  return [
    { label: "7-Day Streak", icon: "🔥", description: "Log meals 7 days in a row", earned: streak >= 7, progress: Math.min(streak, 7), goal: 7 },
    { label: "Protein Champion", icon: "💪", description: `Hit your \${proteinGoal}g protein goal`, earned: proteinDays >= 3, progress: Math.min(proteinDays, 3), goal: 3 },
    { label: "First Meal Logged", icon: "📸", description: "Log your very first meal", earned: totalMeals >= 1, progress: Math.min(totalMeals, 1), goal: 1 },
    { label: "30-Day Consistency", icon: "🏅", description: "Log meals for 30 days total", earned: rows.length >= 30, progress: Math.min(rows.length, 30), goal: 30 },
    { label: "100 Meals Logged", icon: "🍽️", description: "Log 100 total meals", earned: totalMeals >= 100, progress: Math.min(totalMeals, 100), goal: 100 },
    { label: "Perfect Week", icon: "⭐", description: "Log meals every day for a full week", earned: streak >= 7, progress: Math.min(streak, 7), goal: 7 },
  ];
}

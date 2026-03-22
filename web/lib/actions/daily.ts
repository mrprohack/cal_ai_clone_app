"use server";

import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export interface DailySummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  workoutDone: boolean;
}

/** Get aggregated daily nutrition summary for a given date */
export async function getDailySummary(userId: number, date: string): Promise<DailySummary> {
  const [meals] = await pool.query<RowDataPacket[]>(
    "SELECT calories, proteinG, carbsG, fatG FROM meals WHERE userId = ? AND date = ?",
    [userId, date]
  );

  const totalCalories = meals.reduce((sum, m) => sum + Number(m.calories), 0);
  const totalProtein  = meals.reduce((sum, m) => sum + Number(m.proteinG), 0);
  const totalCarbs    = meals.reduce((sum, m) => sum + Number(m.carbsG), 0);
  const totalFat      = meals.reduce((sum, m) => sum + Number(m.fatG), 0);

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    mealCount: meals.length,
    workoutDone: false, // placeholder
  };
}

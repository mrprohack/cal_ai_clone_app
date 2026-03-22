"use server";

import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface MealPlan {
  id: number;
  userId: number;
  createdDate: string;
  planJson: string;
  planName: string;
  calorieTarget: number;
  isPinned: boolean;
  createdAt: number;
}

/** Save a generated meal plan */
export async function savePlan(args: { userId: number; planJson: string; planName: string; calorieTarget: number }): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO mealPlans (userId, createdDate, planJson, planName, calorieTarget, isPinned, createdAt) 
     VALUES (?, ?, ?, ?, ?, FALSE, ?)`,
    [args.userId, today, args.planJson, args.planName, args.calorieTarget, Date.now()]
  );

  return result.insertId;
}

/** List all meal plans for a user */
export async function listPlans(userId: number): Promise<MealPlan[]> {
  const [plans] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM mealPlans WHERE userId = ? ORDER BY createdAt DESC",
    [userId]
  );
  return plans.map(p => ({ ...p, isPinned: !!p.isPinned })) as MealPlan[];
}

/** Get the most recent meal plan */
export async function getLatestPlan(userId: number): Promise<MealPlan | null> {
  const [plans] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM mealPlans WHERE userId = ? ORDER BY createdAt DESC LIMIT 1",
    [userId]
  );

  if (plans.length === 0) return null;
  const plan = plans[0];
  return { ...plan, isPinned: !!plan.isPinned } as MealPlan;
}

/** Toggle pin status for a plan */
export async function togglePin(planId: number, userId: number): Promise<void> {
  const [plans] = await pool.query<RowDataPacket[]>(
    "SELECT isPinned FROM mealPlans WHERE id = ? AND userId = ?",
    [planId, userId]
  );

  if (plans.length === 0) throw new Error("Plan not found");
  const newPinned = !plans[0].isPinned;

  await pool.query(
    "UPDATE mealPlans SET isPinned = ? WHERE id = ?",
    [newPinned, planId]
  );
}

/** Delete a meal plan */
export async function removePlan(planId: number, userId: number): Promise<void> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM mealPlans WHERE id = ? AND userId = ?",
    [planId, userId]
  );

  if (result.affectedRows === 0) throw new Error("Plan not found or unauthorized");
}

"use server";

import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface Meal {
  id: number;
  userId: number;
  name: string;
  mealType: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSize?: string;
  date: string;
  loggedAt: number;
  aiGenerated?: boolean;
}

/** Log a meal entry */
export async function log(args: Omit<Meal, 'id'>): Promise<number> {
  const { userId, name, mealType, calories, proteinG, carbsG, fatG, servingSize, date, loggedAt, aiGenerated } = args;

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO meals (userId, name, mealType, calories, proteinG, carbsG, fatG, servingSize, date, loggedAt, aiGenerated) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, mealType, calories, proteinG, carbsG, fatG, servingSize || null, date, loggedAt, aiGenerated || false]
  );

  return result.insertId;
}

/** Get all meals for a user on a specific date */
export async function byDate(userId: number, date: string): Promise<Meal[]> {
  const [meals] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM meals WHERE userId = ? AND date = ? ORDER BY id ASC",
    [userId, date]
  );

  return meals as Meal[];
}

/** Delete a meal */
export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM meals WHERE id = ?", [id]);
}

/** Get all meals for a given date (used by dashboard) */
export async function getTodayMeals(date: string): Promise<Meal[]> {
  const [meals] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM meals WHERE date = ? ORDER BY id ASC",
    [date]
  );

  return meals as Meal[];
}

/** Get all meals in a date range */
export async function range(userId: number, fromDate: string, toDate: string): Promise<Meal[]> {
  const [meals] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM meals WHERE userId = ? AND date >= ? AND date <= ? ORDER BY id ASC",
    [userId, fromDate, toDate]
  );

  return meals as Meal[];
}

/** Get a user's recently logged unique meals */
export async function getRecent(userId: number, limit = 20): Promise<any[]> {
  const [meals] = await pool.query<RowDataPacket[]>(
    `SELECT name, calories as cals, proteinG as protein, carbsG as carbs, fatG as fat 
     FROM (
         SELECT name, calories, proteinG, carbsG, fatG, id
         FROM meals 
         WHERE userId = ? 
         ORDER BY id DESC
     ) as sub 
     GROUP BY name 
     ORDER BY MAX(id) DESC 
     LIMIT ?`,
    [userId, limit]
  );

  return meals.map(m => ({
    ...m,
    emoji: "🍽️"
  }));
}

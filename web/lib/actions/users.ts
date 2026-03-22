"use server";

import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  gender?: string;
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  onboarded?: boolean;
  createdAt: number;
  plan?: "free" | "pro" | "ultra";
  planActivatedAt?: number;
  planExpiresAt?: number;
}

/**
 * Get user by ID (safe — no password hash returned).
 */
export async function getById(userId: number): Promise<SafeUser | null> {
  const [users] = await pool.query<RowDataPacket[]>(
    "SELECT id, name, email, avatarUrl, calorieGoal, proteinGoal, carbsGoal, fatGoal, gender, ageYears, heightCm, weightKg, onboarded, createdAt, plan, planActivatedAt, planExpiresAt FROM users WHERE id = ?",
    [userId]
  );

  if (users.length === 0) return null;
  const user = users[0] as SafeUser;
  user.onboarded = !!user.onboarded; // convert from INT/TINYINT to boolean
  return user;
}

/**
 * Update profile fields for the user.
 */
export async function updateProfile(userId: number, fields: Partial<Omit<SafeUser, 'id' | 'createdAt'>>): Promise<void> {
  const patch: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) patch[key] = val;
  }

  if (Object.keys(patch).length === 0) return;

  const setClause = Object.keys(patch).map(key => `\${key} = ?`).join(", ");
  const values = Object.values(patch);
  values.push(userId);

  await pool.query(
    `UPDATE users SET \${setClause} WHERE id = ?`,
    values
  );
}

/**
 * Complete onboarding: calculates BMR/TDEE and sets macro goals
 */
export async function completeOnboarding(
  userId: number,
  args: {
    gender: string;
    ageYears: number;
    heightCm: number;
    weightKg: number;
    activityLevel: string;
    goal: string;
  }
): Promise<void> {
  const { gender, ageYears, heightCm, weightKg, activityLevel, goal } = args;

  // Mifflin-St Jeor Equation
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  bmr += gender === "male" ? 5 : -161;

  // Activity Multipliers
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  };
  const tdee = bmr * (multipliers[activityLevel] || 1.2);

  // Goals
  const goalMods: Record<string, number> = { lose: -500, maintain: 0, gain: 500 };
  let calorieGoal = Math.round(tdee + (goalMods[goal] || 0));

  // Minimums
  if (gender === "male" && calorieGoal < 1500) calorieGoal = 1500;
  if (gender === "female" && calorieGoal < 1200) calorieGoal = 1200;

  // Macros
  const proteinGoal = Math.round(weightKg * 2.2); // ~2.2g per kg for high protein
  const fatGoal = Math.round((calorieGoal * 0.25) / 9); // 25% of calories
  const carbsGoal = Math.round((calorieGoal - (proteinGoal * 4) - (fatGoal * 9)) / 4);

  await pool.query(
    `UPDATE users SET 
      gender = ?, ageYears = ?, heightCm = ?, weightKg = ?, 
      calorieGoal = ?, proteinGoal = ?, carbsGoal = ?, fatGoal = ?, 
      onboarded = TRUE 
     WHERE id = ?`,
    [gender, ageYears, heightCm, weightKg, calorieGoal, proteinGoal, carbsGoal, fatGoal, userId]
  );
}

/**
 * Set the user's subscription plan.
 */
export async function updatePlan(userId: number, plan: "free" | "pro" | "ultra"): Promise<{ plan: string }> {
  const activatedAt = Date.now();
  const expiresAt = plan === "free" ? null : Date.now() + 30 * 24 * 60 * 60 * 1000;

  await pool.query(
    "UPDATE users SET plan = ?, planActivatedAt = ?, planExpiresAt = ? WHERE id = ?",
    [plan, activatedAt, expiresAt, userId]
  );

  return { plan };
}

/**
 * Get plan info for a user.
 */
export async function getUserPlan(userId: number): Promise<{ plan: "free" | "pro" | "ultra"; planActivatedAt?: number; planExpiresAt?: number } | null> {
  const [users] = await pool.query<RowDataPacket[]>(
    "SELECT plan, planActivatedAt, planExpiresAt FROM users WHERE id = ?",
    [userId]
  );

  if (users.length === 0) return null;
  const user = users[0];

  return {
    plan: (user.plan ?? "free") as "free" | "pro" | "ultra",
    planActivatedAt: user.planActivatedAt ? Number(user.planActivatedAt) : undefined,
    planExpiresAt: user.planExpiresAt ? Number(user.planExpiresAt) : undefined,
  };
}

/**
 * Delete Account: cascade deletes everything.
 */
export async function deleteAccount(userId: number): Promise<void> {
  // MySQL Foreign keys WITH CASCADE ON DELETE handle the cascade!
  // progress, meals, sessions, bodyPhotos, mealPlans references users(id) ON DELETE CASCADE.
  // We just need to delete the user.
  await pool.query("DELETE FROM users WHERE id = ?", [userId]);
}

/**
 * Export all user data.
 */
export async function exportData(userId: number): Promise<{ user: SafeUser; meals: any[]; progress: any[] } | null> {
  const user = await getById(userId);
  if (!user) throw new Error("User not found");

  const [meals] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM meals WHERE userId = ?",
    [userId]
  );

  const [progress] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM progress WHERE userId = ?",
    [userId]
  );

  return {
    user,
    meals,
    progress
  };
}

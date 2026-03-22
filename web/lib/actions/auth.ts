"use server";

import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  avatarUrl?: string;
  weightKg?: number;
  heightCm?: number;
  ageYears?: number;
  gender?: string;
  onboarded?: boolean;
}

/** Simple 64-char hex token generator */
function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lightweight password stretching using SubtleCrypto PBKDF2 */
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

/** Compare a plaintext password to a stored hash */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const h = await hashPassword(password);
  return h === hash;
}

/** Look up the user attached to a session token */
export async function getSessionUser(token: string): Promise<AuthUser | null> {
  if (!token) return null;

  try {
    const [sessions] = await pool.query<RowDataPacket[]>(
      "SELECT userId, expiresAt FROM sessions WHERE token = ?",
      [token]
    );

    if (sessions.length === 0) return null;
    const session = sessions[0];

    if (session.expiresAt < Date.now()) {
      await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
      return null;
    }

    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, calorieGoal, proteinGoal, carbsGoal, fatGoal, avatarUrl, weightKg, heightCm, ageYears, gender, onboarded FROM users WHERE id = ?",
      [session.userId]
    );

    if (users.length === 0) return null;

    const user = users[0] as AuthUser;
    user.onboarded = !!user.onboarded; // convert from INT to boolean
    return user;
  } catch (err) {
    console.error("Error in getSessionUser:", err);
    return null;
  }
}

/** Sign up a new user */
export async function signUp({ name, email, password }: any): Promise<{ token: string; userId: number }> {
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  const passwordHash = await hashPassword(password);
  const cleanEmail = email.toLowerCase().trim();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Check existing email
    const [existing] = await connection.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existing.length > 0) {
      throw new Error("An account with this email already exists.");
    }

    // Insert user
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO users (name, email, passwordHash, calorieGoal, proteinGoal, carbsGoal, fatGoal, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, cleanEmail, passwordHash, 2000, 150, 200, 65, Date.now()]
    );

    const userId = result.insertId;
    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    // Insert session
    await connection.query(
      "INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)",
      [userId, token, expiresAt, Date.now()]
    );

    await connection.commit();
    return { token, userId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/** Sign in a user */
export async function signIn({ email, password }: any): Promise<{ token: string; userId: number }> {
  const cleanEmail = email.toLowerCase().trim();

  const [users] = await pool.query<RowDataPacket[]>(
    "SELECT id, passwordHash FROM users WHERE email = ?",
    [cleanEmail]
  );

  if (users.length === 0) throw new Error("Invalid email or password.");
  const user = users[0];

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password.");

  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

  await pool.query(
    "INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)",
    [user.id, token, expiresAt, Date.now()]
  );

  return { token, userId: user.id };
}

/** Sign out a user */
export async function signOut({ token }: { token: string }): Promise<{ ok: boolean }> {
  await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
  return { ok: true };
}

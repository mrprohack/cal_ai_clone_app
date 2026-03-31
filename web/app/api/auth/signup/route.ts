import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

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

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const passwordHash = await hashPassword(password);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existing] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM users WHERE email = ?",
        [cleanEmail]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO users (name, email, passwordHash, calorieGoal, proteinGoal, carbsGoal, fatGoal, createdAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, cleanEmail, passwordHash, 2000, 150, 200, 65, Date.now()]
      );

      const userId = result.insertId;
      const token = generateToken();
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

      await connection.query(
        "INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)",
        [userId, token, expiresAt, Date.now()]
      );

      await connection.commit();
      return NextResponse.json({ token, userId });
    } catch (err) {
      await connection.rollback();
      console.error("❌ /api/auth/signup error:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Database connection failed" },
        { status: 500 }
      );
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error("❌ /api/auth/signup parse error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

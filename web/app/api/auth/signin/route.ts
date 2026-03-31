import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

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
    const { email, password } = await req.json();
    const cleanEmail = email.toLowerCase().trim();

    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, passwordHash FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const user = users[0];
    const h = await hashPassword(password);
    if (h !== user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = generateToken();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

    await pool.query(
      "INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)",
      [user.id, token, expiresAt, Date.now()]
    );

    return NextResponse.json({ token, userId: user.id });
  } catch (err) {
    console.error("❌ /api/auth/signin error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database connection failed" },
      { status: 500 }
    );
  }
}

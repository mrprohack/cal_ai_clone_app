import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const [sessions] = await pool.query<RowDataPacket[]>(
      "SELECT userId, expiresAt FROM sessions WHERE token = ?",
      [token]
    );

    if (sessions.length === 0) {
      return NextResponse.json({ user: null });
    }

    const session = sessions[0];
    if (session.expiresAt < Date.now()) {
      await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
      return NextResponse.json({ user: null });
    }

    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, name, email, calorieGoal, proteinGoal, carbsGoal, fatGoal, avatarUrl, weightKg, heightCm, ageYears, gender, onboarded FROM users WHERE id = ?",
      [session.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ user: null });
    }

    const user = users[0];
    user.onboarded = !!user.onboarded;
    return NextResponse.json({ user });
  } catch (err) {
    console.error("❌ /api/auth/session error:", err);
    return NextResponse.json({ user: null });
  }
}

import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (token) {
      await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("❌ /api/auth/signout error:", err);
    return NextResponse.json({ ok: true });
  }
}

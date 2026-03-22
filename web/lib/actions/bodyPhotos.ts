"use server";

import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface BodyPhoto {
  id: number;
  userId: number;
  date: string;
  imageData?: string;
  analysis?: string;
  weekLabel?: string;
  notes?: string;
  recordedAt: number;
}

/** Save a new body photo check-in */
export async function savePhoto(args: {
  userId: number;
  date: string;
  imageData?: string;
  analysis?: string;
  weekLabel?: string;
  notes?: string;
}): Promise<number> {
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id, imageData, analysis, weekLabel, notes FROM bodyPhotos WHERE userId = ? AND date = ?",
    [args.userId, args.date]
  );

  if (existing.length > 0) {
    const row = existing[0];
    const updateArgs = [
      args.imageData !== undefined ? args.imageData : row.imageData,
      args.analysis !== undefined ? args.analysis : row.analysis,
      args.weekLabel !== undefined ? args.weekLabel : row.weekLabel,
      args.notes !== undefined ? args.notes : row.notes,
      row.id
    ];

    await pool.query(
      "UPDATE bodyPhotos SET imageData = ?, analysis = ?, weekLabel = ?, notes = ? WHERE id = ?",
      updateArgs
    );
    return row.id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO bodyPhotos (userId, date, imageData, analysis, weekLabel, notes, recordedAt) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [args.userId, args.date, args.imageData || null, args.analysis || null, args.weekLabel || null, args.notes || null, Date.now()]
  );

  return result.insertId;
}

/** List all body photos */
export async function listPhotos(userId: number): Promise<BodyPhoto[]> {
  const [photos] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM bodyPhotos WHERE userId = ? ORDER BY date DESC",
    [userId]
  );
  return photos as BodyPhoto[];
}

/** Get last N weeks of photos */
export async function getWeeklyPhotos(userId: number, weeks = 7): Promise<BodyPhoto[]> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - weeks * 7);
  const fromStr = fromDate.toISOString().split("T")[0];

  const [photos] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM bodyPhotos WHERE userId = ? AND date >= ? ORDER BY date ASC",
    [userId, fromStr]
  );

  return photos as BodyPhoto[];
}

/** Delete a body photo entry */
export async function removePhoto(photoId: number, userId: number): Promise<void> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM bodyPhotos WHERE id = ? AND userId = ?",
    [photoId, userId]
  );

  if (result.affectedRows === 0) throw new Error("Photo not found or unauthorized");
}

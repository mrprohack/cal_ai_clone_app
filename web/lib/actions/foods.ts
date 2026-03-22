"use server";

import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export interface Food {
  id: number;
  name: string;
  cals: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
  cat: string;
}

/** List first 50 foods */
export async function list(): Promise<Food[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM foods LIMIT 50"
  );
  return rows as Food[];
}

/** Search foods with category filter */
export async function search(searchQuery?: string, category?: string): Promise<Food[]> {
  const values: any[] = [];
  let queryStr = "SELECT * FROM foods WHERE 1=1";

  if (searchQuery && searchQuery.trim().length > 0) {
    queryStr += " AND MATCH(name) AGAINST(?)" ;
    values.push(searchQuery + "*"); // * for wildcard if needed or normal search
  }

  if (category && category !== "All") {
    queryStr += " AND cat = ?";
    values.push(category);
  }

  queryStr += " LIMIT 50";

  let [rows] = await pool.query<RowDataPacket[]>(queryStr, values);

  // Fallback to LIKE if MATCH AGAINST returned 0 rows and a searchQuery exists
  if (rows.length === 0 && searchQuery && searchQuery.trim().length > 0) {
    let fallbackQuery = "SELECT * FROM foods WHERE name LIKE ?";
    const fallbackValues = [`%\${searchQuery}%`];
    
    if (category && category !== "All") {
      fallbackQuery += " AND cat = ?";
      fallbackValues.push(category);
    }
    fallbackQuery += " LIMIT 50";
    
    const [fallbackRows] = await pool.query<RowDataPacket[]>(fallbackQuery, fallbackValues);
    rows = fallbackRows;
  }

  return rows as Food[];
}

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

/* ── Robust JSON extractor ──────────────────────────────────────────────── */
/**
 * Tries multiple strategies to extract a JSON object from an LLM response:
 * 1. Direct JSON.parse
 * 2. Strip markdown fences then parse
 * 3. Regex-extract the first {...} block (handles leading prose)
 * 4. Find the outermost balanced braces
 */
function extractJSON(raw: string): Record<string, unknown> | null {
  if (!raw || raw.trim() === "") return null;

  // Strategy 1: direct parse
  try { return JSON.parse(raw.trim()); } catch { /* fall through */ }

  // Strategy 2: strip markdown fences
  const stripped = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  try { return JSON.parse(stripped); } catch { /* fall through */ }

  // Strategy 3: find first { to last }
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = raw.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(slice); } catch { /* fall through */ }
  }

  // Strategy 4: balanced brace scan
  let depth = 0;
  let start = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === "{") { if (depth === 0) start = i; depth++; }
    else if (raw[i] === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(raw.slice(start, i + 1)); } catch { start = -1; }
      }
    }
  }

  return null;
}

/* ── System prompt (concise to save tokens) ─────────────────────────────── */
const SYSTEM_PROMPT = `You are a certified nutritionist AI. Create a 7-day meal plan.

Return ONLY a raw JSON object — no markdown, no code fences, no explanation text before or after. Start your response with { and end with }.

JSON structure:
{
  "planName": "string",
  "dailyCalorieTarget": number,
  "days": [
    {
      "dayName": "Monday",
      "dayNumber": 1,
      "totalCalories": number,
      "totalProtein": number,
      "totalCarbs": number,
      "totalFat": number,
      "meals": [
        {
          "mealType": "breakfast",
          "name": "string",
          "calories": number,
          "proteinG": number,
          "carbsG": number,
          "fatG": number,
          "servingSize": "string",
          "ingredients": ["string"],
          "prepTime": "string",
          "instructions": "string"
        }
      ],
      "waterGoalMl": 2500,
      "tips": "string"
    }
  ],
  "shoppingList": {
    "proteins": ["string"],
    "carbs": ["string"],
    "vegetables": ["string"],
    "fruits": ["string"],
    "dairy": ["string"],
    "other": ["string"]
  },
  "weeklyTotals": { "avgCalories": number, "avgProtein": number, "avgCarbs": number, "avgFat": number },
  "nutritionTips": ["string"],
  "estimatedCost": "string"
}

Rules:
- Exactly 7 days (Monday-Sunday), each with 4 meals: breakfast, lunch, dinner, snack
- Keep instructions brief (1-2 sentences max)
- Keep ingredient lists to 4-6 items
- YOUR ENTIRE RESPONSE MUST BE VALID JSON ONLY`;

/* ── Route handler ───────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const {
      calorieGoal = 2000,
      proteinGoal = 150,
      carbsGoal = 200,
      fatGoal = 65,
      preferences = [],
      restrictions = [],
      userName = "there",
    } = await req.json() as {
      calorieGoal?: number;
      proteinGoal?: number;
      carbsGoal?: number;
      fatGoal?: number;
      preferences?: string[];
      restrictions?: string[];
      userName?: string;
    };

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const parts: string[] = [
      `Create a 7-day meal plan for ${userName}.`,
      `Targets: ${calorieGoal} kcal/day, ${proteinGoal}g protein, ${carbsGoal}g carbs, ${fatGoal}g fat.`,
    ];
    if (preferences.length > 0) parts.push(`Preferences: ${preferences.join(", ")}.`);
    if (restrictions.length > 0) parts.push(`Restrictions: ${restrictions.join(", ")}.`);
    parts.push("Return ONLY the JSON object, nothing else.");

    const userMessage = parts.join(" ");

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.3,        // lower = more deterministic / less hallucination
      max_completion_tokens: 8192,  // 7-day plan is large — needs room
      top_p: 0.9,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    console.log("[meal-plan] raw length:", raw.length);
    console.log("[meal-plan] raw preview:", raw.slice(0, 200));

    const parsed = extractJSON(raw);

    if (!parsed) {
      console.error("[meal-plan] JSON extraction failed. Raw:", raw.slice(0, 500));
      return NextResponse.json(
        {
          error: "AI did not return valid JSON. Please try again.",
          hint: "The model may have returned a truncated or malformatted response.",
        },
        { status: 422 }
      );
    }

    // Validate minimum required structure
    if (!Array.isArray((parsed as { days?: unknown }).days) || (parsed.days as unknown[]).length === 0) {
      return NextResponse.json(
        { error: "Meal plan is missing the 'days' array. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[meal-plan]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

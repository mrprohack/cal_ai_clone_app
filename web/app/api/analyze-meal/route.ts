import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs"; // groq-sdk needs Node runtime

/* ─── System prompt ─────────────────────────────────────────────────────── */
const SYSTEM_PROMPT = `You are a professional nutrition analyst AI with deep expertise in food science.

When given a food image, analyze it and return ONLY a valid JSON object (no markdown, no code blocks, no extra text) in this exact structure:

{
  "name": "Descriptive food name",
  "confidence": 92,
  "servingSize": "1 plate (~320g)",
  "calories": 412,
  "proteinG": 18,
  "carbsG": 34,
  "fatG": 22,
  "notes": "Brief 1-sentence observation about the meal"
}

Rules:
- All macros must be numbers (integers or one decimal)
- confidence is 0-100 (your certainty about the identification)
- servingSize is an estimated description
- If you cannot identify the food, still return valid JSON with your best guess and low confidence
- NEVER return anything except the raw JSON object`;

/* ─── Route handler ─────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json() as {
      imageBase64: string;
      mimeType?: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.2, // low temp = more deterministic nutrition data
      max_completion_tokens: 512,
      top_p: 1,
      stream: false,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "Analyze this food image and return the nutritional data as JSON.",
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Strip any accidental markdown fences and parse JSON
    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return the raw text so the client can show an error
      return NextResponse.json(
        { error: "AI did not return valid JSON", raw },
        { status: 422 }
      );
    }

    // Validate & normalize fields
    const result = {
      name:        String(parsed.name        ?? "Unknown Food"),
      confidence:  Number(parsed.confidence  ?? 70),
      servingSize: String(parsed.servingSize ?? "1 serving"),
      calories:    Number(parsed.calories    ?? 0),
      proteinG:    Number(parsed.proteinG    ?? 0),
      carbsG:      Number(parsed.carbsG      ?? 0),
      fatG:        Number(parsed.fatG        ?? 0),
      notes:       String(parsed.notes       ?? ""),
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[analyze-meal]", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

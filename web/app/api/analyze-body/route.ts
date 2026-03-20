import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a professional fitness and body composition analyst AI with expertise in visual body assessment.

When given a body photo, analyze visible physical characteristics and return ONLY a valid JSON object (no markdown, no code blocks, no extra text) in this exact structure:

{
  "bodyFat": 18,
  "muscleDefinition": "moderate",
  "visibleMuscleGroups": ["chest", "shoulders", "arms"],
  "posture": "good",
  "estimatedBMICategory": "normal",
  "fitnessLevel": "intermediate",
  "strengths": ["Good upper body development", "Lean midsection"],
  "areasForImprovement": ["Lower body could be more developed", "Core definition"],
  "weeklyChange": null,
  "progressScore": 72,
  "notes": "Brief 1-2 sentence observation about overall physique and progress",
  "recommendations": ["Increase lower body training", "Focus on core exercises"]
}

Rules:
- bodyFat: estimated body fat percentage (number, e.g., 18)  
- muscleDefinition: "low" | "moderate" | "good" | "excellent"
- visibleMuscleGroups: array of muscle groups visible in photo
- posture: "poor" | "fair" | "good" | "excellent"
- estimatedBMICategory: "underweight" | "normal" | "overweight" | "obese"
- fitnessLevel: "beginner" | "intermediate" | "advanced" | "elite"
- strengths: array of 2-3 positive observations
- areasForImprovement: array of 2-3 suggested improvements
- weeklyChange: null for first photo, or description of change if comparison available
- progressScore: 0-100 overall fitness/physique score
- notes: brief professional observation
- recommendations: array of 2-3 actionable exercise/lifestyle tips
- Be encouraging and professional. Never be harsh or body-negative.
- If image is not a body photo, still return valid JSON with estimated/null values
- NEVER return anything except the raw JSON object`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mimeType = "image/jpeg", previousAnalysis } = await req.json() as {
      imageBase64: string;
      mimeType?: string;
      previousAnalysis?: string;
    };

    if (!imageBase64) {
      return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const userContent: Groq.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${imageBase64}` },
      },
      {
        type: "text",
        text: previousAnalysis
          ? `Analyze this body progress photo. Previous week analysis: ${previousAnalysis}. Compare and note changes in weeklyChange field.`
          : "Analyze this body progress photo and return the fitness assessment as JSON.",
      },
    ];

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 0.3,
      max_completion_tokens: 800,
      top_p: 1,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    // Robust extraction — try multiple strategies
    function extractJSON(text: string): Record<string, unknown> | null {
      if (!text.trim()) return null;
      // 1: direct
      try { return JSON.parse(text.trim()); } catch { /* next */ }
      // 2: strip fences
      const s = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();
      try { return JSON.parse(s); } catch { /* next */ }
      // 3: first { to last }
      const f = text.indexOf("{"), l = text.lastIndexOf("}");
      if (f !== -1 && l > f) { try { return JSON.parse(text.slice(f, l + 1)); } catch { /* next */ } }
      return null;
    }

    const parsed = extractJSON(raw);
    if (!parsed) {
      console.error("[analyze-body] JSON extraction failed. Raw:", raw.slice(0, 400));
      return NextResponse.json({ error: "AI did not return valid JSON. Please try again." }, { status: 422 });
    }

    const result = {
      bodyFat:             Number(parsed.bodyFat ?? 20),
      muscleDefinition:    String(parsed.muscleDefinition ?? "moderate"),
      visibleMuscleGroups: Array.isArray(parsed.visibleMuscleGroups) ? parsed.visibleMuscleGroups : [],
      posture:             String(parsed.posture ?? "good"),
      estimatedBMICategory: String(parsed.estimatedBMICategory ?? "normal"),
      fitnessLevel:        String(parsed.fitnessLevel ?? "intermediate"),
      strengths:           Array.isArray(parsed.strengths) ? parsed.strengths : [],
      areasForImprovement: Array.isArray(parsed.areasForImprovement) ? parsed.areasForImprovement : [],
      weeklyChange:        parsed.weeklyChange ? String(parsed.weeklyChange) : null,
      progressScore:       Number(parsed.progressScore ?? 60),
      notes:               String(parsed.notes ?? ""),
      recommendations:     Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[analyze-body]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

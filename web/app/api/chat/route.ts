import { NextRequest } from "next/server";

export const runtime = "edge";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL    = "moonshotai/kimi-k2-instruct-0905";

const BASE_SYSTEM_PROMPT = `You are FitBot, an expert AI nutrition coach built into CalAI — a smart fitness tracker app.

Personality:
- Warm, encouraging, and science-backed
- Use emojis sparingly but effectively
- Format key numbers in **bold**
- Keep answers concise (2–4 short paragraphs max)
- Always tie advice back to the user's actual logged data when relevant
- Never give medical diagnoses — recommend consulting a professional for health issues`;

export async function POST(req: NextRequest) {
  const { messages, contextPrompt } = await req.json() as {
    messages: { role: string; content: string }[];
    contextPrompt?: string;
  };

  const SYSTEM_PROMPT = contextPrompt 
    ? `${BASE_SYSTEM_PROMPT}\n\nUser Context:\n${contextPrompt}`
    : BASE_SYSTEM_PROMPT;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GROQ_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build Groq request with system prompt prepended
  const groqBody = {
    model: MODEL,
    temperature: 0.6,
    max_completion_tokens: 4096,
    top_p: 1,
    stream: true,
    stop: null,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ],
  };

  const groqRes = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(groqBody),
  });

  if (!groqRes.ok) {
    const err = await groqRes.text();
    return new Response(JSON.stringify({ error: err }), {
      status: groqRes.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pipe the SSE stream straight through to the client
  return new Response(groqRes.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { Progress, Meals } from "@/lib/phpApi";
import { Navbar } from "@/components/Navbar";
import styles from "./Chat.module.css";
import { AuthGuard } from "@/components/AuthGuard";

/* ── Types ── */
type Role = "bot" | "user";
interface Message { role: Role; text: string; ts?: string; }

/* ── Suggested prompts ── */
const SUGGESTIONS = [
  "Is my protein intake on track today?",
  "What should I eat before a workout?",
  "Suggest a 400-calorie dinner",
  "How can I add more fibre?",
];

const INIT_MESSAGES: Message[] = [
  {
    role: "bot",
    text: "Hey Champ! 👋 I'm **FitBot**, your personal nutrition AI. I know your macros, meal history, and goals — so ask me anything about your diet, and I'll give you science-backed, *personalised* advice. What's on your mind today?",
    ts: "Now",
  },
];

/* ── Minimal markdown renderer (bold / italic / newlines) ── */
function renderMd(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function ChatPage() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;

  // Dates for context
  const todayDate = new Date();
  const toDate = todayDate.toISOString().split("T")[0];
  const lastMonthDate = new Date();
  lastMonthDate.setDate(lastMonthDate.getDate() - 30);
  const fromDate = lastMonthDate.toISOString().split("T")[0];

  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [pastMeals, setPastMeals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [_today, _past, _stats] = await Promise.all([
        Meals.getTodayMeals(userId, toDate),
          Meals.range(userId, fromDate, toDate),
          Progress.getStats(userId, fromDate, toDate),
      ]);
      setTodayMeals(_today || []);
      setPastMeals(_past || []);
      setStats(_stats);
    } catch (err) {
      console.error("fetchData error:", err);
    }
  }, [userId, toDate, fromDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate today's totals
  const todayTotals = (todayMeals || []).reduce((acc: any, m: any) => ({
    c: acc.c + (m.calories || 0),
    p: acc.p + (m.proteinG || 0),
    cb: acc.cb + (m.carbsG || 0),
    f: acc.f + (m.fatG || 0),
  }), { c: 0, p: 0, cb: 0, f: 0 });

  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [input, setInput]       = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef                  = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function send(text?: string) {
    const txt = (text ?? input).trim();
    if (!txt || streaming) return;

    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { role: "user", text: txt, ts }]);
    setInput("");
    setStreaming(true);

    // Append user turn to history
    historyRef.current = [
      ...historyRef.current,
      { role: "user", content: txt },
    ];

    // Add a placeholder bot message we'll stream into
    const botTs = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { role: "bot", text: "", ts: botTs }]);

    // Build hidden context prompt
    const contextPrompt = user ? `
      - Daily calorie goal: ${user.calorieGoal || 2000} kcal | consumed today: ${Math.round(todayTotals.c)} kcal
      - Protein goal: ${user.proteinGoal || 151}g | consumed today: ${Math.round(todayTotals.p)}g
      - Carbs goal: ${user.carbsGoal || 225}g | consumed today: ${Math.round(todayTotals.cb)}g
      - Fat goal: ${user.fatGoal || 65}g | consumed today: ${Math.round(todayTotals.f)}g
      - Current Weight: ${user.weightKg ? user.weightKg + "kg" : "Not Provided"}
      - Gender/Age: ${user.gender || "Unknown"}, ${user.ageYears || "Unknown"}
      - 30-Day Info: logged ${stats?.daysLogged || 0} days, avg ${stats?.avgCalories || 0} kcal/day, current streak ${stats?.streak || 0}.
      - Some recent meals: ${pastMeals?.slice(-10).map((m: any) => `${m.name} (${m.calories}kcal)`).join(", ") || "None"}
    ` : "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyRef.current, contextPrompt }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "bot", text: `⚠️ Error: ${err}`, ts: botTs };
          return copy;
        });
        setStreaming(false);
        return;
      }

      // Read SSE stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE lines: "data: {...}\n\n" or "data: [DONE]\n\n"
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const json = JSON.parse(payload);
            const delta: string = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              const snap = accumulated;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "bot", text: snap, ts: botTs };
                return copy;
              });
            }
          } catch {
            // partial JSON — skip
          }
        }
      }

      // Save the full bot reply to history
      historyRef.current = [
        ...historyRef.current,
        { role: "assistant", content: accumulated },
      ];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "bot", text: `⚠️ Network error: ${message}`, ts: botTs };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <AuthGuard>
      <div className={styles.page}>
        <Navbar />
        <div className={styles.layout}>
          {/* Side panel */}
          <aside className={styles.sidebar}>
            <div className={styles.sideHeader}>
              <div className={styles.botAvatar}>
                <span className="material-symbols-outlined">smart_toy</span>
                <span className={styles.onlineDot} />
              </div>
              <div>
                <div className={styles.botName}>FitBot</div>
                <div className={styles.botTagline}>Your AI Nutrition Coach</div>
              </div>
            </div>

            <div className={styles.todaySnap}>
              <div className={styles.snapTitle}>Today&apos;s Snapshot</div>
              {[
                { label: "Calories",  val: `${Math.round(todayTotals.c)} / ${user?.calorieGoal || 2000}`, icon: "🔥" },
                { label: "Protein",   val: `${Math.round(todayTotals.p)} / ${user?.proteinGoal || 150}g`, icon: "💪" },
                { label: "Carbs",     val: `${Math.round(todayTotals.cb)} / ${user?.carbsGoal || 225}g`, icon: "🌾" },
                { label: "Fat",       val: `${Math.round(todayTotals.f)} / ${user?.fatGoal || 65}g`,    icon: "🥑" },
              ].map((s) => (
                <div key={s.label} className={styles.snapRow}>
                  <span className={styles.snapEmoji}>{s.icon}</span>
                  <span className={styles.snapLabel}>{s.label}</span>
                  <span className={styles.snapVal}>{s.val}</span>
                </div>
              ))}
            </div>

            <div className={styles.suggestLabel}>Quick Questions</div>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className={styles.suggestionBtn}
                  onClick={() => send(s)}
                  disabled={streaming}
                  id={`chat-suggest-\${s.slice(0,10).replace(/\\s+/g,"-").toLowerCase()}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Model badge */}
            <div className={styles.modelBadge}>
              <span className="material-symbols-outlined">auto_awesome</span>
              Kimi K2 · Groq
            </div>
          </aside>

          {/* Chat area */}
          <div className={styles.chatWrap}>
            <div className={styles.messages} id="fitbot-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`\${styles.msgRow} \${msg.role === "user" ? styles.msgRowUser : ""}`}>
                  {msg.role === "bot" && (
                    <div className={styles.msgAvatar}>
                      <span className="material-symbols-outlined">smart_toy</span>
                    </div>
                  )}
                  <div className={`\${styles.bubble} \${msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}>
                    {msg.text === "" && streaming ? (
                      /* Streaming typing indicator */
                      <span className={styles.cursor}>▍</span>
                    ) : (
                      <div
                        className={styles.bubbleText}
                        dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }}
                      />
                    )}
                    {/* Show blinking cursor while this is the last bot message streaming */}
                    {msg.role === "bot" && streaming && i === messages.length - 1 && msg.text !== "" && (
                      <span className={styles.cursor}>▍</span>
                    )}
                    {msg.ts && <div className={styles.bubbleTs}>{msg.ts}</div>}
                  </div>
                </div>
              ))}

              {/* Classic typing dots while waiting for first token */}
              {streaming && messages[messages.length - 1]?.text === "" && (
                <div className={styles.msgRow}>
                  <div className={styles.msgAvatar}>
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div className={`\${styles.bubble} \${styles.bubbleBot} \${styles.typingBubble}`}>
                    <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className={styles.inputWrap}>
              {messages.length <= 2 && (
                <div className={styles.chipRow}>
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      className={styles.chipBtn}
                      onClick={() => send(s)}
                      disabled={streaming}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.inputBox}>
                <textarea
                  className={styles.textarea}
                  rows={1}
                  placeholder="Ask FitBot anything about your nutrition…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={streaming}
                  id="fitbot-input"
                />
                <button
                  className={`\${styles.sendBtn} \${input.trim() && !streaming ? styles.sendBtnActive : ""}`}
                  onClick={() => send()}
                  disabled={!input.trim() || streaming}
                  id="fitbot-send"
                >
                  {streaming
                    ? <span className={`material-symbols-outlined \${styles.spinIcon}`}>progress_activity</span>
                    : <span className="material-symbols-outlined">send</span>
                  }
                </button>
              </div>
              <div className={styles.inputHint}>Press Enter to send · Shift+Enter for new line</div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

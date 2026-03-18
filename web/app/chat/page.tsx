"use client";
export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import styles from "./Chat.module.css";

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

/* ── Canned responses (demo) ── */
const BOT_REPLIES: Record<string, string> = {
  default:
    "Great question! Based on your logged meals, you're at 1,240 kcal so far today. You have around 760 kcal remaining to hit your 2,000 kcal goal. I'd suggest a protein-rich snack or a light dinner to close the gap without going over. 💡",
  protein:
    "You've hit 92g of protein today — you need 150g to hit your goal. Try adding Greek yogurt (17g), a chicken breast (31g), or a protein shake (25g) to get there. You can do it! 💪",
  workout:
    "For a pre-workout meal, aim for easy-to-digest carbs + some protein about 60–90 minutes before. A banana with peanut butter or Greek yogurt with berries works great and won't weigh you down. 🏋️",
  dinner:
    "Here's a 400-calorie dinner idea: **Lemon-herb salmon (200g)** with **roasted zucchini** and **½ cup quinoa**. That delivers ~35g protein and keeps your fat intake in check. Want a full recipe? 🐟",
  fibre:
    "Adding fibre is easy! Try swapping white rice for brown rice, snacking on an apple, or adding a handful of lentils to your next meal. Aim for 25–38g per day — most people only get 15g. 🥦",
};

function getReply(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("protein")) return BOT_REPLIES.protein;
  if (lower.includes("workout") || lower.includes("exercise")) return BOT_REPLIES.workout;
  if (lower.includes("dinner") || lower.includes("meal")) return BOT_REPLIES.dinner;
  if (lower.includes("fibre") || lower.includes("fiber")) return BOT_REPLIES.fibre;
  return BOT_REPLIES.default;
}

const INIT_MESSAGES: Message[] = [
  {
    role: "bot",
    text: "Hey Champ! 👋 I'm **FitBot**, your personal nutrition AI. I know your macros, meal history, and goals — so ask me anything about your diet, and I'll give you science-backed, *personalised* advice. What's on your mind today?",
    ts: "Now",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const endRef                  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send(text?: string) {
    const txt = (text ?? input).trim();
    if (!txt) return;
    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { role: "user", text: txt, ts }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        { role: "bot", text: getReply(txt), ts: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    }, 1400 + Math.random() * 800);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
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
            <div className={styles.snapTitle}>Today's Snapshot</div>
            {[
              { label: "Calories",  val: "1,240 / 2,000", icon: "🔥" },
              { label: "Protein",   val: "92 / 150g",      icon: "💪" },
              { label: "Carbs",     val: "145 / 225g",     icon: "🌾" },
              { label: "Fat",       val: "38 / 56g",       icon: "🥑" },
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
                id={`chat-suggest-${s.slice(0,10).replace(/\s+/g,"-").toLowerCase()}`}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div className={styles.chatWrap}>
          <div className={styles.messages} id="fitbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.msgRow} ${msg.role === "user" ? styles.msgRowUser : ""}`}>
                {msg.role === "bot" && (
                  <div className={styles.msgAvatar}>
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                )}
                <div className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}>
                  <div className={styles.bubbleText} dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>") }} />
                  {msg.ts && <div className={styles.bubbleTs}>{msg.ts}</div>}
                </div>
              </div>
            ))}

            {typing && (
              <div className={styles.msgRow}>
                <div className={styles.msgAvatar}>
                  <span className="material-symbols-outlined">smart_toy</span>
                </div>
                <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typingBubble}`}>
                  <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className={styles.inputWrap}>
            <div className={styles.inputBox}>
              <textarea
                className={styles.textarea}
                rows={1}
                placeholder="Ask FitBot anything about your nutrition…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                id="fitbot-input"
              />
              <button
                className={`${styles.sendBtn} ${input.trim() ? styles.sendBtnActive : ""}`}
                onClick={() => send()}
                disabled={!input.trim()}
                id="fitbot-send"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            <div className={styles.inputHint}>Press Enter to send · Shift+Enter for new line</div>
          </div>
        </div>
      </div>
    </div>
  );
}

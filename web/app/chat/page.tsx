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

interface ChatSession {
  id: number;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessage?: string;
}

const SUGGESTIONS = [
  "Is my protein intake on track today?",
  "What should I eat before a workout?",
  "Suggest a 400-calorie dinner",
  "How can I add more fibre?",
];

function getWelcomeMessage(name?: string): Message {
  return {
    role: "bot",
    text: `Hey${name ? ` ${name.split(" ")[0]}` : ""}! 👋 I'm **FitBot**, your personal nutrition AI. I know your macros, meal history, and goals — ask me anything! What's on your mind today?`,
    ts: "Now",
  };
}

/* ── Markdown renderer ── */
function renderMd(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

/* ── Session API helpers ── */
async function apiSessions(action: string, body: object) {
  const res = await fetch(`/api/chat-sessions.php?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function ChatPage() {
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : null;

  /* ── Nutrition context ── */
  const todayDate = new Date().toISOString().split("T")[0];
  const fromDate  = new Date(Date.now() - 30 * 864e5).toISOString().split("T")[0];
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [pastMeals,  setPastMeals]  = useState<any[]>([]);
  const [stats,      setStats]      = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      const [a, b, c] = await Promise.all([
        Meals.getTodayMeals(userId, todayDate),
        Meals.range(userId, fromDate, todayDate),
        Progress.getStats(userId, fromDate, todayDate),
      ]);
      setTodayMeals(a || []);
      setPastMeals(b || []);
      setStats(c);
    } catch {}
  }, [userId, todayDate, fromDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const todayTotals = (todayMeals || []).reduce(
    (acc: any, m: any) => ({ c: acc.c + (m.calories||0), p: acc.p + (m.proteinG||0), cb: acc.cb + (m.carbsG||0), f: acc.f + (m.fatG||0) }),
    { c: 0, p: 0, cb: 0, f: 0 }
  );

  /* ── Session state ── */
  const [sessions,        setSessions]        = useState<ChatSession[]>([]);
  const [activeSession,   setActiveSession]   = useState<ChatSession | null>(null);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [messages,        setMessages]        = useState<Message[]>([]);
  const [input,           setInput]           = useState("");
  const [streaming,       setStreaming]       = useState(false);
  const [loadingHistory,  setLoadingHistory]  = useState(false);
  const historyRef  = useRef<{ role: string; content: string }[]>([]);
  const endRef      = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(null);

  /* ── Load sessions list ── */
  const loadSessions = useCallback(async () => {
    if (!userId) return;
    const data = await apiSessions("listSessions", { userId });
    setSessions(data.sessions || []);
  }, [userId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  /* ── New chat ── */
  const startNewChat = useCallback(() => {
    setActiveSession(null);
    activeIdRef.current = null;
    historyRef.current  = [];
    setMessages([getWelcomeMessage(user?.name)]);
    setInput("");
    setSidebarOpen(false);
  }, [user?.name]);

  // Start with a fresh new chat on mount
  useEffect(() => {
    setMessages([getWelcomeMessage(user?.name)]);
  }, [user?.name]);

  /* ── Load historical session ── */
  const loadSession = useCallback(async (session: ChatSession) => {
    if (!userId) return;
    setLoadingHistory(true);
    setActiveSession(session);
    activeIdRef.current = session.id;
    historyRef.current  = [];
    setSidebarOpen(false);

    try {
      const data = await apiSessions("getMessages", { sessionId: session.id, userId });
      const msgs: Message[] = [getWelcomeMessage(user?.name)];
      const apiHistory: { role: string; content: string }[] = [];

      (data.messages || []).forEach((m: any) => {
        const role: Role = m.role === "user" ? "user" : "bot";
        const ts = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        msgs.push({ role, text: m.content, ts });
        apiHistory.push({ role: m.role === "bot" ? "assistant" : "user", content: m.content });
      });

      setMessages(msgs);
      historyRef.current = apiHistory;
    } catch {
      setMessages([getWelcomeMessage(user?.name)]);
    } finally {
      setLoadingHistory(false);
    }
  }, [userId, user?.name]);

  /* ── Send message ── */
  async function send(text?: string) {
    const txt = (text ?? input).trim();
    if (!txt || streaming) return;

    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(m => [...m, { role: "user", text: txt, ts }]);
    setInput("");
    setStreaming(true);

    // Append to history
    historyRef.current = [...historyRef.current, { role: "user", content: txt }];

    // Ensure a session exists for saving
    let sessionId = activeIdRef.current;
    if (!sessionId && userId) {
      // Auto-create session titled from first message (truncated)
      const title = txt.length > 50 ? txt.slice(0, 50) + "…" : txt;
      const data  = await apiSessions("createSession", { userId, title });
      sessionId   = data.id as number;
      activeIdRef.current = sessionId;
      const newSession: ChatSession = {
        id: data.id, title: data.title,
        createdAt: data.createdAt, updatedAt: data.updatedAt,
      };
      setActiveSession(newSession);
      setSessions(prev => [newSession, ...prev]);
    }

    // Save user message to DB
    if (sessionId && userId) {
      apiSessions("saveMessage", { sessionId, userId, role: "user", content: txt }).catch(() => {});
    }

    // Placeholder bot message
    const botTs = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages(m => [...m, { role: "bot", text: "", ts: botTs }]);

    const contextPrompt = user ? `
      - Daily calorie goal: ${user.calorieGoal || 2000} kcal | consumed today: ${Math.round(todayTotals.c)} kcal
      - Protein goal: ${user.proteinGoal || 151}g | consumed today: ${Math.round(todayTotals.p)}g
      - Carbs goal: ${user.carbsGoal || 225}g | consumed today: ${Math.round(todayTotals.cb)}g
      - Fat goal: ${user.fatGoal || 65}g | consumed today: ${Math.round(todayTotals.f)}g
      - Current Weight: ${user.weightKg ? user.weightKg + "kg" : "Not Provided"}
      - Gender/Age: ${user.gender || "Unknown"}, ${user.ageYears || "Unknown"}
      - 30-Day Info: logged ${stats?.daysLogged || 0} days, avg ${stats?.avgCalories || 0} kcal/day, streak ${stats?.streak || 0}.
      - Recent meals: ${pastMeals?.slice(-8).map((m: any) => `${m.name} (${m.calories}kcal)`).join(", ") || "None"}
    ` : "";

    try {
      const res = await fetch("/api/chat.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyRef.current, contextPrompt }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "bot", text: `⚠️ Error: ${err}`, ts: botTs }; return c; });
        setStreaming(false);
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const json  = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              const snap = accumulated;
              setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "bot", text: snap, ts: botTs }; return c; });
            }
          } catch {}
        }
      }

      // Save full bot reply to DB
      historyRef.current = [...historyRef.current, { role: "assistant", content: accumulated }];
      if (sessionId && userId && accumulated) {
        apiSessions("saveMessage", { sessionId, userId, role: "assistant", content: accumulated }).catch(() => {});
        // Refresh sessions sidebar
        loadSessions();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(m => { const c = [...m]; c[c.length - 1] = { role: "bot", text: `⚠️ Network error: ${msg}`, ts: botTs }; return c; });
    } finally {
      setStreaming(false);
    }
  }

  /* ── Delete session ── */
  const deleteSession = useCallback(async (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || !confirm(`Delete "${session.title}"?`)) return;
    await apiSessions("deleteSession", { sessionId: session.id, userId });
    setSessions(prev => prev.filter(s => s.id !== session.id));
    if (activeIdRef.current === session.id) startNewChat();
  }, [userId, startNewChat]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  /* ── Relative time ── */
  function relTime(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000)   return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 864e5)   return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <AuthGuard>
      <div className={styles.page}>
        <Navbar />
        <div className={styles.layout}>

          {/* ── History Sidebar ── */}
          <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
            <div className={styles.sideHeader}>
              <div className={styles.botBrand}>
                <div className={styles.botAvatar}>
                  <span className="material-symbols-outlined">smart_toy</span>
                  <span className={styles.onlineDot} />
                </div>
                <div>
                  <div className={styles.botName}>FitBot</div>
                  <div className={styles.botTagline}>AI Nutrition Coach</div>
                </div>
              </div>
              <button
                className={styles.newChatBtn}
                onClick={startNewChat}
                id="chat-new-btn"
                title="New Chat"
              >
                <span className="material-symbols-outlined">edit_square</span>
                New Chat
              </button>
            </div>

            {/* Today's Snapshot */}
            <div className={styles.todaySnap}>
              <div className={styles.snapTitle}>Today&apos;s Snapshot</div>
              {[
                { label: "Calories", val: `${Math.round(todayTotals.c)} / ${user?.calorieGoal || 2000}`, icon: "🔥" },
                { label: "Protein",  val: `${Math.round(todayTotals.p)} / ${user?.proteinGoal || 150}g`, icon: "💪" },
                { label: "Carbs",    val: `${Math.round(todayTotals.cb)} / ${user?.carbsGoal || 225}g`,  icon: "🌾" },
                { label: "Fat",      val: `${Math.round(todayTotals.f)} / ${user?.fatGoal || 65}g`,    icon: "🥑" },
              ].map(s => (
                <div key={s.label} className={styles.snapRow}>
                  <span className={styles.snapEmoji}>{s.icon}</span>
                  <span className={styles.snapLabel}>{s.label}</span>
                  <span className={styles.snapVal}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Chat History */}
            <div className={styles.historySection}>
              <div className={styles.historyLabel}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>history</span>
                Chat History
              </div>

              {sessions.length === 0 ? (
                <div className={styles.emptyHistory}>
                  <span className="material-symbols-outlined">chat_bubble_outline</span>
                  <span>No chats yet.<br/>Start a conversation!</span>
                </div>
              ) : (
                <div className={styles.sessionList}>
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      className={`${styles.sessionItem} ${activeSession?.id === s.id ? styles.sessionItemActive : ""}`}
                      onClick={() => loadSession(s)}
                      id={`chat-session-${s.id}`}
                    >
                      <div className={styles.sessionIcon}>
                        <span className="material-symbols-outlined">chat_bubble</span>
                      </div>
                      <div className={styles.sessionInfo}>
                        <div className={styles.sessionTitle}>{s.title}</div>
                        <div className={styles.sessionMeta}>
                          {s.lastMessage
                            ? s.lastMessage.slice(0, 40) + (s.lastMessage.length > 40 ? "…" : "")
                            : relTime(s.updatedAt)}
                        </div>
                      </div>
                      <button
                        className={styles.deleteSessionBtn}
                        onClick={e => deleteSession(s, e)}
                        aria-label="Delete session"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Model badge */}
            <div className={styles.modelBadge}>
              <span className="material-symbols-outlined">auto_awesome</span>
              Kimi K2 · Groq
            </div>
          </aside>

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />
          )}

          {/* ── Chat area ── */}
          <div className={styles.chatWrap}>
            {/* Chat topbar */}
            <div className={styles.chatTopbar}>
              <button
                className={styles.menuBtn}
                onClick={() => setSidebarOpen(o => !o)}
                id="chat-menu-btn"
                aria-label="Toggle history"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <div className={styles.chatTitle}>
                {activeSession ? activeSession.title : "New Chat"}
              </div>
              <button
                className={styles.newChatBtnTop}
                onClick={startNewChat}
                id="chat-new-top-btn"
                title="New Chat"
              >
                <span className="material-symbols-outlined">edit_square</span>
              </button>
            </div>

            {/* Messages */}
            <div className={styles.messages} id="fitbot-messages">
              {loadingHistory ? (
                <div className={styles.loadingHistory}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, color: "var(--primary)" }}>history</span>
                  <p>Loading conversation…</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isLastBot = msg.role === "bot" && i === messages.length - 1;
                  const isStreaming = isLastBot && streaming;
                  return (
                    <div key={i} className={`${styles.msgRow} ${msg.role === "user" ? styles.msgRowUser : ""}`}>
                      {msg.role === "bot" && (
                        <div className={`${styles.msgAvatar} ${isStreaming ? styles.msgAvatarStreaming : ""}`}>
                          <span className="material-symbols-outlined">smart_toy</span>
                        </div>
                      )}
                      <div className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : (isStreaming ? styles.bubbleBotStreaming : styles.bubbleBot)}`}>
                        {msg.text === "" && streaming && isLastBot ? (
                          <span className={styles.cursor} />
                        ) : (
                          <>
                            <div className={styles.bubbleText} dangerouslySetInnerHTML={{ __html: renderMd(msg.text) }} />
                            {isStreaming && <span className={styles.cursor} />}
                          </>
                        )}
                        {msg.ts && !isStreaming && <div className={styles.bubbleTs}>{msg.ts}</div>}
                      </div>
                    </div>
                  );
                })
              )}

              {streaming && messages[messages.length - 1]?.text === "" && (
                <div className={styles.msgRow}>
                  <div className={`${styles.msgAvatar} ${styles.msgAvatarStreaming}`}>
                    <span className="material-symbols-outlined">smart_toy</span>
                  </div>
                  <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typingBubble}`}>
                    <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Suggestion chips */}
            {messages.length <= 2 && !loadingHistory && (
              <div className={styles.chipRow}>
                {SUGGESTIONS.map(s => (
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

            {/* Input */}
            <div className={styles.inputWrap}>
              <div className={styles.inputBox}>
                <textarea
                  className={styles.textarea}
                  rows={1}
                  placeholder="Ask FitBot anything about your nutrition…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  disabled={streaming || loadingHistory}
                  id="fitbot-input"
                />
                <button
                  className={`${styles.sendBtn} ${input.trim() && !streaming ? styles.sendBtnActive : ""}`}
                  onClick={() => send()}
                  disabled={!input.trim() || streaming}
                  id="fitbot-send"
                >
                  {streaming
                    ? <span className={`material-symbols-outlined ${styles.spinIcon}`}>progress_activity</span>
                    : <span className="material-symbols-outlined">send</span>
                  }
                </button>
              </div>
              <div className={styles.inputHint}>Press Enter to send · Shift+Enter for new line · Conversations auto-saved</div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

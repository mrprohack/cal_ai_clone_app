# Cal AI Clone 🥗🔥

> **An AI-powered nutrition & fitness tracker** — log meals, track macros, chat with an AI coach, and monitor your progress. Built with Next.js 14, MySQL, and Groq.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![MySQL](https://img.shields.io/badge/MySQL-DB-blue?logo=mysql)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Groq](https://img.shields.io/badge/Groq-kimi--k2-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🍽️ **Meal Logger** | Log breakfast, lunch, dinner & snacks with calories + macros (protein, carbs, fat) |
| 📊 **Live Dashboard** | Animated dual-ring progress chart showing calorie & protein targets in real time |
| 🤖 **FitBot AI Coach** | Streaming AI chat powered by **Groq** (`kimi-k2-instruct`) on Edge Runtime |
| 📈 **Progress Tracker** | Daily macro snapshots, weight tracking, water intake & step count |
| 👤 **Profile & Goals** | Mifflin-St Jeor BMR calculator, personalised calorie/macro targets |
| 🔐 **Custom Auth** | Email/password sign-up & sign-in with bcrypt hashing, token-based sessions in MySQL |
| 🌙 **Dark Glassmorphism UI** | Premium dark theme with glassmorphism cards, animated blobs & smooth transitions |

---

## 🏗️ Architecture

```
cal_ai_clone/
├── web/                     ← Next.js 14 (App Router) web app
│   ├── app/
│   │   ├── dashboard/       ← Main dashboard with calorie rings
│   │   ├── log/             ← Meal logging page
│   │   ├── chat/            ← FitBot AI chat (streaming)
│   │   ├── progress/        ← Weight & macro trends
│   │   ├── profile/         ← User profile & goal settings
│   │   ├── login/           ← Sign-in page
│   │   ├── signup/          ← Registration page
│   │   └── api/chat/        ← Edge API route → Groq streaming
│   ├── components/          ← Shared UI components (Navbar, etc.)
│   └── lib/
│       ├── actions/         ← Next.js Server Actions (meals, users, etc.)
│       ├── db.ts            ← MySQL Database Connection
│       └── auth-context.tsx ← React auth context + useAuth() hook
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org) (App Router, Edge Runtime) |
| **Database & Backend** | MySQL — Relational database accessed via Next.js Server Actions |
| **Auth** | Custom email/password — bcrypt hashing, 64-char session tokens stored in MySQL |
| **AI / Chat** | [Groq](https://groq.com) API — `moonshotai/kimi-k2-instruct` model, streamed via SSE |
| **Language** | TypeScript 5 (strict) |
| **Styling** | Vanilla CSS Modules — dark glassmorphism design system |
| **Icons** | Google Material Symbols |
| **Fonts** | Space Grotesk & Barlow Condensed (Google Fonts) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- A MySQL Database
- A [Groq](https://console.groq.com) API key (free tier available)

### 1. Clone

```bash
git clone https://github.com/your-username/cal_ai_clone.git
cd cal_ai_clone/web
npm install
```

### 2. Configure environment variables

Create `web/.env.local`:

```env
# Database Credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=cal_ai_db

# Groq API key — powers FitBot AI chat
GROQ_API_KEY=gsk_...
```

### 3. Start the dev server

```bash
cd web
npm run dev          # http://localhost:3004
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | ✅ | MySQL Database Host |
| `DB_USER` | ✅ | MySQL Database User |
| `DB_PASSWORD` | ✅ | MySQL Database Password |
| `DB_DATABASE` | ✅ | MySQL Database Name |
| `GROQ_API_KEY` | ✅ | Groq API key for FitBot AI chat |

---

## 🗄️ Database Schema (MySQL)

| Table | Purpose |
|---|---|
| `users` | Account: name, email, bcrypt password hash, macro goals, body stats |
| `sessions` | Active login sessions: token (64-char hex) + expiry |
| `meals` | Meal log entries: name, type, calories, macros, date, AI-generated flag |
| `progress` | Daily snapshots: calories consumed, macros, weight, water, steps |

---

## 📡 API Routes

| Route | Method | Description |
|---|---|---|
| `/api/chat` | `POST` | Edge route — proxies messages to Groq, streams SSE back to client |

---

## 🤖 FitBot AI

FitBot is a nutrition coach powered by **Groq's `kimi-k2-instruct`** model running on Next.js **Edge Runtime** for ultra-low latency streaming.

- Messages stream in real time via **Server-Sent Events (SSE)**
- System prompt injects the user's daily calorie/macro context
- Responses are warm, concise, and science-backed
- Handles follow-ups naturally in a full conversation thread

---

## 🎨 UI Design

- **Dark glassmorphism** cards with `backdrop-filter: blur` and subtle borders
- **Animated gradient blobs** on auth & dashboard pages
- **SVG double-ring chart** — outer ring = calories, inner ring = protein
- **Colour system**: `--primary` blue `#3b96f5`, `--accent` green `#10e56b`
- **Smooth CSS transitions** on all interactive elements
- Fully **responsive** — optimised for mobile and desktop

---

## 🧪 Development Notes

- **TypeScript**: `strict` mode — zero `tsc --noEmit` errors
- **Server Actions**: All DB operations are handled through `lib/actions/` standard Next.js Server Actions.
- **Auth flow**: Token stored in `localStorage` → validated securely on both client (`useAuth()`) and server-side actions.
- **Demo account**: `demo@calai.app` / `Demo1234!`

---

## 📄 License

MIT © 2026

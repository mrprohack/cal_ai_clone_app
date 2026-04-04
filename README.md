# Cal AI Clone 🥗🔥

> **An AI-powered nutrition & fitness tracker** — log meals, track macros, chat with an AI coach, and monitor your progress. Built with Next.js 14 (static export), PHP 8, and Groq.

![Next.js](https://img.shields.io/badge/Next.js-14_Static_Export-black?logo=next.js)
![PHP](https://img.shields.io/badge/PHP-8.x_Backend-777bb4?logo=php)
![MySQL](https://img.shields.io/badge/MySQL-DB-blue?logo=mysql)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Groq](https://img.shields.io/badge/Groq-Llama_4_Vision-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🍽️ **AI Meal Scanner** | Snap a photo → Groq Llama 4 Vision identifies every ingredient, calorie & macro in <5s |
| 📊 **Live Dashboard** | Animated dual-ring progress chart showing calorie & protein targets in real time |
| 🤖 **FitBot AI Coach** | Streaming AI chat powered by **Groq** (`moonshotai/kimi-k2-instruct`) |
| 📈 **Progress Tracker** | Daily macro snapshots, calorie trends, weight tracking & achievements |
| 🗓️ **AI Meal Planner** | Generate, save & pin personalised 7-day meal plans |
| 📸 **Body Scan** | Weekly AI body photo analyser — compares side-by-side with previous week |
| 👤 **Profile & Goals** | Mifflin-St Jeor BMR calculator, personalised calorie/macro targets |
| 🔐 **Custom Auth** | Email/password with bcrypt hashing, 64-char session tokens in MySQL |
| 🌙 **Dark Glassmorphism UI** | Premium dark theme with glassmorphism cards & smooth transitions |

---

## 🏗️ Architecture

```
cal_ai_clone/
├── web/                        ← Next.js 14 App (static export)
│   ├── app/                    ← Pages (all client-side React)
│   ├── lib/
│   │   ├── phpApi.ts           ← PHP API client (replaces Server Actions)
│   │   └── auth-context.tsx    ← useAuth() hook (localStorage session)
│   ├── public/
│   │   └── api/                ← PHP API endpoints (served alongside static files)
│   │       ├── auth.php
│   │       ├── users.php
│   │       ├── meals.php
│   │       ├── progress.php
│   │       ├── foods.php
│   │       ├── mealPlans.php
│   │       ├── bodyPhotos.php
│   │       └── db.php          ← PDO MySQL connection
│   └── out/                    ← Static build output (git-ignored)
```

### How it works

```
Browser (Static HTML/JS/CSS)
  ↕  fetch('/api/meals.php?action=log')
PHP API (public/api/*.php) ← PDO → MySQL DB
  ↕
Groq AI (next.js Edge API routes for analysis)
```

- **Frontend:** 100% static — pre-rendered HTML/CSS/JS (`npm run build` → `out/`)
- **Backend:** Pure PHP scripts in `public/api/` — no Node.js, no PM2 in production
- **Auth:** Token in `localStorage` → sent as JSON body to `auth.php`
- **AI:** Next.js API routes (`/api/analyze-meal`, `/api/chat`, etc.) for Groq streaming

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | [Next.js 14](https://nextjs.org) — `output: 'export'` static site |
| **API Client** | `lib/phpApi.ts` — typed fetch() wrapper for all PHP endpoints |
| **Backend** | PHP 8.x — standalone scripts with PDO MySQL |
| **Database** | MySQL — `users`, `sessions`, `meals`, `progress`, `foods`, `bodyPhotos`, `mealPlans` |
| **Auth** | bcrypt password hash · 64-char hex session tokens in MySQL |
| **AI / Chat** | [Groq](https://groq.com) — Llama 4 Scout Vision + kimi-k2-instruct, streamed SSE |
| **Language** | TypeScript 5 (strict) + PHP 8 |
| **Styling** | Vanilla CSS Modules — dark glassmorphism |
| **Icons** | Google Material Symbols |
| **Fonts** | Space Grotesk & Barlow Condensed (Google Fonts) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 18
- PHP ≥ 8.0 (with PDO + pdo_mysql extension)
- A MySQL database
- A [Groq](https://console.groq.com) API key (free tier)

### 1. Clone & install

```bash
git clone https://github.com/mrprohack/cal_ai_clone_app.git
cd cal_ai_clone_app/web
npm install
```

### 2. Configure environment variables

Create `web/.env`:

```env
# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cal_ai_db
DB_USERNAME=root
DB_PASSWORD=your_password

# Groq AI
GROQ_API_KEY=gsk_...
```

> For local development with remote DB, use an SSH tunnel:
> ```bash
> ssh -N -L 3306:your-db-host:3306 your-ssh-alias
> ```

### 3. Build static files

```bash
cd web
npm run build        # outputs to web/out/
```

### 4. Serve locally (PHP + static)

```bash
# From project root
php -S 0.0.0.0:8080 -t web/out/
# Open http://localhost:8080
```

### 5. (Optional) Next.js dev server

For hot-reload development (features that use Next.js API routes for AI):
```bash
cd web && npm run dev    # http://localhost:3004
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | ✅ | MySQL host (`127.0.0.1` for tunnel) |
| `DB_PORT` | ✅ | MySQL port (default `3306`) |
| `DB_DATABASE` | ✅ | MySQL database name |
| `DB_USERNAME` | ✅ | MySQL username |
| `DB_PASSWORD` | ✅ | MySQL password |
| `GROQ_API_KEY` | ✅ | Groq API key for AI features |

---

## 🗄️ Database Schema (MySQL)

| Table | Purpose |
|---|---|
| `users` | Account: name, email, bcrypt password hash, macro goals, body stats, plan |
| `sessions` | Active login sessions: 64-char hex token + expiry |
| `meals` | Meal log entries: name, type, calories, macros, date, AI-generated flag |
| `progress` | Daily snapshots: calories, macros, weight, water, steps |
| `foods` | Quick-add food database (searchable) |
| `bodyPhotos` | Weekly check-in photos with AI body analysis |
| `mealPlans` | Saved & pinned AI-generated 7-day meal plans |

---

## 📡 PHP API Endpoints

All endpoints follow the pattern: `POST /api/{resource}.php?action={action}`

| PHP File | Actions |
|---|---|
| `auth.php` | `signUp`, `signIn`, `signOut`, `getSessionUser` |
| `users.php` | `getById`, `updateProfile`, `updatePlan`, `getUserPlan`, `deleteAccount` |
| `meals.php` | `log`, `byDate`, `remove`, `getRecent`, `range` |
| `progress.php` | `logWater`, `upsert`, `getDailyProgress`, `getStats`, `range`, `logWeight`, `getAchievements` |
| `foods.php` | `search`, `list` |
| `mealPlans.php` | `listPlans`, `savePlan`, `removePlan`, `togglePin` |
| `bodyPhotos.php` | `listPhotos`, `savePhoto`, `removePhoto` |

### AI API Routes (Next.js Edge)

| Route | Method | Description |
|---|---|---|
| `/api/analyze-meal` | `POST` | Groq Llama 4 Vision — identifies meal macros from photo |
| `/api/analyze-body` | `POST` | Groq Llama 4 Vision — body composition analysis |
| `/api/meal-plan` | `POST` | Groq — generates personalised 7-day meal plan |
| `/api/chat` | `POST` | Groq kimi-k2 — FitBot streaming AI chat |

---

## 🌐 Production Deployment (Hostinger)

No Node.js or PM2 required in production.

```bash
# 1. Build static files locally
cd web && npm run build

# 2. Upload web/out/ to Hostinger public_html/
# (drag & drop via hPanel File Manager, or rsync)
rsync -avz web/out/ user@host:/home/u697986122/domains/site.com/public_html/

# 3. Apache serves static HTML + PHP API — done ✅
```

The PHP files in `out/api/` are executed by Apache/PHP directly. No proxying needed.

---

## 🎨 UI Design

- **Dark glassmorphism** cards with `backdrop-filter: blur` and subtle borders
- **Animated gradient blobs** on hero and auth pages
- **SVG dual-ring chart** — outer = calories, inner = protein
- **Colour system**: `--primary` blue `#3b96f5`, `--accent-green` `#10e56b`, `--accent-purple` `#8b5cf6`
- **Smooth CSS transitions** on all interactive elements
- Fully **responsive** — mobile bottom nav + desktop top nav

---

## 🧪 Development Notes

- **TypeScript strict** — `npx tsc --noEmit` must return zero errors
- **Static export** — all pages are `"use client"` with no server dependencies
- **phpApi.ts** — single source of truth for all backend calls (typed, namespaced)
- **Demo account:** `demo@calai.app` / `Demo1234!`

---

## 📄 License

MIT © 2026

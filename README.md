# Cal AI Clone 🏋️‍♂️

AI-powered fitness & calorie tracking app — web + mobile.

> 🤖 **Working with an AI Coding Assistant?** Please point them to the [`agent.md`](./agent.md) file first for repository rules and context!

## Architecture

```text
cal_ai_clone/
├── convex/          ← Backend: Convex DB + serverless functions + AI actions
├── mobile/          ← React Native (Expo) app for iOS + Android
└── web/             ← Next.js 14 web app
```

## Tech Stack

| Layer | Tech |
| --- | --- |
| Backend | Convex (TypeScript functions + Go-powered AI actions) |
| Mobile | Expo (React Native) |
| Web | Next.js 14 (App Router) |
| Auth | Clerk |
| AI | OpenAI GPT-4o Vision + Chat |

## AI Features

- 🍽️ **Food scan** — take a photo of any meal, GPT-4o returns calories + macros instantly
- 📸 **Weekly photo diff** — submits a weekly progress photo, AI compares it to last week
- 🤖 **FitBot** — AI assistant that ONLY answers fitness/nutrition questions (non-fitness questions are politely redirected)
- 🧮 **Auto calorie targets** — server-side Mifflin-St Jeor BMR calculator

## Quick Start

### 1. Set up Convex

```bash
cd convex
npx convex dev
# Follow prompts to create project + login
```

### 2. Set up environment variables

**Web (`web/.env.local`):**

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Mobile (`mobile/.env`):**

```env
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**Convex dashboard environment variables:**

```env
OPENAI_API_KEY=sk-...
```

### 3. Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

### 4. Run the web app

```bash
cd web
npm install
npm run dev
```

## Keys You Need

| Service | Get it at |
| --- | --- |
| OpenAI API Key | [platform.openai.com](https://platform.openai.com) |
| Clerk keys | [clerk.com](https://clerk.com) |
| Convex deployment | Auto-created by `npx convex dev` |

## Database Collections (Convex)

| Collection | Purpose |
| --- | --- |
| `users` | Profile, goals, calorie/protein targets |
| `meals` | Individual meal logs with foods + macros |
| `dailySummaries` | Aggregated daily totals (auto-calculated) |
| `weeklyCheckIns` | Progress photos + AI analysis |
| `chatMessages` | FitBot conversation history |

# Cal AI Clone — AI Agent Instructions

This document provides instructions and context for AI coding assistants working in this repository. Read this before making architectural changes or scaffolding new features.

## 🎯 Project Overview

This project is a clone of the "Cal AI" fitness and calorie tracking application. It features a unified serverless backend, a cross-platform mobile app, and a responsive web dashboard. The core value of the application relies on AI features (vision and chat) to provide a seamless tracking experience.

## 🛠️ Technology Stack

- **Backend & Database:** [Convex](https://convex.dev/) (Serverless TypeScript functions, real-time database, background actions)
- **Mobile Frontend:** React Native via [Expo](https://expo.dev/) (Using Expo Router)
- **Web Frontend:** [Next.js 14](https://nextjs.org/) (App Router, React server/client components)
- **Authentication:** [Clerk](https://clerk.com/) (Next.js and Expo integration)
- **AI Integrations:** OpenAI GPT-4o (Vision for photos, Chat for FitBot)

## 📁 Repository Structure

The repository is structured as a monorepo with three main workspaces:

```text
cal_ai_clone/
├── convex/          # The Convex backend (Schema, API definitions)
│   ├── schema.ts    # Centralized database schema
│   ├── meals.ts     # Meal/Food functions and AI Actions
│   ├── checkins.ts  # Progress photo functions and AI Actions
│   ├── chat.ts      # FitBot chat completion logic
│   └── ...
├── mobile/          # Expo React Native App
│   ├── app/         # Expo Router structure (tabs, screens)
│   ├── lib/         # Shared utilities, Convex configuration, Theme tokens
│   └── ...
└── web/             # Next.js Web App
    ├── app/         # Next.js App Router structure (pages, layouts)
    ├── components/  # React components
    └── convex/      # API stubs and types for development without running convex dev
```

## 🧠 Core Data Architecture (Convex)

Data lives in Convex and is automatically synced to clients in real-time.
- `users`: Stores user profiles, height, weight, daily goals (Calorie & Protein targets calculated via Mifflin-St Jeor equation).
- `meals`: Records of food logged, including the image (via Convex storage) and the nutritional breakdown (Calories, Macros) provided by AI.
- `dailySummaries`: Aggregated records of a user's daily totals. Important: this table automatically updates via mutations whenever a meal is added or deleted.
- `weeklyCheckIns`: Progress photos and AI-generated analysis diffing the current week against the previous week.
- `chatMessages`: Conversation history for the "FitBot" AI assistant.

## 🤖 AI Action Guidelines

1. **Server-Side Execution:** All AI interactions MUST happen securely on the backend (`convex/` directory) using Convex `action`s. Do not use the OpenAI API key on the frontend (web or mobile).
2. **GPT-4o Vision:** Meal scanning and progress photo diffing use GPT-4o's vision capabilities. Images must be passed using storage URLs handled by Convex.
3. **FitBot Guardrails:** The fitness chatbot (`chat.ts`) has strict system prompts. It MUST actively refuse to answer non-fitness/nutrition queries.

## 💻 Development Conventions

1. **Styling:**
   - **Mobile:** Uses React Native `StyleSheet` with design tokens imported from `lib/theme.ts`. The app enforces a premium "Dark Theme" globally.
   - **Web:** Uses CSS Modules (`.module.css`) and global CSS variables (`globals.css`). Enforces the same Dark Theme. Do not introduce Tailwind unless specifically requested.
2. **Convex Client Providers:**
   - Both Web and Mobile handles Convex connection gracefully even if `CONVEX_URL` is omitted (for local styling without internet/keys). Ensure code handles `undefined` returned from `useQuery`.
3. **Next.js `api.ts` Type Stubs:**
   - Next.js Web uses `web/convex/_generated/api.ts` with `makeFunctionReference`. This prevents build issues when the Convex server is offline. Avoid using `anyApi` in `api.ts` as it triggers a Next.js webpack infinite loop.
4. **Code Quality:**
   - Prefer React functional components and hooks.
   - Use TypeScript strictly.

## 🚀 Running the App

- Convex: `cd convex && npx convex dev` (Generates API types and deploys).
- Next.js Web: `cd web && npm run dev`.
- Expo Mobile: `cd mobile && npx expo start`.

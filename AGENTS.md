# Cal AI — Agent Quick Reference
> Full rules: `.agents/AGENT.md` — read that before any task.

---

## ⚠️ MANDATORY: Update AGENT.md on Every File Change

**Whenever you add, delete, rename, or significantly modify any file you MUST, before marking the task complete:**

1. Update the **file tree** in `.agents/AGENT.md` § 4 (add/remove the entry with a description comment).
2. Update the **relevant table** in `.agents/AGENT.md` (§ 5 schema, § 6 PHP API, § 7 Next.js routes, § 11 Navbar, § 15 env vars).
3. Update the **Page Map** or **PHP API Endpoints** table in this file (`AGENTS.md`) if the change affects routes or API.
4. Update the **Last audited** date in `.agents/AGENT.md`.

> See `.agents/AGENT.md` § 0 for the full lookup table of what to update per change type.

---

## TL;DR
- **Type:** SaaS product
- **Focus:** `web/` directory only (Next.js 14 static export)
- **Backend:** PHP 8 scripts in `web/public/api/` — no Node.js server in production
- **API Client:** `web/lib/phpApi.ts` — typed fetch() wrapper for all PHP endpoints
- **DB:** MySQL via PDO (`web/public/api/db.php`)
- **AI:** Groq Llama 4 Vision via Next.js `/api/analyze-meal` + `/api/chat`
- **Auth:** Custom session tokens (localStorage) — no Clerk
- **Styles:** Vanilla CSS Modules — no Tailwind
- **Dev server:** `http://localhost:3004` (`cd web && npm run dev`)
- **Static build:** `cd web && npm run build` → `web/out/`
- **Local full-stack:** `php -S 0.0.0.0:8080 -t web/out/`
- **Type check:** `cd web && npx tsc --noEmit`

### 🔑 Test Credentials
- **Email:** `demo@calai.app`
- **Password:** `Demo1234!`

---

## Page Map
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/login` | `app/login/page.tsx` | Login |
| `/signup` | `app/signup/page.tsx` | Sign up |
| `/onboarding` | `app/onboarding/page.tsx` | Post-signup profile setup |
| `/dashboard` | `app/dashboard/page.tsx` | Today's overview |
| `/log` | `app/log/page.tsx` | AI meal scanning + food log |
| `/progress` | `app/progress/page.tsx` | Charts & trends |
| `/body-scan` | `app/body-scan/page.tsx` | Weekly AI body photo analyzer |
| `/meal-plan` | `app/meal-plan/page.tsx` | AI 7-day meal planner |
| `/plans` | `app/plans/page.tsx` | Free / Pro / Ultra pricing |
| `/profile` | `app/profile/page.tsx` | Goals, account, premium |
| `/chat` | `app/chat/page.tsx` | FitBot AI coach |

---

## DB Tables (MySQL via PDO in `public/api/db.php`)
`users` · `sessions` · `meals` · `progress` · `foods` · `bodyPhotos` · `mealPlans`

---

## PHP API Endpoints (`public/api/*.php`)
All use `POST /api/{file}.php?action={action}` pattern.

| File | Actions |
|------|---------|
| `auth.php` | signUp, signIn, signOut, getSessionUser |
| `users.php` | getById, updateProfile, updatePlan, getUserPlan, deleteAccount, exportData |
| `meals.php` | log, byDate, remove, getTodayMeals, getRecent, range |
| `progress.php` | logWater, upsert, getDailyProgress, getStats, range, logWeight, getAchievements |
| `foods.php` | search, list |
| `bodyPhotos.php` | listPhotos, savePhoto, removePhoto |
| `mealPlans.php` | listPlans, savePlan, removePlan, togglePin |

## Next.js AI Routes (Edge, remain server-side)
| Route | Purpose |
|-------|---------|
| `/api/analyze-meal` | Groq Llama 4 Vision — meal photo → macros |
| `/api/analyze-body` | Groq Llama 4 Vision — body photo analysis |
| `/api/meal-plan` | Groq — AI 7-day meal plan generation |
| `/api/chat` | Groq kimi-k2 — FitBot streaming chat |

---

## Plans
`free` (default) · `pro` ($9/mo) · `ultra` ($19/mo)  
Change via: `Users.updatePlan(userId, plan)` in `phpApi.ts`

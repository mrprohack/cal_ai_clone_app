# Cal AI — Agent Quick Reference
> Full rules: `.agents/AGENT.md` — read that before any task.

---

## ⚠️ MANDATORY: Update AGENT.md on Every File Change

**Whenever you add, delete, rename, or significantly modify any file you MUST, before marking the task complete:**

1. Update the **file tree** in `.agents/AGENT.md` § 4 (add/remove the entry with a description comment).
2. Update the **relevant table** in `.agents/AGENT.md` (§ 5 schema, § 6 Convex functions, § 7 API routes, § 11 Navbar, § 15 env vars).
3. Update the **Page Map** or **Key Convex Modules** table in this file (`AGENTS.md`) if the change affects routes or Convex modules.
4. Update the **Last audited** date in `.agents/AGENT.md` § 18.

> See `.agents/AGENT.md` § 0 for the full lookup table of what to update per change type.

---

## TL;DR
- **Focus:** `web/` directory only (Next.js 14 app)
- **DB/Backend:** `web/convex/` — Convex real-time database
- **AI:** Groq Llama 4 Vision via `/api/analyze-meal`
- **Auth:** Custom session tokens (localStorage) — no Clerk
- **Styles:** Vanilla CSS Modules — no Tailwind
- **Dev server:** `http://localhost:3004` (`cd web && npm run dev`)
- **Type check:** `cd web && npx tsc --noEmit`

## Page Map
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/login` | `app/login/page.tsx` | Login |
| `/signup` | `app/signup/page.tsx` | Sign up |
| `/dashboard` | `app/dashboard/page.tsx` | Today's overview |
| `/log` | `app/log/page.tsx` | AI meal scanning + food log |
| `/progress` | `app/progress/page.tsx` | Charts & trends |
| `/plans` | `app/plans/page.tsx` | Free / Pro / Ultra pricing |
| `/profile` | `app/profile/page.tsx` | Goals, account, premium |
| `/chat` | `app/chat/page.tsx` | FitBot AI coach |

## DB Tables (web/convex/schema.ts)
`users` · `sessions` · `meals` · `progress`

## Key Convex Modules
| File | Exports |
|------|---------|
| `convex/auth.ts` | signUp, signIn, signOut, getSessionUser |
| `convex/users.ts` | getById, updateProfile, updatePlan, getUserPlan |
| `convex/meals.ts` | log, byDate, remove, getTodayMeals |
| `convex/progress.ts` | progress CRUD |

## Plans
`free` (default) · `pro` ($9/mo) · `ultra` ($19/mo)  
Change via: `users.updatePlan({ userId, plan })`

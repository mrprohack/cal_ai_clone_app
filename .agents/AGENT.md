# Cal AI Web — Agent Rules
# ─────────────────────────────────────────────────────────────────────────────
# This file defines the rules, conventions, architecture, and context that every
# AI agent working on this project MUST follow. Read this fully before touching
# any file.
# ─────────────────────────────────────────────────────────────────────────────

---

## 0. ⚠️ AGENT.md SELF-MAINTENANCE RULE (MANDATORY)

> **Every time you add, delete, rename, or significantly modify any file in this project you MUST update BOTH of the following files before reporting the task as complete:**
>
> 1. `.agents/AGENT.md` — full agent rules (this file)
> 2. `AGENTS.md` — top-level quick reference

### What to update

| Change type | What to update in AGENT.md |
| ------------- | ---------------------------- |
| New page added (`app/*/page.tsx`) | § 4 file tree + § 17 priority list; add row to § 4 tree |
| New CSS module added | § 4 file tree (add next to its page) |
| New Convex function/file | § 4 file tree + § 6 backend functions table |
| New API route | § 4 file tree + § 7 API routes section |
| New component | § 4 file tree (`components/` block) |
| New lib/utility file | § 4 file tree (`lib/` block) |
| DB schema change | § 5 database schema tables |
| New env variable | § 15 environment variables table |
| New nav item | § 11 Navbar routes table |
| File deleted / renamed | § 4 file tree (remove/rename the entry) |

### Update format

For each new file added to the tree, use this format:

```text
│   ├── filename.ext        # Short description — route or purpose
```


### Also update `AGENTS.md`

If you add a new page route, update the **Page Map** table in `AGENTS.md`.  
If you add a new Convex module or function, update the **Key Convex Modules** table.

---

## 1. PROJECT IDENTITY

**Name:** Cal AI  
**Type:** AI-powered nutrition & calorie tracking web application  
**Stack:** Next.js 14 · Convex (backend/DB) · Groq Llama 4 Vision (AI) · Vanilla CSS Modules  
**Root directory (web):** `/home/mrpro/mygit/cal_ai_clone/web/`  
**Dev server:** `http://localhost:3004`  
**Start command:** `cd web && npm run dev`

---

## 2. SCOPE — WEB ONLY

> **RULE:** This agent manages ONLY the `web/` directory.  
> Do NOT touch `mobile/`, `convex/` (root), or any other sibling directories.  
> The web app has its own Convex deployment at `web/convex/`.

---

## 3. TECH STACK (exact versions)

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.2.5 | App router framework |
| `react` / `react-dom` | ^18.3.1 | UI library |
| `convex` | ^1.12.0 | Real-time database + backend functions |
| `groq-sdk` | ^1.1.1 | AI meal analysis (Llama 4 Scout Vision) |
| `openai` | ^4.47.0 | Fallback / FitBot chat |
| `typescript` | ^5 | Static typing |

**UI:** Vanilla CSS Modules — no TailwindCSS, no styled-components, no inline styles unless dynamic (e.g. plan color variables).  
**Icons:** Material Symbols Outlined (loaded via Google Fonts CDN in layout.tsx).  
**Fonts:** Space Grotesk (body) + Barlow Condensed (headings via `--font-heading` variable).

---

## 4. DIRECTORY & FILE TREE

```
web/
├── app/
│   ├── layout.tsx                  # Root layout — fonts, Convex provider, Navbar
│   ├── globals.css                 # Design tokens (CSS variables), resets, animations
│   ├── page.tsx                    # Landing / home page  (route: /)
│   ├── page.module.css
│   │
│   ├── login/
│   │   ├── page.tsx                # Login form (route: /login)
│   │   └── auth.module.css
│   │
│   ├── signup/
│   │   └── page.tsx                # Sign-up form (route: /signup)
│   │
│   ├── dashboard/
│   │   ├── page.tsx                # Today overview (route: /dashboard)
│   │   └── Dashboard.module.css
│   │
│   ├── log/
│   │   ├── page.tsx                # Log your meal — AI scan + meal list (route: /log)
│   │   └── Log.module.css
│   │
│   ├── progress/
│   │   ├── page.tsx                # Progress charts (route: /progress)
│   │   └── Progress.module.css
│   │
│   ├── plans/
│   │   ├── page.tsx                # Pricing — Free / Pro / Ultra (route: /plans)
│   │   └── Plans.module.css
│   │
│   ├── profile/
│   │   ├── page.tsx                # User profile + goals + premium tab (route: /profile)
│   │   └── Profile.module.css
│   │
│   ├── chat/
│   │   ├── page.tsx                # FitBot AI chat (route: /chat)
│   │   └── Chat.module.css
│   │
│   ├── api/
│   │   ├── analyze-meal/
│   │   │   └── route.ts            # POST /api/analyze-meal — Groq vision analysis
│   │   └── chat/
│   │       └── route.ts            # POST /api/chat — FitBot streaming chat
│   │
│   └── ConvexClientProvider.tsx    # Wraps the app in <ConvexProvider>
│
├── components/
│   ├── Navbar.tsx                  # Top navigation (shared across all pages)
│   └── Navbar.module.css
│
├── convex/                         # ← WEB APP'S OWN CONVEX BACKEND
│   ├── schema.ts                   # Database schema (source of truth)
│   ├── auth.ts                     # signUp / signIn / signOut / getSessionUser
│   ├── users.ts                    # getMe / getById / updateProfile / updatePlan / getUserPlan
│   ├── meals.ts                    # log / byDate / remove / getTodayMeals
│   ├── daily.ts                    # Daily summary helpers
│   ├── progress.ts                 # Progress snapshots
│   ├── seed.ts                     # Dev seed data
│   └── _generated/                 # AUTO-GENERATED — never edit manually
│
└── lib/
    └── auth-context.tsx            # useAuth() hook — session token in localStorage
```

---

## 5. DATABASE SCHEMA (web/convex/schema.ts)

### `users` table
| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Display name |
| `email` | string | Unique, indexed |
| `passwordHash` | string | bcrypt — never expose to client |
| `avatarUrl` | string? | Profile picture URL |
| `calorieGoal` | number | kcal/day |
| `proteinGoal` | number | g/day |
| `carbsGoal` | number | g/day |
| `fatGoal` | number | g/day |
| `gender` | string? | "male" / "female" / "other" |
| `ageYears` | number? | |
| `heightCm` | number? | |
| `weightKg` | number? | |
| `createdAt` | number | Unix ms |
| `plan` | "free"/"pro"/"ultra"? | Subscription plan |
| `planActivatedAt` | number? | Unix ms |
| `planExpiresAt` | number? | Unix ms (undefined = never) |

Index: `by_email`

### `sessions` table
| Field | Type | Notes |
|-------|------|-------|
| `userId` | Id<"users"> | |
| `token` | string | 64-char hex, stored in localStorage |
| `expiresAt` | number | Unix ms |
| `createdAt` | number | Unix ms |

Indexes: `by_token`, `by_user`

### `meals` table
| Field | Type | Notes |
|-------|------|-------|
| `userId` | Id<"users"> | |
| `name` | string | Food name |
| `mealType` | string | "breakfast"/"lunch"/"dinner"/"snack" |
| `calories` | number | kcal |
| `proteinG` | number | grams |
| `carbsG` | number | grams |
| `fatG` | number | grams |
| `servingSize` | string? | e.g. "1 plate (~320g)" |
| `date` | string | ISO: "2026-03-20" |
| `loggedAt` | number | Unix ms |
| `aiGenerated` | boolean? | true if from AI scan |

Indexes: `by_user_date`, `by_user`

### `progress` table
| Field | Type | Notes |
|-------|------|-------|
| `userId` | Id<"users"> | |
| `date` | string | ISO date |
| `weightKg` | number? | |
| `caloriesConsumed` | number | |
| `proteinConsumed` | number | |
| `carbsConsumed` | number | |
| `fatConsumed` | number | |
| `waterMl` | number? | |
| `steps` | number? | |
| `recordedAt` | number | Unix ms |

Indexes: `by_user_date`, `by_user`

---

## 6. CONVEX BACKEND FUNCTIONS

### Auth (`convex/auth.ts`)
| Function | Type | Description |
|----------|------|-------------|
| `auth.getSessionUser` | query | Get current user from session token |
| `auth.signUp` | action | Create user + session, returns `{ token }` |
| `auth.signIn` | action | Verify password + create session, returns `{ token }` |
| `auth.signOut` | action | Delete session |

### Users (`convex/users.ts`)
| Function | Type | Description |
|----------|------|-------------|
| `users.getMe` | query | Returns null (stub — session auth via `auth.getSessionUser`) |
| `users.getById` | query | Get user by ID (no passwordHash) |
| `users.updateProfile` | mutation | Patch profile fields |
| `users.updatePlan` | mutation | Set plan: "free"/"pro"/"ultra" |
| `users.getUserPlan` | query | Get `{ plan, planActivatedAt, planExpiresAt }` |

### Meals (`convex/meals.ts`)
| Function | Type | Description |
|----------|------|-------------|
| `meals.log` | mutation | Insert a meal entry |
| `meals.byDate` | query | Get meals for userId + date |
| `meals.remove` | mutation | Delete a meal by ID |
| `meals.getTodayMeals` | query | Get all meals for a date (all users) |

### Progress (`convex/progress.ts`)
| Function | Type | Description |
|----------|------|-------------|
| See progress.ts | — | Progress snapshot CRUD |

---

## 7. API ROUTES

### `POST /api/analyze-meal`
- **Runtime:** Node.js
- **AI:** Groq `meta-llama/llama-4-scout-17b-16e-instruct` (vision)
- **Input:** `FormData` with `image` field (base64 or blob)
- **Output:** JSON `{ name, confidence, servingSize, calories, proteinG, carbsG, fatG, notes }`
- **Key:** `GROQ_API_KEY` env variable

### `POST /api/chat`
- **AI:** Groq / OpenAI streaming
- **Input:** `{ messages: ChatMessage[] }`
- **Output:** Stream of text chunks (FitBot responses)

---

## 8. AUTH PATTERN

The web app uses **custom session-based auth** — NOT Clerk, NOT NextAuth.

```
User → signUp/signIn action
     → bcrypt hash in Action (Node env)
     → creates session {token: 64-char hex}
     → token stored in localStorage (key: "calai_session")
     → AuthProvider queries getSessionUser({token}) reactively
     → user object available via useAuth() across all pages
```

**Never** use Clerk or any external auth provider.  
**Never** store raw passwords.  
**Always** pass `userId` (from `useAuth().user._id`) explicitly to mutations that need it.

---

## 9. FRONTEND PATTERNS

### Getting user + plan
```tsx
const { user, loading } = useAuth();
const userId = user?._id ? (user._id as unknown as Id<"users">) : null;
const planInfo = useQuery(api.users.getUserPlan, userId ? { userId } : "skip");
```

### Calling a mutation
```tsx
const doUpdate = useMutation(api.users.updateProfile);
await doUpdate({ userId: user._id as Id<"users">, calorieGoal: 2000 });
```

### Import alias
The `@/` alias resolves to `web/` root. Always use `@/convex/_generated/api` not relative paths.

---

## 10. DESIGN SYSTEM

### CSS Variables (defined in globals.css)
```
--bg                  Dark page background
--surface             Card background
--surface-elevated    Elevated card / input background
--border              Subtle divider
--text                Primary text
--text-secondary      Muted text
--text-muted          Very muted text
--primary             #3b96f5 (blue)
--primary-light       Lighter blue
--accent-green        #10e56b
--accent-purple       #8b5cf6
--accent-yellow       #fbbf24
--fat                 Fat macro color
--radius-sm/md/lg/xl  Border radius tokens
--ease-out            Easing curve
--ease-spring         Spring easing
--font-heading        Barlow Condensed (uppercase, athletic)
```

### Component conventions
- Every page has its own `Page.module.css` file — no global CSS in page files
- Use `fadeInUp` animation for page sections (defined in globals.css)
- All interactive elements must have `id` attributes for testing
- Touch targets ≥ 44×44px on mobile
- Material Symbols icons: always `<span className="material-symbols-outlined">{icon_name}</span>`

### Plan color palette
| Plan | Color | Glow |
|------|-------|------|
| Free | `#4d6075` | `rgba(77,96,117,0.3)` |
| Pro | `#3b96f5` | `rgba(59,150,245,0.35)` |
| Ultra | `#a855f7` | `rgba(168,85,247,0.35)` |

---

## 11. NAVBAR

**File:** `web/components/Navbar.tsx`  
**Routes (in order):**

| Label | Route | Icon |
|-------|-------|------|
| Today | `/dashboard` | `home` |
| Log | `/log` | `restaurant` |
| Progress | `/progress` | `trending_up` |
| Plans | `/plans` | `workspace_premium` |
| FitBot | `/chat` | `smart_toy` |
| Profile | `/profile` | `person` |

Right CTA: "Log Meal" → `/log`

---

## 12. PLANS / SUBSCRIPTION

Three tiers, stored in `users.plan`:

| Plan | Price | Key limits |
|------|-------|-----------|
| `free` | $0 | 5 AI scans/day, 7-day history, 10 FitBot msgs/day |
| `pro` | $9/mo | Unlimited scans, full analytics, export |
| `ultra` | $19/mo | Everything Pro + body scan, meal planning, priority AI |

**Changing plan:** Call `users.updatePlan({ userId, plan })`.  
**Reading plan:** Call `users.getUserPlan({ userId })` — returns `{ plan, planActivatedAt, planExpiresAt }`.

---

## 13. AI MEAL ANALYSIS FLOW

```
User taps "Scan Meal" on /log
  → file input opens → image selected
  → image converted to base64
  → POST /api/analyze-meal with FormData
  → Groq Llama 4 Vision analyzes image
  → Returns JSON: { name, confidence, servingSize, calories, proteinG, carbsG, fatG }
  → UI shows result card
  → User taps "Log This Meal"
  → calls meals.log() mutation → saved to Convex
```

---

## 14. CODING RULES

1. **TypeScript only.** No `.js` files in `app/` or `components/`.
2. **"use client"** at the top of any component using hooks, browser APIs, or event handlers.
3. **Never edit `_generated/`** — these files are auto-generated by Convex CLI.
4. **Run `npx tsc --noEmit` after every change** to verify zero TypeScript errors.
5. **CSS Modules only.** Never use global class names in `.module.css` files.
6. **No `any` casts** unless bridging stale Convex generated types (and add a TODO comment).
7. **Accessibility:** All buttons need `aria-label` if icon-only. All interactive lists need `role`.
8. **Animations:** Always include `@media (prefers-reduced-motion: reduce)` override for any `@keyframes`.
9. **Error states:** All async operations must handle loading, success, and error states in the UI.
10. **IDs:** Every interactive element needs a unique `id` attribute (format: `page-component-action`).

---

## 15. ENVIRONMENT VARIABLES

| Variable | Used in | Purpose |
|----------|---------|---------|
| `GROQ_API_KEY` | `app/api/analyze-meal/route.ts`, `app/api/chat/route.ts` | Groq AI API key |
| `NEXT_PUBLIC_CONVEX_URL` | `app/ConvexClientProvider.tsx` | Convex deployment URL |

---

## 16. RUNNING THE PROJECT

```bash
# Start web dev server (already running on port 3004)
cd web && npm run dev

# Type-check
cd web && npx tsc --noEmit

# Convex dev (syncs schema + generates types)
cd web && npx convex dev

# Build for production
cd web && npm run build
```

---

## 17. WHAT THIS AGENT SHOULD PRIORITIZE

When given a task, the agent should:

1. **Read this file first** to understand context.
2. **Check existing pages** before creating new ones — avoid duplication.
3. **Always update the DB schema** if adding new data fields (`web/convex/schema.ts`).
4. **Always add the corresponding Convex function** in the right module file.
5. **Keep the Navbar updated** when adding new routes.
6. **Run TypeScript check** before reporting completion.
7. **Use the existing design system** — CSS variables, Material Symbols icons, CSS Modules.
8. **Never hardcode data** — always connect to Convex queries/mutations.
9. **Test in browser** after implementation by screenshotting key flows.
10. **Maintain the premium UX standard** — dark theme, smooth animations, glassmorphism cards.
11. **⚠️ UPDATE AGENT.md + AGENTS.md** — after ANY file addition, deletion, or rename, update § 4 file tree, relevant tables in this file, AND the Page Map / Convex Modules tables in `AGENTS.md`. This is non-negotiable. See § 0 for the full rule.

---

## 18. AGENT.md CURRENT FILE TREE CHECKLIST

Use this as a quick audit checklist. Every file in `web/` (excluding `_generated/` and `node_modules/`) should appear in § 4.

```
web/
├── app/
│   ├── layout.tsx                  # Root layout — fonts, Convex provider, Navbar
│   ├── globals.css                 # Design tokens (CSS variables), resets, animations
│   ├── page.tsx                    # Landing / home page  (route: /)
│   ├── page.module.css
│   │
│   ├── ConvexClientProvider.tsx    # Wraps the app in <ConvexProvider>
│   │
│   ├── login/
│   │   ├── page.tsx                # Login form (route: /login)
│   │   └── auth.module.css
│   │
│   ├── signup/
│   │   └── page.tsx                # Sign-up form (route: /signup)
│   │
│   ├── dashboard/
│   │   ├── page.tsx                # Today overview (route: /dashboard)
│   │   └── Dashboard.module.css
│   │
│   ├── log/
│   │   ├── page.tsx                # Log your meal — AI scan + meal list (route: /log)
│   │   └── Log.module.css
│   │
│   ├── progress/
│   │   ├── page.tsx                # Progress charts (route: /progress)
│   │   └── Progress.module.css
│   │
│   ├── plans/
│   │   ├── page.tsx                # Pricing — Free / Pro / Ultra (route: /plans)
│   │   └── Plans.module.css
│   │
│   ├── profile/
│   │   ├── page.tsx                # User profile + goals + premium tab (route: /profile)
│   │   └── Profile.module.css
│   │
│   ├── chat/
│   │   ├── page.tsx                # FitBot AI chat (route: /chat)
│   │   └── Chat.module.css
│   │
│   └── api/
│       ├── analyze-meal/
│       │   └── route.ts            # POST /api/analyze-meal — Groq vision analysis
│       └── chat/
│           └── route.ts            # POST /api/chat — FitBot streaming chat
│
├── components/
│   ├── Navbar.tsx                  # Top navigation (shared across all pages)
│   └── Navbar.module.css
│
├── convex/                         # ← WEB APP'S OWN CONVEX BACKEND
│   ├── schema.ts                   # Database schema (source of truth)
│   ├── auth.ts                     # signUp / signIn / signOut / getSessionUser
│   ├── users.ts                    # getMe / getById / updateProfile / updatePlan / getUserPlan
│   ├── meals.ts                    # log / byDate / remove / getTodayMeals
│   ├── daily.ts                    # Daily summary helpers
│   ├── progress.ts                 # Progress snapshots
│   ├── seed.ts                     # Dev seed data
│   └── _generated/                 # AUTO-GENERATED — never edit manually
│
└── lib/
    └── auth-context.tsx            # useAuth() hook — session token in localStorage
```

> **Last audited:** 2026-03-20 · All files accounted for. Update this date whenever you audit the tree.

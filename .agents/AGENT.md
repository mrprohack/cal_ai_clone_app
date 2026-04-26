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
| New PHP API endpoint | § 4 file tree + § 6 PHP API table |
| New Next.js API route | § 4 file tree + § 7 Next.js routes section |
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
If you add/modify a PHP API endpoint, update the **PHP API Endpoints** table.

---

## 1. PROJECT IDENTITY

**Name:** Cal AI  
**Type:** AI-powered nutrition & calorie tracking SaaS  
**Stack:** Next.js 14 (static export) · PHP 8 API · MySQL (via PDO) · Groq AI · Vanilla CSS Modules  
**Root directory (web):** `/home/mrpro/mygit/cal_ai_clone/web/`  
**Dev server:** `http://localhost:3004` (Next.js hot-reload)  
**Local full-stack:** `php -S 0.0.0.0:8080 -t web/out/` (PHP serves static + API)  
**Start command:** `cd web && npm run dev`  
**Build command:** `cd web && npm run build` → outputs `web/out/`

---

## 2. SCOPE — WEB ONLY

> **RULE:** This agent manages ONLY the `web/` directory.  
> Do NOT touch `mobile/` or any other sibling directories.  
> The web app uses PHP API endpoints in `web/public/api/` — NOT Next.js Server Actions.  
> All frontend→backend calls go through `web/lib/phpApi.ts`.

---

## 3. TECH STACK (exact versions)

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 14.2.5 | Static export framework (`output: 'export'`) |
| `react` / `react-dom` | ^18.3.1 | UI library |
| `groq-sdk` | ^1.1.1 | AI meal analysis (Llama 4 Scout Vision) |
| `typescript` | ^5 | Static typing |
| PHP | ^8.0 | Backend API (PDO + pdo_mysql) |

**Backend pattern:** `POST /api/{resource}.php?action={action}` — JSON in, JSON out.  
**API client:** `lib/phpApi.ts` — namespaced exports: `Auth`, `Users`, `Meals`, `Progress`.  
**UI:** Vanilla CSS Modules — no TailwindCSS, no styled-components.  
**Icons:** Material Symbols Outlined (Google Fonts CDN).  
**Fonts:** Space Grotesk (body) + Barlow Condensed (headings).

---

## 4. DIRECTORY & FILE TREE

```
web/
├── app/
│   ├── layout.tsx                  # Root layout — fonts, AuthProvider, Navbar
│   ├── manifest.ts                 # PWA Web Manifest
│   ├── icon.svg                    # PWA App Icon
│   ├── globals.css                 # Design tokens (CSS vars), resets, animations
│   ├── page.tsx                    # Landing page (route: /)
│   ├── page.module.css
│   │
│   ├── login/
│   │   ├── page.tsx                # Login form (route: /login)
│   │   └── auth.module.css
│   │
│   ├── signup/
│   │   └── page.tsx                # Sign-up form (route: /signup)
│   │
│   ├── onboarding/
│   │   ├── page.tsx                # Post-signup setup (route: /onboarding)
│   │   └── Onboarding.module.css
│   │
│   ├── dashboard/
│   │   ├── page.tsx                # Today overview (route: /dashboard)
│   │   └── Dashboard.module.css
│   │
│   ├── log/
│   │   ├── page.tsx                # Meal logging + AI scan (route: /log)
│   │   ├── Log.module.css
│   │   └── hooks/
│   │       ├── useFoodSearch.ts    # Food search hook
│   │       ├── useMealLogging.ts   # Meal log/delete hook
│   │       └── useProgressSync.ts  # Progress upsert hook
│   │
│   ├── progress/
│   │   ├── page.tsx                # Progress charts & trends (route: /progress)
│   │   └── Progress.module.css
│   │
│   ├── body-scan/
│   │   ├── page.tsx                # Weekly body photo analyzer (route: /body-scan)
│   │   └── BodyScan.module.css
│   │
│   ├── meal-plan/
│   │   ├── page.tsx                # AI 7-day meal planner (route: /meal-plan)
│   │   └── MealPlan.module.css
│   │
│   ├── plans/
│   │   ├── page.tsx                # Pricing — Free/Pro/Ultra (route: /plans)
│   │   └── Plans.module.css
│   │
│   ├── profile/
│   │   ├── page.tsx                # User profile + goals (route: /profile)
│   │   └── Profile.module.css
│   │
│   ├── chat/
│   │   ├── page.tsx                # FitBot AI chat (route: /chat)
│   │   └── Chat.module.css
│   │
│   └── api/                        # Next.js Edge API routes (AI only)
│       ├── analyze-meal/
│       │   └── route.ts            # POST /api/analyze-meal — Groq vision → macros
│       ├── analyze-body/
│       │   └── route.ts            # POST /api/analyze-body — Groq body analysis
│       ├── meal-plan/
│       │   └── route.ts            # POST /api/meal-plan — AI 7-day plan generation
│       └── chat/
│           └── route.ts            # POST /api/chat — FitBot kimi-k2 streaming
│
├── components/
│   ├── Navbar.tsx                  # Top/bottom navigation (shared)
│   ├── Navbar.module.css
│   └── AuthGuard.tsx               # Route protection wrapper (redirects to /login)
│
├── lib/
│   ├── phpApi.ts                   # ← PHP API client (Auth/Users/Meals/Progress namespaces)
│   └── auth-context.tsx            # useAuth() hook — session token in localStorage
│
├── public/
│   └── api/                        # PHP Backend (served by Apache/PHP-CLI alongside static)
│       ├── db.php                  # PDO MySQL connection + env loader + jsonResponse()
│       ├── auth.php                # signUp, signIn, signOut, getSessionUser
│       ├── users.php               # getById, updateProfile, updatePlan, getUserPlan, deleteAccount
│       ├── meals.php               # log, byDate, remove, getRecent, getTodayMeals, range
│       ├── progress.php            # logWater, upsert, getDailyProgress, getStats, range, logWeight, getAchievements
│       ├── foods.php               # search, list
│       ├── bodyPhotos.php          # listPhotos, savePhoto, removePhoto
│       └── mealPlans.php           # listPlans, savePlan, removePlan, togglePin
│
├── next.config.js                  # output: 'export', trailingSlash: true
├── tsconfig.json
├── package.json
└── .env / .env.local               # DB credentials + GROQ_API_KEY
```

---

## 5. DATABASE SCHEMA (MySQL via PDO)

### `users` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | INT AUTO_INCREMENT PK | |
| `name` | VARCHAR | Display name |
| `email` | VARCHAR UNIQUE | |
| `passwordHash` | VARCHAR | bcrypt — never expose |
| `avatarUrl` | VARCHAR? | |
| `calorieGoal` | INT | kcal/day |
| `proteinGoal` | INT | g/day |
| `carbsGoal` | INT | g/day |
| `fatGoal` | INT | g/day |
| `gender` | VARCHAR? | "male" / "female" / "other" |
| `ageYears` | INT? | |
| `heightCm` | FLOAT? | |
| `weightKg` | FLOAT? | |
| `activityLevel` | VARCHAR? | |
| `goal` | VARCHAR? | "lose"/"maintain"/"gain" |
| `plan` | VARCHAR | "free"/"pro"/"ultra" |
| `planActivatedAt` | BIGINT? | Unix ms |
| `createdAt` | BIGINT | Unix ms |

### `sessions` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | INT PK | |
| `userId` | INT FK→users | |
| `token` | VARCHAR(64) UNIQUE | 64-char hex, stored in localStorage |
| `expiresAt` | BIGINT | Unix ms |
| `createdAt` | BIGINT | Unix ms |

### `meals` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | INT PK | |
| `userId` | INT FK→users | |
| `name` | VARCHAR | Food name |
| `mealType` | VARCHAR | "breakfast"/"lunch"/"dinner"/"snack" |
| `calories` | INT | kcal |
| `proteinG` | FLOAT | grams |
| `carbsG` | FLOAT | grams |
| `fatG` | FLOAT | grams |
| `servingSize` | VARCHAR? | e.g. "1 plate (~320g)" |
| `date` | DATE | ISO: "2026-03-20" |
| `loggedAt` | BIGINT | Unix ms |
| `aiGenerated` | TINYINT(1) | 1 if AI-scanned |

### `progress` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | INT PK | |
| `userId` | INT FK→users | |
| `date` | DATE | ISO date |
| `weightKg` | FLOAT? | |
| `caloriesConsumed` | INT | |
| `proteinConsumed` | INT | |
| `carbsConsumed` | INT | |
| `fatConsumed` | INT | |
| `waterMl` | INT? | |
| `steps` | INT? | |
| `recordedAt` | BIGINT | Unix ms |

### `foods` table (Quick Add)
| Field | Type | Notes |
|-------|------|-------|
| `id` | INT PK | |
| `name` | VARCHAR | Food name |
| `cals` | INT | kcal |
| `protein` | FLOAT | grams |
| `carbs` | FLOAT | grams |
| `fat` | FLOAT | grams |
| `emoji` | VARCHAR | |
| `cat` | VARCHAR | "Protein", "Carbs", etc. |

### `bodyPhotos` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | INT PK | |
| `userId` | INT FK→users | |
| `date` | DATE | |
| `imageData` | MEDIUMTEXT? | Base64 thumbnail |
| `analysis` | MEDIUMTEXT? | AI analysis JSON |
| `weekLabel` | VARCHAR? | e.g. "Week 1" |
| `notes` | TEXT? | |
| `recordedAt` | BIGINT | Unix ms |

### `mealPlans` table
| Field | Type | Notes |
|-------|------|-------|
| `id` | INT PK | |
| `userId` | INT FK→users | |
| `planName` | VARCHAR | Human-readable name |
| `planJson` | MEDIUMTEXT | Full 7-day plan JSON |
| `calorieTarget` | INT | kcal target used |
| `isPinned` | TINYINT(1) | 0/1 |
| `createdDate` | DATE | |
| `createdAt` | BIGINT | Unix ms |

---

## 6. PHP API ENDPOINTS (`web/public/api/`)

> **Pattern:** `POST /api/{resource}.php?action={action}` with JSON body.  
> **Response:** Always JSON. Error responses use `http_response_code(4xx/5xx)`.

### `auth.php`
| Action | Input | Output |
|--------|-------|--------|
| `signUp` | `{name, email, password}` | `{token, userId}` |
| `signIn` | `{email, password}` | `{token, userId}` |
| `signOut` | `{token}` | `{ok}` |
| `getSessionUser` | `{token}` | `{user}` |

### `users.php`
| Action | Input | Output |
|--------|-------|--------|
| `getById` | `{userId}` | `{user}` |
| `updateProfile` | `{userId, fields:{...}}` | `{ok}` |
| `updatePlan` | `{userId, plan}` | `{ok}` |
| `getUserPlan` | `{userId}` | `{plan, planActivatedAt}` |
| `deleteAccount` | `{userId}` | `{ok}` |
| `exportData` | `{userId}` | `{meals, progress}` |

### `meals.php`
| Action | Input | Output |
|--------|-------|--------|
| `log` | `{args:{userId,name,mealType,...}}` | `{id}` |
| `byDate` | `{userId, date}` | `{meals:[]}` |
| `remove` | `{id}` | `{ok}` |
| `getRecent` | `{userId, limit?}` | `{meals:[]}` |
| `getTodayMeals` | `{userId, date}` | `{meals:[]}` |
| `range` | `{userId, fromDate, toDate}` | `{meals:[]}` |

### `progress.php`
| Action | Input | Output |
|--------|-------|--------|
| `logWater` | `{userId, date, waterMl}` | `{id}` |
| `upsert` | `{args:{userId, date, ...}}` | `{id}` |
| `getDailyProgress` | `{userId, date}` | `{progress}` |
| `getStats` | `{userId, fromDate, toDate}` | `{avgCalories, streak, ...}` |
| `range` | `{userId, fromDate, toDate}` | `{rows:[]}` |
| `logWeight` | `{userId, date, weightKg}` | `{ok}` |
| `getAchievements` | `{userId}` | `{achievements:[]}` |

### `foods.php`
| Action | Input | Output |
|--------|-------|--------|
| `search` | `{query, category?}` | `{foods:[]}` |
| `list` | `{category?}` | `{foods:[]}` |

### `bodyPhotos.php`
| Action | Input | Output |
|--------|-------|--------|
| `listPhotos` | `{userId}` | `{photos:[]}` |
| `savePhoto` | `{userId, date, imageData?, analysis?, ...}` | `{id}` |
| `removePhoto` | `{id, userId}` | `{ok}` |

### `mealPlans.php`
| Action | Input | Output |
|--------|-------|--------|
| `listPlans` | `{userId}` | `{plans:[]}` |
| `savePlan` | `{userId, planJson, planName, calorieTarget}` | `{id}` |
| `removePlan` | `{id, userId}` | `{ok}` |
| `togglePin` | `{id, userId}` | `{ok}` |

---

## 7. NEXT.JS AI API ROUTES (Edge Runtime)

These routes **stay** as Next.js server routes (they require the GROQ_API_KEY and stream responses). They are NOT static and require the Next.js dev server or a serverless host.

### `POST /api/analyze-meal`
- **AI:** Groq `meta-llama/llama-4-scout-17b-16e-instruct` (vision)
- **Input:** `FormData` with `image` (base64 blob)
- **Output:** `{ name, confidence, servingSize, calories, proteinG, carbsG, fatG, notes }`

### `POST /api/analyze-body`
- **AI:** Groq Llama 4 Scout Vision
- **Input:** `{ imageBase64, mimeType?, previousAnalysis? }`
- **Output:** Full body composition analysis JSON

### `POST /api/meal-plan`
- **AI:** Groq Llama 4 Scout
- **Input:** `{ calorieGoal, proteinGoal, carbsGoal, fatGoal, preferences?, restrictions? }`
- **Output:** Complete 7-day meal plan JSON

### `POST /api/chat`
- **AI:** Groq `moonshotai/kimi-k2-instruct`
- **Input:** `{ messages: ChatMessage[] }`
- **Output:** SSE stream of text chunks

---

## 8. AUTH PATTERN

Custom session-based auth — NOT Clerk, NOT NextAuth.

```
User → signUp/signIn (POST /api/auth.php)
     → PHP: bcrypt_verify → creates session {token: 64-char hex}
     → Response: { token, userId }
     → Stored in localStorage: "calai_session"
     → AuthProvider reads token → POST /api/auth.php?action=getSessionUser
     → user object available via useAuth() across all pages
```

**Never** use Clerk or any external auth provider.  
**Never** store raw passwords.  
**Auth token** is passed as `token` field in JSON body (not as Authorization header in PHP API).

---

## 9. FRONTEND PATTERNS

### Using PHP API client
```tsx
import { Auth, Users, Meals, Progress } from "@/lib/phpApi";

// Get current user
const { user } = useAuth();
const userId = user?.id ? Number(user.id) : null;

// Fetch meals
const meals = await Meals.byDate(userId, today);

// Log progress
await Progress.upsert({ userId, date: today, caloriesConsumed: 1800 });
```

### Getting user plan
```tsx
const res = await Users.getUserPlan(userId);
const plan = res?.plan ?? "free";
```

### Import alias
The `@/` alias resolves to `web/`. Always use `@/lib/phpApi` for backend calls.

---

## 10. DESIGN SYSTEM

### CSS Variables (defined in globals.css)
```
--bg                  Dark page background (#09090b)
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
--protein             Protein macro color
--carbs               Carbs macro color
--fat                 Fat macro color
--radius-sm/md/lg/xl  Border radius tokens
--ease-out            Easing curve
--font-heading        Barlow Condensed
```

### Component conventions
- Every page has its own `Page.module.css` — no global CSS in page files
- Use `fadeInUp` animation for page sections (globals.css)
- All interactive elements must have `id` attributes for testing
- Touch targets ≥ 44×44px on mobile
- Icons: `<span className="material-symbols-outlined">{icon_name}</span>`

---

## 11. NAVBAR

**File:** `web/components/Navbar.tsx`  
Desktop top navigation + mobile bottom nav.

| Label | Route | Icon |
|-------|-------|------|
| Today | `/dashboard` | `home` |
| Log | `/log` | `restaurant` |
| Progress | `/progress` | `trending_up` |
| Body Scan | `/body-scan` | `body_system` |
| Meal Plan | `/meal-plan` | `restaurant_menu` |
| Plans | `/plans` | `workspace_premium` |
| FitBot | `/chat` | `smart_toy` |
| Profile | `/profile` | `person` |

Right CTA: "Log Meal" → `/log`

---

## 12. PLANS / SUBSCRIPTION

| Plan | Price | Key limits |
|------|-------|-----------|
| `free` | $0 | 5 AI scans/day, 7-day history, 10 FitBot msgs/day |
| `pro` | $9/mo | Unlimited scans, full analytics, export |
| `ultra` | $19/mo | Pro + body scan, meal planning, priority AI |

**Changing plan:** `Users.updatePlan(userId, plan)` via phpApi.ts.

---

## 13. AI MEAL ANALYSIS FLOW

```
User taps "Scan Meal" on /log
  → image selected → base64 encoded
  → POST /api/analyze-meal (Next.js Edge route)
  → Groq Llama 4 Vision → returns macros JSON
  → UI shows result card
  → User taps "Log This Meal"
  → Meals.log({...}) → POST /api/meals.php?action=log → MySQL
  → Progress.upsert({...}) → POST /api/progress.php?action=upsert
```

---

## 14. CODING RULES

1. **TypeScript only.** No `.js` files in `app/` or `components/`.
2. **"use client"** at the top of every page and component (all pages are static client-side).
3. **Never write raw SQL in pages** — all DB access goes through PHP API via phpApi.ts.
4. **Run `npx tsc --noEmit` after every change** — zero errors required.
5. **CSS Modules only.** Never use global class names inside `.module.css` files.
6. **No `any` casts** unless bridging untyped PHP response rows (add a TODO comment).
7. **Accessibility:** icon-only buttons need `aria-label`. Lists need `role`.
8. **Animations:** Always add `@media (prefers-reduced-motion: reduce)` override for `@keyframes`.
9. **Error states:** All async operations must handle loading, success, and error in the UI.
10. **IDs:** Every interactive element needs a unique `id` (format: `page-component-action`).
11. **Temp files:** Write scratch scripts and debug logs to `/tmp/` — never clutter `web/`.
12. **phpApi.ts is the single source of truth** — add any new PHP API calls as methods there.

---

## 15. ENVIRONMENT VARIABLES

| Variable | Used in | Purpose |
|----------|---------|---------| 
| `GROQ_API_KEY` | Next.js API routes | Groq AI API key |
| `DB_HOST` | `public/api/db.php` | MySQL host |
| `DB_PORT` | `public/api/db.php` | MySQL port (default 3306) |
| `DB_DATABASE` | `public/api/db.php` | MySQL database name |
| `DB_USERNAME` | `public/api/db.php` | MySQL username |
| `DB_PASSWORD` | `public/api/db.php` | MySQL password |

---

## 16. RUNNING THE PROJECT

### Local Development (hot-reload, no PHP API)
```bash
cd web && npm run dev    # http://localhost:3004
# Note: PHP API endpoints (/api/*.php) won't work in this mode
```

### Local Full-Stack (static + PHP API)
```bash
cd web && npm run build  # build to web/out/
php -S 0.0.0.0:8080 -t web/out/
# Open http://localhost:8080
# PHP executes api/*.php and serves static files
```

### SSH tunnel (local dev against production DB)
```bash
ssh -N -L 3306:auth-db1873.hstgr.io:3306 host &
# Then use DB_HOST=127.0.0.1 in .env.local
```

### Type check
```bash
cd web && npx tsc --noEmit
```

### Production (Hostinger — No Node.js/PM2 needed)
```bash
# Build locally
cd web && npm run build

# Upload web/out/ to server's public_html/
rsync -avz web/out/ u697986122@147.93.99.163:/home/u697986122/domains/lightgreen-spider-622425.hostingersite.com/public_html/

# Apache serves static files + PHP API automatically — no PM2
```

### 🔑 Test Credentials
- **Email:** `demo@calai.app`
- **Password:** `Demo1234!`

---

## 17. SSH & DEPLOYMENT

### SSH Config (`~/.ssh/config`)

| Alias | HostName | User | Port |
|-------|----------|------|------|
| `host` | `147.93.99.163` | `u697986122` | `65002` |

### Production URLs

| Purpose | URL |
|---------|-----|
| Live site | `https://lightgreen-spider-622425.hostingersite.com` |
| Hostinger hPanel | https://hpanel.hostinger.com |

### Server Paths

| Path | Purpose |
|------|---------|
| `/home/u697986122/domains/lightgreen-spider-622425.hostingersite.com/public_html/` | Apache document root |
| `…/public_html/api/` | PHP API endpoints |
| `…/public_html/_next/` | Static JS/CSS assets |
| `…/.env` | Production environment variables |

### Production Stack (PHP-only, no PM2)
```
Browser → Apache (port 443/80)
       → serves static HTML/JS/CSS from public_html/
       → PHP executes public_html/api/*.php directly
       → PHP PDO → MySQL DB
```

> **Note:** The old PM2 / Node.js / proxy setup has been removed. Production now runs as pure static + PHP.

---

## 18. AUTHGUARD & ROUTE PROTECTION

**File:** `web/components/AuthGuard.tsx`

Wraps protected pages to redirect unauthenticated users to `/login`.

```tsx
export default function DashboardPage() {
  return (
    <AuthGuard>
      {/* page content */}
    </AuthGuard>
  );
}
```

**Features:**
1. Waits for `authLoading` to resolve before rendering (prevents flash)
2. Redirects to `/login` if no user
3. Integrated with `useAuth()` hook from `auth-context.tsx`

---

## 19. WHAT THIS AGENT SHOULD PRIORITIZE

1. **Read this file first** to understand context.
2. **Check existing pages** before creating new ones — avoid duplication.
3. **Add PHP API actions** in the correct `public/api/*.php` file and expose via `phpApi.ts`.
4. **Always update the DB schema** documentation if adding new MySQL fields.
5. **Keep the Navbar** updated when adding new routes.
6. **Run TypeScript check** before reporting task complete.
7. **Use the existing design system** — CSS variables, Material Symbols, CSS Modules.
8. **Never hardcode data** — always call via phpApi.ts methods.
9. **Test in browser** after implementation (screenshot key flows).
10. **Maintain premium UX** — dark theme, smooth animations, glassmorphism cards.
11. **⚠️ UPDATE AGENT.md + AGENTS.md** after ANY file change — non-negotiable (§ 0).

> **Last audited:** April 26, 2026  
> **Auditor:** Assistant (Updated .gitignore and cleaned up build artifacts)

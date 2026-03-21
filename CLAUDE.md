# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Cal AI** - An AI-powered nutrition & fitness tracker for logging meals, tracking macros, and chatting with an AI coach. Currently refactoring monolithic pages into modular components with enhanced AI features.

**Repository Structure:**
- `/web` - Next.js 14 App Router application
- `/mobile` - React Native/Expo mobile app
- `/convex` - Shared Convex backend (DB + functions)

## Development Commands

### Web App
```bash
# Start dev server (http://localhost:3000)
cd web && npm run dev

# Build for production
cd web && npm run build

# Run TypeScript type checker
npx tsc --noEmit --skipLibCheck

# Linting (React hooks, TypeScript, unused vars)
npm run lint
```

### Mobile App
```bash
cd mobile && npm start
```

### Convex
```bash
# Run Convex dev server (generates schema types)
cd web && npx convex dev

# Seed demo data
npx convex run seed:seedDemoUser
```

### Running Tests
```bash
# Playwright tests (install first: npm i -D @playwright/test @types/node)
cd web && npx playwright install
npx playwright test tests/log-page.spec.ts
npx playwright test --ui
npx playwright show-report
```

## Architecture

### Tech Stack
- **Framework:** Next.js 14 (App Router, Edge Runtime)
- **Database:** Convex (real-time reactive database)
- **AI:** Groq API (`moonshotai/kimi-k2-instruct`)
- **Web:** React 18, TypeScript 5 (strict), CSS Modules
- **Mobile:** React Native/Expo
- **Auth:** Custom bcrypt + session tokens in Convex

### Current Refactoring: Log Page (Priority)
Monolithic `web/app/log/page.tsx` (1,150 lines) → Modular component architecture

**Created Files:**
- `/web/app/log/types/index.ts` - Centralized TypeScript types
- `/web/app/log/hooks/` - React hooks for state/logic
  - `useMealLogging.ts` - Meal mutations
  - `useAIScan.ts` - AI scanning workflow
  - `useFoodSearch.ts` - Food search w/ AI suggestions
  - `useProgressSync.ts` - Daily progress sync
  - `useImageQuality.ts` - Image validation
- `/web/app/log/subcomponents/` - Reusable UI pieces
  - `CalRing.tsx` - Calorie progress ring (React.memo)
  - `MacroBar.tsx` - Macro progress bars (React.memo)
  - `MealRow.tsx` - Individual meal cards
  - `FoodCard.tsx` - Food selection cards
  - `QuantityPicker.tsx` - Servings/grams picker
  - `CameraFrame.tsx` - Camera UI overlay
- `/web/app/log/components/` - Feature components
  - `DailyStatsHero.tsx` - Ring + macro bars
  - `MealTypeSelector.tsx` - Meal tabs selector
  - `ScanSection.tsx` - AI photo scanning (NEW AI feature)
  - `ConfidenceWarning.tsx` - NEW: Low confidence warning (< 85% requires user confirmation)

**Remaining:**
- `MealsList.tsx` - Today's meal list
- `QuickAddSidebar.tsx` - Food search + quick-add
- `ManualEntryModal.tsx` - Manual entry form
- `MobileScanFab.tsx` - Mobile floating action button

### Convex Backend
Schema: `web/convex/schema.ts`
- `users` - Accounts, goals, body stats
- `sessions` - Token-based auth sessions
- `meals` - Food logs with macros
- `progress` - Daily calorie/macro snapshots
- `foods` - Quick-add food items (1000+ seeded)
- `bodyPhotos` - Progress body photos
- `mealPlans` - AI-generated meal plans

Key files:
- `convex/auth.ts` - SignUp, SignIn, SignOut
- `convex/meals.ts` - Meal logging & retrieval
- `convex/progress.ts` - Daily progress tracking

### AI Integration
- **FitBot AI Chat** (`/web/api/chat/route.ts`): Streaming AI coach with user context
- **Meal Photo Analysis** (`/web/api/analyze-meal/route.ts`): Groq vision model for food analysis
- **AI Food Suggestions** (planned): Suggest foods based on recent meals

## Component Patterns

### Refactoring Pattern: Monolithic Pages
When refactoring pages:
1. **Extract types** → `app/[feature]/types/index.ts`
2. **Extract sub-components** → `app/[feature]/subcomponents/` (small, reusable UI pieces)
3. **Create hooks** → `app/[feature]/hooks/` (state, mutations, side effects)
4. **Create main components** → `app/[feature]/components/` (feature sections)
5. **Update page** → Reduce to ~200 lines orchestrator
6. **Add React.memo** to prevent unnecessary re-renders on stable props
7. **Use TypeScript strict** - no `any`, explicit return types on hooks

### AI Feature Pattern: Confidence-Based Validation
When implementing AI features:
1. **Check confidence** - Log when < 85%
2. **Show warning** - Require user confirmation
3. **Show ingredients** - Include per-item breakdown if available
4. **Allow retry** - User can retake photo
5. **Hover states** - Add visual feedback for confidence levels

### State Management
- **Convex queries**: Use `useQuery(api.path.here)` with "skip" guard during hydration
- **Convex mutations**: Use `useMutation(api.path.here)`
- **Progressive enhancement**: Don't rely on Convex types in page components until hydrated
- **Toast notifications**: Simple state + setTimeout for auto-dismiss

## Testing

### Test Commands
```bash
# Type checking
npx tsc --noEmit --skipLibCheck app/log/**/*.ts*

# Build for production
cd web && npm run build

# Run specific Playwright test
npx playwright test tests/log-page.spec.ts

# Linting (React hooks, TypeScript, unused vars)
npm run lint
```

### Test File Locations
- **Manual tests**: `/web/tests/`
- **Test guide**: `/tmp/TESTING-GUIDE.md` (autogenerated)

### Web Log Page Test Coverage
- Page loads and renders
- Meal type selector interaction
- AI scan workflow (upload → analyze → result)
- Confidence warning (< 85% threshold)
- Food search and quick-add
- Meal deletion workflow
- Manual entry modal

## Database/Convex Queries

### Common Queries
```typescript
// Get today's meals for current user
const meals = useQuery(api.meals.byDate, userId ? { userId, date: today } : "skip");

// Search foods
const foods = useQuery(api.foods.search, { searchQuery: query, category: "All" });

// Get daily progress
const progress = useQuery(api.progress.byDate, userId ? { userId, date: today } : "skip");
```

### Common Mutations
```typescript
const logMeal = useMutation(api.meals.log);
const removeMeal = useMutation(api.meals.remove);
const upsertProgress = useMutation(api.progress.upsert);
```

## Common Development Tasks

### **Adding a New Page**
1. Create `app/new-page/page.tsx`
2. Implement component, use `useAuth()` for user data
3. Add route to `Navbar.tsx` navigation constants
4. Add test in `tests/new-page.spec.ts`

### **Adding a New Feature to Log Page**
1. Add types to `app/log/types/index.ts`
2. Create sub-component in `app/log/subcomponents/`
3. Add React.memo() wrapper for performance
4. Export component from `app/log/components/`
5. Update main `app/log/page.tsx` to use new component
6. Add test coverage
7. Run `npm run build` before committing

### **Creating a New Convex Table**
1. Add schema in `convex/schema.ts`
2. Create indexing fields for common queries
3. Generate migration: `npx convex dev` (must run before using)
4. Create mutation/query functions in same file or new file
5. Use in UI

### **Testing AI Features**
- Use mock images: small (< 480px), blurry, clear photos
- Check confidence warning triggers at 85% threshold
- Verify ingredient breakdown appears for complex meals

## Performance Guidelines

### Reducing Re-renders
- Wrap expensive subcomponents in `React.memo()`
- Use `useMemo()` for computed values (meal totals, filter results)
- Use `useCallback()` for event handlers passed to memoized children
- Keep component props stable between renders

### Bundle Optimization
- Lazy-load heavy components: `dynamic(() => import('./HeavyComponent'))`
- Split at page boundaries
- Code-split AI-related features (scanning, analysis)

### Convex Query Optimization
- Use indexes (define in schema.ts)
- Filter as early as possible in queries
- Avoid ordering on large datasets unless necessary
- Use `.withIndex()` for efficient lookups

## AI/ML Patterns

### AI-Powered Features
1. **Confidence Thresholds**: Always check and display confidence scores
2. **Quality Gates**: Validate inputs before AI processing (image size, blur detection)
3. **User Warnings**: Show alerts for low confidence (< 85%)
4. **Human Review**: Allow users to correct AI results
5. **Feedback Loop**: Track corrected AI data to improve future predictions

### Prompt Engineering
- Use consistent system prompts
- Include user context in prompts (daily macros, goals)
- Keep temperature low (0.2-0.6) for deterministic nutrition data
- Validate AI responses fit expected JSON schemas

## Tasks and Progress

### Log Page Refactoring Status
- ✅ Types extracted (app/log/types/index.ts)
- ✅ Hooks created (5/5)
- ✅ Sub-components extracted (6/6)
- ✅ Main components started (4/7)
- 📝 Tests created (app/log/tests/log-page.spec.ts)
- ⏳ Integration into main page.tsx
- ⏳ Testing and validation

### Known Linting Rules (Strict)
- TypeScript: strict mode enabled
- React Hooks: exhaustive-deps enforced
- Unused variables: removed on commit
- Convex: type IDs properly (Id<"users"> not string)

---

**Last Updated**: March 20, 2026
**Maintenance**: Automatic kluster code review on all changes
**Active Development**: Log page refactoring (Phase 1/2)
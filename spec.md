# Synau — Project Spec

> AI-powered learning platform. AI Learning Operating System.
> Domain: synau.in

---

## ⚠️ For new sessions — read this first

This spec is the **source of truth** for the Synau project. The project is past initial MVP scaffolding — the foundations and core flows are working. The next sessions will be split into:

1. **Agentic & Backend session** — Mastra agents, workflows, Convex, API routes, LLM quality
2. **Frontend session** — UI/UX polish, components, interactions, design

Both sessions must read the relevant sections below. Do not re-implement what already exists — extend it.

---

## Current State (as of last update)

### ✅ Done & Working

| Layer | Status | Notes |
|---|---|---|
| **Next.js 16 + React 19 + Tailwind v4 + shadcn/ui v4** | ✅ Installed | Base UI primitives (not Radix) |
| **Convex** | ✅ Live | Deployment: `artful-cassowary-122.convex.cloud` |
| **Convex HTTP API gateway** | ✅ Working | `convex/http.ts` exposes `/query` & `/mutation` for server-side |
| **Mastra AI v1.51** | ✅ Working | 14 agents + 3 workflows registered |
| **LLM Provider** | ✅ Working | `gemini/gemini-2.5-flash-lite` via sumopod OpenAI-compatible endpoint |
| **NextAuth v5 (Google)** | ✅ Working | Auto-syncs user to Convex on login |
| **Auth → Convex sync** | ✅ Working | `signIn` callback upserts user |
| **Course Generation Workflow** | ✅ Working | 9 steps, resilient (no throws on quality gate failures) |
| **Lesson Generation Workflow** | ✅ Working | 4 steps, on-demand lazy generation |
| **Quiz Generation Workflow** | ✅ Working | Generates questions + adaptive hints |
| **Dashboard UI** | ✅ Working | Real data from Convex |
| **Course Detail UI** | ✅ Working | Real chapters + lessons from Convex |
| **Lesson View UI** | ✅ Working | Generate via workflow, persists to Convex |
| **Progress Page** | ✅ Working | Real progress data from Convex |

### ⚠️ Known Issues & TODO

See **"Known Issues"** section at the bottom of this spec.

---

## AI Provider

```
Base URL : https://ai.sumopod.com/v1
Model    : gemini/gemini-2.5-flash-lite   (current, working)
```

**Why not GPT-5 Nano?** GPT-5 Nano / GPT-4o-mini quota exhausted on this API key. Gemini Flash Lite works and produces quality output. The provider is OpenAI-compatible and switchable via env var.

Env vars (`.env.local`):
```
LLM_BASE_URL=https://ai.sumopod.com/v1
LLM_MODEL_ID=gemini/gemini-2.5-flash-lite
LLM_PROVIDER_ID=sumopod
LLM_API_KEY=sk-...
```

**Never hardcode.** Always use `src/mastra/providers/llm.ts` → `getLLMConfig()`.

### Available models at endpoint (as of last check)
`gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1`, `gpt-4o`, `gemini/gemini-2.5-flash`, `gemini/gemini-2.5-flash-lite`, `glm-5`, `glm-5.2`, `claude-sonnet-4-6`, `claude-opus-4-8`, `kimi-k2.6`, `qwen3.7-max`, `deepseek-v4-pro`, etc.

---

## Tech Stack

### Frontend
- **Next.js 16** (App Router, `src/` dir, `@/*` alias)
- **React 19**
- **TypeScript** strict
- **Tailwind CSS v4**
- **shadcn/ui v4** (Base UI primitives — NOT Radix)
- **Lucide** icons
- **React Hook Form + Zod**
- **sonner** for toasts

### Backend / AI
- **Mastra AI v1.51** (`@mastra/core`, `@mastra/memory`, `@mastra/libsql`)
- **Convex** (database, real-time, HTTP gateway)
- **NextAuth v5** (Google OAuth + Email-ready)

### Deployment
- Frontend → Vercel
- Database → Convex Cloud
- AI workloads → in Next.js API routes (Mastra in-process)

---

## Architecture: How it fits together

```
Browser
   │
   ▼
Next.js (App Router)
   ├── Server Components  ────► convex-server.ts ───► Convex HTTP /query
   ├── Client Components   ────► /api/* routes ────► Mastra workflows
   │                                            └──► Convex HTTP /mutation
   └── NextAuth session
                │
                ▼ (signIn callback)
         Convex users:upsert
```

### Server-side data flow

Server Components query Convex via **HTTP gateway** (not the React client):
- `src/lib/convex-server.ts` exports `convexQuery()` & `convexMutation()`
- These POST to `https://<deployment>.convex.site/query|mutation`
- The gateway (`convex/http.ts`) resolves `path` (e.g. `"lessons.getById"`) to a FunctionReference and calls `ctx.runQuery`/`ctx.runMutation`

**Path notation:** Both `module.function` and `module:function` work.

### Client-side data flow

Client Components call Next.js API routes (which run server-side):
- `POST /api/courses` → runs `courseGenerationWorkflow` → persists to Convex
- `POST /api/lessons` → runs `lessonWorkflow` → persists to Convex
- `POST /api/quiz` → runs `quizWorkflow`

Convex React client (`ConvexProvider`) is wired up but currently unused (all reads go through Server Components for SSR). Client hooks may be added for real-time updates.

---

## Folder Structure (actual)

```
src/
├── app/                                # Next.js App Router
│   ├── (auth)/login/                   # Login page (public)
│   ├── (dashboard)/                    # Protected routes
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── courses/
│   │   │   │   ├── new/                # New course form
│   │   │   │   └── [courseId]/
│   │   │   │       ├── page.tsx        # Course detail
│   │   │   │       └── lessons/[lessonId]/page.tsx
│   │   │   └── progress/               # Progress page
│   │   └── layout.tsx                  # Top nav, auth guard
│   ├── api/
│   │   ├── auth/[...nextauth]/         # NextAuth handler
│   │   ├── courses/route.ts            # Course generation
│   │   ├── lessons/route.ts            # Lesson generation
│   │   ├── quiz/route.ts               # Quiz generation
│   │   ├── progress/route.ts           # Progress calc
│   │   └── mastra/[...slug]/           # Direct agent handler (legacy)
│   ├── layout.tsx                      # Root layout + providers
│   ├── page.tsx                        # Redirect to dashboard/login
│   └── globals.css
│
├── components/
│   ├── ui/                             # shadcn/ui v4 components (22)
│   └── providers/
│       ├── convex-provider.tsx         # Convex React client wrapper
│       └── app-providers.tsx           # SessionProvider + ConvexProvider
│
├── features/                           # Domain-driven modules
│   ├── auth/login-form.tsx
│   ├── courses/new-course-form.tsx
│   ├── lessons/lesson-view.tsx
│   ├── quiz/quiz-view.tsx
│   └── progress/
│
├── mastra/                             # AI orchestration
│   ├── agents/                         # 14 agents (one file each)
│   ├── workflows/                      # 3 workflows
│   ├── providers/llm.ts                # LLM provider abstraction
│   └── index.ts                        # Mastra instance (registers all)
│
├── lib/
│   ├── convex-server.ts                # Server-side Convex HTTP helpers
│   └── utils.ts                        # cn() etc.
│
├── types/
│   └── next-auth.d.ts                  # Session type extension
│
├── auth.ts                             # NextAuth config + Convex user sync
└── middleware.ts                       # Route protection (authenticated only)

convex/                                 # Convex backend
├── _generated/                         # Auto-generated by `npx convex dev`
├── http.ts                             # HTTP gateway (/query, /mutation)
├── schema.ts                           # All collections
├── users.ts                            # User queries/mutations
├── courses.ts
├── roadmaps.ts
├── chapters.ts
├── lessons.ts                          # Includes content + citations
├── quizzes.ts
├── progress.ts
└── notifications.ts
```

---

## Agent Roster

14 agents, all registered in `src/mastra/index.ts`. **Rule:** No agent calls another agent. Only workflows orchestrate.

| Agent ID | File | Role |
|---|---|---|
| `synauAgent` | `synau-agent.ts` | Base assistant (general Q&A) |
| `plannerAgent` | `planner-agent.ts` | Creates roadmap from user goal |
| `researchPlannerAgent` | `research-planner-agent.ts` | Search strategy |
| `researchAgent` | `research-agent.ts` | Collects evidence |
| `sourceRankAgent` | `source-rank-agent.ts` | Ranks sources (Docs > Academic > Gov > Org > Industry > Books > Wiki > Blogs) |
| `groundingAgent` | `grounding-agent.ts` | Verified knowledge package |
| `curriculumReviewerAgent` | `curriculum-reviewer-agent.ts` | Reviews & validates roadmap |
| `teacherAgent` | `teacher-agent.ts` | Produces lesson content |
| `factCheckerAgent` | `fact-checker-agent.ts` | Flags unsupported claims |
| `citationBuilderAgent` | `citation-builder-agent.ts` | APA-style citations |
| `learningReviewerAgent` | `learning-reviewer-agent.ts` | Computes LQS (0-100) |
| `quizAgent` | `quiz-agent.ts` | Generates quiz questions |
| `progressAgent` | `progress-agent.ts` | Calculates mastery score |
| `adaptiveLearningAgent` | `adaptive-learning-agent.ts` | Re-explains weak topics |

Each agent has a **strict JSON output schema** documented in its `instructions`. The schema is enforced via Mastra's `structuredOutput: { schema }` option using Zod.

---

## Workflows

### 1. Course Generation Workflow (`courseGenerationWorkflow`)

Triggered by `POST /api/courses`. 9 steps, ~45-60s total runtime.

```
generateRoadmap   (Planner)
   → reviewCurriculum  (Curriculum Reviewer)
   → planResearch      (Research Planner)
   → collectResearch   (Research)
   → rankSources       (Source Rank)
   → groundKnowledge   (Grounding)
   → generateLesson    (Teacher) — fallback to verifiedFacts if rejected
   → factCheck         (Fact Checker) — flags, doesn't throw
   → buildCitations    (Citation Builder + LQS evaluation)
```

**Resilience policy:** Steps log warnings instead of throwing on quality gate failures (fact check, LQS). The workflow always completes and produces output.

### 2. Lesson Workflow (`lessonWorkflow`)

Triggered by `POST /api/lessons` (on-demand lazy generation when user opens a pending lesson). 4 steps.

```
generateLessonContent (Research Planner)
   → researchLesson   (Research + Rank + Ground)
   → teachLesson      (Teacher + Fact Check)
   → citeLesson       (Citation Builder + LQS)
```

### 3. Quiz Workflow (`quizWorkflow`)

Triggered by `POST /api/quiz`. Generates questions + pre-computes adaptive hints.

```
generateQuiz             (Quiz Agent)
   → generateAdaptiveLesson (Adaptive Learning Agent)
```

---

## Learning Quality Score (LQS)

Auto-evaluated per lesson by `learningReviewerAgent`. Stored in `lessons.lqs`.

| Metric | Max Score |
|---|---|
| Citation Coverage | 20 |
| Concept Coverage | 20 |
| Difficulty Consistency | 15 |
| Readability | 15 |
| Hallucination Risk (inverted) | 20 |
| Learning Objective Coverage | 10 |
| **Total** | **100** |

**Original spec threshold:** 90+. **Current behavior:** lessons are saved with whatever score they get (workflows don't throw). The LQS is shown to users as a quality indicator. Future improvement: add a "Regenerate" button for low-LQS lessons.

---

## Database Schema (Convex)

12 collections defined in `convex/schema.ts`:

| Collection | Purpose |
|---|---|
| `users` | Synced from NextAuth on login |
| `courses` | Course metadata + status |
| `roadmaps` | Chapter graph per course |
| `chapters` | Ordered chapter within course |
| `lessons` | Lesson metadata + LQS + status (`pending`/`generating`/`ready`/`failed`) |
| `lessonContents` | Versioned lesson body (explanation, examples, summary) |
| `citations` | Per-lesson source citations |
| `quizzes` | Quiz metadata |
| `questions` | Quiz questions |
| `attempts` | User quiz attempts |
| `progress` | Per-user-per-course progress + mastery |
| `notifications` | In-app notifications |
| `settings` | User settings |

### Key indexes
- `users.by_email`
- `courses.by_user`, `courses.by_user_status`
- `roadmaps.by_course`
- `chapters.by_course`, `chapters.by_course_order`
- `lessons.by_chapter`, `lessons.by_chapter_order`, `lessons.by_course`
- `progress.by_user`, `progress.by_user_course`
- `notifications.by_user`

---

## API Routes

| Route | Method | Purpose | Calls |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler | — |
| `/api/courses` | POST | Generate course + persist | `courseGenerationWorkflow` → Convex writes |
| `/api/lessons` | POST | Generate lesson + persist | `lessonWorkflow` → Convex writes |
| `/api/quiz` | POST | Generate quiz | `quizWorkflow` |
| `/api/progress` | POST | Compute mastery | `progressAgent` |
| `/api/mastra/[...slug]` | * | Direct agent handler (legacy) | `mastra.getAgent()` |

All API routes:
- Require `auth()` session
- Validate input with Zod
- Resolve user via `users:getByEmail` mutation
- Persist to Convex via `convex-server.ts`

---

## Authentication

- **Provider:** NextAuth v5 (Google OAuth working, Email-ready)
- **Session:** JWT strategy
- **Route protection:** `src/middleware.ts` redirects unauthenticated → `/login`
- **User sync:** `signIn` callback in `src/auth.ts` calls `users:upsert` on Convex
- **Session type extension:** `src/types/next-auth.d.ts` adds `convexId`

---

## Design System

- **Colors:** White / Black / Gray only. No gradients. No glassmorphism.
- **Components:** shadcn/ui v4 (Base UI primitives)
- **Icons:** Lucide
- **Typography:** Geist (Sans + Mono) loaded via `next/font/google`
- **Spacing:** 8px grid
- **Style:** minimal, monochrome, distraction-free, desktop-first
- **Inspiration:** Claude UI

### shadcn/ui v4 specifics

- Uses **Base UI** primitives, not Radix
- `Button` component uses `render` prop (NOT `asChild`) for polymorphism. Example:
  ```tsx
  <Button render={<Link href="/somewhere" />}>Click me</Button>
  ```
- The Button component auto-sets `nativeButton={false}` when `render` is used (see `src/components/ui/button.tsx`)

---

## MVP Features — Status

| Feature | Status | Notes |
|---|---|---|
| **Auth (Google)** | ✅ Done | Auto-syncs to Convex |
| **Auth (Email)** | ⚠️ Stub | Credentials provider exists but rejects all (needs password hashing) |
| **Dashboard** | ✅ Done | Real data, continue learning, summary stats |
| **Course Generation** | ✅ Done | 9-step workflow, resilient |
| **Course Detail** | ✅ Done | Chapters + lessons from Convex |
| **Lesson View** | ✅ Done | Lazy generation, citations, LQS display |
| **Quiz UI** | ⚠️ Partial | `quiz-view.tsx` built but not integrated into lesson flow |
| **Progress Tracking** | ✅ Done | Per-course mastery + weak topics |
| **Course Management** | ❌ Not built | Rename / Archive / Delete / Duplicate |
| **Notifications** | ❌ UI not built | Convex mutations exist |
| **Adaptive Learning UI** | ❌ Not integrated | Workflow generates content, UI hookup missing |

---

## Roadmap

| Phase | Features |
|---|---|
| **MVP (current)** | Auth, Dashboard, Course Generator, Lesson Generator, Quiz, Progress, Citations |
| **MVP Polish** | Quiz integration, Adaptive Learning UI, Course Management, Notifications UI, Email auth |
| **V1** | AI Tutor, Flashcards, Notes, Certificates, Search, Learning Streak |
| **V2** | Team Workspace, Learning Paths, Shared Courses, PWA, Mobile |
| **V3** | Voice Tutor, AI Mentor, AI Interview, AI Coding Lab, Marketplace, Enterprise |

---

## Non-Negotiable Engineering Rules

1. **Business logic only on backend.**
2. **All AI through Mastra Workflow** — never direct agent calls from frontend.
3. **No agent calls another agent** — only workflows orchestrate.
4. **All AI output must be structured JSON and validated with Zod.**
5. **All content must have trusted citations** — flag missing citations, don't silently skip.
6. **Generate content progressively** (cost efficiency + UX).
7. **Frontend does not hold critical business state.**
8. **Feature development is modular and domain-driven** (`src/features/<domain>/`).
9. **Observability** (logging, metrics, retries) is a core requirement.
10. **UX must feel like a professional learning mentor, not a chatbot.**

---

## Security Rules

- All AI logic on backend only
- No API keys in frontend (LLM_API_KEY is server-only)
- Zod validation on every API input
- Rate limiting (TODO)
- Prompt injection mitigation (TODO)
- Output validation (all AI output structured + Zod-validated) ✅
- RBAC ready (Convex queries filter by `userId`)
- Secure session management (NextAuth JWT) ✅
- Environment secrets server-only ✅

---

## Analytics Events (TODO: instrumentation)

`course_created` `outline_approved` `lesson_generated` `lesson_completed` `quiz_started` `quiz_passed` `quiz_failed` `lesson_regenerated` `course_completed`

---

## Local Development

### Prerequisites
- Node.js ≥ 20
- `.env.local` with: `LLM_*`, `AUTH_*`, `AUTH_GOOGLE_*`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `CONVEX_DEPLOYMENT`

### Run (two terminals)
```bash
# Terminal 1 — Convex (watches convex/ folder)
npx convex dev

# Terminal 2 — Next.js
npm run dev
```

### Verify
- `npm run lint` — must pass clean
- `npx tsc --noEmit` — must pass clean (convex/ excluded, has own tsconfig)

### Redeploy Convex after schema/mutation changes
```bash
npx convex dev --once
```

---

## Key Files Reference

### Agentic & Backend session — focus here

| File | Purpose |
|---|---|
| `src/mastra/index.ts` | Mastra instance — registers all agents & workflows |
| `src/mastra/providers/llm.ts` | LLM provider abstraction (`getLLMConfig()`) |
| `src/mastra/agents/*.ts` | 14 agent definitions with JSON output schemas |
| `src/mastra/workflows/course-generation-workflow.ts` | 9-step resilient workflow |
| `src/mastra/workflows/lesson-workflow.ts` | On-demand lesson generation |
| `src/mastra/workflows/quiz-workflow.ts` | Quiz + adaptive hints |
| `src/app/api/courses/route.ts` | Course API → workflow → Convex persist |
| `src/app/api/lessons/route.ts` | Lesson API → workflow → Convex persist |
| `src/app/api/quiz/route.ts` | Quiz API → workflow |
| `src/app/api/progress/route.ts` | Progress calc via progressAgent |
| `src/lib/convex-server.ts` | `convexQuery()` / `convexMutation()` HTTP helpers |
| `convex/http.ts` | HTTP gateway exposing Convex functions |
| `convex/schema.ts` | All collections + indexes |
| `convex/*.ts` | Per-collection queries & mutations |
| `src/auth.ts` | NextAuth config + user sync |

### Frontend session — focus here

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout + AppProviders |
| `src/app/(dashboard)/layout.tsx` | Top nav + auth guard |
| `src/app/(dashboard)/dashboard/page.tsx` | Dashboard |
| `src/app/(dashboard)/dashboard/courses/new/page.tsx` | New course form |
| `src/app/(dashboard)/dashboard/courses/[courseId]/page.tsx` | Course detail |
| `src/app/(dashboard)/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx` | Lesson page |
| `src/app/(dashboard)/dashboard/progress/page.tsx` | Progress page |
| `src/app/(auth)/login/page.tsx` | Login page |
| `src/features/auth/login-form.tsx` | Login form |
| `src/features/courses/new-course-form.tsx` | Course creation form |
| `src/features/lessons/lesson-view.tsx` | Lesson content viewer + generate trigger |
| `src/features/quiz/quiz-view.tsx` | Quiz UI (built, not integrated) |
| `src/components/ui/*` | shadcn/ui v4 components |
| `src/components/providers/*` | Convex + Session providers |
| `src/app/globals.css` | Tailwind theme tokens |

---

## Known Issues & Next Steps

### Bugs / Polish needed

1. **Quiz not integrated** — `quiz-view.tsx` exists but the lesson flow doesn't trigger a quiz after completion. Needs a "Take Quiz" button on lesson page + `/api/quiz` integration.

2. **Adaptive Learning not surfaced** — Workflow produces `adaptiveContent` but UI doesn't show it after quiz failure. Needs hook-up in `quiz-view.tsx`.

3. **LQS threshold enforcement** — Currently lessons are saved regardless of LQS. Consider:
   - Show LQS badge prominently on lesson cards
   - Add "Regenerate" button for lessons with LQS < 70

4. **No "Edit Roadmap" step** — Spec says user should approve/edit roadmap before lesson generation. Currently the workflow runs end-to-end without approval. Consider splitting into two API calls.

5. **Course Management missing** — No UI for rename / archive / delete / duplicate. Convex mutations exist (`courses:rename`, `courses:archive`, `courses:remove`).

6. **Notifications UI missing** — Convex mutations + queries exist, no UI.

7. **Email auth stub** — Credentials provider rejects all logins. Need password hashing + Convex user lookup.

8. **No rate limiting** — All API routes are unprotected from abuse.

9. **No real-time updates** — Convex React client is wired but unused. Dashboard requires manual refresh after course creation. Consider using `useQuery` from `convex/react` in client components.

10. **Time tracking not implemented** — `progress.completeLesson` accepts `timeSpentMinutes` but it's always 0.

### Performance

- Each dashboard load does N+1 Convex queries (course → chapters → lessons). Consider a denormalized `courseStats` field updated by mutations.
- Course generation takes 45-60s. UI shows progress steps but no real progress streaming. Consider SSE or polling.

### Observability gaps

- Console logging exists but no structured logging / metrics.
- No error tracking (Sentry etc.).
- No analytics events instrumentation.

---

## Changelog

- **Initial scaffolding** — Next.js, Mastra, base agent
- **Convex setup** — schema, mutations, HTTP gateway
- **shadcn/ui v4** — 22 base components installed
- **Auth** — NextAuth Google + user sync to Convex
- **14 agents** — All registered with JSON output schemas
- **3 workflows** — Course gen (resilient), lesson, quiz
- **Real data UI** — All pages query Convex, no mock data
- **URL bug fix** — LLM provider was double-appending `/chat/completions`
- **Resilience fixes** — Workflows no longer throw on fact-check / LQS failures
- **HTTP gateway** — Convex functions exposed via `/query` & `/mutation` for SSR
- **Current model:** `gemini/gemini-2.5-flash-lite` (GPT-5 Nano quota exhausted)

# Synau — AI Learning OS

Platform pembelajaran berbasis AI. AI membuat roadmap, lesson, kuis, dan tracking progress secara otomatis — semuanya dengan sumber tepercaya.

**Repo:** `github.com/temamumtaza/synau-beta`
**Domain:** synau.in

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| UI Components | shadcn/ui v4 (Base UI), Lucide icons |
| AI Orchestration | Mastra AI (agents, workflows) |
| Database | Convex (real-time, cloud) |
| Auth | NextAuth v5 (Google OAuth) |
| LLM | `gemini/gemini-2.5-flash-lite` via OpenAI-compatible endpoint |

---

## Quick Start

```bash
# Clone
git clone https://github.com/temamumtaza/synau-beta.git
cd synau-beta

# Install
npm install

# Setup env
cp .env.example .env.local
# Fill in: LLM_API_KEY, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

# Start Convex (Terminal 1)
npx convex dev

# Start Next.js (Terminal 2)
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — login Google → buat kursus baru.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Next.js dev server (port 3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npx tsc --noEmit` | TypeScript check |
| `npx convex dev` | Convex dev server (biarkan running) |
| `npx convex dev --once --typecheck=disable` | One-shot deploy (skip typecheck) |

---

## Documentation

Full project spec, architecture, agent roster, database schema, and known issues: see **[SPEC.md](./SPEC.md)**.

---

## Deployment

| Layer | Platform |
|---|---|
| Frontend | Vercel |
| Database | Convex Cloud |
| AI workloads | In-process (Next.js API routes) |

Environment variables untuk Vercel: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL_ID`, `LLM_PROVIDER_ID`, `NEXT_PUBLIC_CONVEX_URL`.

---

## License

Private project. All rights reserved.

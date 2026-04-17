# AutoBrain

Generate working interactive tools from a natural-language prompt. Describe what you need, and the app uses OpenAI to produce a JSON UI schema, then renders a live tool with inputs, formulas, outputs, and charts. Suggestions, prompt refinement, and schema generation are served from your own API routes (not hard-coded mock content).

## Tech stack

- **Next.js 15** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS**, **shadcn-style** UI components
- **OpenAI API** (JSON mode) with streaming SSE for generation
- **Recharts** for bar, line, and pie chart visualizations
- **Prisma** + **SQLite** for database
- **NextAuth.js** for authentication (credentials)

## Features

| Feature | Description |
|---------|-------------|
| Prompt input | Large textarea; **Ctrl/Cmd+Enter** to generate; **/** focuses the prompt when not typing in a field |
| Prompt draft | Last prompt is restored from **sessionStorage** after refresh |
| Improve prompt | Calls `/api/refine-prompt` to rewrite a vague prompt; accept or dismiss before generating |
| AI streaming | Real-time schema deltas with live JSON preview; server validates JSON and can **auto-repair** once if invalid |
| Inspiration grid | **AI-curated suggestions** from `/api/suggestions` (category chips, reroll); offline fallback list if the API is unavailable |
| Modify tool | Follow-up prompts; **AI modification chips** from `/api/modify-suggestions` |
| Toasts | Success feedback after create, modify, or cloud save |
| Dynamic inputs | number, slider, text, select, checkbox, date |
| Conditional visibility | Inputs that show/hide based on other values |
| Layout system | single, two-column, tabs, and step-by-step wizards |
| Live calculation | Safe math with `min`, `max`, `round`, `sqrt`, `SUM`, ternary conditionals (client-side evaluator) |
| Output formatting | currency, percent, number; optional **per-output `currency` / `locale`** (ISO 4217 + BCP47) |
| Charts | Bar, line, pie; optional **`chart.series`** lists which input/output keys to plot |
| Dark mode | System-aware with manual toggle |
| Tool sidebar | Search, rename, duplicate, delete tools |
| LocalStorage | Tools persist across browser sessions |
| Auth | Register/login with email and password |
| Dashboard | Manage saved tools, toggle public/private |
| Gallery | Browse and fork community-shared tools |
| Save to Cloud | Save local tools to the database |
| Like & Fork | Community interaction on public tools |

## AI pipeline

1. **Generation** - `POST /api/generate-stream` streams JSON from OpenAI (`response_format: json_object`), then parses and validates the result with `src/lib/validateSchema.ts`. If validation fails, the client may see a brief "repairing" state while the server runs a one-shot repair call. `POST /api/generate` does the same non-streamed, with optional repair.
2. **Shared prompt** - `src/lib/genPrompt.ts` holds the system prompt and repair messages so streaming and non-streaming routes stay aligned.
3. **Suggestions** - `GET /api/suggestions` returns starter ideas (cached ~1h per category/seed). Query params: `category`, `seed`, `count`, `avoid` (comma-separated titles), `refresh=1` to bypass cache.
4. **Refine and modify ideas** - `POST /api/refine-prompt` and `POST /api/modify-suggestions` return JSON only, for UX helpers on the home page.

If `OPENAI_API_KEY` is missing, suggestion and generation routes degrade gracefully (suggestions use `src/lib/templates.ts` as a fallback list).

## Project structure

```text
src/
  app/
    api/
      auth/[...nextauth]/route.ts   NextAuth handler
      auth/register/route.ts        User registration
      generate/route.ts             Non-streaming generation + validation + repair
      generate-stream/route.ts      Streaming generation (SSE) + validation + repair
      suggestions/route.ts          GET - AI-curated starter prompts (cached)
      refine-prompt/route.ts        POST - rewrite user prompt for clarity
      modify-suggestions/route.ts   POST - short modify ideas for current schema
      tools/route.ts                GET (list) + POST (create) tools
      tools/[id]/route.ts           GET, PATCH, DELETE, POST (like/fork)
    dashboard/page.tsx
    gallery/page.tsx
    login/page.tsx
    layout.tsx
    page.tsx
    globals.css
  components/        UI, ToolRenderer, ToolChart, TemplateCards, ToolSidebar, home/*, tool/*
  hooks/             usePersistedTools, useGenerator, usePromptDraft, useRefinePrompt, useModifyIdeas, useToast
  lib/               auth, calculator, genPrompt, generateSchema, validateSchema, prisma, streamClient, templates, openai, json, safeFunctions, suggestionMeta, storageKeys, formatOutput, utils
  types/             schema.ts (GenUISchema, chart.series, output currency/locale)
prisma/schema.prisma
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local: set OPENAI_API_KEY and AUTH_SECRET

# 3. Set up database
npx prisma db push

# 4. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (required for live AI generation, suggestions, refine, and modify ideas; without it, suggestions fall back to static examples) |
| `DATABASE_URL` | SQLite file path (default: `file:./dev.db`) |
| `AUTH_SECRET` | NextAuth secret (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (default: `http://localhost:3000`) |

## License

MIT

# PRD-to-Evals

Turn any AI agent Product Requirements Document into a reviewable suite of structured eval test cases. Three-stage pipeline: extract requirements → review & generate cases → export as YAML or JSON.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (reads `PORT` env var)
- `pnpm --filter @workspace/prd-to-evals run dev` — run the frontend (Vite)
- `pnpm --filter @workspace/api-server run typecheck` — typecheck the backend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/integrations-anthropic-ai exec tsc -p tsconfig.json` — build the Anthropic integration lib (required before api-server typecheck)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 19 + Vite, Wouter routing, TanStack Query, shadcn/ui, Tailwind CSS
- **API**: Express 5, Pino logging, Helmet, express-rate-limit
- **AI**: Anthropic claude-sonnet-4-6 via Replit AI Integrations proxy (no user API key needed)
- **DB**: PostgreSQL + Drizzle ORM (used for Anthropic integration schema; sessions are in-memory)
- **Validation**: Zod v4, drizzle-zod
- **API codegen**: Orval (from `lib/api-spec/openapi.yaml`)
- **Build**: esbuild

## Where things live

| Thing | Path |
|---|---|
| OpenAPI spec (source of truth) | `lib/api-spec/openapi.yaml` |
| Generated API hooks (do not edit) | `lib/api-client-react/src/generated/api.ts` |
| Generated Zod schemas (do not edit) | `lib/api-zod/src/generated/api.ts` |
| Session store (in-memory) | `artifacts/api-server/src/lib/sessionStore.ts` |
| Real LLM pipeline | `artifacts/api-server/src/lib/llmPipeline.ts` |
| Express routes | `artifacts/api-server/src/routes/sessions.ts` |
| Security / middleware | `artifacts/api-server/src/app.ts` |
| STRATOS design tokens | `artifacts/prd-to-evals/src/index.css` |
| Shell / navbar | `artifacts/prd-to-evals/src/components/layout/Shell.tsx` |
| Anthropic integration lib | `lib/integrations-anthropic-ai/` |

## Architecture decisions

- **No database for sessions** — all session state in process memory with 24-hour TTL eviction. Simple for v1; swap `sessionStore.ts` for a DB-backed store when multi-instance or persistence is needed.
- **OpenAPI-first** — `openapi.yaml` is the contract. Editing generated files directly will be overwritten by codegen. Always edit the spec, then run codegen.
- **Rate limiting on LLM routes** — 10 req/min per IP on `/extract` and `/generate` to control Claude spend. Adjust in `app.ts`.
- **UUID session IDs** — `crypto.randomUUID()`, not sequential counters, to prevent enumeration attacks.
- **Anthropic integration lib must be built before api-server typecheck** — it emits `.d.ts` declarations the api-server references. Run `pnpm --filter @workspace/integrations-anthropic-ai exec tsc -p tsconfig.json` first if you see TS6305 errors.
- **STRATOS design system** — dark navy `#0f172a`, blue accent `#2563eb`, Bricolage Grotesque headings, Inter Tight body, JetBrains Mono labels. Applied globally via CSS variables in `index.css`.

## User preferences

_None recorded yet._

## Gotchas

- After adding a new lib package, build it (`tsc -p tsconfig.json`) before typechecking packages that depend on it.
- `lib/db/src/schema/index.ts` exports the Drizzle schema — add new table exports there for migrations to pick them up.
- Do not edit `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/` — always regenerate via `pnpm --filter @workspace/api-spec run codegen`.
- The Vite frontend uses `BASE_URL` for path-prefixed API calls — do not hardcode `/api/...` without the base prefix.

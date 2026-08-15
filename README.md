# product-evaluator

**Turn an AI agent PRD into a reviewable suite of structured eval cases.**

Three stages: extract testable requirements from a PRD → review and edit them → generate eval cases and export as YAML or JSON, ready to run.

---

## The problem

Writing evals is the part of AI product work everyone agrees matters and nobody wants to do.

The requirements already exist. They are sitting in the PRD, written in prose: *"The agent must decline refund requests outside the 30-day window."* *"Responses must include a link to the returns portal."* Every one of those sentences is a test case waiting to be transcribed, and turning fifty of them into structured cases by hand is a few hours of tedious, error-prone work.

So it usually does not happen. The feature ships behind a demo and a vibe check, and the team discovers in production which requirements the agent quietly ignores.

The people best placed to write good evals — the PMs who wrote the requirements in the first place — are also the least likely to hand-author YAML.

## The solution

Paste in a PRD. The tool extracts discrete, testable requirements, presents them for review and editing, then generates structured eval cases with graders and pass criteria attached.

You stay in the loop at the stage that matters: deciding whether the extracted requirements are the *right* ones. That is product judgment and it should not be automated away. The transcription is what gets automated.

Output conforms to a shared eval-case schema — the same one [agent-eval-harness](https://github.com/rileytrottier23/agent-eval-harness) consumes. One contract, two tools, one pipeline:

```
PRD  ->  product-evaluator  ->  eval cases  ->  agent-eval-harness  ->  scorecard
```

A written requirement becomes an executable test becomes a number.

---

## Tradeoffs and decisions

**Sessions live in process memory, not a database.**
Session state is held in memory with a 24-hour TTL rather than persisted. PRD-to-eval generation is a single-sitting workflow, so a persistence layer would have meant schema migrations and cleanup jobs for something that lasts twenty minutes. The cost is real and accepted: sessions do not survive a restart, and the app cannot run multi-instance. `sessionStore.ts` is deliberately isolated behind a small interface so it can be swapped for a DB-backed store the moment either of those constraints starts to bite — which will be the first time someone wants to resume a session tomorrow.

**The OpenAPI spec is the source of truth, not the code.**
`lib/api-spec/openapi.yaml` defines the contract; the React query hooks and Zod validation schemas are generated from it. Frontend and backend cannot drift, and validation is enforced at both ends from a single definition. The tradeoff is a build step plus a hard rule that generated files are never edited directly — a genuine papercut when you want to change one field quickly. Worth it here because a typed frontend talking to a loosely-typed API is a bug class that costs more later than the build step costs now.

**Rate limiting is a spend control, not a security measure.**
`/extract` and `/generate` are capped at 10 requests/minute per IP. Both send a full PRD to Claude, so an accidental retry loop is an expensive mistake rather than a slow page. The limit is set low on purpose and lives in one place (`app.ts`) so it can be raised knowingly rather than discovered in a bill.

**Session IDs are UUIDs, not sequential.**
`crypto.randomUUID()` rather than an incrementing counter. Sequential IDs would have been marginally easier to debug and would have let anyone enumerate every other session.

**Review is a required stage, not an optional one.**
The pipeline could go PRD-to-cases in a single pass. It deliberately does not — extraction and generation are separate steps with a human review gate between them. Requirement extraction from prose is exactly the kind of task an LLM does *almost* right, and eval cases built on a subtly misread requirement are worse than no eval cases at all: they produce a passing scorecard that means nothing.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite, Wouter, TanStack Query, shadcn/ui, Tailwind |
| API | Express 5, Pino, Helmet, express-rate-limit |
| AI | Anthropic Claude |
| Validation | Zod v4, generated from the OpenAPI spec via Orval |
| Persistence | PostgreSQL + Drizzle ORM (integration schema); sessions in-memory |
| Monorepo | pnpm workspaces, Node.js 24, TypeScript 5.9 |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full repo layout, commands, and known gotchas.

## Running it

```bash
pnpm install
pnpm --filter @workspace/api-server run dev      # API server
pnpm --filter @workspace/prd-to-evals run dev    # frontend
```

## Non-goals

Not an eval *runner* — that is [agent-eval-harness](https://github.com/rileytrottier23/agent-eval-harness). Not a PRD authoring tool. Not a general-purpose document extractor; it is tuned specifically for AI agent requirements.

## License

MIT


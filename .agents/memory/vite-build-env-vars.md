---
name: Vite build env vars
description: PORT and BASE_PATH must not throw during production builds — only needed for the dev server.
---

In prd-to-evals (and any react-vite artifact), `vite.config.ts` reads `PORT` and `BASE_PATH` from the environment. These are set in `[services.env]` in `artifact.toml`, which is **dev-only** and not injected into `[services.production.build]` steps.

**Rule:** Never `throw` when `PORT` or `BASE_PATH` is missing in `vite.config.ts`. Use a safe default (`PORT ?? '3000'`, `BASE_PATH ?? '/'`) — the values only matter for the dev/preview server, not for `vite build`.

**Why:** The production Vite build crashed with "PORT environment variable is required" before any build output was produced. The Replit build logs only showed "Preparing PostgreSQL 16 tools" repeating (build infrastructure retrying) because the build command exited immediately. Took a local `pnpm build` run to surface the real error.

**How to apply:** Any time a `vite.config.ts` validates env vars at config-load time (top-level `if (!PORT) throw`), ensure the missing-env path uses a fallback rather than a throw. Alternatively, add `[services.production.build.env]` to the artifact's `artifact.toml` with the needed values.

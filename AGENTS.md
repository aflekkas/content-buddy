# Repository Guidelines

Contributor reference for Codex working in this repo.

## Next.js 16

This repo uses Next.js 16. APIs, conventions, and file structure may differ from older training data. Check `node_modules/next/dist/docs/` before writing route or framework-level code, and heed deprecation notices.

## Project Structure & Module Organization

Next.js 16 TypeScript app for LinkedIn Studio: a LinkedIn ghostwriter. The core loop is feeds + journal -> signals -> on-demand scan -> draft -> copy. App Router routes live in `src/app`, including dashboard pages under `src/app/(dashboard)` and API routes under `src/app/api`. Reusable feature components live in `src/components`, with shared UI primitives in `src/components/ui`. Feed and draft surfaces live in `src/components/feed` and `src/components/drafts`; source fetching and synthesis live in `src/lib/sources` and `src/lib/synthesis.ts`. Dashboard shell primitives (topbar, column header, cockpit layout) live in `src/components/cockpit`. Database access is centralized in `src/lib/db/queries.ts`, with row types in `src/lib/db/types.ts`. Supabase SQL migrations live in `supabase/migrations`. Static assets live in `public`, including provider logos. Prefer extending the existing structure over creating parallel folders or duplicate abstractions.

## Build, Test, and Development Commands

- `npm install` installs dependencies from `package-lock.json`.
- `npm run dev` starts the local Next.js dev server.
- `npm run build` creates a production build and catches route/type integration issues.
- `npm run start` serves the production build.
- `npm run lint` runs ESLint across the repository.

Use `npm` for scripts and dependency changes; `package-lock.json` is the canonical lockfile. Don't update both lockfiles in the same change. Run the lightest relevant verification before finishing: `npm run lint` for most changes, `npm run build` too for routing, data flow, or framework-level changes.

Do not start a local dev server (`npm run dev`, `npm run start`, `next dev`, or similar) unless the user explicitly asks for it. Prefer static verification commands such as `npm run lint` and `npm run build`.

## Coding Style & Naming Conventions

Use TypeScript, React Server Components where appropriate, and existing local helpers before adding abstractions. Component files kebab-case (`chat-switcher.tsx`); exported React components PascalCase. Prefer shared primitives from `src/components/ui` and the `cn` helper from `src/lib/utils.ts` before introducing new dependencies or bespoke patterns. Keep provider logic routed through `src/lib/providers.ts` and `src/lib/model-dispatch.ts`; do not import provider SDKs directly in route handlers or feature code.

## Testing Guidelines

`vitest` is configured. Run unit tests with `npm test` (one current test at `src/lib/rate-limit.test.ts`). Colocate new tests next to the code under test as `*.test.ts` or `*.test.tsx`. Run `npm test` for logic changes, `npm run lint` for most edits, and `npm run build` for routing, server, database, or framework-level changes.

## Shipping Workflow (auto-commit + push)

When a unit of work reaches a clean checkpoint (builds/lints), commit and push to `origin` without being asked. The user does not want to babysit `git`.

- Stage relevant files explicitly, write a Conventional Commits message, and `git push`.
- Bundle related changes into one coherent commit; don't split unrelated work or bundle unrelated work.
- Never `git add -A` blindly without scanning for secrets first (`.env*`, `*.key`, `*.pem`, credential files). If anything sensitive is staged, unstage and warn.
- Never `--amend` a pushed commit. Never `push --force` to `main` or `initial-scaffold` without explicit ask.
- If the push fails (hook, conflict, auth), surface the error and stop — do not bypass with `--no-verify` or `--force`.
- WIP / experimental / half-broken state: do not auto-push. Commit locally if useful, but hold the push until it works.
- Respect the current branch. Don't switch branches to push.

## Commit & Pull Request Guidelines

History uses Conventional Commits, e.g. `fix(chat): refresh banner + input state after settings save`. Keep commits scoped and descriptive. PRs should include a short summary, verification commands run, linked issues if any, and screenshots for UI changes.

## Supabase & Data Access

Reuse existing helpers, do not create ad hoc clients:

- `src/lib/supabase/server.ts` for server-side access
- `src/lib/supabase/client.ts` for browser access
- `src/lib/db/queries.ts` for shared database query logic

Do not expose secret env vars to the client. Never use the admin client in browser code. Prefer the publishable-key client unless the task strictly requires server-only admin access. If a change affects the database schema, add or update a migration in `supabase/migrations` and keep the TypeScript row types in `src/lib/db/types.ts` in sync within the same change.

## OpenAI key (env-driven)

LinkedIn Studio uses a single shared OpenAI key set in the server env. There is no per-user key storage.

- The OpenAI key lives in `process.env.OPENAI_API_KEY` (set in `.env.local`).
- Server-side AI calls read the env key directly: `process.env.OPENAI_API_KEY`. Never reintroduce per-user key tables, encrypted credentials, or BYOK UI surfaces.
- Provider catalogue (supported providers and models) is the single source of truth in `src/lib/providers.ts`. Use `getModel("openai", "gpt-4o-mini", apiKey)` from `src/lib/model-dispatch.ts`. Do not import provider SDKs directly in route or feature code.
- Onboarding is 3 steps: welcome, profile (niche + voice notes + voice samples), sources (RSS feeds + niche bundles). No keys step.
- Settings live in the Settings rail panel (5th cockpit tab, default collapsed). Edits PATCH `/api/profile` and feed both the chat system prompt and the synthesis prompt as soft hints (target audience, post goal, formality 1-5, elaboration 1-3, target length, preferred post types, avoid phrases, include links). Audience/goal are framed as soft hints — never name-drop or shoehorn.

## Pipeline Invariants

- `monitored_sources` stores `rss_feed` (with `url`) and `life_journal` rows.
- `/api/cron/poll-sources` runs daily with `CRON_SECRET`; onboarding may POST it with `?user_id=<uuid>` for the authenticated user only. Cron polls feeds and scores signals only — no auto-synthesis.
- `/api/journal` POST appends a `life_journal` signal for the user.
- `/api/scan` POST with `mode: "news" | "life" | "mix"` synthesizes a draft on demand. This is the only synthesis trigger.
- Draft chat is scoped to `/dashboard/drafts/[id]`; do not add a standalone dashboard chat route.
- Long-term memory lives in `user_memories` (renamed from `user_facts`). Chat tools `write_memory` / `update_memory` accept a `memory` field. UI labels use "Memory" everywhere.
- Synthesis prompt (`src/lib/synthesis.ts`) returns `{post_type, body}` JSON. The chosen `post_type` is persisted on the draft. Style/audience fields from `user_profiles` are passed as soft-hint XML blocks, never as hard constraints.

## Chat Invariants

When editing chat flows, preserve unless the user explicitly asks to change:

- authenticated access to chat routes and APIs
- persistence of user and assistant messages
- chat title generation
- creator profile context (`niche`, `voice_notes`, and `voice_samples`)
- usage and token accounting (rolled up per chat row)

Keep server-side AI orchestration in route handlers and shared library files. Do not move provider secrets or model calls into client components.

## Security & Configuration Tips

Local secrets belong in `.env.local`, never in commits. Required values include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `OPENAI_API_KEY`. The OpenAI key must never be logged or returned to the client.

## Browser tooling

Don't use Playwright or MCP browser tools unless the user explicitly asks. For UI work, make the change and let the user verify in their own browser.

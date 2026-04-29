# Repository Guidelines

Contributor reference for any agent (Claude, Codex, Cursor, human) working in this repo.

## Next.js 16

This repo uses Next.js 16. APIs, conventions, and file structure may differ from older training data. Check `node_modules/next/dist/docs/` before writing route or framework-level code, and heed deprecation notices.

## Project Structure & Module Organization

Next.js 16 TypeScript app for Shortform Studio. App Router routes live in `src/app`, including dashboard pages under `src/app/(dashboard)` and API routes under `src/app/api`. Reusable feature components live in `src/components`, with shared UI primitives in `src/components/ui`. Server helpers, provider dispatch, crypto, pricing, and product logic live in `src/lib`; database access is centralized in `src/lib/db/queries.ts`, with row types in `src/lib/db/types.ts`. Supabase SQL migrations live in `supabase/migrations`. Static assets live in `public`, including provider logos. Prefer extending the existing structure over creating parallel folders or duplicate abstractions.

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

No test runner is currently configured. For changes today, run `npm run lint`; run `npm run build` for routing, server, database, or framework-level changes. If tests are added, colocate them near the code under test using `*.test.ts` or `*.test.tsx`, and add the corresponding npm script.

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

## Bring Your Own Key

Shortform Studio is a bring-your-own-key product. Each user supplies their own provider API key (Anthropic, OpenAI, Google Gemini, xAI Grok, or Llama via Groq) and picks an active model in `/settings`; the app uses that key to drive their chats.

- Surface BYOK in the UI subtly (footer note, landing CTA line, onboarding hint), not as the headline of the brand.
- Server-side AI orchestration must use the **caller's** key, not a shared platform key. Never check a global env var like `ANTHROPIC_API_KEY` in production paths; pull the user's key via `getDecryptedProviderKey(userId, provider)` from `src/lib/db/queries.ts`.
- Provider catalogue (supported providers and models) is the single source of truth in `src/lib/providers.ts`. Use `getModel(provider, model, apiKey)` from `src/lib/model-dispatch.ts` to instantiate the AI SDK model. Do not import `@ai-sdk/anthropic` (or any other provider SDK) directly in route or feature code.
- Avoid Anthropic-specific `providerOptions` (`cacheControl`, `thinking`) in request paths since they error on other providers. If genuinely needed, branch on `provider === "anthropic"`.
- Keys are stored encrypted at rest in `public.user_provider_keys` (AES-256-GCM, master key in `BYOK_ENCRYPTION_KEY`). Helpers in `src/lib/crypto.ts`. Never log, return, or expose the decrypted key to the client.
- Missing/invalid user keys must surface as actionable UI ("add your key in settings"), not opaque 500s. The chat route returns `402 {error: "missing_key", provider}`; the chat client surfaces a banner linking to `/settings`.

## Chat Invariants

When editing chat flows, preserve unless the user explicitly asks to change:

- authenticated access to chat routes and APIs
- persistence of user and assistant messages
- chat title generation
- remembered user facts
- usage and token accounting (per-user, since each user pays for their own key)

Keep server-side AI orchestration in route handlers and shared library files. Do not move provider secrets or model calls into client components.

## Security & Configuration Tips

Local secrets belong in `.env.local`, never in commits. Required values include `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `BYOK_ENCRYPTION_KEY`. User provider keys are encrypted and must never be logged, returned to the client, or handled outside server-side code.

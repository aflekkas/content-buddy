<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Subagents (use them aggressively)

Project agents live in `.claude/agents/`. Prefer delegating focused work to them over doing it yourself, especially anything that fits an agent's description. Spawning is cheap; protecting the main context is valuable.

- **`frontend-engineer`** — owns ALL UI / page / component / styling / motion / design work in `src/app/**`, `src/components/**`, and `src/app/globals.css`. Default to delegating any frontend task here, even small ones. Brand and stack rules are baked into the agent. **Also owns the `shadcn` and `magicui` MCP servers exclusively** — any `mcp__shadcn__*` or `mcp__magicui__*` call must be made from this agent.
- **`backend`** — owns ALL server-side work: Supabase queries, route handlers under `src/app/api`, RLS policies, SQL migrations, type sync, AI chat pipeline (chat route, model dispatch, BYOK key resolution, streaming, token accounting, tool calls), provider catalogue. **Also owns the `supabase` MCP server exclusively** — any `mcp__supabase__*` call (apply_migration, execute_sql, list_tables, get_advisors, get_logs, branches, edge functions, etc.) must be made from this agent.
- **Run agents in the background** (`run_in_background: true`) for any task expected to take more than a few seconds. Continue with other work and process the result when it returns. Do not sit and wait.
- Spawn multiple agents in parallel when the tasks are independent (e.g. frontend redesign + backend route refactor at the same time).
- New project-specific agents go in `.claude/agents/<name>.md` with YAML frontmatter (`name`, `description`, optional `model`).

## MCP server ownership

MCP servers map 1:1 to subagents. The main thread does **not** call MCP tools directly — it delegates.

| MCP server | Owner agent | Tool prefix |
|------------|-------------|-------------|
| `supabase` | `backend` | `mcp__supabase__*` |
| `shadcn` | `frontend-engineer` | `mcp__shadcn__*` |
| `magicui` | `frontend-engineer` | `mcp__magicui__*` |

If a task needs Supabase MCP and shadcn MCP, spawn both agents in parallel rather than reaching for the tools from the main thread.

# Tooling

Do not use Playwright (MCP browser tools) unless the user explicitly asks for it. For UI work, make the change and let the user verify in their own browser.

Use `npm` by default for installs and scripts. Treat `package-lock.json` as the canonical lockfile unless the user explicitly asks to switch package managers. Do not update both lockfiles in the same change.

Run the lightest relevant verification before finishing. For most changes, run `npm run lint`. For routing, data flow, or framework-level changes, run `npm run build` too when feasible.

# Project Structure

- App routes live under `src/app`.
- Shared UI primitives live under `src/components/ui`.
- Feature components live under `src/components`.
- Supabase helpers live under `src/lib/supabase`.
- Database queries live under `src/lib/db/queries.ts`.
- SQL migrations live under `supabase/migrations`.

Prefer extending the existing structure over creating parallel folders or duplicate abstractions.

# Supabase And Data Access

Reuse the existing Supabase helpers instead of creating ad hoc clients:

- `src/lib/supabase/server.ts` for server-side access
- `src/lib/supabase/client.ts` for browser access
- `src/lib/db/queries.ts` for shared database query logic

Do not expose secret env vars to the client. Never use the admin client in browser code. Prefer the publishable-key client unless the task strictly requires server-only admin access.

If a change affects the database schema, add or update a migration in `supabase/migrations` and keep the TypeScript row types in `src/lib/db/types.ts` in sync within the same change.

# Product Model: Bring Your Own Key

Content Buddy is a **bring-your-own-key** product. Each user supplies their own provider API key (Anthropic, OpenAI, Google Gemini, xAI Grok, or Llama via Groq) and picks an active model in `/settings`; the app uses that key to drive their chats. Keep this in mind across the surface area:

- Surface BYOK in the UI subtly (e.g. a small footer note, a line on the landing CTA, an onboarding hint), it should be clear, not the headline of the brand.
- Server-side AI orchestration must use the **caller's** key, not a shared platform key. Never check a global provider env var like `ANTHROPIC_API_KEY` in production paths; pull the user's key from `user_provider_keys` via `getDecryptedProviderKey(userId, provider)` from `src/lib/db/queries.ts`.
- The provider catalogue (which providers and models are supported) is the single source of truth in `src/lib/providers.ts`. Use `getModel(provider, model, apiKey)` from `src/lib/model-dispatch.ts` to instantiate the AI SDK model. Do not import `@ai-sdk/anthropic` (or any other provider SDK) directly in route or feature code.
- Avoid Anthropic-specific `providerOptions` (`cacheControl`, `thinking`) in request code paths since they error on other providers. If you genuinely need them, branch on `provider === "anthropic"`.
- Keys are stored encrypted at rest in `public.user_provider_keys` (AES-256-GCM, master key in `BYOK_ENCRYPTION_KEY` env). Encryption helpers live in `src/lib/crypto.ts`. Never log, return, or expose the decrypted key to the client.
- When you touch chat or model-call code, make sure errors around missing/invalid user keys surface as actionable UI ("add your key in settings"), not opaque 500s. The chat route returns `402 {error: "missing_key", provider}`; the chat client surfaces a banner linking to `/settings`.

# Chat And AI Changes

When editing chat flows, preserve these behaviors unless the user explicitly asks to change them:

- authenticated access to chat routes and APIs
- persistence of user and assistant messages
- chat title generation
- remembered user facts
- usage and token accounting (per-user, since each user pays for their own key)

Keep server-side AI orchestration in route handlers and shared library files. Do not move provider secrets or model calls into client components.

# UI Conventions

Prefer existing shadcn/Base UI-style primitives in `src/components/ui` before introducing new dependencies or bespoke patterns. Reuse existing utility helpers and styling conventions from the repo, especially the global styles and `cn` helper.

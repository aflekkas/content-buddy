<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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

# Chat And AI Changes

When editing chat flows, preserve these behaviors unless the user explicitly asks to change them:

- authenticated access to chat routes and APIs
- persistence of user and assistant messages
- chat title generation
- remembered user facts
- usage and token accounting

Keep server-side AI orchestration in route handlers and shared library files. Do not move provider secrets or model calls into client components.

# UI Conventions

Prefer existing shadcn/Base UI-style primitives in `src/components/ui` before introducing new dependencies or bespoke patterns. Reuse existing utility helpers and styling conventions from the repo, especially the global styles and `cn` helper.

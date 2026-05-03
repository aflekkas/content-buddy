# LinkedStudio

LinkedStudio is a LinkedIn ghostwriter. You add the news feeds you read and
drop journal notes whenever something happens. One click and we draft posts in
your voice — news riffs, life posts, or a mix. You edit, copy, ship.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn/ui + Base UI primitives + motion/react
- Supabase (Postgres, Auth, Storage, RLS)
- Vercel AI SDK v6 with `@ai-sdk/openai`
- `feedsmith` for RSS/Atom/RDF/JSON feed parsing

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase service key |
| `BYOK_ENCRYPTION_KEY` | 32-byte base64 AES-GCM key for stored user keys |
| `CRON_SECRET` | Bearer secret for scheduled source polling |

Apply migrations from `supabase/migrations/` in numeric order.

## BYOK

Users bring their own OpenAI API key. The key lives in
`public.user_provider_keys`, AES-256-GCM encrypted at rest, decrypted only
inside server-side request paths, and never returned to the client after
storage. Apify tokens are still supported in `public.user_external_credentials`
for the deferred LinkedIn voice-scrape feature, but are optional in the MVP.

## Product Flow

- Onboarding has 4 steps: welcome, keys (OpenAI), profile (niche + voice +
  voice samples), sources (RSS feeds + niche bundles).
- Sources are stored in `monitored_sources` as `rss_feed` or `life_journal`.
- `/api/cron/poll-sources` runs daily to fetch RSS items and score signals.
  No drafts are auto-created — synthesis is manual.
- `/api/journal` POST appends a quick-capture life note as a `life_journal`
  signal.
- `/api/scan` POST with `mode: "news" | "life" | "mix"` synthesizes a draft
  on demand.
- `/dashboard/feed` is the inbox for signals and drafts plus the journal
  capture and scan controls.
- `/dashboard/drafts/[id]` is the editor and draft-scoped chat surface.

## Verification

```bash
npm run lint
npm run build
```

Use `npm run lint` for most edits and `npm run build` for routing, schema, or
framework-level changes.

## Key Paths

- `src/app/(dashboard)` — auth-gated dashboard shell
- `src/app/api/chat` — draft-scoped OpenAI chat route
- `src/app/api/cron/poll-sources` — daily source polling route (RSS only)
- `src/app/api/journal` — quick-capture journal entries
- `src/app/api/scan` — manual draft synthesis (news/life/mix)
- `src/components/feed` — signal/draft inbox, journal capture, scan controls
- `src/components/drafts` — draft editor and chat sidebar
- `src/components/chat` — reusable chat UI and input
- `src/components/settings` — key and profile settings
- `src/lib/providers.ts` — OpenAI model catalogue
- `src/lib/model-dispatch.ts` — AI SDK model construction
- `src/lib/system-prompt.ts` — basic system prompt composition
- `src/lib/sources` — RSS fetcher + niche bundles
- `src/lib/synthesis.ts` — relevance scoring and mode-aware draft synthesis
- `src/lib/db/queries.ts` — shared DB query layer
- `supabase/migrations` — SQL schema migrations

## Security Notes

- Keep local secrets in `.env.local`; never commit them.
- Never expose `SUPABASE_SECRET_KEY` or `BYOK_ENCRYPTION_KEY` to client code.
- Do not log decrypted provider keys.
- Keep RLS enabled on user-owned tables.

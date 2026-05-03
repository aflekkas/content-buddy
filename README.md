# LinkedIn Studio

LinkedIn Studio is a self-hosted LinkedIn ghostwriter. You add the news feeds
you read and drop journal notes whenever something happens. One click and it
drafts posts in your voice — news riffs, life posts, or a mix. You edit, copy,
ship.

Open source. Single user. Bring your own OpenAI key in `.env.local`.

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
# fill in OPENAI_API_KEY + Supabase keys
npm run dev
```

Required environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase key |
| `SUPABASE_SECRET_KEY` | Server-only Supabase service key |
| `OPENAI_API_KEY` | Single OpenAI key. Every server-side AI call reads this. |
| `CRON_SECRET` | Optional. Bearer secret for the poll-sources cron route. |

Apply migrations from `supabase/migrations/` in numeric order.

## Product Flow

- Onboarding has 3 steps: welcome, profile (niche + voice + voice samples),
  sources (RSS feeds + niche bundles).
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
- `src/components/settings` — profile settings dialog
- `src/lib/providers.ts` — OpenAI model catalogue
- `src/lib/model-dispatch.ts` — AI SDK model construction
- `src/lib/system-prompt.ts` — basic system prompt composition
- `src/lib/sources` — RSS fetcher + niche bundles
- `src/lib/synthesis.ts` — relevance scoring and mode-aware draft synthesis
- `src/lib/db/queries.ts` — shared DB query layer
- `supabase/migrations` — SQL schema migrations

## Security Notes

- Keep local secrets in `.env.local`; never commit them.
- Never expose `SUPABASE_SECRET_KEY` or `OPENAI_API_KEY` to client code.
- The OpenAI key is read server-side only via `process.env.OPENAI_API_KEY`.
- RLS stays enabled on user-owned tables.

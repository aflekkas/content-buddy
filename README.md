# Shortform Studio

Shortform Studio polls a creator's own X posts and monitored niche accounts,
scores useful signals, then synthesizes LinkedIn draft posts for copy/paste.
Publishing stays out of scope; the product loop is source -> signal -> draft ->
copy.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn/ui + Base UI primitives + motion/react
- Supabase (Postgres, Auth, Storage, RLS)
- Vercel AI SDK v6 with `@ai-sdk/openai`
- Apify for X source fetching

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

Users bring their own OpenAI API key and Apify token. OpenAI keys live in
`public.user_provider_keys`; Apify tokens live in
`public.user_external_credentials`. Both are AES-256-GCM encrypted at rest,
decrypted only inside server-side request paths, and never returned to the
client after storage.

## Product Flow

- Onboarding has 4 steps: welcome, keys, profile, sources.
- Sources are stored in `monitored_sources` as `x_self` or `x_account`.
- `/api/cron/poll-sources` runs daily to fetch posts, score signals, and create
  drafts from the creator's own posts.
- `/dashboard/feed` is the inbox for signals and drafts.
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
- `src/app/api/cron/poll-sources` — daily source polling route
- `src/components/feed` — signal and draft inbox
- `src/components/drafts` — draft editor and chat sidebar
- `src/components/chat` — reusable chat UI and input
- `src/components/settings` — key and profile settings
- `src/lib/providers.ts` — OpenAI model catalogue
- `src/lib/model-dispatch.ts` — AI SDK model construction
- `src/lib/system-prompt.ts` — basic system prompt composition
- `src/lib/sources` — Apify-backed source fetchers
- `src/lib/synthesis.ts` — relevance scoring and draft synthesis
- `src/lib/db/queries.ts` — shared DB query layer
- `supabase/migrations` — SQL schema migrations
- `scripts/seed-byok-key.mjs` — local helper for seeding an encrypted OpenAI key

## Security Notes

- Keep local secrets in `.env.local`; never commit them.
- Never expose `SUPABASE_SECRET_KEY` or `BYOK_ENCRYPTION_KEY` to client code.
- Do not log decrypted provider keys.
- Keep RLS enabled on user-owned tables.

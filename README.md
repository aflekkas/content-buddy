# Shortform Studio

Stage A of the pivot strips the app down to a bare OpenAI BYOK chat shell. The
old creator-tool surfaces have been removed so the next stages can build the
X-news to LinkedIn synthesis workflow on a smaller base.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn/ui + Base UI primitives + motion/react
- Supabase (Postgres, Auth, Storage, RLS)
- Vercel AI SDK v6 with `@ai-sdk/openai`

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

Apply migrations from `supabase/migrations/` in numeric order.

## BYOK

Users bring their own OpenAI API key. Keys are AES-256-GCM encrypted at rest in
`public.user_provider_keys`, decrypted only inside server-side request paths,
and never returned to the client after storage.

## Verification

```bash
npm run lint
npm run build
```

Use `npm run lint` for most edits and `npm run build` for routing, schema, or
framework-level changes.

## Key Paths

- `src/app/(dashboard)` — auth-gated dashboard shell
- `src/app/api/chat` — OpenAI chat route
- `src/components/chat` — chat UI and input
- `src/components/settings` — key and profile settings
- `src/lib/providers.ts` — OpenAI model catalogue
- `src/lib/model-dispatch.ts` — AI SDK model construction
- `src/lib/system-prompt.ts` — basic system prompt composition
- `src/lib/db/queries.ts` — shared DB query layer
- `supabase/migrations` — SQL schema migrations
- `scripts/seed-byok-key.mjs` — local helper for seeding an encrypted OpenAI key

## Security Notes

- Keep local secrets in `.env.local`; never commit them.
- Never expose `SUPABASE_SECRET_KEY` or `BYOK_ENCRYPTION_KEY` to client code.
- Do not log decrypted provider keys.
- Keep RLS enabled on user-owned tables.

# 🎬 content-buddy

Short-form video creators juggle a brand voice doc in one tab, a hook list in another, half-finished scripts in a third, and a chat assistant that has no idea what any of it looks like together. content-buddy is a chat-first cockpit that puts those primitives in one frame: a brand panel that the model actually reads on every turn, a video queue that tracks what's drafted vs. shipped, and a chat switcher that lets you iterate on multiple scripts in parallel without losing context. Built on Next.js 16, the Vercel AI SDK, Anthropic, and Supabase. Pre-alpha, scaffolding stage, expect breakage.

## 📦 Install

```bash
git clone https://github.com/aflekkas/content-buddy
cd content-buddy
npm install
```

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANTHROPIC_API_KEY` in `.env.local`. Run `supabase/migrations` against your project before first boot.

## 🚀 Usage

```bash
npm run dev
```

Open `http://localhost:3000`, sign in, land in the cockpit.

## 🧰 What's in here

- `src/app/(dashboard)` - cockpit shell, auth-gated.
- `src/components/cockpit` - brand panel, video queue, chat switcher, topbar.
- `src/components/chat` - chat surface + input.
- `src/components/ui` - shadcn / Base UI primitives.
- `src/lib/supabase` - server + browser Supabase clients.
- `src/lib/db/queries.ts` - shared DB query layer.
- `supabase/migrations` - SQL schema.

## 🛠️ How it works

Each cockpit pane is a column in the shell. The brand panel persists creator voice rules into Supabase and injects them as system context on every chat turn. The video queue tracks per-video state (draft, scripted, shipped) and lets a chat thread bind to a specific video so the model knows which artifact it's editing. Chat history, user facts, and token accounting persist server-side via the route handlers in `src/app/api`.

## 📄 License

MIT

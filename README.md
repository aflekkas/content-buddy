# 🎬 shortform-studio

Most AI script tools are blank chat boxes wearing a logo. Shortform Studio ships with the playbook: hook archetypes, retention mechanics, video format templates, and niche-specific tactics, all loaded as system context on every turn. Paste an idea, get a script that respects how short-form actually works. Built for the creator who's seen the gurus, read the threads, and still doesn't know what to post tomorrow morning.

The knowledge layer at `src/lib/patterns/pattern-library.md` is the entire competitive moat, and it's right there. Fork it, read the prompt, change the playbook.

Pre-alpha, scaffolding stage, expect breakage.

## 🧠 What's baked in

- **Hook archetypes** — controversial take, counterintuitive claim, before/after tease, question loop, pattern interrupt, and more, with the structural rule and an example for each.
- **Video formats** — the canonical short-form shapes (talking head, listicle, voiceover, narrative arc) with the retention notes for each.
- **Retention mechanics** — open loops, callbacks, escalation, payoff timing.
- **Niche playbooks** — what works for fitness vs. business vs. educational vs. entertainment.

The model gets all of this on every turn. You don't have to teach it short-form from scratch.

## 🔓 Open source

MIT. Read every prompt, change every rule. Pin the version, fork the repo, ship your own opinionated build. The interesting part is in `src/lib/patterns/`, not in some vendor's API.

## 🔑 Bring your own key

Anthropic, OpenAI, Gemini, Grok, or Llama via Groq. Your key, your spend, your data. Keys are AES-256-GCM encrypted at rest, decrypted only inside the request that calls your provider. We don't proxy.

## 💻 Runs locally

```bash
git clone https://github.com/aflekkas/shortform-studio
cd shortform-studio
npm install
cp .env.local.example .env.local
npm run dev
```

You need a Supabase project (free tier is fine) and one provider API key. No SaaS, no waitlist, no telemetry pinging home.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `BYOK_ENCRYPTION_KEY` in `.env.local`. Run `supabase/migrations` against your project before first boot.

## 🧰 What's in here

- `src/app/(dashboard)` - cockpit shell, auth-gated.
- `src/components/cockpit` - brand panel, video queue, chat switcher, topbar.
- `src/components/chat` - chat surface + input.
- `src/components/ui` - shadcn / Base UI primitives.
- `src/lib/patterns/pattern-library.md` - **the playbook**.
- `src/lib/anthropic.ts` - system prompt + pattern-library injection.
- `src/lib/supabase` - server + browser Supabase clients.
- `src/lib/db/queries.ts` - shared DB query layer.
- `supabase/migrations` - SQL schema.

## 🛠️ How it works

The chat route loads `pattern-library.md` and injects it as a system message on every turn alongside your creator profile (niche, platform, audience stage, goals). The model is instructed to ground every recommendation in the library — when it invokes a hook archetype or retention mechanic, it names it from the playbook so you build the vocabulary over time. Per-user keys live encrypted in `user_provider_keys`; the chat dispatch in `src/lib/model-dispatch.ts` resolves the right provider SDK at request time.

## 📄 License

MIT

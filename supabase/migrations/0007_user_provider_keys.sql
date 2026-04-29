-- BYOK: per-user encrypted provider API keys + active model selection.

alter table public.user_profiles
  add column if not exists active_provider text not null default 'anthropic',
  add column if not exists active_model text not null default 'claude-sonnet-4-6';

create table if not exists public.user_provider_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  ciphertext bytea not null,
  iv bytea not null,
  auth_tag bytea not null,
  last4 text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider),
  constraint user_provider_keys_provider_check
    check (provider in ('anthropic', 'openai', 'google', 'xai', 'groq'))
);

create index if not exists user_provider_keys_user_id_idx
  on public.user_provider_keys (user_id);

alter table public.user_provider_keys enable row level security;

drop policy if exists "user_provider_keys_select_own" on public.user_provider_keys;
create policy "user_provider_keys_select_own"
  on public.user_provider_keys for select
  using ((select auth.uid()) = user_id);

drop policy if exists "user_provider_keys_insert_own" on public.user_provider_keys;
create policy "user_provider_keys_insert_own"
  on public.user_provider_keys for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_provider_keys_update_own" on public.user_provider_keys;
create policy "user_provider_keys_update_own"
  on public.user_provider_keys for update
  using ((select auth.uid()) = user_id);

drop policy if exists "user_provider_keys_delete_own" on public.user_provider_keys;
create policy "user_provider_keys_delete_own"
  on public.user_provider_keys for delete
  using ((select auth.uid()) = user_id);

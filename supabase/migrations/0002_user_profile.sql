-- User profile: a self-authored bio, plus AI-extracted facts about the creator.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bio text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.user_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_facts_user_id_created_at_idx
  on public.user_facts (user_id, created_at desc);

alter table public.user_profiles enable row level security;
alter table public.user_facts enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using ((select auth.uid()) = user_id);

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  using ((select auth.uid()) = user_id);

drop policy if exists "user_profiles_delete_own" on public.user_profiles;
create policy "user_profiles_delete_own"
  on public.user_profiles for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "user_facts_select_own" on public.user_facts;
create policy "user_facts_select_own"
  on public.user_facts for select
  using ((select auth.uid()) = user_id);

drop policy if exists "user_facts_insert_own" on public.user_facts;
create policy "user_facts_insert_own"
  on public.user_facts for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_facts_update_own" on public.user_facts;
create policy "user_facts_update_own"
  on public.user_facts for update
  using ((select auth.uid()) = user_id);

drop policy if exists "user_facts_delete_own" on public.user_facts;
create policy "user_facts_delete_own"
  on public.user_facts for delete
  using ((select auth.uid()) = user_id);

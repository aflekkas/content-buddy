-- Personalized empty-state starter prompts.

create table if not exists public.user_starter_prompts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  prompts jsonb not null,
  generated_at timestamptz not null default now(),
  source_provider text not null default '',
  source_model text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_starter_prompts_prompts_array check (
    jsonb_typeof(prompts) = 'array'
    and jsonb_array_length(prompts) = 6
  )
);

create index if not exists user_starter_prompts_generated_at_idx
  on public.user_starter_prompts (generated_at);

alter table public.user_starter_prompts enable row level security;

drop policy if exists "user_starter_prompts_select_own" on public.user_starter_prompts;
create policy "user_starter_prompts_select_own"
  on public.user_starter_prompts for select
  using ((select auth.uid()) = user_id);

drop policy if exists "user_starter_prompts_insert_own" on public.user_starter_prompts;
create policy "user_starter_prompts_insert_own"
  on public.user_starter_prompts for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_starter_prompts_update_own" on public.user_starter_prompts;
create policy "user_starter_prompts_update_own"
  on public.user_starter_prompts for update
  using ((select auth.uid()) = user_id);

drop policy if exists "user_starter_prompts_delete_own" on public.user_starter_prompts;
create policy "user_starter_prompts_delete_own"
  on public.user_starter_prompts for delete
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

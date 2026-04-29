create table if not exists public.hooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  notes text not null default '',
  tags text[] not null default '{}',
  source text not null default 'manual' check (source in ('manual', 'chat', 'video')),
  source_chat_id uuid references public.chats(id) on delete set null,
  source_video_id uuid references public.videos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists hooks_user_id_updated_at_idx
  on public.hooks (user_id, updated_at desc);

create index if not exists hooks_tags_idx
  on public.hooks using gin (tags);

alter table public.hooks enable row level security;

drop policy if exists "hooks owner select" on public.hooks;
create policy "hooks owner select" on public.hooks
  for select using (user_id = (select auth.uid()));

drop policy if exists "hooks owner insert" on public.hooks;
create policy "hooks owner insert" on public.hooks
  for insert with check (user_id = (select auth.uid()));

drop policy if exists "hooks owner update" on public.hooks;
create policy "hooks owner update" on public.hooks
  for update using (user_id = (select auth.uid()));

drop policy if exists "hooks owner delete" on public.hooks;
create policy "hooks owner delete" on public.hooks
  for delete using (user_id = (select auth.uid()));

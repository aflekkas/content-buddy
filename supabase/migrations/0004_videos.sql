create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  chat_id uuid references public.chats on delete set null,
  title text not null default '',
  hook text not null default '',
  script text not null default '',
  status text not null default 'idea' check (status in ('idea','ready','filmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  filmed_at timestamptz
);

create index videos_user_id_updated_at_idx on public.videos (user_id, updated_at desc);

alter table public.videos enable row level security;

create policy "videos owner select" on public.videos for select using (user_id = auth.uid());
create policy "videos owner insert" on public.videos for insert with check (user_id = auth.uid());
create policy "videos owner update" on public.videos for update using (user_id = auth.uid());
create policy "videos owner delete" on public.videos for delete using (user_id = auth.uid());

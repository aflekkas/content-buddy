-- Markdown-backed creator memory. Folders are virtual and derived from path
-- segments, e.g. facts/audience.md.

create table if not exists public.memory_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  title text not null,
  content text not null default '',
  autoload boolean not null default false,
  source text not null default 'user'
    check (source in ('user', 'agent', 'migration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memory_files_path_markdown check (
    path <> ''
    and length(path) <= 180
    and path like '%.md'
    and path not like '/%'
    and path not like '%//%'
    and path not like '%/../%'
    and path not like '../%'
    and path not like '%/..'
  ),
  constraint memory_files_user_path_key unique (user_id, path)
);

create index if not exists memory_files_user_id_path_idx
  on public.memory_files (user_id, path);

create index if not exists memory_files_user_id_autoload_idx
  on public.memory_files (user_id, autoload, path);

alter table public.memory_files enable row level security;

drop policy if exists "memory_files_select_own" on public.memory_files;
create policy "memory_files_select_own"
  on public.memory_files for select
  using ((select auth.uid()) = user_id);

drop policy if exists "memory_files_insert_own" on public.memory_files;
create policy "memory_files_insert_own"
  on public.memory_files for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "memory_files_update_own" on public.memory_files;
create policy "memory_files_update_own"
  on public.memory_files for update
  using ((select auth.uid()) = user_id);

drop policy if exists "memory_files_delete_own" on public.memory_files;
create policy "memory_files_delete_own"
  on public.memory_files for delete
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';

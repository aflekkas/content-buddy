-- Align backend naming with the UI: facts → memories.
-- Renames table, column, index, and policies. URLs (/api/memory) already used "memory".

alter table public.user_facts rename to user_memories;
alter table public.user_memories rename column fact to memory;

alter index user_facts_user_id_created_at_idx
  rename to user_memories_user_id_created_at_idx;

drop policy if exists "user_facts_select_own" on public.user_memories;
create policy "user_memories_select_own"
  on public.user_memories for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_facts_insert_own" on public.user_memories;
create policy "user_memories_insert_own"
  on public.user_memories for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_facts_update_own" on public.user_memories;
create policy "user_memories_update_own"
  on public.user_memories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_facts_delete_own" on public.user_memories;
create policy "user_memories_delete_own"
  on public.user_memories for delete to authenticated
  using ((select auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';

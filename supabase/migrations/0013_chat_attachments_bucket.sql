-- Private storage bucket for user-uploaded chat attachments (images today; expandable later).
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

-- Owners may read/write objects under their own user_id prefix.
-- Path convention: <auth.uid()>/<uuid>.<ext>

drop policy if exists "chat_attachments_owner_select" on storage.objects;
create policy "chat_attachments_owner_select"
  on storage.objects for select
  using (
    bucket_id = 'chat-attachments'
    and owner = (select auth.uid())
  );

drop policy if exists "chat_attachments_owner_insert" on storage.objects;
create policy "chat_attachments_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-attachments'
    and owner = (select auth.uid())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "chat_attachments_owner_delete" on storage.objects;
create policy "chat_attachments_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'chat-attachments'
    and owner = (select auth.uid())
  );

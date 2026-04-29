-- Generated tsvector + GIN index for chat message full-text search.
alter table public.messages
  add column if not exists fts tsvector
    generated always as (to_tsvector('english', coalesce(content, ''))) stored;

create index if not exists messages_fts_idx
  on public.messages using gin (fts);

create extension if not exists pg_trgm;

create index if not exists chats_title_trgm_idx
  on public.chats using gin (title gin_trgm_ops);

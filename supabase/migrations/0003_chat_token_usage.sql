-- Running token usage per chat, used to derive a cost estimate.
alter table public.chats
  add column if not exists input_tokens bigint not null default 0,
  add column if not exists output_tokens bigint not null default 0,
  add column if not exists cache_read_tokens bigint not null default 0,
  add column if not exists cache_creation_tokens bigint not null default 0;

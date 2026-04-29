-- Persist UIMessage parts (text, tool calls, file refs, reasoning) alongside the legacy text content column.
alter table public.messages
  add column if not exists parts jsonb;

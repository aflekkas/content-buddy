-- Atomic token usage increment to eliminate read-modify-write race in onFinish.
-- Called from addChatUsage() in src/lib/db/queries.ts.
create or replace function public.add_chat_usage(
  p_chat_id uuid,
  p_input bigint,
  p_output bigint,
  p_cache_read bigint,
  p_cache_creation bigint
) returns void
language sql
security invoker
set search_path = ''
as $$
  update public.chats
  set
    input_tokens        = input_tokens        + p_input,
    output_tokens       = output_tokens       + p_output,
    cache_read_tokens   = cache_read_tokens   + p_cache_read,
    cache_creation_tokens = cache_creation_tokens + p_cache_creation
  where id = p_chat_id;
$$;

grant execute on function public.add_chat_usage(uuid, bigint, bigint, bigint, bigint) to authenticated;

-- Defense-in-depth: scope search_chats() to the calling user explicitly,
-- so the RPC stays correct even if RLS policies on chats/messages drift.

create or replace function public.search_chats(p_query text, p_limit int default 20)
returns table (
  chat_id uuid,
  title text,
  updated_at timestamptz,
  snippet text,
  matched_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with q as (
    select
      websearch_to_tsquery('english', p_query) as tsq,
      p_query as raw
  ),
  hits as (
    select
      m.chat_id,
      m.created_at as matched_at,
      ts_headline(
        'english',
        m.content,
        (select tsq from q),
        'StartSel=<mark>,StopSel=</mark>,MaxWords=20,MinWords=5,ShortWord=2,HighlightAll=false'
      ) as snippet,
      ts_rank((m.fts), (select tsq from q)) as rank,
      row_number() over (
        partition by m.chat_id
        order by ts_rank(m.fts, (select tsq from q)) desc, m.created_at desc
      ) as rn
    from public.messages m
    where m.fts @@ (select tsq from q)
      and exists (
        select 1 from public.chats c
        where c.id = m.chat_id
          and c.user_id = (select auth.uid())
      )
  ),
  best as (
    select chat_id, snippet, matched_at, rank
    from hits
    where rn = 1
  ),
  combined as (
    select
      c.id as chat_id,
      c.title,
      c.updated_at,
      coalesce(b.snippet, c.title) as snippet,
      coalesce(b.matched_at, c.updated_at) as matched_at,
      coalesce(b.rank, 0) + case when c.title ilike '%' || (select raw from q) || '%' then 0.5 else 0 end as score
    from public.chats c
    left join best b on b.chat_id = c.id
    where c.user_id = (select auth.uid())
      and (
        b.chat_id is not null
        or c.title ilike '%' || (select raw from q) || '%'
      )
  )
  select chat_id, title, updated_at, snippet, matched_at
  from combined
  order by score desc, updated_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.search_chats(text, int) to authenticated;

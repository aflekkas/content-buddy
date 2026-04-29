create table if not exists public.api_rate_limits (
  scope text not null,
  identifier text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, identifier, window_start)
);

create index if not exists api_rate_limits_updated_at_idx
  on public.api_rate_limits (updated_at);

alter table public.api_rate_limits enable row level security;

revoke all on public.api_rate_limits from anon;
revoke all on public.api_rate_limits from authenticated;

create or replace function public.check_rate_limit(
  p_scope text,
  p_limit_count integer,
  p_window_seconds integer
) returns table (
  allowed boolean,
  limit_count integer,
  remaining_count integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if v_user_id is null then
    return query select false, p_limit_count, 0, v_now;
    return;
  end if;

  if p_scope !~ '^[a-z0-9:_-]{1,80}$' then
    raise exception 'invalid_rate_limit_scope';
  end if;

  if p_limit_count < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid_rate_limit_config';
  end if;

  v_window_start :=
    to_timestamp(
      floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
    );

  insert into public.api_rate_limits (
    scope,
    identifier,
    window_start,
    count,
    updated_at
  )
  values (p_scope, v_user_id::text, v_window_start, 1, v_now)
  on conflict (scope, identifier, window_start)
  do update set
    count = public.api_rate_limits.count + 1,
    updated_at = v_now
  returning public.api_rate_limits.count into v_count;

  delete from public.api_rate_limits
  where updated_at < v_now - interval '2 days';

  return query
    select
      v_count <= p_limit_count,
      p_limit_count,
      greatest(p_limit_count - v_count, 0),
      v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer)
  to authenticated;

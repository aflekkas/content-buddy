create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  tokens bigint not null default 0 check (tokens >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index if not exists ai_daily_usage_updated_at_idx
  on public.ai_daily_usage (updated_at);

alter table public.ai_daily_usage enable row level security;

revoke all on public.ai_daily_usage from anon;
revoke all on public.ai_daily_usage from authenticated;

alter table public.ai_daily_usage
  add column if not exists cost_micro_usd bigint not null default 0
  check (cost_micro_usd >= 0);

create table if not exists public.landing_video_activity_seed_events (
  id uuid primary key default gen_random_uuid(),
  masked_email text not null,
  provider text not null check (provider in ('anthropic', 'openai', 'google', 'xai', 'groq')),
  country_code text not null default 'US',
  country_name text not null default 'United States',
  country_flag text not null default '🇺🇸',
  action text not null default 'generated a video',
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint landing_video_activity_seed_events_unique
    unique (masked_email, provider, action)
);

alter table public.landing_video_activity_seed_events enable row level security;

drop policy if exists "landing seed events no direct access"
  on public.landing_video_activity_seed_events;
create policy "landing seed events no direct access"
  on public.landing_video_activity_seed_events
  for all
  using (false)
  with check (false);

create index if not exists landing_video_activity_seed_events_occurred_at_idx
  on public.landing_video_activity_seed_events (occurred_at desc);

insert into public.landing_video_activity_seed_events
  (masked_email, provider, country_code, country_name, country_flag, action, occurred_at)
values
  ('m***a@c***o.com', 'anthropic', 'US', 'United States', '🇺🇸', 'generated a video', now() - interval '18 minutes'),
  ('r***n@g***l.com', 'openai', 'CA', 'Canada', '🇨🇦', 'planned a video', now() - interval '34 minutes'),
  ('s***h@p***o.io', 'google', 'GB', 'United Kingdom', '🇬🇧', 'created a clip outline', now() - interval '51 minutes'),
  ('d***l@s***o.dev', 'xai', 'DE', 'Germany', '🇩🇪', 'generated a video', now() - interval '1 hour 12 minutes'),
  ('a***x@n***e.com', 'groq', 'AU', 'Australia', '🇦🇺', 'planned a video', now() - interval '1 hour 48 minutes'),
  ('j***e@m***a.co', 'anthropic', 'NL', 'Netherlands', '🇳🇱', 'created a clip outline', now() - interval '2 hours 20 minutes'),
  ('t***r@v***o.app', 'openai', 'BR', 'Brazil', '🇧🇷', 'generated a video', now() - interval '3 hours 5 minutes'),
  ('k***n@b***d.io', 'google', 'SG', 'Singapore', '🇸🇬', 'planned a video', now() - interval '4 hours 30 minutes')
on conflict (masked_email, provider, action) do update
set
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  country_flag = excluded.country_flag,
  occurred_at = excluded.occurred_at;

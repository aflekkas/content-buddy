-- Onboarding profile fields. These capture what the creator is doing or building
-- so the AI system prompt can lead with a personalized <creator_profile> block
-- on the very first chat.

alter table public.user_profiles
  add column if not exists platforms text[] not null default '{}',
  add column if not exists niche_primary text,
  add column if not exists niche_secondary text[] not null default '{}',
  add column if not exists channel_pitch text,
  add column if not exists audience_stage text
    check (audience_stage in ('starting','growing','established','large')),
  add column if not exists primary_goal text
    check (primary_goal in ('grow','monetize','brand','traffic','experiment')),
  add column if not exists onboarded_at timestamptz;

create index if not exists user_profiles_onboarded_at_idx
  on public.user_profiles (onboarded_at);

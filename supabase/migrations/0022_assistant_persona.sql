-- Per-user assistant persona: a friendly name and free-form personality blurb
-- that get injected into the system prompt so the bot answers under that
-- identity. Both nullable; defaults handled at the application layer.

alter table public.user_profiles
  add column if not exists assistant_name text,
  add column if not exists assistant_persona text;

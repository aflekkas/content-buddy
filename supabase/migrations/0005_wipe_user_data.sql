-- Destructive: wipe all user-generated content so the new onboarding flow
-- starts every account from a clean slate. auth.users is intentionally
-- left alone; existing accounts will sign in and be routed into onboarding
-- because their user_profiles row (and onboarded_at flag) is gone.

truncate table public.messages restart identity cascade;
truncate table public.chats restart identity cascade;
truncate table public.user_facts restart identity cascade;
truncate table public.videos restart identity cascade;
truncate table public.user_profiles restart identity cascade;

-- Onboarding flow removed. Users land directly on /dashboard/chat.
-- Drop the gate column + index. niche/voice fields stay (used by system prompt) until memory facts replace them.

DROP INDEX IF EXISTS public.user_profiles_onboarded_at_idx;

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS onboarded_at;

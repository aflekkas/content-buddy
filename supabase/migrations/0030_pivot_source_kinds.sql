ALTER TABLE public.monitored_sources
  DROP CONSTRAINT IF EXISTS monitored_sources_kind_check;

ALTER TABLE public.monitored_sources
  ADD CONSTRAINT monitored_sources_kind_check
    CHECK (kind IN ('x_self','x_account','rss_feed','life_journal'));

ALTER TABLE public.monitored_sources
  ADD COLUMN IF NOT EXISTS url text;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS voice_samples text;

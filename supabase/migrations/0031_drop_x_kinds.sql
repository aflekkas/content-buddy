DELETE FROM public.monitored_sources
WHERE kind IN ('x_self','x_account');

ALTER TABLE public.monitored_sources
  DROP CONSTRAINT IF EXISTS monitored_sources_kind_check;

ALTER TABLE public.monitored_sources
  ADD CONSTRAINT monitored_sources_kind_check
    CHECK (kind IN ('rss_feed','life_journal'));

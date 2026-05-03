-- Life journal surface removed. RSS-only sources now.

DELETE FROM public.monitored_sources
WHERE kind = 'life_journal';

ALTER TABLE public.monitored_sources
  DROP CONSTRAINT IF EXISTS monitored_sources_kind_check;

ALTER TABLE public.monitored_sources
  ADD CONSTRAINT monitored_sources_kind_check
    CHECK (kind IN ('rss_feed'));

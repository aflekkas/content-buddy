alter table public.drafts
  add column if not exists posted_at timestamptz;

alter table public.drafts
  drop constraint if exists drafts_status_check;

alter table public.drafts
  add constraint drafts_status_check
  check (status in ('draft', 'copied', 'posted', 'dismissed'));

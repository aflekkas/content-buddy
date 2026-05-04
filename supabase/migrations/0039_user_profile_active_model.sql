-- Active provider/model selection persisted per user.
-- Drives the inline model picker at the bottom of the chat.

alter table public.user_profiles
  add column if not exists active_provider_id text not null default 'openai',
  add column if not exists active_model_id   text not null default 'gpt-5.4';

comment on column public.user_profiles.active_provider_id is
  'Provider id selected by the user. Validated against PROVIDERS catalogue in app code.';
comment on column public.user_profiles.active_model_id is
  'Model id selected by the user. Validated against the chosen provider in app code.';

NOTIFY pgrst, 'reload schema';

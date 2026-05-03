DROP TABLE IF EXISTS public.user_provider_keys;
DROP TABLE IF EXISTS public.user_external_credentials;

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS active_provider,
  DROP COLUMN IF EXISTS active_model;

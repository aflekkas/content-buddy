ALTER TABLE public.user_provider_keys
  DROP CONSTRAINT user_provider_keys_provider_check,
  ADD CONSTRAINT user_provider_keys_provider_check CHECK (provider = 'openai');

DELETE FROM public.user_provider_keys WHERE provider <> 'openai';

ALTER TABLE public.user_profiles
  ALTER COLUMN active_provider SET DEFAULT 'openai',
  ALTER COLUMN active_model SET DEFAULT 'gpt-4o-mini';

UPDATE public.user_profiles
SET active_provider = 'openai',
    active_model = 'gpt-4o-mini'
WHERE active_provider <> 'openai';

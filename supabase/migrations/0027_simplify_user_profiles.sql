ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS platforms,
  DROP COLUMN IF EXISTS niche_primary,
  DROP COLUMN IF EXISTS niche_secondary,
  DROP COLUMN IF EXISTS channel_pitch,
  DROP COLUMN IF EXISTS audience_stage,
  DROP COLUMN IF EXISTS primary_goal,
  DROP COLUMN IF EXISTS assistant_name,
  DROP COLUMN IF EXISTS assistant_persona,
  ADD COLUMN niche text,
  ADD COLUMN voice_notes text;

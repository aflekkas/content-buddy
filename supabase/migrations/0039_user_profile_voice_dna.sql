-- Distilled voice profile derived from voice_samples + recent drafts.
-- Cached so synthesis can pass a structured spec instead of dumping raw
-- samples into every call. Regenerated when voice_samples changes or on
-- explicit user request.

alter table public.user_profiles
  add column if not exists voice_dna text;

comment on column public.user_profiles.voice_dna is
  'Structured voice profile (signature openers, sentence-length distribution, banned phrases the user implicitly avoids, recurring topics, common metaphors). Distilled from voice_samples + recent drafts via /api/profile/distill-voice.';

NOTIFY pgrst, 'reload schema';

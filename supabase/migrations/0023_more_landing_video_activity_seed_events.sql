insert into public.landing_video_activity_seed_events
  (masked_email, provider, country_code, country_name, country_flag, action, occurred_at)
values
  ('l***a@f***w.io', 'xai', 'ES', 'Spain', '🇪🇸', 'created a short-form brief', now() - interval '5 hours 15 minutes'),
  ('p***l@c***r.co', 'groq', 'FR', 'France', '🇫🇷', 'generated a video', now() - interval '6 hours 40 minutes'),
  ('n***i@s***p.com', 'anthropic', 'IN', 'India', '🇮🇳', 'planned a video', now() - interval '7 hours 25 minutes'),
  ('v***a@g***h.dev', 'openai', 'MX', 'Mexico', '🇲🇽', 'created a clip outline', now() - interval '8 hours 10 minutes'),
  ('b***n@r***l.io', 'google', 'SE', 'Sweden', '🇸🇪', 'generated a video', now() - interval '9 hours 35 minutes'),
  ('c***e@d***o.app', 'xai', 'JP', 'Japan', '🇯🇵', 'planned a video', now() - interval '10 hours 50 minutes'),
  ('h***o@v***s.co', 'groq', 'ZA', 'South Africa', '🇿🇦', 'created a short-form brief', now() - interval '12 hours 5 minutes'),
  ('e***n@l***b.ai', 'anthropic', 'IE', 'Ireland', '🇮🇪', 'generated a video', now() - interval '13 hours 30 minutes')
on conflict (masked_email, provider, action) do update
set
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  country_flag = excluded.country_flag,
  occurred_at = excluded.occurred_at;

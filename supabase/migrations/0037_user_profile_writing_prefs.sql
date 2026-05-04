-- Writing preferences for synthesis: style, audience, post-type targeting.
-- All soft hints; the synthesis prompt frames them as "consider, don't force".

alter table public.user_profiles
  add column if not exists target_audience text,
  add column if not exists post_goal text,
  add column if not exists formality smallint not null default 3
    check (formality between 1 and 5),
  add column if not exists elaboration smallint not null default 2
    check (elaboration between 1 and 3),
  add column if not exists length_pref integer not null default 1500
    check (length_pref between 200 and 5000),
  add column if not exists preferred_post_types text[] not null default '{}',
  add column if not exists avoid_phrases text,
  add column if not exists include_links boolean not null default false;

comment on column public.user_profiles.target_audience is
  'Soft hint passed to synthesis. Free-form ICP description.';
comment on column public.user_profiles.post_goal is
  'Soft hint. What the user wants the post to accomplish.';
comment on column public.user_profiles.formality is
  '1=ultra-casual, 5=formal-exec.';
comment on column public.user_profiles.elaboration is
  '1=tight/punchy, 2=balanced, 3=expansive long-form.';
comment on column public.user_profiles.preferred_post_types is
  'Subset of canonical post types: hot_take, story, framework, teardown, listicle, contrarian, question, lesson.';

-- Track which post-type the synthesis chose; lets read_past_drafts surface
-- shape diversity and the chat agent calibrate to recent voice.
alter table public.drafts
  add column if not exists post_type text;

NOTIFY pgrst, 'reload schema';

CREATE TABLE public.monitored_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('x_self','x_account')),
  handle text NOT NULL,
  topic_tags text[] NOT NULL DEFAULT '{}',
  poll_interval_hours int NOT NULL DEFAULT 24,
  last_polled_at timestamptz,
  last_synthesized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, handle)
);

CREATE TABLE public.signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.monitored_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  url text NOT NULL,
  posted_at timestamptz NOT NULL,
  raw jsonb NOT NULL,
  summary text,
  relevance_score numeric,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','queued','drafted','dismissed')),
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, external_id)
);

CREATE TABLE public.drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_ids uuid[] NOT NULL DEFAULT '{}',
  chat_id uuid REFERENCES public.chats(id) ON DELETE SET NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','copied','dismissed')),
  copied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX monitored_sources_user_id_idx
  ON public.monitored_sources (user_id);
CREATE INDEX signals_user_id_status_posted_at_idx
  ON public.signals (user_id, status, posted_at DESC);
CREATE INDEX signals_source_id_posted_at_idx
  ON public.signals (source_id, posted_at DESC);
CREATE INDEX drafts_user_id_created_at_idx
  ON public.drafts (user_id, created_at DESC);

ALTER TABLE public.monitored_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitored_sources_select_own" ON public.monitored_sources;
CREATE POLICY "monitored_sources_select_own"
  ON public.monitored_sources FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "monitored_sources_insert_own" ON public.monitored_sources;
CREATE POLICY "monitored_sources_insert_own"
  ON public.monitored_sources FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "monitored_sources_update_own" ON public.monitored_sources;
CREATE POLICY "monitored_sources_update_own"
  ON public.monitored_sources FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "monitored_sources_delete_own" ON public.monitored_sources;
CREATE POLICY "monitored_sources_delete_own"
  ON public.monitored_sources FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "signals_select_own" ON public.signals;
CREATE POLICY "signals_select_own"
  ON public.signals FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "signals_insert_own" ON public.signals;
CREATE POLICY "signals_insert_own"
  ON public.signals FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "signals_update_own" ON public.signals;
CREATE POLICY "signals_update_own"
  ON public.signals FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "signals_delete_own" ON public.signals;
CREATE POLICY "signals_delete_own"
  ON public.signals FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "drafts_select_own" ON public.drafts;
CREATE POLICY "drafts_select_own"
  ON public.drafts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "drafts_insert_own" ON public.drafts;
CREATE POLICY "drafts_insert_own"
  ON public.drafts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "drafts_update_own" ON public.drafts;
CREATE POLICY "drafts_update_own"
  ON public.drafts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "drafts_delete_own" ON public.drafts;
CREATE POLICY "drafts_delete_own"
  ON public.drafts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

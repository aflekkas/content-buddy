-- Long-term agent memory. Flat list of short facts the user (or agent) wrote.
-- Injected into chat system prompt every turn.

CREATE TABLE IF NOT EXISTS public.user_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact text NOT NULL CHECK (length(fact) BETWEEN 1 AND 500),
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user','agent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_facts_user_id_created_at_idx
  ON public.user_facts (user_id, created_at DESC);

ALTER TABLE public.user_facts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_facts_select_own" ON public.user_facts;
CREATE POLICY "user_facts_select_own"
  ON public.user_facts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_facts_insert_own" ON public.user_facts;
CREATE POLICY "user_facts_insert_own"
  ON public.user_facts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_facts_update_own" ON public.user_facts;
CREATE POLICY "user_facts_update_own"
  ON public.user_facts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_facts_delete_own" ON public.user_facts;
CREATE POLICY "user_facts_delete_own"
  ON public.user_facts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

NOTIFY pgrst, 'reload schema';

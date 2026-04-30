CREATE TABLE public.user_external_credentials (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('apify')),
  ciphertext bytea NOT NULL,
  iv bytea NOT NULL,
  auth_tag bytea NOT NULL,
  last4 text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind)
);

CREATE INDEX user_external_credentials_user_id_idx
  ON public.user_external_credentials (user_id);

ALTER TABLE public.user_external_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_external_credentials_select_own"
  ON public.user_external_credentials;
CREATE POLICY "user_external_credentials_select_own"
  ON public.user_external_credentials FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_external_credentials_insert_own"
  ON public.user_external_credentials;
CREATE POLICY "user_external_credentials_insert_own"
  ON public.user_external_credentials FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_external_credentials_update_own"
  ON public.user_external_credentials;
CREATE POLICY "user_external_credentials_update_own"
  ON public.user_external_credentials FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_external_credentials_delete_own"
  ON public.user_external_credentials;
CREATE POLICY "user_external_credentials_delete_own"
  ON public.user_external_credentials FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

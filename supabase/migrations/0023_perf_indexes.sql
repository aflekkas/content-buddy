-- Performance indexes
-- chats(id, user_id): accelerates messages_select_own RLS subquery
--   (EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid()))
-- videos(user_id, status): covers status-filtered queries in cockpit video queue

CREATE INDEX CONCURRENTLY IF NOT EXISTS chats_id_user_id_idx
  ON public.chats (id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS videos_user_id_status_idx
  ON public.videos (user_id, status);

ANALYZE public.chats;
ANALYZE public.videos;

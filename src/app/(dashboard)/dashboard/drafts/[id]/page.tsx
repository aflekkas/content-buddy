import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  createChat,
  getChat,
  getDraft,
  listSignalsByIds,
  listSources,
  updateDraft,
} from "@/lib/db/queries";
import { DraftChatSidebar } from "@/components/drafts/draft-chat-sidebar";
import { DraftEditor } from "@/components/drafts/draft-editor";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const draft = await getDraft(user.id, id);
  if (!draft || draft.status === "dismissed") notFound();

  const [signals, sources] = await Promise.all([
    listSignalsByIds(user.id, draft.signal_ids),
    listSources(user.id),
  ]);
  const sourceHandles = new Map(
    sources.map((source) => [source.id, source.handle]),
  );
  const handles = signals
    .map((signal) => sourceHandles.get(signal.source_id))
    .filter((handle): handle is string => Boolean(handle));

  let chat = draft.chat_id ? await getChat(draft.chat_id, user.id) : null;
  if (!chat) {
    chat = await createChat(user.id);
    await updateDraft(user.id, draft.id, { chat_id: chat.id });
  }

  return (
    <main className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4 md:p-6">
      <DraftEditor draft={draft} sourceHandles={handles} />
      <DraftChatSidebar draftId={draft.id} chat={chat} userId={user.id} />
    </main>
  );
}

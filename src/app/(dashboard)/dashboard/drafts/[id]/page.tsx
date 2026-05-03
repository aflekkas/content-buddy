import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { createChat, getDraft, updateDraft } from "@/lib/db/queries";

export default async function DraftDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const draft = await getDraft(user.id, id);
  if (!draft || draft.status === "dismissed") notFound();

  let chatId = draft.chat_id;
  if (!chatId) {
    const chat = await createChat(user.id);
    chatId = chat.id;
    await updateDraft(user.id, draft.id, { chat_id: chatId });
  }

  redirect(`/dashboard/chat/${chatId}?drafts=${draft.id}`);
}

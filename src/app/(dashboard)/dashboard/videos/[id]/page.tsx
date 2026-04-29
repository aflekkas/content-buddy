import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getVideo, listChats } from "@/lib/db/queries";

export default async function VideoEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const video = await getVideo(user.id, id);
  if (!video) notFound();

  const chats = await listChats(user.id);
  const targetChatId = video.chat_id ?? chats[0]?.id;
  if (targetChatId) {
    redirect(`/dashboard/chat/${targetChatId}?video=${id}`);
  }

  redirect(`/dashboard/chat/new?video=${id}`);
}

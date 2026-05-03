import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { createChat, listChats } from "@/lib/db/queries";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const chats = await listChats(user.id);
  if (chats.length > 0) {
    redirect(`/dashboard/chat/${chats[0].id}`);
  }

  const chat = await createChat(user.id);
  redirect(`/dashboard/chat/${chat.id}`);
}

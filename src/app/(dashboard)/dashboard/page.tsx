import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listChats } from "@/lib/db/queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const chats = await listChats(user.id);
  if (chats.length > 0) {
    redirect(`/dashboard/chat/${chats[0].id}`);
  }
  redirect("/dashboard/chat/new");
}

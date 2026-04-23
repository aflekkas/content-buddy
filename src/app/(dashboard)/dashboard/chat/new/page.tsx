import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createChat } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const chat = await createChat(user.id);
  redirect(`/dashboard/chat/${chat.id}`);
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createChat } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NewChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  async function createNewChat() {
    "use server";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/");

    const chat = await createChat(user.id);
    redirect(`/dashboard/chat/${chat.id}`);
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form action={createNewChat} className="w-full max-w-sm">
        <Card className="rounded-2xl border p-6 ring-0 shadow-sm">
          <h1 className="text-lg font-semibold">Start a new chat</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a fresh thread for a new content idea.
          </p>
          <Button type="submit" className="mt-5 w-full">
            Create chat
          </Button>
        </Card>
      </form>
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUserProfile,
  listChats,
  listUserFacts,
  listVideos,
} from "@/lib/db/queries";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [chats, profile, facts, videos] = await Promise.all([
    listChats(user.id),
    getUserProfile(user.id),
    listUserFacts(user.id),
    listVideos(user.id),
  ]);

  return (
    <CockpitShell
      user={{ id: user.id, email: user.email ?? "" }}
      bio={profile?.bio ?? ""}
      facts={facts}
      videos={videos}
      chats={chats}
    >
      {children}
    </CockpitShell>
  );
}

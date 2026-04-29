import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";
import { BrandPanelLoader } from "@/components/cockpit/loaders/brand-panel-loader";
import { BrandPanelSkeleton } from "@/components/cockpit/loaders/brand-panel-skeleton";
import { VideoQueueLoader } from "@/components/cockpit/loaders/video-queue-loader";
import { VideoQueueSkeleton } from "@/components/cockpit/loaders/video-queue-skeleton";
import { ChatSwitcherLoader } from "@/components/cockpit/loaders/chat-switcher-loader";
import { ChatSwitcherSkeleton } from "@/components/cockpit/loaders/chat-switcher-skeleton";

export default async function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return (
    <CockpitShell
      user={{ id: user.id, email: user.email ?? "" }}
      brandSlot={
        <Suspense fallback={<BrandPanelSkeleton />}>
          <BrandPanelLoader userId={user.id} />
        </Suspense>
      }
      videoSlot={
        <Suspense fallback={<VideoQueueSkeleton />}>
          <VideoQueueLoader userId={user.id} />
        </Suspense>
      }
      chatSwitcherSlot={
        <Suspense fallback={<ChatSwitcherSkeleton />}>
          <ChatSwitcherLoader userId={user.id} />
        </Suspense>
      }
    >
      {children}
    </CockpitShell>
  );
}

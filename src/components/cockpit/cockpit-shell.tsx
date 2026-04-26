"use client";

import { useParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import type {
  ChatRow,
  UserFactRow,
  VideoRow,
} from "@/lib/db/types";
import { BrandPanel } from "@/components/cockpit/brand-panel";
import { ChatSwitcher } from "@/components/cockpit/chat-switcher";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { TopBar } from "@/components/cockpit/topbar";
import { VideoQueue } from "@/components/cockpit/video-queue";
import { FadeIn } from "@/components/ui/motion";

type Props = {
  user: { id: string; email: string };
  bio: string;
  facts: UserFactRow[];
  videos: VideoRow[];
  chats: ChatRow[];
  children: React.ReactNode;
};

export function CockpitShell({
  user,
  bio,
  facts,
  videos,
  chats,
  children,
}: Props) {
  const params = useParams<{ id?: string }>();
  const activeChatId = params?.id ?? "";
  const activeChat = chats.find((c) => c.id === activeChatId);
  const activeTitle = activeChat?.title?.trim() || "New chat";

  const brandPanelKey = `${bio}::${facts
    .map((fact) => `${fact.id}:${fact.content}`)
    .join("|")}`;
  const videoQueueKey = videos
    .map((video) => `${video.id}:${video.status}:${video.updated_at}`)
    .join("|");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar email={user.email} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <FadeIn
          y={0}
          delay={0.04}
          className="w-full shrink-0 border-b lg:h-full lg:w-80 lg:border-r lg:border-b-0"
        >
          <aside className="h-full">
            <BrandPanel key={brandPanelKey} bio={bio} facts={facts} />
          </aside>
        </FadeIn>

        <FadeIn
          y={0}
          delay={0.08}
          className="w-full shrink-0 border-b lg:h-full lg:w-[380px] lg:border-r lg:border-b-0"
        >
          <aside className="h-full">
            <VideoQueue key={videoQueueKey} videos={videos} />
          </aside>
        </FadeIn>

        <FadeIn y={0} delay={0.12} className="min-h-0 flex-1">
          <section className="flex h-full flex-col">
            <ColumnHeader
              icon={Sparkles}
              titleSlot={
                <ChatSwitcher
                  chats={chats}
                  activeChatId={activeChatId}
                  activeTitle={activeTitle}
                />
              }
            />
            <div className="min-h-0 flex-1">{children}</div>
          </section>
        </FadeIn>
      </div>
    </div>
  );
}

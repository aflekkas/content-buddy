import { Sparkles } from "lucide-react";
import { BrandPanelSkeleton } from "@/components/cockpit/loaders/brand-panel-skeleton";
import { VideoQueueSkeleton } from "@/components/cockpit/loaders/video-queue-skeleton";
import { ChatSwitcherSkeleton } from "@/components/cockpit/loaders/chat-switcher-skeleton";
import { ColumnHeader } from "@/components/cockpit/column-header";

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Topbar placeholder */}
      <div className="flex h-14 shrink-0 items-center border-b bg-background px-5" aria-hidden />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Brand panel column */}
        <div className="w-full shrink-0 border-b lg:h-full lg:w-80 lg:border-r lg:border-b-0">
          <aside className="h-full">
            <BrandPanelSkeleton />
          </aside>
        </div>

        {/* Video queue column */}
        <div className="w-full shrink-0 border-b lg:h-full lg:w-[380px] lg:border-r lg:border-b-0">
          <aside className="h-full">
            <VideoQueueSkeleton />
          </aside>
        </div>

        {/* Chat column */}
        <div className="min-h-0 flex-1">
          <section className="flex h-full flex-col">
            <ColumnHeader icon={Sparkles} titleSlot={<ChatSwitcherSkeleton />} />
            <div className="min-h-0 flex-1" />
          </section>
        </div>
      </div>
    </div>
  );
}

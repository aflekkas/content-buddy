import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { TopBar } from "@/components/cockpit/topbar";

type Props = {
  user: { id: string; email: string };
  brandSlot: ReactNode;
  videoSlot: ReactNode;
  chatSwitcherSlot: ReactNode;
  children: ReactNode;
};

export function CockpitShell({
  user,
  brandSlot,
  videoSlot,
  chatSwitcherSlot,
  children,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar email={user.email} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="w-full shrink-0 border-b lg:h-full lg:w-80 lg:border-r lg:border-b-0">
          <aside className="h-full">{brandSlot}</aside>
        </div>

        <div className="w-full shrink-0 border-b lg:h-full lg:w-[380px] lg:border-r lg:border-b-0">
          <aside className="h-full">{videoSlot}</aside>
        </div>

        <div className="min-h-0 flex-1">
          <section className="flex h-full flex-col">
            <ColumnHeader
              icon={Sparkles}
              titleSlot={chatSwitcherSlot}
            />
            <div className="min-h-0 flex-1">{children}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

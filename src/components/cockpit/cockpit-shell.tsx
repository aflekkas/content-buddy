"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { CockpitFrame } from "@/components/cockpit/cockpit-primitives";
import { TopBar } from "@/components/cockpit/topbar";

type Props = {
  user: { id: string; email: string };
  children: ReactNode;
};

export function CockpitShell({ user, children }: Props) {
  return (
    <CockpitFrame>
      <TopBar email={user.email} />
      <section className="flex min-h-0 flex-1 flex-col">
        <ColumnHeader
          icon={Sparkles}
          iconTone="chat"
          titleSlot={
            <span className="text-sm font-medium text-foreground">
              OpenAI chat
            </span>
          }
        />
        <div className="min-h-0 flex-1">{children}</div>
      </section>
    </CockpitFrame>
  );
}

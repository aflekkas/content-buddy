"use client";

import type { ReactNode } from "react";
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
      <section className="flex min-h-0 flex-1 flex-col">{children}</section>
    </CockpitFrame>
  );
}

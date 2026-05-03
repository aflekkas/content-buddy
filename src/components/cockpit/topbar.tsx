"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CockpitTopBarFrame } from "@/components/cockpit/cockpit-primitives";
import { LogoLockup } from "@/components/logo";
import { BRAND_NAME } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";
import { useSettingsDialog } from "@/components/settings/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Props = {
  email: string;
};

const TABS = [
  { href: "/dashboard/chat", label: "Chat", segment: "chat" },
  { href: "/dashboard/news", label: "News", segment: "news" },
  { href: "/dashboard/memory", label: "Memory", segment: "memory" },
  { href: "/dashboard/drafts", label: "Drafts", segment: "drafts" },
];

export function TopBar({ email }: Props) {
  const [signingOut, setSigningOut] = useState(false);
  const settings = useSettingsDialog();
  const pathname = usePathname() ?? "";

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <CockpitTopBarFrame>
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/"
          aria-label={`${BRAND_NAME} home`}
          className="inline-flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoLockup iconClassName="size-[18px]" textClassName="hidden sm:inline" />
        </Link>
        <nav className="flex items-center gap-1">
          {TABS.map((tab) => {
            const active = pathname.startsWith(`/dashboard/${tab.segment}`);
            return (
              <Link
                key={tab.segment}
                href={tab.href}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          {email}
        </p>
        <ThemeToggle />
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => settings.open()}
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings className="size-4" />
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          aria-label="Sign out"
          title="Sign out"
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut />
        </Button>
      </div>
    </CockpitTopBarFrame>
  );
}

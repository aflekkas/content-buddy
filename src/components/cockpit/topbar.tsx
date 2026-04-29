"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CockpitTopBarFrame } from "@/components/cockpit/cockpit-primitives";
import { LogoLockup } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { useSettingsDialog } from "@/components/settings/settings-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  email: string;
};

export function TopBar({ email }: Props) {
  const [signingOut, setSigningOut] = useState(false);
  const settings = useSettingsDialog();

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
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          aria-label="Shortform Studio home"
          className="inline-flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoLockup iconClassName="size-[18px]" textClassName="hidden sm:inline" />
        </Link>
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

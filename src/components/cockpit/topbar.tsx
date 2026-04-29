"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoLockup } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { EASE_OUT } from "@/lib/motion";
import { useReducedMotionSafe } from "@/lib/motion";
import { useSettingsDialog } from "@/components/settings/settings-dialog";

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

  const reducedMotion = useReducedMotionSafe();

  return (
    <motion.header
      className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-5"
      initial={reducedMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          aria-label="Shortform Studio home"
          className="inline-flex min-w-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoLockup iconClassName="size-5" textClassName="hidden sm:inline" />
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="hidden truncate text-sm text-muted-foreground sm:block">
          {email}
        </p>
        <button
          type="button"
          aria-label="Settings"
          title="Settings"
          onClick={() => settings.open()}
          className="inline-flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)] text-muted-foreground hover:bg-muted hover:text-foreground"
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
    </motion.header>
  );
}

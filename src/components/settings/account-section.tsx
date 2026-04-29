"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
};

export function AccountSection({ email }: Props) {
  const [signingOut, setSigningOut] = useState(false);

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
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-background p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Signed in as
        </p>
        <p className="mt-1 text-sm font-medium break-all">{email}</p>
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          <LogOut />
          {signingOut ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  );
}

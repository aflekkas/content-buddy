import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CockpitShell } from "@/components/cockpit/cockpit-shell";

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
    >
      {children}
    </CockpitShell>
  );
}

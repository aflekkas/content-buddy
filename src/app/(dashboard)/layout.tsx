import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedOnboarding } from "@/lib/db/queries";
import { SettingsDialogProvider } from "@/components/settings/settings-dialog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const onboarded = await hasCompletedOnboarding(user.id);
  if (!onboarded) {
    redirect("/onboarding");
  }

  return (
    <SettingsDialogProvider>
      <div className="h-svh overflow-hidden flex flex-col">{children}</div>
    </SettingsDialogProvider>
  );
}

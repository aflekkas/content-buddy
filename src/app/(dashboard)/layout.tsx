import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile, hasCompletedOnboarding } from "@/lib/db/queries";
import { SettingsDialogProvider } from "@/components/settings/settings-dialog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const [onboarded, profile] = await Promise.all([
    hasCompletedOnboarding(user.id),
    getUserProfile(user.id),
  ]);

  if (!onboarded) {
    redirect("/onboarding");
  }

  return (
    <SettingsDialogProvider profile={profile}>
      <div className="h-svh overflow-hidden flex flex-col">{children}</div>
    </SettingsDialogProvider>
  );
}

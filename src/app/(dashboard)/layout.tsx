import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/queries";
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

  const profile = await getUserProfile(user.id);

  return (
    <SettingsDialogProvider profile={profile}>
      <div className="h-svh overflow-hidden flex flex-col">{children}</div>
    </SettingsDialogProvider>
  );
}

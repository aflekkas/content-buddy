import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  ensureStarterMemoryFiles,
  getActiveModel,
  getUserProfile,
  hasCompletedOnboarding,
  listProviderKeyMeta,
  listUserFacts,
} from "@/lib/db/queries";
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

  const [onboarded, keys, active, profile, facts, memoryFiles] =
    await Promise.all([
      hasCompletedOnboarding(user.id),
      listProviderKeyMeta(user.id),
      getActiveModel(user.id),
      getUserProfile(user.id),
      listUserFacts(user.id),
      ensureStarterMemoryFiles(user.id),
    ]);

  if (!onboarded) {
    redirect("/onboarding");
  }

  return (
    <SettingsDialogProvider
      initialKeys={keys}
      initialActive={active}
      profile={profile}
      initialFacts={facts}
      initialMemoryFiles={memoryFiles}
      email={user.email ?? ""}
    >
      <div className="h-svh overflow-hidden flex flex-col">{children}</div>
    </SettingsDialogProvider>
  );
}

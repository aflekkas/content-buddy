import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <OnboardingFlow userId={user.id} />;
}

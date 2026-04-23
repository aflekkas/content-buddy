import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, listUserFacts } from "@/lib/db/queries";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { BRAND_NAME } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profile, facts] = await Promise.all([
    getUserProfile(user.id),
    listUserFacts(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your context</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What {BRAND_NAME} knows about you. The bio is yours to write. Facts
          are learned automatically from your chats; you can delete any that are
          wrong or stale.
        </p>
      </div>
      <ProfileEditor initialBio={profile?.bio ?? ""} initialFacts={facts} />
    </div>
  );
}

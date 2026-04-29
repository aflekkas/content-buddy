import { getUserProfile, listUserFacts } from "@/lib/db/queries";
import { BrandPanel } from "@/components/cockpit/brand-panel";

type Props = {
  userId: string;
};

export async function BrandPanelLoader({ userId }: Props) {
  const [profile, facts] = await Promise.all([
    getUserProfile(userId),
    listUserFacts(userId),
  ]);

  return <BrandPanel bio={profile?.bio ?? ""} facts={facts} />;
}

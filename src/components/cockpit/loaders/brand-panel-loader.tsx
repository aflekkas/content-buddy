import { getUserProfile, listUserFacts } from "@/lib/db/queries";
import { BrandPanel } from "@/components/cockpit/brand-panel";
import { FadeIn } from "@/components/ui/motion";

type Props = {
  userId: string;
};

export async function BrandPanelLoader({ userId }: Props) {
  const [profile, facts] = await Promise.all([
    getUserProfile(userId),
    listUserFacts(userId),
  ]);

  return (
    <FadeIn y={0} delay={0.04} className="h-full">
      <BrandPanel bio={profile?.bio ?? ""} facts={facts} />
    </FadeIn>
  );
}

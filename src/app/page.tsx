import { createClient } from "@/lib/supabase/server";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ByokSection } from "@/components/landing/byok-section";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto">
      <LandingNav isAuthed={isAuthed} />
      <main className="flex-1">
        <Hero isAuthed={isAuthed} />
        <HowItWorks />
        <ByokSection />
        <FinalCta isAuthed={isAuthed} />
      </main>
      <LandingFooter isAuthed={isAuthed} />
    </div>
  );
}

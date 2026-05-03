import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { listFacts } from "@/lib/db/queries";
import { FactsList } from "@/components/memory/facts-list";

export default async function MemoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const facts = await listFacts(user.id);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Memory</h1>
          <p className="text-sm text-muted-foreground">
            Long-term context the agent uses every chat. Add what you want it to
            know about your niche, voice, audience.
          </p>
        </header>
        <FactsList initialFacts={facts} />
      </div>
    </main>
  );
}

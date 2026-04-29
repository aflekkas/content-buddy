import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listHooks } from "@/lib/db/queries";
import { HooksGrid } from "@/components/hooks/hooks-grid";

export default async function HooksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const hooks = await listHooks(user.id);

  return <HooksGrid initialHooks={hooks} />;
}

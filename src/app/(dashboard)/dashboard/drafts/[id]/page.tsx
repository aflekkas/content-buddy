import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getDraft } from "@/lib/db/queries";
import { ACTIVE_DRAFTS_PARAM } from "@/lib/active-drafts";

export default async function DraftDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const draft = await getDraft(user.id, id);
  if (!draft || draft.status === "dismissed") notFound();

  redirect(`/dashboard?${ACTIVE_DRAFTS_PARAM}=${draft.id}`);
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { createChat, listChats } from "@/lib/db/queries";
import { parseActiveDraftIds, writeActiveDraftIds } from "@/lib/active-drafts";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const draftIds = parseActiveDraftIds(toSearchString(await searchParams));
  const suffix = draftIds.length > 0 ? `?${toActiveDraftsQuery(draftIds)}` : "";

  const chats = await listChats(user.id);
  if (chats.length > 0) {
    redirect(`/dashboard/chat/${chats[0].id}${suffix}`);
  }

  const chat = await createChat(user.id);
  redirect(`/dashboard/chat/${chat.id}${suffix}`);
}

function toSearchString(
  searchParams: { [key: string]: string | string[] | undefined },
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return params.toString();
}

function toActiveDraftsQuery(ids: string[]): string {
  const params = new URLSearchParams();
  writeActiveDraftIds(params, ids);
  return params.toString();
}

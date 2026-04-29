import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveModel,
  listProviderKeyMeta,
} from "@/lib/db/queries";
import { KeysForm } from "@/components/settings/keys-form";

export const metadata = {
  title: "Settings · Content Buddy",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [keys, active] = await Promise.all([
    listProviderKeyMeta(user.id),
    getActiveModel(user.id),
  ]);

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-8 overflow-y-auto px-6 py-10">
      <header className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to chats
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bring your own API key for any of these providers. Keys are stored
            encrypted at rest and only ever used to call the provider on your
            behalf.
          </p>
        </div>
      </header>

      <KeysForm initialKeys={keys} initialActive={active} />
    </div>
  );
}

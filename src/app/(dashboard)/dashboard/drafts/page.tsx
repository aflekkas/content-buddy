import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { listDrafts, listSignalsByIds, listSources } from "@/lib/db/queries";
import { Card } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/system-prompt";
import { cn } from "@/lib/utils";

export default async function DraftsListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const drafts = await listDrafts(user.id);
  const visible = drafts.filter((d) => d.status !== "dismissed");
  const allSignalIds = visible.flatMap((d) => d.signal_ids);
  const [signals, sources] = await Promise.all([
    listSignalsByIds(user.id, allSignalIds),
    listSources(user.id),
  ]);
  const sourceHandleById = new Map(sources.map((s) => [s.id, s.handle]));
  const signalHandleById = new Map(
    signals.map((s) => [s.id, sourceHandleById.get(s.source_id) ?? null]),
  );

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Drafts</h1>
          <p className="text-sm text-muted-foreground">
            LinkedIn posts you saved from chat or news. Open to edit, copy, or
            dismiss.
          </p>
        </header>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-background p-10 text-center shadow-sm">
            <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              No drafts yet. Ask the agent in chat to draft a post and save it.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((draft) => {
              const handles = draft.signal_ids
                .map((id) => signalHandleById.get(id))
                .filter((h): h is string => Boolean(h));
              const preview = draft.body.slice(0, 240);
              return (
                <li key={draft.id}>
                  <Link href={`/dashboard/drafts/${draft.id}`}>
                    <Card
                      className={cn(
                        "rounded-2xl border bg-background p-4 shadow-sm transition-colors hover:bg-muted/40",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          Draft
                        </span>
                        <span>{formatRelativeTime(draft.created_at)}</span>
                        {draft.status === "copied" && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            copied
                          </span>
                        )}
                        {handles.length > 0 && (
                          <span className="ml-auto truncate text-[11px]">
                            {handles.slice(0, 3).join(", ")}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-foreground">
                        {preview}
                        {draft.body.length > preview.length && "..."}
                      </p>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

import { NextResponse } from "next/server";
import { PROVIDERS, isProviderId, type ProviderId } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type VideoActivityEvent = {
  id: string;
  maskedEmail: string;
  providerLabel: string;
  providerLogo: string;
  occurredAt: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const afterParam = url.searchParams.get("after") ?? undefined;
  const after =
    afterParam && Number.isFinite(new Date(afterParam).getTime())
      ? afterParam
      : undefined;

  const events = await listPublicVideoActivityEvents({ after });

  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function listPublicVideoActivityEvents({
  after,
}: {
  after?: string;
}): Promise<VideoActivityEvent[]> {
  const supabase = createAdminClient();
  const limit = 6;

  async function fetchVideoRows(recentOnly = false) {
    let query = supabase
      .from("videos")
      .select("id,user_id,created_at")
      .order("created_at", { ascending: Boolean(after) })
      .limit(limit);

    if (after) {
      query = query.gt("created_at", after);
    } else if (recentOnly) {
      const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      query = query.gte("created_at", since);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  let videoRows = await fetchVideoRows(!after);
  if (!after && videoRows.length === 0) {
    videoRows = await fetchVideoRows(false);
  }
  if (videoRows.length === 0) return [];

  const userIds = Array.from(new Set(videoRows.map((row) => row.user_id)));
  const [{ data: profiles, error: profileError }, userResults] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id,active_provider")
        .in("user_id", userIds),
      Promise.all(
        userIds.map((userId) => supabase.auth.admin.getUserById(userId)),
      ),
    ]);

  if (profileError) throw profileError;

  const providerByUser = new Map<string, ProviderId>(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      isProviderId(profile.active_provider)
        ? profile.active_provider
        : "anthropic",
    ]),
  );

  const emailByUser = new Map<string, string>();
  for (const result of userResults) {
    const user = result.data.user;
    if (result.error || !user?.id || !user.email) continue;
    emailByUser.set(user.id, user.email);
  }

  const events: VideoActivityEvent[] = [];
  for (const row of videoRows) {
    const email = emailByUser.get(row.user_id);
    if (!email) continue;

    const provider = providerByUser.get(row.user_id) ?? "anthropic";
    const providerMeta = PROVIDERS[provider];

    events.push({
      id: row.id,
      maskedEmail: maskEmailForPublicActivity(email),
      providerLabel: providerMeta.label,
      providerLogo: providerMeta.logo,
      occurredAt: row.created_at,
    });
  }

  return events;
}

function maskEmailForPublicActivity(email: string): string {
  const [local = "", domain = ""] = email.toLowerCase().split("@");
  const [domainName = "", ...rest] = domain.split(".");
  const tld = rest.length > 0 ? `.${rest.at(-1)}` : "";

  return `${maskToken(local)}@${maskToken(domainName)}${tld}`;
}

function maskToken(value: string): string {
  const cleaned = value.replace(/[^a-z0-9]/g, "");
  if (cleaned.length <= 1) return `${cleaned || "u"}***`;
  return `${cleaned[0]}***${cleaned[cleaned.length - 1]}`;
}

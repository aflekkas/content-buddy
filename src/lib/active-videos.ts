export const ACTIVE_VIDEOS_PARAM = "videos";

export function parseActiveVideoIds(
  params: URLSearchParams | string | null | undefined,
): string[] {
  if (!params) return [];

  const raw =
    typeof params === "string"
      ? new URLSearchParams(params).get(ACTIVE_VIDEOS_PARAM)
      : params.get(ACTIVE_VIDEOS_PARAM);

  if (!raw) return [];

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of raw.split(",")) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    ids.push(trimmed);
  }
  return ids;
}

export function writeActiveVideoIds(
  params: URLSearchParams,
  ids: string[],
): void {
  if (ids.length === 0) {
    params.delete(ACTIVE_VIDEOS_PARAM);
    return;
  }
  params.set(ACTIVE_VIDEOS_PARAM, ids.join(","));
}

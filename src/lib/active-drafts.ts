export const ACTIVE_DRAFTS_PARAM = "drafts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseActiveDraftIds(search: string): string[] {
  const params = new URLSearchParams(search);
  const raw = params.get(ACTIVE_DRAFTS_PARAM);
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id || !UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function writeActiveDraftIds(
  params: URLSearchParams,
  ids: string[],
): void {
  if (ids.length === 0) {
    params.delete(ACTIVE_DRAFTS_PARAM);
    return;
  }
  params.set(ACTIVE_DRAFTS_PARAM, ids.join(","));
}

export type SaveState = "idle" | "loading" | "saving" | "saved" | "error";

export const SAVE_DEBOUNCE_MS = 600;

export function SaveIndicator({
  state,
  dirty,
}: {
  state: SaveState;
  dirty: boolean;
}) {
  if (state === "saving") return <span>Saving…</span>;
  if (state === "error")
    return <span className="text-destructive">Save failed</span>;
  if (dirty) return <span>Unsaved</span>;
  if (state === "saved") return <span>Saved</span>;
  return null;
}

export function saveLabel(state: SaveState, dirty: boolean): string {
  if (state === "loading") return "Opening...";
  if (state === "saving") return "Saving...";
  if (state === "error") return "Save failed";
  if (dirty) return "Unsaved";
  if (state === "saved") return "Saved";
  return "Markdown script editor";
}

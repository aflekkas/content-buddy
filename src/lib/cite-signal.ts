import { formatRelativeTime } from "@/lib/system-prompt";
import type { NewsSignalCardData } from "@/components/news/news-signal-card";

export function citeSignal(signal: NewsSignalCardData) {
  const handle = signal.source ? signal.source : "feed";
  const ago = formatRelativeTime(signal.posted_at);
  const excerpt = signal.text.replace(/\s+/g, " ").trim().slice(0, 180);
  const ref = `[signal:${signal.id}] ${handle} · ${ago} — ${excerpt}`;
  window.dispatchEvent(
    new CustomEvent("chat:input-paste", {
      detail: { text: ref, append: true },
    }),
  );
}

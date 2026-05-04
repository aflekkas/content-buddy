import type { NewsSignalCardData } from "@/components/news/news-signal-card";

export type CiteSignalDetail = {
  id: string;
  source: string | null;
  posted_at: string;
  text: string;
};

export function citeSignal(signal: NewsSignalCardData) {
  const detail: CiteSignalDetail = {
    id: signal.id,
    source: signal.source,
    posted_at: signal.posted_at,
    text: signal.text,
  };
  window.dispatchEvent(
    new CustomEvent<CiteSignalDetail>("chat:cite-signal", { detail }),
  );
}

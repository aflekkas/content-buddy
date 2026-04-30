import { FileText, KeyRound, Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    n: "01",
    icon: KeyRound,
    title: "Connect.",
    body: "Paste your OpenAI key and your Apify token. Add your X handle and a few accounts you follow.",
  },
  {
    n: "02",
    icon: Radar,
    title: "Monitor.",
    body: "Daily, we pull new posts. AI scores each for relevance to your audience and drafts your LinkedIn variants.",
  },
  {
    n: "03",
    icon: FileText,
    title: "Draft.",
    body: "Open your inbox, edit any draft in chat, copy the final version, paste into LinkedIn.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="border-t bg-muted/20"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            One loop: connect your inputs, monitor the feed, ship the draft.
          </p>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
            >
              <Card className="h-full rounded-lg border-border/80 bg-background/85 shadow-sm">
                <CardContent className="flex h-full flex-col gap-4 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-medium tracking-widest text-primary">
                      {s.n}
                    </span>
                    <span className="grid size-9 place-items-center rounded-lg border bg-muted/40 text-primary">
                      <s.icon className="size-4" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {s.body}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

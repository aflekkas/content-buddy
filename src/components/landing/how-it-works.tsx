"use client";

import { FileText, KeyRound, Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BlurFade } from "@/components/ui/blur-fade";

const STEPS = [
  {
    n: "01",
    icon: KeyRound,
    title: "Connect.",
    body: "Paste your OpenAI key. Add your niche, your voice, and a few of your best LinkedIn posts.",
  },
  {
    n: "02",
    icon: Radar,
    title: "Feed.",
    body: "Pick a niche bundle or paste your own RSS URLs. Drop a journal note whenever something happens worth posting about.",
  },
  {
    n: "03",
    icon: FileText,
    title: "Scan.",
    body: "Click scan. We draft a news riff, a life post, or a mix in your voice. You edit, copy, ship.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how"
      className="border-t bg-muted/20"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <BlurFade delay={0.05} inView>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <p className="mt-3 text-muted-foreground">
              Connect, feed, scan. Three buttons, one loop.
            </p>
          </div>
        </BlurFade>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, idx) => (
            <li key={s.n} className="h-full">
              <BlurFade delay={0.15 + idx * 0.1} inView className="h-full">
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
              </BlurFade>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

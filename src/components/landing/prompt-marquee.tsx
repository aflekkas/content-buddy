import { Sparkles } from "lucide-react";
import { Marquee } from "@/components/ui/marquee";
import { cn } from "@/lib/utils";

const PROMPTS_A = [
  "give me three hooks for a 45s short on AI tooling",
  "turn this idea into a 30-second script",
  "what's a stronger hook than ‘here's why’",
  "draft an opener that doesn't sound like an ad",
  "rewrite this in my voice, drop the hype",
];

const PROMPTS_B = [
  "five angles for the same topic, ranked",
  "what would i film today if i only had 20 minutes",
  "summarise this thread into a video idea",
  "give me a sharper title for ‘shipping in public’",
  "what's a fresh angle on a tired topic",
];

function Pill({ text }: { text: string }) {
  return (
    <div
      className={cn(
        "mx-2 flex shrink-0 items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm",
        "shadow-sm",
      )}
    >
      <Sparkles className="size-3.5 shrink-0 text-primary/70" />
      <span className="text-foreground">{text}</span>
    </div>
  );
}

export function PromptMarquee() {
  return (
    <section className="relative border-t bg-muted/20 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            The kind of thing you&apos;d ask
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Real prompts, the way they get typed.
          </p>
        </div>
      </div>
      <div className="relative mt-10 overflow-hidden">
        <Marquee pauseOnHover className="[--duration:42s]">
          {PROMPTS_A.map((p) => (
            <Pill key={p} text={p} />
          ))}
        </Marquee>
        <Marquee reverse pauseOnHover className="[--duration:50s] mt-3">
          {PROMPTS_B.map((p) => (
            <Pill key={p} text={p} />
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
      </div>
    </section>
  );
}

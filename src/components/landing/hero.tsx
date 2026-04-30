import { Sparkles } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AuroraText } from "@/components/ui/aurora-text";
import { DotPattern } from "@/components/ui/dot-pattern";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

export function Hero({ isAuthed = false }: { isAuthed?: boolean }) {
  void isAuthed;

  return (
    <section className="relative isolate overflow-hidden">
      <DotPattern
        className={cn(
          "absolute inset-0 -z-10 text-foreground/10",
          "[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]",
        )}
      />
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
        <Stagger className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <StaggerItem>
            <span className="group inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs backdrop-blur">
              <Sparkles className="size-3.5 text-primary" />
              <AnimatedShinyText className="!mx-0 !max-w-none">
                OpenAI chat shell
              </AnimatedShinyText>
            </span>
          </StaggerItem>

          <StaggerItem>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Bring an idea,{" "}
              <AuroraText
                speed={0.8}
                colors={[
                  "oklch(0.685 0.169 237.323)",
                  "oklch(0.746 0.16 232.661)",
                  "oklch(0.55 0.22 250)",
                  "oklch(0.685 0.169 237.323)",
                ]}
              >
                shape it into sharper writing.
              </AuroraText>
            </h1>
          </StaggerItem>

          <StaggerItem>
            <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Stage A strips the product back to a focused OpenAI chat while
              the new synthesis workflow is built.
            </p>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}

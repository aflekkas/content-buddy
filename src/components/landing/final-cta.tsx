import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";
import { buttonVariants } from "@/components/ui/button";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

export function FinalCta({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <section className="relative isolate border-t overflow-hidden">
      <DotPattern
        className={cn(
          "absolute inset-0 -z-10 text-foreground/10",
          "[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]",
        )}
      />
      <div id="start" className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <Stagger>
          <StaggerItem>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Ready to ship more LinkedIn?
            </h2>
          </StaggerItem>
          <StaggerItem>
            <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
              It takes 2 minutes to connect. Free to try with your own keys.
            </p>
          </StaggerItem>
          <StaggerItem className="mt-8 flex flex-col items-center gap-3">
            <Link
              href={isAuthed ? "/dashboard" : "/login"}
              className={cn(buttonVariants({ size: "lg", shape: "pill", withArrow: true }))}
            >
              Start free
              <ArrowRight className="size-4" />
            </Link>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <KeyRound className="size-3.5" />
              Bring your own OpenAI key and Apify token
            </span>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}

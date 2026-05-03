import { Code2, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND_NAME } from "@/lib/brand";

export function ByokSection() {
  return (
    <section id="byok" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Open source. Single key. No middleman.
          </h2>
          <p className="mt-3 text-muted-foreground">
            {BRAND_NAME} is a small open-source app you self-host. Drop your
            OpenAI key in <code className="font-mono text-xs">.env.local</code>{" "}
            and run it.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-md gap-3">
          <Card className="rounded-lg border-border/80 bg-background">
            <CardContent className="flex items-center gap-3 pt-1">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/30 text-foreground">
                <Code2 className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold tracking-tight">
                  github.com/aflekkas/linkedin-studio
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Clone it, run it, fork it.
                </span>
              </span>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0 text-primary" />
          The key never leaves your server. No telemetry, no key broker.
        </p>
      </div>
    </section>
  );
}

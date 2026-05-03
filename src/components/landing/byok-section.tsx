import Image from "next/image";
import { ExternalLink, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BRAND_NAME } from "@/lib/brand";

const TILES = [
  {
    name: "OpenAI",
    href: "https://platform.openai.com",
    logo: "/providers/openai.svg",
    logoWidth: 28,
    logoHeight: 28,
    tagline: "Your OpenAI key. Your bills. No markup.",
    invert: true,
  },
];

export function ByokSection() {
  return (
    <section id="byok" className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Bring the key that runs the loop.
          </h2>
          <p className="mt-3 text-muted-foreground">
            {BRAND_NAME} handles synthesis. Your OpenAI account handles usage.
            No middleman.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-md gap-4">
          {TILES.map((tile) => (
            <a
              key={tile.name}
              href={tile.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <Card className="h-full rounded-lg border-border/80 bg-background transition-colors group-hover:border-primary/35">
                <CardContent className="flex items-center gap-4 pt-1">
                  <span className="grid size-12 shrink-0 place-items-center rounded-lg border bg-muted/30">
                    <Image
                      src={tile.logo}
                      alt=""
                      width={tile.logoWidth}
                      height={tile.logoHeight}
                      className={tile.invert ? "dark:invert" : ""}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
                      {tile.name}
                      <ExternalLink className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {tile.tagline}
                    </span>
                  </span>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0 text-primary" />
          Your key is encrypted at rest with AES-256-GCM. We never see it in
          plaintext after you save.
        </p>
      </div>
    </section>
  );
}

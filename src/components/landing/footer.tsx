import { BRAND_NAME } from "@/lib/brand";
import { LogoLockup } from "@/components/logo";

export function LandingFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <LogoLockup
            iconClassName="size-5"
            textClassName="text-base font-semibold tracking-tight"
          />
          <p className="text-xs text-muted-foreground">
            News in. Life in. Posts out.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <a
            href="https://www.linkedin.com/in/alexandros-lekkas/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 decoration-foreground/30 transition-colors duration-200 ease-out hover:text-foreground hover:decoration-foreground"
          >
            Powering Alexandros&apos; LinkedIn posts since 2026
          </a>
        </div>
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto max-w-6xl px-4 py-4 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
          Not affiliated with, endorsed by, or sponsored by LinkedIn. {BRAND_NAME} is an
          independent tool to help you manage your LinkedIn presence. LinkedIn is a
          trademark of LinkedIn Corporation.
        </p>
      </div>
    </footer>
  );
}

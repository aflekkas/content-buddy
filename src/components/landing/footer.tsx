import Link from "next/link";
import { KeyRound } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export function LandingFooter({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="text-base font-semibold tracking-tight">
            {BRAND_NAME}
          </p>
          <p className="text-xs text-muted-foreground">
            Turn X signal into LinkedIn long-form.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="size-3.5" />
            BYO OpenAI key + Apify token
          </span>
          <Link
            href={isAuthed ? "/dashboard" : "/login"}
            className="transition-colors hover:text-foreground"
          >
            {isAuthed ? "Dashboard" : "Sign in"}
          </Link>
          <span>
            Built by{" "}
            <a
              href="https://twitter.com/_aflekkas"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              @_aflekkas
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}

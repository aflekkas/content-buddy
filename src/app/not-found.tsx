import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DotPattern } from "@/components/ui/dot-pattern";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DotPattern
        className={cn(
          "absolute inset-0 -z-10 text-foreground/10",
          "[mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]",
        )}
      />

      <header className="flex h-14 shrink-0 items-center px-4 sm:px-6">
        <Link
          href="/"
          aria-label={`${BRAND_NAME} home`}
          className="text-sm font-semibold tracking-tight"
        >
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p
          aria-hidden
          className="font-mono text-[10rem] font-semibold leading-none tracking-tighter text-primary/10 sm:text-[14rem]"
        >
          404
        </p>

        <p className="-mt-4 font-mono text-xs font-medium uppercase tracking-[0.25em] text-primary">
          page not found
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          That link went nowhere.
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or moved. Head
          back to {BRAND_NAME} and try again.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            <Home className="mr-1 size-4" />
            Back home
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", variant: "ghost" })}
          >
            <ArrowLeft className="mr-1 size-4" />
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}

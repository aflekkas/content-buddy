import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BRAND_NAME } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        That link didn&apos;t lead anywhere. Head back to {BRAND_NAME} and pick
        up where you left off.
      </p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-2" })}>
        Back to dashboard
      </Link>
    </div>
  );
}

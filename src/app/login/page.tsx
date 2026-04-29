import { redirect } from "next/navigation";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";

function isSafeNext(value: string | undefined): value is string {
  if (!value) return false;
  return value.startsWith("/") && !value.startsWith("//");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const next = isSafeNext(params.next) ? params.next : "/dashboard";

  if (user) {
    redirect(next);
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <AuthForm />
      </main>

      <footer className="flex items-center justify-center pb-8 text-xs text-muted-foreground">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <KeyRound className="size-3.5" />
          Bring your own key
        </Link>
      </footer>
    </div>
  );
}

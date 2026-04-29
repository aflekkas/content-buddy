import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";

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
    <div className="relative">
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Button asChild variant="ghost" size="sm" className="group">
          <Link href="/">
            <span className="transition-transform duration-200 ease-out group-hover:-translate-x-0.5">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Home
          </Link>
        </Button>
      </div>
      <AuthForm />
    </div>
  );
}

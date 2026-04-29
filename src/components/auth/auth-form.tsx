"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/logo";
import { EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Mode = "signin" | "signup";

const EASE = [0.22, 1, 0.36, 1] as const;

function isSafeNext(value: string | null): value is string {
  if (!value) return false;
  return value.startsWith("/") && !value.startsWith("//");
}

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = isSafeNext(nextParam) ? nextParam : "/dashboard";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const supabase = createClient();
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      toast.success("Check your email to confirm your account.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="w-full max-w-sm"
    >
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <LogoMark className="size-7" />
        </span>
      </div>

      <Card className="ring-1 ring-foreground/10">
        <CardHeader className="text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="flex flex-col items-center gap-1.5"
            >
              <CardTitle className="text-balance text-xl tracking-tight">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-balance">
                {mode === "signup"
                  ? "Two fields and you're filming."
                  : "Sign in to keep building."}
              </CardDescription>
            </motion.div>
          </AnimatePresence>
        </CardHeader>

        <CardContent className="pb-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  className="pr-9"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading || !email || !password}
              className="mt-1 w-full"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === "signup" ? "Create account" : "Sign in"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <Button
              variant="link"
              size="sm"
              type="button"
              onClick={() => setMode("signup")}
              className="font-medium"
            >
              Sign up
            </Button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Button
              variant="link"
              size="sm"
              type="button"
              onClick={() => setMode("signin")}
              className="font-medium"
            >
              Sign in
            </Button>
          </>
        )}
      </p>
    </motion.div>
  );
}

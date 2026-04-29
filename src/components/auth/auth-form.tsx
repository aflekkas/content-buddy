"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { CircularLoader } from "@/components/ui/loader";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LogoMark } from "@/components/logo";
import { EASE_OUT } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";

type Mode = "signin" | "signup";

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
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      {/* Left column: form */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          {/* LogoMark badge */}
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
              <LogoMark className="size-7" />
            </span>
          </div>

          {/* Animated form block — entire form blurs-fades on mode change */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, filter: "blur(8px)", y: 4 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              exit={{ opacity: 0, filter: "blur(8px)", y: -4 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
            >
              <div className="mb-6 flex flex-col items-center gap-1.5 text-center">
                <h1 className="text-xl font-semibold tracking-tight">
                  {mode === "signup" ? "Create your account" : "Welcome back"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "signup"
                    ? "Two fields and you're filming."
                    : "Sign in to keep building."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
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
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
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
                    {mode === "signup" && (
                      <FieldDescription>8 character minimum.</FieldDescription>
                    )}
                  </Field>
                </FieldGroup>

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !email || !password}
                  className="w-full"
                >
                  {loading ? (
                    <CircularLoader size="sm" />
                  ) : (
                    <>
                      {mode === "signup" ? "Create account" : "Sign in"}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <FieldSeparator />

                <FieldDescription className="text-center">
                  {mode === "signin" ? (
                    <>
                      No account?{" "}
                      <Button
                        variant="link"
                        size="sm"
                        type="button"
                        onClick={() => setMode("signup")}
                        className="h-auto px-1 py-0 font-medium"
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
                        className="h-auto px-1 py-0 font-medium"
                      >
                        Sign in
                      </Button>
                    </>
                  )}
                </FieldDescription>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right column: brand panel — hidden below lg */}
      <div className="relative hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary/15 via-background to-background border-l border-border/60">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
            <LogoMark className="size-8" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-2xl font-medium tracking-tight">Content Buddy</p>
            <p className="text-muted-foreground">Short-form cockpit.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

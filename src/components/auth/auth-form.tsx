"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { CircularLoader } from "@/components/ui/loader";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LogoMark, LogoLockup } from "@/components/logo";
import { EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { DotPattern } from "@/components/ui/dot-pattern";

type Mode = "signin" | "signup";

const panelVariants = {
  container: {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
  },
  item: {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  },
} as const;

function isSafeNext(value: string | null): value is string {
  if (!value) return false;
  return value.startsWith("/") && !value.startsWith("//");
}

export function AuthForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const next = isSafeNext(nextParam) ? nextParam : "/dashboard";
  const emailRedirectTo =
    typeof window === "undefined"
      ? undefined
      : `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
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
    let result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo },
          })
        : await supabase.auth.signInWithPassword({ email, password });

    // Existing account on signup: fall back to signin with same credentials.
    if (mode === "signup" && result.error) {
      const msg = result.error.message?.toLowerCase() ?? "";
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        result = await supabase.auth.signInWithPassword({ email, password });
      }
    }

    if (result.error) {
      setLoading(false);
      toast.error(result.error.message);
      return;
    }

    if (mode === "signup" && !result.data.session) {
      setLoading(false);
      toast.success("Check your email to confirm your account.");
      return;
    }

    // Full page nav so middleware + server layouts see fresh auth cookies.
    // The (dashboard) layout redirects unonboarded users to /onboarding.
    window.location.assign(next);
  }

  return (
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      {/* Left column: form */}
      <div className="flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          {/* Logo lockup */}
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
              <LogoMark className="size-7" />
            </span>
            <LogoLockup
              iconClassName="hidden"
              textClassName="text-base font-semibold tracking-tight"
            />
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
                    ? "Two fields and you're ready to connect."
                    : "Sign in to keep drafting."}
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
      <div className="relative hidden lg:flex flex-col items-center justify-center overflow-hidden p-12 bg-gradient-to-br from-primary/15 via-background to-background border-l border-border/60">
        {/* Subtle dot pattern masked radially */}
        <DotPattern
          width={20}
          height={20}
          cr={1}
          className="text-foreground/15 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
        />

        <BrandPanel />
      </div>
    </div>
  );
}

function BrandPanel() {
  const reduced = useReducedMotionSafe();
  const transitionBase = { duration: 0.4, ease: EASE_OUT };

  return (
    <motion.div
      variants={panelVariants.container}
      initial={reduced ? "show" : "hidden"}
      animate="show"
      className="relative z-10 flex flex-col items-center gap-8 max-w-md text-center"
    >
      {/* Hero block */}
      <motion.div
        variants={panelVariants.item}
        transition={transitionBase}
        className="flex flex-col items-center gap-4"
      >
        <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <LogoMark className="size-8" />
        </span>
        <p className="text-base text-muted-foreground leading-snug">
          News in. Life in. LinkedIn drafts out.
          <br />
          Your voice, ready to copy.
        </p>
      </motion.div>

      <motion.div
        variants={panelVariants.item}
        transition={transitionBase}
        className="flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"
      >
        <KeyRound className="size-3.5 text-primary" />
        You&apos;ll bring an OpenAI key and an Apify token. Both stay encrypted.
      </motion.div>
    </motion.div>
  );
}

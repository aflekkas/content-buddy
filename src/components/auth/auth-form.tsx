"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
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
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { FadeIn } from "@/components/ui/motion";
import { EASE_OUT } from "@/lib/motion";

type Mode = "signin" | "signup";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      // Email confirmation is enabled in Supabase, user needs to verify
      toast.success("Check your email to confirm your account.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <FadeIn y={8} className="w-full max-w-sm">
      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <Logo size={32} className="mb-2" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="flex flex-col items-center gap-1.5"
            >
              <CardTitle className="text-xl">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription>
                {mode === "signup"
                  ? "Sign up to start getting video recommendations."
                  : "Sign in to continue."}
              </CardDescription>
            </motion.div>
          </AnimatePresence>
        </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? mode === "signup"
                ? "Creating..."
                : "Signing in..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-foreground underline underline-offset-4"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </CardContent>
      </Card>
    </FadeIn>
  );
}

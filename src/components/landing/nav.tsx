"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#models", label: "Models" },
  { href: "#security", label: "Security" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function LandingNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 16);
  });

  return (
    <>
      <header className="sticky top-0 z-40 w-full px-3 pt-3 sm:px-4 sm:pt-4">
        <motion.div
          initial={false}
          animate={{
            boxShadow: scrolled
              ? "0 1px 0 0 rgba(15,30,60,0.04), 0 12px 32px -16px rgba(15,30,60,0.18), 0 0 0 1px rgba(15,30,60,0.06)"
              : "0 0 0 0 rgba(0,0,0,0), 0 0 0 0 rgba(0,0,0,0), 0 0 0 1px rgba(15,30,60,0.06)",
          }}
          transition={{ duration: 0.4, ease: EASE }}
          className={cn(
            "relative mx-auto flex h-13 max-w-5xl items-center gap-6 rounded-full px-4 py-2 sm:h-14 sm:px-5",
            "bg-background/75 backdrop-blur-xl",
            "supports-[backdrop-filter]:bg-background/60",
          )}
        >
          <Link
            href="/"
            aria-label={`${BRAND_NAME} home`}
            className="shrink-0"
          >
            <LogoMark className="size-6" />
          </Link>

          <nav
            className="relative hidden items-center md:flex"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={() => setHoverIdx(i)}
                className="relative px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {hoverIdx === i && (
                  <motion.span
                    layoutId="nav-hover-pill"
                    aria-hidden
                    className="absolute inset-0 -z-0 rounded-full bg-foreground/[0.05]"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex flex-1 items-center justify-end gap-1">
            {isAuthed ? (
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "sm", shape: "pill", withArrow: true }),
                  "h-9",
                )}
              >
                My account
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex sm:px-3 sm:py-2"
                >
                  Sign in
                </Link>
                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ size: "sm", shape: "pill", withArrow: true }),
                    "h-9",
                  )}
                >
                  Get started
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              shape="pill"
              aria-label="Open menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="ml-1 text-foreground/70 md:hidden"
            >
              {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          </div>
        </motion.div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="fixed inset-x-3 top-[68px] z-30 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur-xl md:hidden"
          >
            <nav className="flex flex-col">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-1 border-t border-border/60 pt-2">
                <Link
                  href={isAuthed ? "/dashboard" : "/login"}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-muted"
                >
                  {isAuthed ? "My account" : "Sign in"}
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

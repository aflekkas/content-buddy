"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "large" | "compact";

export function HeroPromptBar({
  variant,
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  variant: Variant;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const large = variant === "large";
  const canSubmit = !disabled && value.trim().length >= 3;
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!large || !taRef.current) return;
    const el = taRef.current;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 280)}px`;
  }, [value, large]);

  return (
    <motion.form
      layout
      layoutId="hero-prompt-bar"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex w-full overflow-hidden rounded-2xl border bg-background/95 backdrop-blur",
        large
          ? "flex-col shadow-2xl shadow-primary/10"
          : "flex-row items-center gap-2 rounded-xl px-2 py-1.5 shadow-sm",
      )}
    >
      {large ? (
        <>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (canSubmit) onSubmit();
              }
            }}
            placeholder="describe what you want to make videos about…"
            disabled={disabled}
            rows={3}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-label="Describe what you want to make videos about"
            className={cn(
              "min-h-[110px] w-full resize-none bg-transparent px-5 pt-5 pb-2 text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 sm:text-base",
            )}
          />
          <div className="flex items-center justify-between gap-3 px-3 pb-3">
            <span className="inline-flex items-center gap-1.5 pl-2 text-[11px] text-muted-foreground/80">
              <Sparkles className="size-3 text-primary" />
              <span className="hidden sm:inline">
                ⌘ + enter to send · we&apos;ll plan five videos from it
              </span>
              <span className="sm:hidden">we&apos;ll plan five videos from it</span>
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity disabled:opacity-40"
            >
              Try it
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </>
      ) : (
        <>
          <Sparkles className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
            {value}
          </span>
          <span className="rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground">
            sent
          </span>
        </>
      )}
    </motion.form>
  );
}

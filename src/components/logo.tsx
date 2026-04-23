"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  BRAND_NAME,
  MASCOT,
  MASCOT_SEQUENCES,
  type MascotFrame,
  type MascotSequence,
} from "@/lib/brand";

type LogoProps = {
  className?: string;
  size?: number;
  /** Animate via a named stop-motion sequence; omit for a static idle frame. */
  animate?: MascotSequence;
};

export function LogoMark({ className, size = 32, animate }: LogoProps) {
  const [frame, setFrame] = useState<MascotFrame>("idle");

  useEffect(() => {
    if (!animate) {
      setFrame("idle");
      return;
    }
    const seq = MASCOT_SEQUENCES[animate];
    if (!seq || seq.length === 0) return;

    let i = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (cancelled) return;
      const [key, hold] = seq[i % seq.length];
      setFrame(key);
      i++;
      timer = setTimeout(tick, hold);
    };
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [animate]);

  return (
    <div
      className={cn(
        "relative block shrink-0 self-start overflow-hidden rounded-xl",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {/* Preload all frames so swaps don't flash */}
      {(Object.keys(MASCOT) as MascotFrame[]).map((k) => (
        <Image
          key={k}
          src={MASCOT[k]}
          alt={BRAND_NAME}
          width={size}
          height={size}
          priority={k === "idle"}
          draggable={false}
          className={cn(
            "absolute inset-0 h-full w-full select-none object-contain transition-opacity",
            k === frame ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </div>
  );
}

export function Logo({
  className,
  size = 32,
  showWordmark = true,
  animate,
}: LogoProps & { showWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark size={size} animate={animate} />
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight">
          {BRAND_NAME}
        </span>
      )}
    </div>
  );
}

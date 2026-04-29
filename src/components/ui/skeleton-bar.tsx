"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function SkeletonBar({ className }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        className,
      )}
      aria-hidden
    >
      <motion.span
        className="absolute inset-y-0 -left-1/2 block w-1/2 bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        animate={{ x: ["0%", "300%"] }}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </div>
  );
}

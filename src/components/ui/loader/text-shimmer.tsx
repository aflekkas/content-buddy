"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// shimmer: backgroundPosition 200%→-200% linear 4s
const SHIMMER_ANIMATE = { backgroundPosition: ["200% 0", "-200% 0"] }
const SHIMMER_TRANSITION = {
  duration: 4,
  ease: "linear" as const,
  repeat: Infinity,
}

const TEXT_SIZES: Record<LoaderSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

export function TextShimmerLoader({
  text = "Thinking",
  className,
  size = "md",
}: {
  text?: string
  className?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()

  return (
    <motion.div
      className={cn(
        "bg-[linear-gradient(to_right,var(--muted-foreground)_40%,var(--foreground)_60%,var(--muted-foreground)_80%)]",
        "bg-size-[200%_auto] bg-clip-text font-medium text-transparent",
        TEXT_SIZES[size],
        className
      )}
      animate={reducedMotion ? {} : SHIMMER_ANIMATE}
      transition={reducedMotion ? {} : SHIMMER_TRANSITION}
    >
      {text}
    </motion.div>
  )
}

"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// blink: 0%,100% opacity 1 / 50% opacity 0 — step-end timing
const BLINK_ANIMATE = { opacity: [1, 1, 0, 0] }
const BLINK_TRANSITION = {
  duration: 1,
  ease: "linear" as const,
  times: [0, 0.49, 0.5, 1],
  repeat: Infinity,
}

const CURSOR_SIZES: Record<LoaderSize, string> = {
  sm: "h-3 w-1.5",
  md: "h-4 w-2",
  lg: "h-5 w-2.5",
}
const TEXT_SIZES: Record<LoaderSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}
const CONTAINER_SIZES: Record<LoaderSize, string> = {
  sm: "h-4",
  md: "h-5",
  lg: "h-6",
}

export function TerminalLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()

  return (
    <div
      className={cn(
        "flex items-center space-x-1",
        CONTAINER_SIZES[size],
        className
      )}
    >
      <span className={cn("text-primary font-mono", TEXT_SIZES[size])}>
        {">"}
      </span>
      <motion.div
        className={cn("bg-primary", CURSOR_SIZES[size])}
        animate={reducedMotion ? { opacity: 1 } : BLINK_ANIMATE}
        transition={reducedMotion ? {} : BLINK_TRANSITION}
      />
      <span className="sr-only">Loading</span>
    </div>
  )
}

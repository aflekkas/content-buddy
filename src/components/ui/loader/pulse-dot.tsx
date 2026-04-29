"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// pulse-dot: 0%,100% scale(1) opacity 0.6 / 50% scale(1.5) opacity 1
const PULSE_DOT_ANIMATE = { scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }
const PULSE_DOT_TRANSITION = {
  duration: 1.2,
  ease: "easeInOut" as const,
  repeat: Infinity,
}

const DOT_SIZE: Record<LoaderSize, string> = {
  sm: "size-1",
  md: "size-2",
  lg: "size-3",
}

export function PulseDotLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()

  return (
    <motion.div
      className={cn("bg-primary rounded-full", DOT_SIZE[size], className)}
      animate={reducedMotion ? {} : PULSE_DOT_ANIMATE}
      transition={reducedMotion ? {} : PULSE_DOT_TRANSITION}
    >
      <span className="sr-only">Loading</span>
    </motion.div>
  )
}

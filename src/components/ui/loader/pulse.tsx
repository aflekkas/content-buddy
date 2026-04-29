"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { type LoaderSize, ICON_SIZE } from "./shared"

// thin-pulse: 0%,100% scale(1) opacity 1 / 50% scale(0.85) opacity 0.6
const PULSE_ANIMATE = { scale: [1, 0.85, 1], opacity: [1, 0.6, 1] }
const PULSE_TRANSITION = {
  duration: 1.5,
  ease: "easeInOut" as const,
  repeat: Infinity,
}

export function PulseLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()

  return (
    <div className={cn("relative", ICON_SIZE[size], className)}>
      <motion.div
        className="border-primary absolute inset-0 rounded-full border-2"
        animate={reducedMotion ? {} : PULSE_ANIMATE}
        transition={reducedMotion ? {} : PULSE_TRANSITION}
      />
      <span className="sr-only">Loading</span>
    </div>
  )
}

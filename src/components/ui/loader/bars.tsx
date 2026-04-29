"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// wave-bars: 0%,100% scaleY(0.5) opacity 0.5 / 50% scaleY(1) opacity 1
const WAVE_BARS_ANIMATE = { scaleY: [0.5, 1, 0.5], opacity: [0.5, 1, 0.5] }

const BAR_WIDTHS: Record<LoaderSize, string> = {
  sm: "w-1",
  md: "w-1.5",
  lg: "w-2",
}
const CONTAINER_SIZES: Record<LoaderSize, string> = {
  sm: "h-4 gap-1",
  md: "h-5 gap-1.5",
  lg: "h-6 gap-2",
}
const BAR_DELAYS = [0, 0.2, 0.4]

export function BarsLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()

  return (
    <div className={cn("flex", CONTAINER_SIZES[size], className)}>
      {BAR_DELAYS.map((delay, i) => (
        <motion.div
          key={i}
          className={cn("bg-primary h-full", BAR_WIDTHS[size])}
          animate={reducedMotion ? {} : WAVE_BARS_ANIMATE}
          transition={
            reducedMotion
              ? {}
              : { duration: 1.2, ease: "easeInOut", repeat: Infinity, delay }
          }
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// wave: 0%,100% scaleY(0.4) / 50% scaleY(1)
const WAVE_ANIMATE = { scaleY: [0.4, 1, 0.4] }

const BAR_WIDTHS: Record<LoaderSize, string> = {
  sm: "w-0.5",
  md: "w-0.5",
  lg: "w-1",
}
const CONTAINER_SIZE: Record<LoaderSize, string> = {
  sm: "h-4",
  md: "h-5",
  lg: "h-6",
}
const BAR_HEIGHTS: Record<LoaderSize, string[]> = {
  sm: ["6px", "9px", "12px", "9px", "6px"],
  md: ["8px", "12px", "16px", "12px", "8px"],
  lg: ["10px", "15px", "20px", "15px", "10px"],
}
const BAR_DELAYS = [0, 0.1, 0.2, 0.3, 0.4]

export function WaveLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()
  const heights = BAR_HEIGHTS[size]

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        CONTAINER_SIZE[size],
        className
      )}
    >
      {BAR_DELAYS.map((delay, i) => (
        <motion.div
          key={i}
          className={cn("bg-primary rounded-full", BAR_WIDTHS[size])}
          style={{ height: heights[i] }}
          animate={reducedMotion ? {} : WAVE_ANIMATE}
          transition={
            reducedMotion
              ? {}
              : { duration: 1, ease: "easeInOut", repeat: Infinity, delay }
          }
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

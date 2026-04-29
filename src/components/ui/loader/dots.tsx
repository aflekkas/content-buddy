"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// bounce-dots: 0%,80%,100% scale(0.6) opacity 0.4 / 40% scale(1) opacity 1
const BOUNCE_DOTS_ANIMATE = { scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }

const DOT_SIZE: Record<LoaderSize, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
}
const CONTAINER_SIZE: Record<LoaderSize, string> = {
  sm: "h-4",
  md: "h-5",
  lg: "h-6",
}
const DOT_DELAYS = [0, 0.16, 0.32]

export function DotsLoader({
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
        CONTAINER_SIZE[size],
        className
      )}
    >
      {DOT_DELAYS.map((delay, i) => (
        <motion.div
          key={i}
          className={cn("bg-primary rounded-full", DOT_SIZE[size])}
          animate={reducedMotion ? {} : BOUNCE_DOTS_ANIMATE}
          transition={
            reducedMotion
              ? {}
              : { duration: 1.4, ease: "easeInOut", repeat: Infinity, delay }
          }
        />
      ))}
      <span className="sr-only">Loading</span>
    </div>
  )
}

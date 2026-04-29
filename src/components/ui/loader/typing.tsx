"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// typing: 0%,100% translateY(0) opacity 0.4 / 50% translateY(-3px) opacity 1
const TYPING_ANIMATE = { y: [0, -3, 0], opacity: [0.4, 1, 0.4] }

const DOT_SIZE: Record<LoaderSize, string> = {
  sm: "h-1 w-1",
  md: "h-1.5 w-1.5",
  lg: "h-2 w-2",
}
const CONTAINER_SIZE: Record<LoaderSize, string> = {
  sm: "h-4",
  md: "h-5",
  lg: "h-6",
}
const DOT_DELAYS = [0, 0.25, 0.5]

export function TypingLoader({
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
          animate={reducedMotion ? {} : TYPING_ANIMATE}
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

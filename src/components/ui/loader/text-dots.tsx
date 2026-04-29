"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// loading-dots: 0%,20% opacity 0 / 50% opacity 1 / 80%,100% opacity 0
// Three dots with staggered delays: 0.2s, 0.4s, 0.6s
const DOT_ANIMATE = { opacity: [0, 0, 1, 0, 0] }

const TEXT_SIZES: Record<LoaderSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}
const DOT_DELAYS = [0.2, 0.4, 0.6]

export function TextDotsLoader({
  className,
  text = "Thinking",
  size = "md",
}: {
  className?: string
  text?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()

  return (
    <div className={cn("inline-flex items-center", className)}>
      <span className={cn("text-primary font-medium", TEXT_SIZES[size])}>
        {text}
      </span>
      <span className="inline-flex">
        {DOT_DELAYS.map((delay, i) => (
          <motion.span
            key={i}
            className="text-primary"
            animate={reducedMotion ? { opacity: 1 } : DOT_ANIMATE}
            transition={
              reducedMotion
                ? {}
                : { duration: 1.4, ease: "linear", repeat: Infinity, delay }
            }
          >
            .
          </motion.span>
        ))}
      </span>
    </div>
  )
}

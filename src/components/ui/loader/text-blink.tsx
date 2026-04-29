"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import type { LoaderSize } from "./shared"

// text-blink: 0%,100% opacity 1 / 50% opacity 0.3
const TEXT_BLINK_ANIMATE = { opacity: [1, 0.3, 1] }
const TEXT_BLINK_TRANSITION = {
  duration: 2,
  ease: "easeInOut" as const,
  repeat: Infinity,
}

const TEXT_SIZES: Record<LoaderSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

export function TextBlinkLoader({
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
      className={cn("font-medium", TEXT_SIZES[size], className)}
      animate={reducedMotion ? {} : TEXT_BLINK_ANIMATE}
      transition={reducedMotion ? {} : TEXT_BLINK_TRANSITION}
    >
      {text}
    </motion.div>
  )
}

"use client"

import { motion } from "motion/react"
import { useReducedMotionSafe } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { type LoaderSize, ICON_SIZE } from "./shared"

// Bar geometry constants lifted out of the render path
const BAR_HEIGHTS: Record<LoaderSize, string> = {
  sm: "6px",
  md: "8px",
  lg: "10px",
}
const BAR_WIDTHS: Record<LoaderSize, string> = {
  sm: "1.5px",
  md: "2px",
  lg: "2.5px",
}
const HALF_WIDTH: Record<LoaderSize, string> = {
  sm: "-0.75px",
  md: "-1px",
  lg: "-1.25px",
}
const ORIGIN_X: Record<LoaderSize, string> = {
  sm: "0.75px",
  md: "1px",
  lg: "1.25px",
}
const ORIGIN_Y: Record<LoaderSize, string> = {
  sm: "10px",
  md: "12px",
  lg: "14px",
}

const BAR_COUNT = 12
// Precomputed per-bar style objects (module scope, not recreated per render)
type BarData = { transform: string; transformOrigin: string; marginLeft: string; height: string; width: string; delay: number }
function buildBars(size: LoaderSize): BarData[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => ({
    transform: `rotate(${i * 30}deg)`,
    transformOrigin: `${ORIGIN_X[size]} ${ORIGIN_Y[size]}`,
    marginLeft: HALF_WIDTH[size],
    height: BAR_HEIGHTS[size],
    width: BAR_WIDTHS[size],
    delay: i * 0.1,
  }))
}

// Memoised per size so we build once each
const BARS_SM = buildBars("sm")
const BARS_MD = buildBars("md")
const BARS_LG = buildBars("lg")
const BARS_BY_SIZE = { sm: BARS_SM, md: BARS_MD, lg: BARS_LG }

export function ClassicLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: LoaderSize
}) {
  const reducedMotion = useReducedMotionSafe()
  const bars = BARS_BY_SIZE[size]

  return (
    <div className={cn("relative", ICON_SIZE[size], className)}>
      <div className="absolute h-full w-full">
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            className="bg-primary absolute rounded-full"
            style={{
              top: "0",
              left: "50%",
              marginLeft: bar.marginLeft,
              transformOrigin: bar.transformOrigin,
              transform: bar.transform,
              height: bar.height,
              width: bar.width,
            }}
            animate={reducedMotion ? { opacity: 0.4 } : { opacity: [1, 0.15] }}
            transition={
              reducedMotion
                ? {}
                : {
                    duration: 1.2,
                    ease: "linear",
                    repeat: Infinity,
                    delay: bar.delay,
                  }
            }
          />
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}

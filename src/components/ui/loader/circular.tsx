"use client"

import { cn } from "@/lib/utils"
import { type LoaderSize, ICON_SIZE } from "./shared"

export function CircularLoader({
  className,
  size = "md",
}: {
  className?: string
  size?: LoaderSize
}) {
  return (
    <div
      className={cn(
        "border-primary animate-spin rounded-full border-2 border-t-transparent",
        ICON_SIZE[size],
        className
      )}
    >
      <span className="sr-only">Loading</span>
    </div>
  )
}

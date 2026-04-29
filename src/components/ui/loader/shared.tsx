"use client"

// Shared size maps and types reused across loader variants.

export type LoaderSize = "sm" | "md" | "lg"

export const ICON_SIZE: Record<LoaderSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
}

export const TEXT_SIZE: Record<LoaderSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

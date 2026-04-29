"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NICHE_BY_ID } from "@/lib/niches"
import type { OnboardingPlatform } from "@/lib/niches"
import type { AudienceStage, PrimaryGoal } from "@/lib/db/types"
import type { ProviderId } from "@/lib/providers"
import React from "react"

export type { OnboardingPlatform }

export type VideoFormat =
  | "talking_head"
  | "voiceover"
  | "tutorial"
  | "story"
  | "listicle"
  | "reaction"
  | "skit"
  | "vlog"

export type PostingCadence = "daily" | "few_per_week" | "weekly" | "occasional"

export type VoiceTone =
  | "casual"
  | "expert"
  | "hype"
  | "calm"
  | "dry_humor"
  | "warm"

export type OnboardingFlowState = {
  platforms: OnboardingPlatform[]
  nichePrimary: string | null
  nicheSecondary: string[]
  channelPitch: string
  audienceStage: AudienceStage | null
  primaryGoal: PrimaryGoal | null
  provider: ProviderId
  apiKey: string
  videoFormats: VideoFormat[]
  postingCadence: PostingCadence | null
  voiceTone: VoiceTone[]
  inspirations: string
}

export function StepHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: string
  align?: "left" | "center"
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-2",
        align === "center" ? "items-center text-center" : "items-start",
      )}
    >
      {eyebrow && (
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </span>
      )}
      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "text-balance text-base text-muted-foreground",
            align === "center" ? "max-w-xl" : "max-w-2xl",
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}

export function SelectableCard({
  active,
  onClick,
  children,
  className,
  ariaLabel,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <Button
      variant="outline"
      shape="card"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "group relative h-full w-full p-5 transition-colors",
        active
          ? "border-primary ring-2 ring-primary/40 bg-primary/5"
          : "border-border hover:border-foreground/30",
        className,
      )}
    >
      {children}
    </Button>
  )
}

export function prettyPlatform(p: OnboardingPlatform | string): string {
  switch (p) {
    case "tiktok":
      return "TikTok"
    case "reels":
      return "Reels"
    case "shorts":
      return "Shorts"
    case "youtube_long":
      return "YouTube"
    default:
      return String(p)
  }
}

export function derivePitchPlaceholder(state: OnboardingFlowState): string {
  const niche = state.nichePrimary
    ? NICHE_BY_ID[state.nichePrimary]?.label.toLowerCase() ?? "fitness"
    : "fitness"
  const platform = prettyPlatform(state.platforms[0] ?? "tiktok")
  return `e.g., a ${niche} channel for busy parents on ${platform}`
}

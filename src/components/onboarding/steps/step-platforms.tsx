"use client"

import { motion } from "motion/react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { ONBOARDING_PLATFORMS } from "@/lib/niches"
import { getPlatformLogo } from "@/components/brand/platform-logos"
import { StepHeading, SelectableCard } from "./_shared"
import type { OnboardingPlatform } from "@/lib/niches"

const EASE = [0.22, 1, 0.36, 1] as const

export function StepPlatforms({
  value,
  onChange,
}: {
  value: OnboardingPlatform[]
  onChange: (next: OnboardingPlatform[]) => void
}) {
  const toggle = (id: OnboardingPlatform) => {
    if (value.includes(id)) {
      onChange(value.filter((p) => p !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div>
      <StepHeading
        eyebrow="Where you post"
        title="Pick the surfaces you actually publish on"
        subtitle="Defaults are the short-form trio. Toggle anything that doesn't fit."
      />
      <div className="grid grid-cols-2 gap-3">
        {ONBOARDING_PLATFORMS.map((p, i) => {
          const active = value.includes(p.id)
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
            >
              <SelectableCard
                active={active}
                onClick={() => toggle(p.id)}
                className="p-5"
              >
                <span
                  className={cn(
                    "absolute top-3 right-3 inline-flex size-5 items-center justify-center rounded-full border transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground opacity-100"
                      : "border-border/60 opacity-0 group-hover:opacity-40",
                  )}
                >
                  <Check className="size-3" />
                </span>
                <div className="flex w-full flex-col gap-2">
                  {(() => {
                    const Logo = getPlatformLogo(p.id)
                    return <Logo className="size-6" />
                  })()}
                  <span className="text-sm font-semibold tracking-tight">
                    {p.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.hint}
                  </span>
                </div>
              </SelectableCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

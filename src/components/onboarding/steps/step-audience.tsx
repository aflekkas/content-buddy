"use client"

import { motion } from "motion/react"
import type { AudienceStage } from "@/lib/db/types"
import { StepHeading, SelectableCard } from "./_shared"

const EASE = [0.22, 1, 0.36, 1] as const

const AUDIENCE_OPTIONS: {
  id: AudienceStage
  label: string
  range: string
  copy: string
}[] = [
  {
    id: "starting",
    label: "Just starting",
    range: "0 – 1k",
    copy: "Building from zero. Hooks and consistency matter most.",
  },
  {
    id: "growing",
    label: "Growing",
    range: "1k – 10k",
    copy: "Have a few wins. Sharpening niche and frequency.",
  },
  {
    id: "established",
    label: "Established",
    range: "10k – 100k",
    copy: "Predictable performance. Ready to monetize or scale.",
  },
  {
    id: "large",
    label: "Large",
    range: "100k+",
    copy: "Audience is built. Optimizing yield and brand.",
  },
]

export function StepAudience({
  value,
  onChange,
}: {
  value: AudienceStage | null
  onChange: (next: AudienceStage) => void
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Your stage"
        title="Where are you in the journey?"
        subtitle="No judgment. Just helps me give you advice that actually applies."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {AUDIENCE_OPTIONS.map((opt, i) => {
          const active = opt.id === value
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
            >
              <SelectableCard active={active} onClick={() => onChange(opt.id)}>
                <div className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-base font-semibold tracking-tight">
                    {opt.label}
                  </span>
                  <span className="rounded-full bg-muted/70 px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {opt.range}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {opt.copy}
                </p>
              </SelectableCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

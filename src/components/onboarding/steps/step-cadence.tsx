"use client"

import { motion } from "motion/react"
import { StepHeading, SelectableCard } from "./_shared"
import type { PostingCadence } from "./_shared"

const EASE = [0.22, 1, 0.36, 1] as const

const CADENCE_OPTIONS: { id: PostingCadence; label: string; copy: string }[] = [
  { id: "daily", label: "Daily", copy: "One or more every day." },
  { id: "few_per_week", label: "3-5 per week", copy: "Heavy but not daily." },
  { id: "weekly", label: "Weekly", copy: "One or two a week, deliberate." },
  { id: "occasional", label: "Whenever", copy: "No fixed schedule yet." },
]

export function StepCadence({
  value,
  onChange,
}: {
  value: PostingCadence | null
  onChange: (next: PostingCadence) => void
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Cadence"
        title="How often do you post?"
        subtitle="Helps me size scripts to your bandwidth."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {CADENCE_OPTIONS.map((opt, i) => {
          const active = opt.id === value
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
            >
              <SelectableCard active={active} onClick={() => onChange(opt.id)}>
                <span className="text-base font-semibold tracking-tight">
                  {opt.label}
                </span>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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

export const CADENCE_LABELS: Record<PostingCadence, string> = Object.fromEntries(
  CADENCE_OPTIONS.map((o) => [o.id, o.label]),
) as Record<PostingCadence, string>

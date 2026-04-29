"use client"

import { motion } from "motion/react"
import type { PrimaryGoal } from "@/lib/db/types"
import { StepHeading, SelectableCard } from "./_shared"

const EASE = [0.22, 1, 0.36, 1] as const

const GOAL_OPTIONS: { id: PrimaryGoal; label: string; copy: string }[] = [
  { id: "grow", label: "Grow followers", copy: "Reach and retention first." },
  { id: "monetize", label: "Monetize", copy: "Brand deals, products, ads." },
  { id: "brand", label: "Build personal brand", copy: "Recognition over raw count." },
  { id: "traffic", label: "Drive traffic", copy: "Pull people to a site or product." },
  {
    id: "experiment",
    label: "Just experiment",
    copy: "Find your shape with no fixed goal.",
  },
]

export function StepGoal({
  value,
  onChange,
}: {
  value: PrimaryGoal | null
  onChange: (next: PrimaryGoal) => void
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Your goal"
        title="What's the win right now?"
        subtitle="Pick one. I'll score every script idea against it."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {GOAL_OPTIONS.map((opt, i) => {
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

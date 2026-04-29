"use client"

import { motion } from "motion/react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { StepHeading, SelectableCard } from "./_shared"
import type { VoiceTone } from "./_shared"

const EASE = [0.22, 1, 0.36, 1] as const

const VOICE_OPTIONS: { id: VoiceTone; label: string; copy: string }[] = [
  { id: "casual", label: "Casual", copy: "Like talking to a friend." },
  { id: "expert", label: "Expert", copy: "Authoritative, sharp, sourced." },
  { id: "hype", label: "High-energy", copy: "Loud, fast, hype." },
  { id: "calm", label: "Calm", copy: "Measured, ASMR-adjacent." },
  { id: "dry_humor", label: "Dry humor", copy: "Deadpan, ironic, understated." },
  { id: "warm", label: "Warm", copy: "Encouraging, supportive, kind." },
]

export function StepVoice({
  value,
  onChange,
}: {
  value: VoiceTone[]
  onChange: (next: VoiceTone[]) => void
}) {
  const toggle = (id: VoiceTone) => {
    if (value.includes(id)) {
      onChange(value.filter((p) => p !== id))
    } else if (value.length < 2) {
      onChange([...value, id])
    } else {
      onChange([value[1], id])
    }
  }

  return (
    <div>
      <StepHeading
        eyebrow="Voice"
        title="How do you want to sound?"
        subtitle="Pick up to two. I'll match tone in everything I draft."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {VOICE_OPTIONS.map((opt, i) => {
          const active = value.includes(opt.id)
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.05 }}
            >
              <SelectableCard active={active} onClick={() => toggle(opt.id)}>
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

export const VOICE_LABELS: Record<VoiceTone, string> = Object.fromEntries(
  VOICE_OPTIONS.map((o) => [o.id, o.label]),
) as Record<VoiceTone, string>

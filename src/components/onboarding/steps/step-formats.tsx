"use client"

import { motion } from "motion/react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { StepHeading, SelectableCard } from "./_shared"
import type { VideoFormat } from "./_shared"

const EASE = [0.22, 1, 0.36, 1] as const

const FORMAT_OPTIONS: { id: VideoFormat; label: string; copy: string }[] = [
  { id: "talking_head", label: "Talking head", copy: "You on camera, direct to lens." },
  { id: "voiceover", label: "Voiceover + b-roll", copy: "Narration over visuals." },
  { id: "tutorial", label: "Tutorial / how-to", copy: "Step-by-step walkthroughs." },
  { id: "story", label: "Storytelling", copy: "First-person narrative arcs." },
  { id: "listicle", label: "Listicle", copy: "Top X, ranked picks, countdowns." },
  { id: "reaction", label: "Reaction / commentary", copy: "Take on someone else's content." },
  { id: "skit", label: "Skit / comedy", copy: "Scripted scenes, characters, jokes." },
  { id: "vlog", label: "Vlog / day-in-life", copy: "Document what you actually do." },
]

export function StepFormats({
  value,
  onChange,
}: {
  value: VideoFormat[]
  onChange: (next: VideoFormat[]) => void
}) {
  const toggle = (id: VideoFormat) => {
    if (value.includes(id)) {
      onChange(value.filter((p) => p !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div>
      <StepHeading
        eyebrow="Video formats"
        title="What kind of videos do you actually make?"
        subtitle="Pick all that fit. I'll lean on these when proposing scripts."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {FORMAT_OPTIONS.map((opt, i) => {
          const active = value.includes(opt.id)
          return (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.04 }}
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

export const FORMAT_LABELS: Record<VideoFormat, string> = Object.fromEntries(
  FORMAT_OPTIONS.map((o) => [o.id, o.label]),
) as Record<VideoFormat, string>

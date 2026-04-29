"use client"

import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { Search } from "lucide-react"
import { NICHES } from "@/lib/niches"
import { Input } from "@/components/ui/input"
import { StepHeading, SelectableCard } from "./_shared"

const EASE = [0.22, 1, 0.36, 1] as const

export function StepNiche({
  primary,
  secondary,
  onChange,
}: {
  primary: string | null
  secondary: string[]
  onChange: (primary: string | null, secondary: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NICHES
    return NICHES.filter((n) => n.label.toLowerCase().includes(q))
  }, [query])

  const select = (id: string) => {
    if (id === primary) {
      const [nextPrimary, ...rest] = secondary
      onChange(nextPrimary ?? null, rest)
      return
    }
    if (secondary.includes(id)) {
      onChange(primary, secondary.filter((n) => n !== id))
      return
    }
    if (!primary) {
      onChange(id, secondary)
      return
    }
    if (secondary.length < 2) {
      onChange(primary, [...secondary, id])
    }
  }

  return (
    <div>
      <StepHeading
        eyebrow="Your niche"
        title="What do you make videos about?"
        subtitle="Pick your main one first. Add up to two adjacent ones if it bleeds."
      />
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search niches"
          className="h-10 rounded-full pl-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((n, i) => {
          const isPrimary = n.id === primary
          const isSecondary = secondary.includes(n.id)
          const active = isPrimary || isSecondary
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.025 }}
            >
              <SelectableCard
                active={active}
                onClick={() => select(n.id)}
                className="flex-col items-center justify-center gap-2 p-4 text-center"
              >
                <span className="text-2xl leading-none">{n.emoji}</span>
                <span className="text-sm font-medium tracking-tight">
                  {n.label}
                </span>
                {isPrimary && (
                  <span className="absolute top-2 right-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    primary
                  </span>
                )}
                {isSecondary && (
                  <span className="absolute top-2 right-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    also
                  </span>
                )}
              </SelectableCard>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

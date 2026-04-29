"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CircularLoader } from "@/components/ui/loader"
import { NICHE_BY_ID } from "@/lib/niches"
import { prettyPlatform, type OnboardingFlowState } from "./_shared"

export function StepAha({
  state,
  submit,
  onDone,
  onFallback,
}: {
  state: OnboardingFlowState
  submit: () => Promise<{ chatId: string } | null>
  onDone: (chatId: string) => void
  onFallback: () => void
}) {
  const niche = state.nichePrimary
    ? NICHE_BY_ID[state.nichePrimary]?.label.toLowerCase() ?? "your niche"
    : "your niche"
  const platform = state.platforms[0] ?? "tiktok"

  const hasProfile =
    Boolean(state.nichePrimary) ||
    state.channelPitch.trim().length >= 3 ||
    state.platforms.length > 0

  const stages = useMemo(
    () => [
      `Reading your channel pitch...`,
      `Pulling top hooks for ${niche}...`,
      `Tuning length for ${prettyPlatform(platform)}...`,
      `Drafting your first script...`,
    ],
    [niche, platform],
  )
  const [stageIdx, setStageIdx] = useState(0)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!hasProfile) {
      const t = window.setTimeout(() => onFallback(), 800)
      return () => window.clearTimeout(t)
    }

    let cancelled = false
    const interval = window.setInterval(() => {
      setStageIdx((i) => (i < stages.length - 1 ? i + 1 : i))
    }, 1400)

    submit().then((result) => {
      window.clearInterval(interval)
      if (cancelled) return
      if (!result) {
        setFailed(true)
        return
      }
      setStageIdx(stages.length - 1)
      setDone(true)
      window.setTimeout(() => {
        if (!cancelled) onDone(result.chatId)
      }, 600)
    })

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!hasProfile) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="relative grid size-16 place-items-center">
          <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
            <Sparkles className="size-7 text-primary" />
          </span>
        </div>
        <h2 className="mt-5 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          You&apos;re set
        </h2>
        <p className="mt-3 max-w-md text-balance text-muted-foreground">
          Taking you to your dashboard.
        </p>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          That didn&apos;t go through
        </h2>
        <p className="mt-3 max-w-md text-balance text-muted-foreground">
          Something failed generating your starter script. You can keep going
          to your dashboard and chat normally.
        </p>
        <div className="mt-7 flex gap-2">
          <Button size="lg" variant="outline" onClick={onFallback}>
            Go to dashboard
            <ArrowRight className="size-4" />
          </Button>
          <Button size="lg" onClick={() => window.location.reload()}>
            Try again
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative grid size-16 place-items-center">
        <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <Sparkles className="size-7 text-primary" />
        </span>
      </div>

      <h2 className="mt-5 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {done ? "Ready when you are" : "Building your starter pack"}
      </h2>

      <ul className="mt-7 flex w-full max-w-md flex-col gap-2 text-left">
        {stages.map((label, i) => {
          const active = i === stageIdx && !done
          const complete = i < stageIdx || done
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-sm transition-all",
                complete
                  ? "border-primary/40 bg-primary/[0.04] text-foreground"
                  : active
                    ? "border-border text-foreground"
                    : "border-border/70 text-muted-foreground opacity-60",
              )}
            >
              {complete ? (
                <Check className="size-4 text-primary" />
              ) : active ? (
                <CircularLoader size="sm" />
              ) : (
                <span className="size-4 rounded-full border" />
              )}
              {label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

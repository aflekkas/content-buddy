"use client"

import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { LogoMark } from "@/components/logo"
import { BRAND_NAME } from "@/lib/brand"
import { StepHeading } from "./_shared"

export function StepInspirations({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      <StepHeading
        eyebrow="Inspirations"
        title="Whose stuff do you actually watch?"
        subtitle="Creators, channels, accounts. Names or handles. I'll borrow what works for them."
      />
      <Card className="rounded-2xl border bg-muted/30 p-4 ring-0">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
            <LogoMark className="size-5" />
          </span>
          <div className="flex-1">
            <p className="mb-2 text-xs text-muted-foreground">
              {BRAND_NAME} is listening
            </p>
            <Textarea
              value={value}
              placeholder="e.g., @alexhormozi, MrBeast, Ali Abdaal"
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              autoFocus
              className="resize-none border-0 bg-background/80 text-base shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Comma-separated. Three to seven is plenty.</span>
              <span className="tabular-nums">{value.trim().length}/500</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

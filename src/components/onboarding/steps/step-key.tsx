"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, ExternalLink, Eye, EyeOff, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BRAND_NAME } from "@/lib/brand"
import { PROVIDERS, PROVIDER_IDS, type ProviderId } from "@/lib/providers"
import { StepHeading, SelectableCard } from "./_shared"

export function StepKey({
  provider,
  apiKey,
  onProviderChange,
  onKeyChange,
}: {
  provider: ProviderId
  apiKey: string
  onProviderChange: (p: ProviderId) => void
  onKeyChange: (k: string) => void
}) {
  const [showPlain, setShowPlain] = useState(false)
  const looksValid =
    apiKey.startsWith(PROVIDERS[provider].keyPrefix) && apiKey.length >= 20

  return (
    <div>
      <StepHeading
        eyebrow="Bring your key"
        title={`Connect your ${PROVIDERS[provider].label} key`}
        subtitle={`${BRAND_NAME} runs on your own ${PROVIDERS[provider].label} key. Your usage, your bill, your control.`}
      />

      <div className="mb-4 grid grid-cols-5 gap-2">
        {PROVIDER_IDS.map((id) => {
          const active = id === provider
          return (
            <SelectableCard
              key={id}
              active={active}
              onClick={() => onProviderChange(id)}
              ariaLabel={PROVIDERS[id].label}
              className="p-3"
            >
              <div className="flex w-full flex-col items-center gap-2">
                <Image
                  src={PROVIDERS[id].logo}
                  alt={PROVIDERS[id].label}
                  width={24}
                  height={24}
                  className="size-6 object-contain"
                />
                <span
                  className={cn(
                    "text-center text-xs font-medium leading-tight tracking-tight",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {PROVIDERS[id].label}
                </span>
              </div>
            </SelectableCard>
          )
        })}
      </div>

      <div className="rounded-xl border bg-background p-5">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3">
          <KeyRound className="size-4 text-muted-foreground" />
          <Input
            type={showPlain ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onKeyChange(e.target.value)}
            placeholder={`${PROVIDERS[provider].keyPrefix}...`}
            autoFocus
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            size="icon-sm"
            variant="ghost"
            type="button"
            onClick={() => setShowPlain((v) => !v)}
            aria-label={showPlain ? "Hide key" : "Show key"}
          >
            {showPlain ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 transition-colors",
              looksValid ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {looksValid && <Check className="size-3" />}
            {looksValid ? "Looks good" : `Starts with ${PROVIDERS[provider].keyPrefix}`}
          </span>
          <a
            href={PROVIDERS[provider].consoleUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
          >
            Where do I get one?
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <KeyRound className="size-3.5" />
        Stored encrypted. You can switch providers any time in settings.
      </p>
    </div>
  )
}

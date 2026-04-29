"use client"

import { motion } from "motion/react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/logo"
import { BRAND_NAME } from "@/lib/brand"

const EASE = [0.22, 1, 0.36, 1] as const

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <motion.span
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative mb-6 grid size-20 place-items-center"
      >
        <span className="relative grid size-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/15 via-background to-background ring-1 ring-border/80">
          <LogoMark className="size-10" />
        </span>
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
        className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl"
      >
        Let&apos;s tune {BRAND_NAME} to you
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.12 }}
        className="mt-4 max-w-xl text-balance text-base text-muted-foreground"
      >
        Drop in your API key first, then answer as many questions as you
        want. Skip whenever, get to chatting whenever.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
        className="mt-8"
      >
        <Button size="lg" onClick={onNext}>
          Let&apos;s set you up
          <ArrowRight className="size-4" />
        </Button>
      </motion.div>
    </div>
  )
}

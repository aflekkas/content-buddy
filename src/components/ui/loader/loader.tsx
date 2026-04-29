"use client"

import { CircularLoader } from "./circular"
import { ClassicLoader } from "./classic"
import { PulseLoader } from "./pulse"
import { PulseDotLoader } from "./pulse-dot"
import { DotsLoader } from "./dots"
import { TypingLoader } from "./typing"
import { WaveLoader } from "./wave"
import { BarsLoader } from "./bars"
import { TerminalLoader } from "./terminal"
import { TextBlinkLoader } from "./text-blink"
import { TextShimmerLoader } from "./text-shimmer"
import { TextDotsLoader } from "./text-dots"
import type { LoaderSize } from "./shared"

export interface LoaderProps {
  variant?:
    | "circular"
    | "classic"
    | "pulse"
    | "pulse-dot"
    | "dots"
    | "typing"
    | "wave"
    | "bars"
    | "terminal"
    | "text-blink"
    | "text-shimmer"
    | "loading-dots"
  size?: LoaderSize
  text?: string
  className?: string
}

export function Loader({
  variant = "circular",
  size = "md",
  text,
  className,
}: LoaderProps) {
  switch (variant) {
    case "circular":
      return <CircularLoader size={size} className={className} />
    case "classic":
      return <ClassicLoader size={size} className={className} />
    case "pulse":
      return <PulseLoader size={size} className={className} />
    case "pulse-dot":
      return <PulseDotLoader size={size} className={className} />
    case "dots":
      return <DotsLoader size={size} className={className} />
    case "typing":
      return <TypingLoader size={size} className={className} />
    case "wave":
      return <WaveLoader size={size} className={className} />
    case "bars":
      return <BarsLoader size={size} className={className} />
    case "terminal":
      return <TerminalLoader size={size} className={className} />
    case "text-blink":
      return <TextBlinkLoader text={text} size={size} className={className} />
    case "text-shimmer":
      return <TextShimmerLoader text={text} size={size} className={className} />
    case "loading-dots":
      return <TextDotsLoader text={text} size={size} className={className} />
    default:
      return <CircularLoader size={size} className={className} />
  }
}

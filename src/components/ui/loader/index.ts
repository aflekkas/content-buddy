// Re-export all loader variants so imports of "@/components/ui/loader" keep working.

export type { LoaderSize } from "./shared"

export { CircularLoader } from "./circular"
export { ClassicLoader } from "./classic"
export { PulseLoader } from "./pulse"
export { PulseDotLoader } from "./pulse-dot"
export { DotsLoader } from "./dots"
export { TypingLoader } from "./typing"
export { WaveLoader } from "./wave"
export { BarsLoader } from "./bars"
export { TerminalLoader } from "./terminal"
export { TextBlinkLoader } from "./text-blink"
export { TextShimmerLoader } from "./text-shimmer"
export { TextDotsLoader } from "./text-dots"

// Types
export type {
  LoaderProps,
} from "./loader"
export { Loader } from "./loader"

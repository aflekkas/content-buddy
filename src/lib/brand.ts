export const BRAND_NAME = "Shortform Guru";
export const BRAND_TAGLINE = "Content buddy";

// Mascot frames for stop-motion animation.
// Paths are relative to /public. Callers should reference specific keys so
// missing frames surface as type errors rather than silent fallbacks.
export const MASCOT = {
  idle: "/mascot.png",
  blinkMid: "/mascot-blink-1.png",
  blinkClosed: "/mascot-blink-2.png",
  thinkingLeft: "/mascot-thinking-1.png",
  thinkingRight: "/mascot-thinking-2.png",
} as const;

export type MascotFrame = keyof typeof MASCOT;

// Frame sequences for different moods. Each entry is [frameKey, holdMs].
export const MASCOT_SEQUENCES = {
  // Subtle idle: open eyes, brief blink every few seconds.
  idle: [
    ["idle", 3000],
    ["blinkMid", 70],
    ["blinkClosed", 110],
    ["blinkMid", 70],
  ] as const,
  // Thinking: eyes dart between up-left and up-right.
  thinking: [
    ["thinkingLeft", 700],
    ["idle", 220],
    ["thinkingRight", 700],
    ["idle", 220],
  ] as const,
} satisfies Record<string, ReadonlyArray<readonly [MascotFrame, number]>>;

export type MascotSequence = keyof typeof MASCOT_SEQUENCES;

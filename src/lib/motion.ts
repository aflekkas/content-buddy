import { useReducedMotion } from "motion/react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const DUR_FAST = 0.18;
export const DUR_NORMAL = 0.24;

export function useReducedMotionSafe(): boolean {
  return Boolean(useReducedMotion());
}

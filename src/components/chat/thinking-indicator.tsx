"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "@/components/logo";

const PHASES = [
  "Thinking",
  "Hunting for a hook",
  "Sketching the angle",
  "Tightening the script",
  "Picking the punchline",
  "Cooking",
];

// Keyframes are inlined so the indicator works regardless of globals.css state.
const STYLES = `
@keyframes sg-shimmer {
  0%   { background-position: -180% 0; }
  100% { background-position:  280% 0; }
}
@keyframes sg-halo {
  0%   { transform: scale(0.85); opacity: 0.55; }
  80%  { transform: scale(1.55); opacity: 0; }
  100% { transform: scale(1.55); opacity: 0; }
}
@keyframes sg-breath {
  0%, 100% { transform: scale(1);    opacity: 1; }
  50%      { transform: scale(0.96); opacity: 0.85; }
}
@keyframes sg-wave {
  0%, 100% { transform: scaleY(0.4); }
  50%      { transform: scaleY(1.4); }
}
@keyframes sg-fade-up {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sg-ellipsis {
  0%, 20%   { opacity: 0.15; transform: translateY(0); }
  50%       { opacity: 1;    transform: translateY(-1px); }
  80%, 100% { opacity: 0.15; transform: translateY(0); }
}
.sg-shimmer {
  background: linear-gradient(
    90deg,
    var(--muted-foreground) 0%,
    var(--muted-foreground) 38%,
    var(--foreground) 50%,
    var(--muted-foreground) 62%,
    var(--muted-foreground) 100%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
          background-clip: text;
  color: transparent;
  animation: sg-shimmer 2.4s linear infinite;
}
.sg-halo  { animation: sg-halo  1.6s ease-out infinite; }
.sg-halo2 { animation: sg-halo  1.6s ease-out 600ms infinite; }
.sg-breath { animation: sg-breath 2.4s ease-in-out infinite; }
.sg-wave  { animation: sg-wave  1.1s ease-in-out infinite; transform-origin: bottom; }
.sg-phase { animation: sg-fade-up 320ms ease-out; }
.sg-ellipsis { display: inline-flex; margin-left: 1px; }
.sg-ellipsis i {
  font-style: normal;
  display: inline-block;
  animation: sg-ellipsis 1.2s ease-in-out infinite;
}
.sg-ellipsis i:nth-child(2) { animation-delay: 160ms; }
.sg-ellipsis i:nth-child(3) { animation-delay: 320ms; }
@media (prefers-reduced-motion: reduce) {
  .sg-shimmer, .sg-halo, .sg-halo2, .sg-breath, .sg-wave, .sg-phase, .sg-ellipsis i {
    animation: none !important;
  }
  .sg-shimmer { color: var(--muted-foreground); }
}
`;

export function ThinkingIndicator() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhaseIndex((i) => (i + 1) % PHASES.length);
    }, 2200);
    const tickTimer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(phaseTimer);
      clearInterval(tickTimer);
    };
  }, []);

  return (
    <div className="flex w-full gap-3" aria-live="polite" aria-label="Assistant is thinking">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="relative size-10 shrink-0">
        <span aria-hidden className="sg-halo  absolute inset-0 rounded-xl bg-foreground/15" />
        <span aria-hidden className="sg-halo2 absolute inset-0 rounded-xl bg-foreground/10" />
        <LogoMark
          size={40}
          animate="thinking"
          className="sg-breath relative"
        />
      </div>

      <div className="flex min-h-7 flex-1 items-center gap-3">
        <span
          key={phaseIndex}
          className="sg-shimmer sg-phase text-sm font-medium tracking-tight"
        >
          {PHASES[phaseIndex]}
          <span className="sg-ellipsis" aria-hidden>
            <i>.</i>
            <i>.</i>
            <i>.</i>
          </span>
        </span>

        <span aria-hidden className="flex items-end gap-[3px] opacity-70">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="sg-wave block w-[2px] rounded-full bg-foreground/60"
              style={{
                height: 6 + (i % 2 === 0 ? 2 : 6),
                animationDelay: `${i * 110}ms`,
              }}
            />
          ))}
        </span>

        {elapsed >= 2 && (
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 tabular-nums">
            {elapsed}s
          </span>
        )}
      </div>
    </div>
  );
}

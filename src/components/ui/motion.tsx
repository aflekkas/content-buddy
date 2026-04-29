"use client";

import { motion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { DUR_NORMAL, EASE_OUT, useReducedMotionSafe } from "@/lib/motion";

type FadeInProps = {
  delay?: number;
  y?: number;
  className?: string;
  children: ReactNode;
};

type StaggerProps = {
  className?: string;
  children: ReactNode;
};

type StreamTextProps = {
  text: string;
  className?: string;
  isStreaming?: boolean;
  renderStable: (text: string) => ReactNode;
};

const STAGGER_VARIANTS = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
} as const;

const STAGGER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR_NORMAL, ease: EASE_OUT },
  },
} as const;

const BURST_TICK_MS = 120;
const FORCE_FLUSH_MS = 600;

function lastWordBoundary(text: string, fromIdx: number): number {
  for (let i = text.length - 1; i > fromIdx; i--) {
    if (/\s/.test(text[i])) return i + 1;
  }
  return -1;
}

export function FadeIn({ delay = 0, y = 4, className, children }: FadeInProps) {
  const reducedMotion = useReducedMotionSafe();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_NORMAL, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ className, children }: StaggerProps) {
  const reducedMotion = useReducedMotionSafe();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={STAGGER_VARIANTS}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children }: StaggerProps) {
  const reducedMotion = useReducedMotionSafe();

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={STAGGER_ITEM_VARIANTS}>
      {children}
    </motion.div>
  );
}

const TOKEN_RE = /(\s+)/;

function tokenizeStream(text: string) {
  return text.split(TOKEN_RE).filter((t) => t.length > 0);
}

export function StreamText({
  text,
  className,
  isStreaming = false,
  renderStable,
}: StreamTextProps) {
  const reducedMotion = useReducedMotionSafe();
  const displayedRef = useRef<string>(text);
  const lastUpdateRef = useRef(0);
  const [displayed, setDisplayed] = useState(text);

  const showText = useCallback((nextText: string) => {
    if (displayedRef.current === nextText) return;
    lastUpdateRef.current = performance.now();
    displayedRef.current = nextText;
    setDisplayed(nextText);
  }, []);

  useEffect(() => {
    if (reducedMotion || isStreaming === false) {
      showText(text);
      return;
    }

    if (text.length < displayedRef.current.length) {
      showText(text);
      return;
    }

    if (text.length <= displayedRef.current.length) {
      return;
    }

    const fromIdx = displayedRef.current.length;
    const elapsed = performance.now() - lastUpdateRef.current;
    const wait = Math.max(0, BURST_TICK_MS - elapsed);

    const flush = () => {
      const boundary = lastWordBoundary(text, fromIdx);
      if (boundary === -1) {
        if (performance.now() - lastUpdateRef.current >= FORCE_FLUSH_MS) {
          showText(text);
        }
        return;
      }
      showText(text.slice(0, boundary));
    };

    if (wait === 0) {
      flush();
      return;
    }
    const timeout = window.setTimeout(flush, wait);
    return () => window.clearTimeout(timeout);
  }, [isStreaming, reducedMotion, showText, text]);

  if (reducedMotion) {
    return <>{renderStable(text)}</>;
  }

  if (!isStreaming) {
    const stable = renderStable(text);
    if (!className) return <>{stable}</>;
    return <div className={className}>{stable}</div>;
  }

  const tokens = tokenizeStream(displayed);
  const nodes = tokens.map((tok, i) => {
    if (/^\s+$/.test(tok)) {
      return <span key={i}>{tok}</span>;
    }
    return (
      <motion.span
        key={i}
        initial={{ filter: "blur(4px)", opacity: 0 }}
        animate={{ filter: "blur(0px)", opacity: 1 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
      >
        {tok}
      </motion.span>
    );
  });

  return (
    <div className={className} style={{ whiteSpace: "pre-wrap" }}>
      {nodes}
    </div>
  );
}

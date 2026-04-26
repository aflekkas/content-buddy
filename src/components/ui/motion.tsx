"use client";

import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
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

export function StreamText({
  text,
  className,
  isStreaming = false,
  renderStable,
}: StreamTextProps) {
  const reducedMotion = useReducedMotionSafe();
  const stableRef = useRef<string>("");
  const [stable, setStable] = useState("");
  const [, setVersion] = useState(0);

  const promoteStable = (nextStable: string) => {
    if (stableRef.current === nextStable) return;
    stableRef.current = nextStable;
    setStable(nextStable);
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    if (isStreaming === false) {
      promoteStable(text);
      return;
    }

    if (text.length < stableRef.current.length) {
      promoteStable(text);
      return;
    }

    if (text.length <= stableRef.current.length) {
      return;
    }

    const timeout = window.setTimeout(() => {
      promoteStable(text);
    }, 60);

    return () => window.clearTimeout(timeout);
  }, [isStreaming, reducedMotion, text]);

  if (reducedMotion) {
    return <>{renderStable(text)}</>;
  }

  const stableText = isStreaming === false ? text : stable;
  const tail =
    text.length > stableText.length ? text.slice(stableText.length) : "";

  return (
    <>
      {renderStable(stableText)}
      {tail.length > 0 && (
        <motion.span
          key={stableText.length}
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, ease: EASE_OUT }}
        >
          {tail}
        </motion.span>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/ui/prompt-input";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
};

export function ChatInput({
  onSubmit,
  isStreaming,
  onStop,
  autoFocus,
}: Props) {
  const [value, setValue] = useState("");

  function send() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSubmit(trimmed);
    setValue("");
  }

  return (
    <PromptInput
      value={value}
      onValueChange={setValue}
      onSubmit={send}
      isLoading={isStreaming}
      className="flex flex-col gap-2"
    >
      <PromptInputTextarea
        placeholder="Tell me what you want to make..."
        autoFocus={autoFocus}
        className="px-2 py-1.5"
      />
      <PromptInputActions className="justify-end">
        <PromptInputAction tooltip={isStreaming ? "Stop generating" : "Send"}>
          <Button
            type="button"
            size="icon"
            variant="default"
            className="rounded-full"
            onClick={isStreaming ? onStop : send}
            disabled={!isStreaming && !value.trim()}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isStreaming ? "stop" : "send"}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="inline-flex"
              >
                {isStreaming ? <Square className="fill-current" /> : <ArrowUp />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  );
}

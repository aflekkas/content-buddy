"use client";

import { useState } from "react";
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
        {isStreaming ? (
          <PromptInputAction tooltip="Stop generating">
            <Button
              type="button"
              size="icon"
              variant="default"
              className="rounded-full"
              onClick={onStop}
            >
              <Square className="fill-current" />
            </Button>
          </PromptInputAction>
        ) : (
          <PromptInputAction tooltip="Send">
            <Button
              type="button"
              size="icon"
              onClick={send}
              disabled={!value.trim()}
              className="rounded-full"
            >
              <ArrowUp />
            </Button>
          </PromptInputAction>
        )}
      </PromptInputActions>
    </PromptInput>
  );
}

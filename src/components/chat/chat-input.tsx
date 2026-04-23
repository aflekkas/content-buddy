"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Mic, MicOff, ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceDictation } from "./voice-dictation";
import { cn } from "@/lib/utils";

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  autoFocus?: boolean;
};

export function ChatInput({
  onSubmit,
  disabled,
  isStreaming,
  onStop,
  autoFocus,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const voice = useVoiceDictation((transcript) => {
    setValue((prev) => {
      const sep = prev && !prev.endsWith(" ") ? " " : "";
      return prev + sep + transcript;
    });
  });

  function send() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="relative flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Tell me what you want to make..."
        rows={1}
        autoFocus={autoFocus}
        className="min-h-0 max-h-48 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center gap-1.5">
        {voice.supported && (
          <Button
            type="button"
            size="sm"
            variant={voice.listening ? "default" : "secondary"}
            onClick={voice.toggle}
            disabled={disabled}
            className={cn(
              "rounded-full gap-1.5 px-3",
              voice.listening && "bg-red-600 text-white hover:bg-red-600/90",
            )}
            title={voice.listening ? "Stop dictation" : "Dictate with voice"}
          >
            {voice.listening ? (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-white" />
                </span>
                <span>Listening</span>
              </>
            ) : (
              <>
                <Mic />
                <span>Speak</span>
              </>
            )}
          </Button>
        )}
        {isStreaming ? (
          <Button
            type="button"
            size="icon"
            variant="default"
            className="rounded-full"
            onClick={onStop}
          >
            <Square className="fill-current" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={send}
            disabled={disabled || !value.trim()}
            className="rounded-full"
          >
            <ArrowUp />
          </Button>
        )}
      </div>
    </div>
  );
}

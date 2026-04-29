"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  url: string;
  alt: string;
  className?: string;
  thumbClassName?: string;
};

export function ChatImage({ url, alt, className, thumbClassName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${alt}`}
        className={cn(
          "group relative overflow-hidden rounded-md border border-border bg-muted transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
      >
        <Image
          src={url}
          alt={alt}
          fill
          sizes="200px"
          className={cn("object-cover", thumbClassName)}
          unoptimized
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="border-0 bg-transparent p-0 shadow-none sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <Image
            src={url}
            alt={alt}
            width={1600}
            height={1200}
            className="h-auto max-h-[85vh] w-full rounded-lg object-contain"
            unoptimized
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

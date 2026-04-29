"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function SectionHeader({ title, subtitle, onBack }: Props) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onBack}
        aria-label="Back to settings"
        className="-ml-1 mt-0.5 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { ThemeProvider as InternalThemeProvider } from "@/lib/theme";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <InternalThemeProvider>{children}</InternalThemeProvider>;
}

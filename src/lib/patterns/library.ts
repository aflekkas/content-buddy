import fs from "node:fs";
import path from "node:path";

let cached: string | null = null;

export function getPatternLibrary(): string {
  if (cached) return cached;
  const filePath = path.join(process.cwd(), "src/lib/patterns/pattern-library.md");
  cached = fs.readFileSync(filePath, "utf-8");
  return cached;
}

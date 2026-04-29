"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const REPO_URL = "https://github.com/aflekkas/shortform-studio";

export function OpenSourceSection() {
  return (
    <section className="border-t">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="flex flex-col items-center justify-between gap-4 rounded-xl border bg-muted/20 px-6 py-5 sm:flex-row"
        >
          <div className="flex items-center gap-3">
            <Image
              src="/github-mark.svg"
              alt="GitHub"
              width={22}
              height={22}
              className="shrink-0"
            />
            <p className="text-sm text-muted-foreground">
              built in the open.{" "}
              <span className="text-foreground font-medium">
                clone it, fork it, run your own.
              </span>
            </p>
          </div>
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "shrink-0 gap-1.5",
            )}
          >
            View on GitHub
            <ArrowUpRight className="size-3.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

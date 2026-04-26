"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColumnHeader } from "@/components/cockpit/column-header";
import { BRAND_NAME } from "@/lib/brand";
import { EASE_OUT } from "@/lib/motion";
import type { UserFactRow } from "@/lib/db/types";

type Props = {
  bio: string;
  facts: UserFactRow[];
};

export function BrandPanel({ bio: initialBio, facts: initialFacts }: Props) {
  const [bio, setBio] = useState(initialBio);
  const [savedBio, setSavedBio] = useState(initialBio);
  const [facts, setFacts] = useState(initialFacts);
  const [newFact, setNewFact] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [addingFact, setAddingFact] = useState(false);

  async function saveBio() {
    if (bio === savedBio || savingBio) return;

    setSavingBio(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      if (!res.ok) throw new Error("save_failed");
      const data = await res.json();
      setSavedBio(data.bio);
      setBio(data.bio);
    } catch {
      toast.error("Could not save bio");
      setBio(savedBio);
    } finally {
      setSavingBio(false);
    }
  }

  async function addFact() {
    const content = newFact.trim();
    if (content.length < 3) return;
    setAddingFact(true);
    try {
      const res = await fetch("/api/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("add_failed");
      const fact: UserFactRow = await res.json();
      setFacts((prev) => [fact, ...prev]);
      setNewFact("");
    } catch {
      toast.error("Could not add fact");
    } finally {
      setAddingFact(false);
    }
  }

  async function removeFact(id: string) {
    const prev = facts;
    setFacts((list) => list.filter((f) => f.id !== id));
    try {
      const res = await fetch(`/api/facts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete_failed");
    } catch {
      setFacts(prev);
      toast.error("Could not delete fact");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ColumnHeader
        icon={UserRound}
        title="About you"
        description="Who you are, what you post, and who it's for."
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section className="space-y-2 border-b p-4">
          <Label htmlFor="cockpit-bio">Bio</Label>
          <Textarea
            id="cockpit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            onBlur={() => void saveBio()}
            placeholder="I run an AI agency for SMBs. I post on LinkedIn and YouTube Shorts, targeting founders and operators. Tone: direct, a little contrarian."
            className="min-h-40 bg-muted/40"
            maxLength={2000}
            disabled={savingBio}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {savingBio ? "Saving…" : "Saves when you leave the field"}
            </span>
            <span>{bio.length} / 2000</span>
          </div>
        </section>

        <section className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <Label>Facts</Label>
            <span className="text-xs text-muted-foreground">
              Remembered from past chats
            </span>
          </div>

          {facts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
              No facts yet. As you chat, {BRAND_NAME} will remember stable
              things about you here.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {facts.map((fact) => (
                  <motion.li
                    key={fact.id}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="group flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                  >
                    <span className="min-w-0 break-words">{fact.content}</span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete fact"
                      onClick={() => void removeFact(fact.id)}
                      className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 />
                    </Button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <div className="flex items-center gap-2">
            <Input
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addFact();
                }
              }}
              placeholder="Add a fact you want remembered"
              maxLength={300}
              className="bg-muted/40"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void addFact()}
              disabled={addingFact || newFact.trim().length < 3}
            >
              <Plus />
              Add
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

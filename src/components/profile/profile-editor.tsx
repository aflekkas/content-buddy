"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { UserFactRow } from "@/lib/db/types";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  initialBio: string;
  initialFacts: UserFactRow[];
};

export function ProfileEditor({ initialBio, initialFacts }: Props) {
  const [bio, setBio] = useState(initialBio);
  const [savedBio, setSavedBio] = useState(initialBio);
  const [facts, setFacts] = useState(initialFacts);
  const [newFact, setNewFact] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [addingFact, setAddingFact] = useState(false);

  const bioChanged = bio !== savedBio;

  async function saveBio() {
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
      toast.success("Bio saved");
    } catch {
      toast.error("Could not save bio");
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
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">Bio</h2>
          <p className="text-xs text-muted-foreground">
            A short self-description. Who you are, what you post, who you post
            for. Included in every chat.
          </p>
        </div>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="I run an AI agency for SMBs. I post on LinkedIn and YouTube Shorts, targeting founders and operators. Tone: direct, a little contrarian."
          className="min-h-32"
          maxLength={2000}
        />
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {bio.length} / 2000
          </span>
          <Button
            size="sm"
            onClick={saveBio}
            disabled={!bioChanged || savingBio}
          >
            {savingBio ? "Saving..." : "Save bio"}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium">Facts</h2>
          <p className="text-xs text-muted-foreground">
            Things {BRAND_NAME} has learned about you from past chats. Add
            your own or delete ones that are wrong.
          </p>
        </div>

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
            placeholder="e.g., Posts primarily on Instagram Reels"
            maxLength={300}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={addFact}
            disabled={addingFact || newFact.trim().length < 3}
          >
            <Plus />
            Add
          </Button>
        </div>

        {facts.length === 0 ? (
          <div className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            No facts yet. As you chat, {BRAND_NAME} will remember stable
            things about you here.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {facts.map((f) => (
              <li
                key={f.id}
                className="group flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{f.content}</span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete fact"
                  onClick={() => removeFact(f.id)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatRow } from "@/lib/db/types";
import { formatRelativeTime } from "@/lib/system-prompt";

type Props = {
  chats: ChatRow[];
  activeId: string | null;
};

export function ChatSidebar({ chats, activeId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(chats);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  async function handleNewChat() {
    setCreating(true);
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      if (!res.ok) return;
      const chat = (await res.json()) as ChatRow;
      setItems((current) => [chat, ...current]);
      router.push(`/dashboard/chat/${chat.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(id: string) {
    const title = editingValue.trim();
    if (!title) return;
    const res = await fetch(`/api/chats/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return;
    setItems((current) =>
      current.map((c) => (c.id === id ? { ...c, title } : c)),
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((current) => current.filter((c) => c.id !== id));
    if (activeId === id) router.push("/dashboard/chat");
  }

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r bg-muted/20 md:flex">
      <div className="shrink-0 p-3">
        <Button
          type="button"
          onClick={() => void handleNewChat()}
          disabled={creating}
          className="w-full justify-start"
          variant="outline"
        >
          <Plus className="size-4" /> New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {items.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No chats yet. Start one to talk with your ghostwriter.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {items.map((chat) => {
              const active = chat.id === activeId;
              if (editingId === chat.id) {
                return (
                  <li key={chat.id} className="flex items-center gap-1 p-1">
                    <Input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRename(chat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-8"
                      maxLength={200}
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => void handleRename(chat.id)}
                      aria-label="Save title"
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </li>
                );
              }
              return (
                <li key={chat.id} className="group">
                  <Link
                    href={`/dashboard/chat/${chat.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      {chat.title || "Untitled chat"}
                    </span>
                    <span className="hidden shrink-0 text-[10px] text-muted-foreground/70 group-hover:hidden md:inline">
                      {formatRelativeTime(chat.updated_at)}
                    </span>
                    <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                      <button
                        type="button"
                        aria-label="Rename"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingId(chat.id);
                          setEditingValue(chat.title ?? "");
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={(e) => {
                          e.preventDefault();
                          void handleDelete(chat.id);
                        }}
                        className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

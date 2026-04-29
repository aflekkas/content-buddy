"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { groupChatsByDate } from "@/lib/chat-groups";
import { cn } from "@/lib/utils";
import type { ChatRow } from "@/lib/db/types";

type Props = {
  chats: ChatRow[];
  activeChatId: string;
  activeTitle: string;
};

type SearchHit = {
  chat_id: string;
  title: string | null;
  updated_at: string;
  snippet: string;
  matched_at: string;
};

export function ChatSwitcher({ chats, activeChatId, activeTitle }: Props) {
  const router = useRouter();
  const groups = useMemo(() => groupChatsByDate(chats), [chats]);
  const [creatingChat, setCreatingChat] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState(activeTitle);
  const [renamePending, setRenamePending] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const searchActive = search.trim().length >= 2;

  useEffect(() => {
    if (!searchActive) return;
    const trimmed = search.trim();
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: SearchHit[] };
        if (!cancelled) setHits(data.results);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [search, searchActive]);

  const handleCreateChat = useCallback(async () => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const res = await fetch("/api/chats", { method: "POST" });
      if (!res.ok) throw new Error("create failed");
      const chat = (await res.json()) as ChatRow;
      router.push(`/dashboard/chat/${chat.id}`);
      router.refresh();
    } catch {
      toast.error("Couldn't create chat");
      setCreatingChat(false);
    }
  }, [creatingChat, router]);

  const startRename = useCallback(() => {
    setRenameDraft(activeTitle);
    setIsRenaming(true);
    requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [activeTitle]);

  const cancelRename = useCallback(() => {
    setRenameDraft(activeTitle);
    setIsRenaming(false);
  }, [activeTitle]);

  const saveRename = useCallback(async () => {
    const next = renameDraft.trim();
    if (!next || next === activeTitle) {
      setIsRenaming(false);
      return;
    }
    setRenamePending(true);
    try {
      const res = await fetch(`/api/chats/${activeChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      if (!res.ok) throw new Error("rename failed");
      router.refresh();
    } catch {
      toast.error("Couldn't rename chat");
    } finally {
      setRenamePending(false);
      setIsRenaming(false);
    }
  }, [activeChatId, activeTitle, renameDraft, router]);

  if (isRenaming) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={renameInputRef}
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onBlur={() => void saveRename()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelRename();
            }
          }}
          disabled={renamePending}
          className="h-7 min-w-0 flex-1 bg-muted/40 text-sm font-medium"
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => void saveRename()}
          disabled={renamePending}
          aria-label="Save title"
        >
          <Check />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={cancelRename}
          disabled={renamePending}
          aria-label="Cancel"
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="-ml-1 max-w-full justify-start gap-1.5 px-1.5 font-medium"
          >
            <span className="min-w-0 truncate">{activeTitle}</span>
            <ChevronDown className="shrink-0 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent side="bottom" align="start" className="w-80 p-2">
        <div className="relative mb-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats and messages…"
            className="h-8 pl-7 pr-7 text-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {searchActive ? (
          <div className="max-h-[24rem] space-y-1 overflow-y-auto pr-1">
            {searching && hits.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                Searching…
              </div>
            ) : hits.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No matches.
              </div>
            ) : (
              hits.map((hit) => (
                <SearchResult key={hit.chat_id} hit={hit} />
              ))
            )}
          </div>
        ) : (
          <>
            <DropdownMenuItem
              onClick={(event) => {
                event.preventDefault();
                startRename();
              }}
            >
              <Pencil className="mr-2 size-4" />
              Rename this chat
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={creatingChat}
              onClick={(event) => {
                event.preventDefault();
                void handleCreateChat();
              }}
            >
              <MessageSquarePlus className="mr-2 size-4" />
              {creatingChat ? "Creating…" : "New chat"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {groups.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground">
                No chats yet.
              </div>
            ) : (
              <div className="max-h-[24rem] space-y-3 overflow-y-auto pr-1">
                {groups.map((group) => (
                  <DropdownMenuGroup key={group.name}>
                    <DropdownMenuLabel className="px-2">
                      {group.name}
                    </DropdownMenuLabel>
                    <div className="mt-1 space-y-1">
                      {group.chats.map((chat) => (
                        <ChatSwitcherItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === activeChatId}
                        />
                      ))}
                    </div>
                  </DropdownMenuGroup>
                ))}
              </div>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchResult({ hit }: { hit: SearchHit }) {
  const router = useRouter();
  const title = hit.title?.trim() || "New chat";
  return (
    <button
      type="button"
      onClick={() => router.push(`/dashboard/chat/${hit.chat_id}`)}
      className="block w-full rounded-lg border border-transparent px-2 py-1.5 text-left hover:border-border hover:bg-muted/40"
    >
      <div className="truncate text-sm font-medium">{title}</div>
      <div
        className="mt-0.5 line-clamp-2 text-xs text-muted-foreground [&_mark]:bg-amber-200/70 [&_mark]:text-foreground dark:[&_mark]:bg-amber-500/30"
        dangerouslySetInnerHTML={{ __html: sanitizeSnippet(hit.snippet) }}
      />
    </button>
  );
}

function sanitizeSnippet(raw: string): string {
  // The RPC emits <mark>...</mark> tags around hits. Escape everything else
  // and only re-introduce <mark> safely.
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;mark&gt;/g, "<mark>")
    .replace(/&lt;\/mark&gt;/g, "</mark>");
}

function ChatSwitcherItem({
  chat,
  isActive,
}: {
  chat: ChatRow;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const displayTitle = chat.title || "New chat";

  const confirmDelete = useCallback(async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/chats/${chat.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setIsDeleteOpen(false);
      if (isActive) router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't delete chat");
    } finally {
      setPending(false);
    }
  }, [chat.id, isActive, router]);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-2 py-1.5",
          isActive
            ? "border-border bg-muted/50 text-foreground"
            : "border-transparent bg-transparent hover:border-border hover:bg-muted/40",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => router.push(`/dashboard/chat/${chat.id}`)}
          className="min-w-0 flex-1 justify-start"
        >
          <span className="block truncate font-medium">{displayTitle}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${displayTitle}`}
              >
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent side="right" align="start" className="w-40">
            <DropdownMenuItem
              variant="destructive"
              onClick={(event) => {
                event.preventDefault();
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription>
              <span className="block truncate font-medium text-foreground">
                {displayTitle}
              </span>
              This will permanently remove the chat and all of its messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

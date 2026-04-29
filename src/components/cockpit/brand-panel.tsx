"use client";

import { useMemo, useState } from "react";
import {
  Brain,
  Check,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserSquare,
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CircularLoader } from "@/components/ui/loader";
import { ColumnHeader } from "@/components/cockpit/column-header";
import {
  cockpitDashedPanelClass,
  cockpitInputClass,
  cockpitSoftPanelClass,
} from "@/components/cockpit/cockpit-primitives";
import {
  DEFAULT_MEMORY_PATH,
  isProtectedMemoryPath,
  isSyntheticMemoryFileId,
  titleFromMemoryPath,
} from "@/lib/memory";
import { DUR_FAST, EASE_OUT, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { MemoryFileRow } from "@/lib/db/types";

type Props = {
  files: MemoryFileRow[];
};

type Draft = {
  path: string;
  title: string;
  content: string;
  autoload: boolean;
};

type TreeNode =
  | {
      type: "folder";
      name: string;
      path: string;
      children: TreeNode[];
    }
  | {
      type: "file";
      name: string;
      path: string;
      file: MemoryFileRow;
    };

type MutableFolder = {
  type: "folder";
  name: string;
  path: string;
  folders: Map<string, MutableFolder>;
  files: TreeNode[];
};

export function BrandPanel({ files: initialFiles }: Props) {
  const initialSelectedFile =
    initialFiles.find((file) => file.path === DEFAULT_MEMORY_PATH) ??
    initialFiles[0];
  const [files, setFiles] = useState(initialFiles);
  const [selectedId, setSelectedId] = useState(
    initialSelectedFile?.id,
  );
  const [draft, setDraft] = useState<Draft | null>(() =>
    initialSelectedFile ? draftFromFile(initialSelectedFile) : null,
  );
  const [newPath, setNewPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    () => initialOpenFolders(initialSelectedFile?.path),
  );

  const selectedFile = files.find((file) => file.id === selectedId) ?? files[0];
  const tree = useMemo(() => buildTree(files), [files]);
  const memoryReadOnly = files.some((file) => file.id.startsWith("virtual:"));
  const selectedSynthetic = Boolean(
    selectedFile && isSyntheticMemoryFileId(selectedFile.id),
  );
  const selectedProtected = Boolean(
    selectedFile &&
      (selectedSynthetic || isProtectedMemoryPath(selectedFile.path)),
  );
  const fileLocked = memoryReadOnly || selectedProtected;
  const isDirty = Boolean(
    selectedFile &&
      draft &&
      (draft.path !== selectedFile.path ||
        draft.title !== selectedFile.title ||
        draft.content !== selectedFile.content ||
        draft.autoload !== selectedFile.autoload),
  );

  async function createFile() {
    const path = newPath.trim();
    if (!path) return;

    setCreating(true);
    try {
      const title = titleFromMemoryPath(path);
      const res = await fetch("/api/memory/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path,
          title,
          content: `# ${title}\n`,
          autoload: false,
        }),
      });
      if (!res.ok) throw new Error("create_failed");
      const file: MemoryFileRow = await res.json();
      setFiles((prev) => sortFiles([...prev, file]));
      setSelectedId(file.id);
      setDraft(draftFromFile(file));
      setNewPath("");
      expandParents(file.path, setOpenFolders);
    } catch {
      toast.error("Could not create memory file");
    } finally {
      setCreating(false);
    }
  }

  async function saveFile() {
    if (!selectedFile || !draft || saving || !isDirty) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/memory/files/${selectedFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error("save_failed");
      const file: MemoryFileRow = await res.json();
      setFiles((prev) =>
        sortFiles(prev.map((item) => (item.id === file.id ? file : item))),
      );
      setSelectedId(file.id);
      setDraft(draftFromFile(file));
      expandParents(file.path, setOpenFolders);
    } catch {
      toast.error("Could not save memory file");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFile() {
    if (!selectedFile) return;
    if (!window.confirm(`Delete ${selectedFile.path}?`)) return;

    const previous = files;
    const nextFiles = files.filter((file) => file.id !== selectedFile.id);
    const nextSelectedFile = nextFiles[0];
    setFiles(nextFiles);
    setSelectedId(nextSelectedFile?.id);
    setDraft(nextSelectedFile ? draftFromFile(nextSelectedFile) : null);

    try {
      const res = await fetch(`/api/memory/files/${selectedFile.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete_failed");
    } catch {
      setFiles(previous);
      setSelectedId(selectedFile.id);
      setDraft(draftFromFile(selectedFile));
      toast.error("Could not delete memory file");
    }
  }

  function selectFile(file: MemoryFileRow) {
    if (isDirty && !window.confirm("Discard unsaved changes?")) return;
    setSelectedId(file.id);
    setDraft(draftFromFile(file));
    expandParents(file.path, setOpenFolders);
  }

  return (
    <div className="flex h-full flex-col">
      <ColumnHeader
        icon={Brain}
        title="Memory"
        description="Markdown files the agent can read."
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <section className="space-y-3 border-b bg-background/80 p-3">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-muted-foreground">Library</Label>
            <span className="text-[11px] text-muted-foreground">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          </div>

          {memoryReadOnly ? (
            <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              Memory is in read-only preview until the database migration is
              applied.
            </div>
          ) : null}

          <div className={cn("min-h-28 p-1.5", cockpitSoftPanelClass)}>
            {tree.length === 0 ? (
              <div className="px-2 py-8 text-center text-xs text-muted-foreground">
                No memory files yet.
              </div>
            ) : (
              <div className="space-y-0.5">
                {tree.map((node) => (
                  <TreeRow
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedId={selectedFile?.id}
                    openFolders={openFolders}
                    setOpenFolders={setOpenFolders}
                    onSelect={selectFile}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input
              value={newPath}
              onChange={(event) => setNewPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createFile();
                }
              }}
              placeholder="audience.md"
              className={cn("h-8 text-xs", cockpitInputClass)}
              disabled={creating || memoryReadOnly}
            />
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Create memory file"
              onClick={() => void createFile()}
              disabled={creating || memoryReadOnly || !newPath.trim()}
            >
              <Plus />
            </Button>
          </div>
        </section>

        <section className="flex min-h-[28rem] flex-1 flex-col gap-3 p-3">
          {selectedFile && draft ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor="memory-path"
                    className="text-xs text-muted-foreground"
                  >
                    File
                  </Label>
                  {selectedSynthetic ? (
                    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Sparkles className="size-3" />
                      System
                    </span>
                  ) : selectedProtected ? (
                    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Lock className="size-3" />
                      Protected
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={draft.autoload ? "secondary" : "outline"}
                      onClick={() =>
                        setDraft((prev) =>
                          prev ? { ...prev, autoload: !prev.autoload } : prev,
                        )
                      }
                      disabled={fileLocked}
                    >
                      {draft.autoload ? <Check /> : null}
                      Autoload
                    </Button>
                  )}
                </div>
                <Input
                  id="memory-path"
                  value={draft.path}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev ? { ...prev, path: event.target.value } : prev,
                    )
                  }
                  className={cn("font-mono text-xs", cockpitInputClass)}
                  disabled={fileLocked}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="memory-title"
                  className="text-xs text-muted-foreground"
                >
                  Title
                </Label>
                <Input
                  id="memory-title"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev ? { ...prev, title: event.target.value } : prev,
                    )
                  }
                  className={cockpitInputClass}
                  disabled={fileLocked}
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <Label
                  htmlFor="memory-content"
                  className="text-xs text-muted-foreground"
                >
                  Markdown
                </Label>
                <Textarea
                  id="memory-content"
                  value={draft.content}
                  onChange={(event) =>
                    setDraft((prev) =>
                      prev ? { ...prev, content: event.target.value } : prev,
                    )
                  }
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "s") {
                      event.preventDefault();
                      void saveFile();
                    }
                  }}
                  className={cn(
                    "min-h-72 flex-1 resize-none font-mono text-xs leading-5",
                    cockpitInputClass,
                  )}
                  maxLength={20000}
                  disabled={fileLocked}
                />
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void deleteFile()}
                  disabled={fileLocked}
                >
                  <Trash2 />
                  Delete
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedSynthetic
                      ? "Read-only"
                      : selectedProtected
                        ? "Managed by agent"
                        : isDirty
                          ? "Unsaved"
                          : "Saved"}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => void saveFile()}
                    disabled={fileLocked || !isDirty || saving}
                  >
                    {saving ? <CircularLoader size="sm" /> : <Save />}
                    {saving ? "Saving" : "Save"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div
              className={cn(
                "px-3 py-8 text-center text-xs text-muted-foreground",
                cockpitDashedPanelClass,
              )}
            >
              Create a markdown file to start building memory.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  selectedId,
  openFolders,
  setOpenFolders,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | undefined;
  openFolders: Set<string>;
  setOpenFolders: (updater: (prev: Set<string>) => Set<string>) => void;
  onSelect: (file: MemoryFileRow) => void;
}) {
  const reducedMotion = useReducedMotionSafe();

  if (node.type === "folder") {
    const isOpen = openFolders.has(node.path);
    return (
      <div>
        <button
          type="button"
          className="flex h-7 w-full items-center gap-1 rounded-md px-1.5 text-left text-xs text-muted-foreground hover:bg-muted/60"
          style={{ paddingLeft: depth * 14 + 6 }}
          onClick={() =>
            setOpenFolders((prev) => {
              const next = new Set(prev);
              if (next.has(node.path)) next.delete(node.path);
              else next.add(node.path);
              return next;
            })
          }
        >
          <motion.span
            className="flex"
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: DUR_FAST, ease: EASE_OUT }
            }
          >
            <ChevronRight className="size-3" />
          </motion.span>
          {isOpen ? (
            <FolderOpen className="size-3.5" />
          ) : (
            <Folder className="size-3.5" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        <AnimatePresence initial={false}>
          {isOpen ? (
            <motion.div
              key="content"
              initial={reducedMotion ? false : { height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: DUR_FAST, ease: EASE_OUT }
              }
              className="overflow-hidden"
            >
              <div className="space-y-0.5 pt-0.5">
                {node.children.map((child) => (
                  <TreeRow
                    key={child.path}
                    node={child}
                    depth={depth + 1}
                    selectedId={selectedId}
                    openFolders={openFolders}
                    setOpenFolders={setOpenFolders}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  const selected = node.file.id === selectedId;
  return (
    <button
      type="button"
      className={cn(
        "flex h-7 w-full items-center gap-1.5 rounded-md px-1.5 text-left text-xs hover:bg-muted/60",
        selected && "bg-primary/10 text-primary",
      )}
      style={{ paddingLeft: depth * 14 + 22 }}
      onClick={() => onSelect(node.file)}
    >
      <FileIcon file={node.file} />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
      {node.file.autoload ? (
        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
      ) : null}
    </button>
  );
}

function FileIcon({ file }: { file: MemoryFileRow }) {
  const className = "size-3.5 shrink-0";
  if (isSyntheticMemoryFileId(file.id)) {
    return <Sparkles className={className} />;
  }
  if (file.path === "identity.md") return <UserSquare className={className} />;
  if (file.path === "facts.md") return <Wand2 className={className} />;
  return <FileText className={className} />;
}

function draftFromFile(file: MemoryFileRow): Draft {
  return {
    path: file.path,
    title: file.title,
    content: file.content,
    autoload: file.autoload,
  };
}

function sortFiles(files: MemoryFileRow[]): MemoryFileRow[] {
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}

function buildTree(files: MemoryFileRow[]): TreeNode[] {
  const root: MutableFolder = {
    type: "folder",
    name: "",
    path: "",
    folders: new Map(),
    files: [],
  };

  for (const file of sortFiles(files)) {
    const parts = file.path.split("/");
    let current = root;

    for (const part of parts.slice(0, -1)) {
      const path = `${current.path}${part}/`;
      let folder = current.folders.get(part);
      if (!folder) {
        folder = {
          type: "folder",
          name: part,
          path,
          folders: new Map(),
          files: [],
        };
        current.folders.set(part, folder);
      }
      current = folder;
    }

    current.files.push({
      type: "file",
      name: parts[parts.length - 1] ?? file.path,
      path: file.path,
      file,
    });
  }

  return flattenFolder(root);
}

function flattenFolder(folder: MutableFolder): TreeNode[] {
  const folders = [...folder.folders.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((child) => ({
      type: "folder" as const,
      name: child.name,
      path: child.path,
      children: flattenFolder(child),
    }));

  return [...folders, ...folder.files.sort((a, b) => a.name.localeCompare(b.name))];
}

function expandParents(
  path: string,
  setOpenFolders: (updater: (prev: Set<string>) => Set<string>) => void,
) {
  const parts = path.split("/").slice(0, -1);
  if (parts.length === 0) return;

  setOpenFolders((prev) => {
    const next = new Set(prev);
    let prefix = "";
    for (const part of parts) {
      prefix += `${part}/`;
      next.add(prefix);
    }
    return next;
  });
}

function initialOpenFolders(path: string | undefined): Set<string> {
  const open = new Set(["facts/"]);
  if (!path) return open;

  let prefix = "";
  for (const part of path.split("/").slice(0, -1)) {
    prefix += `${part}/`;
    open.add(prefix);
  }
  return open;
}

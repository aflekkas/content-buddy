"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ACTIVE_DRAFTS_PARAM,
  parseActiveDraftIds,
  writeActiveDraftIds,
} from "@/lib/active-drafts";
import type { DraftRow } from "@/lib/db/types";

const DRAFT_EVENT_NAME = "linkedin-studio:draft";

type DraftEvent =
  | { type: "updated"; draft: DraftRow }
  | { type: "deleted"; id: string };

type ContextValue = {
  activeDraftIds: string[];
  openDraft: (id: string, draft?: DraftRow) => void;
  closeDraft: (id: string) => void;
  reorderDrafts: (fromIndex: number, toIndex: number) => void;
  closeAllDrafts: () => void;
  getCached: (id: string) => DraftRow | undefined;
  primeCache: (rows: DraftRow[]) => void;
};

const ActiveDraftsContext = createContext<ContextValue | null>(null);

function readInitialIds(): string[] {
  if (typeof window === "undefined") return [];
  return parseActiveDraftIds(window.location.search);
}

function mirrorIdsToUrl(ids: string[]) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  writeActiveDraftIds(url.searchParams, ids);
  const next = `${url.pathname}${url.search ? url.search : ""}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}

export function ActiveDraftsProvider({ children }: { children: ReactNode }) {
  const [activeDraftIds, setActiveDraftIds] = useState<string[]>(readInitialIds);
  const cacheRef = useRef<Map<string, DraftRow>>(new Map());
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const fromUrl = parseActiveDraftIds(window.location.search);
      setActiveDraftIds((current) => {
        if (
          current.length === fromUrl.length &&
          current.every((id, i) => id === fromUrl[i])
        ) {
          return current;
        }
        return fromUrl;
      });
      return;
    }
    mirrorIdsToUrl(activeDraftIds);
  }, [activeDraftIds]);

  useEffect(() => {
    function onPopState() {
      setActiveDraftIds(parseActiveDraftIds(window.location.search));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    function onDraftEvent(event: Event) {
      const detail = (event as CustomEvent<DraftEvent>).detail;
      if (!detail) return;
      if (detail.type === "updated") {
        cacheRef.current.set(detail.draft.id, detail.draft);
      } else if (detail.type === "deleted") {
        cacheRef.current.delete(detail.id);
        setActiveDraftIds((current) =>
          current.includes(detail.id)
            ? current.filter((id) => id !== detail.id)
            : current,
        );
      }
    }
    window.addEventListener(DRAFT_EVENT_NAME, onDraftEvent);
    return () => window.removeEventListener(DRAFT_EVENT_NAME, onDraftEvent);
  }, []);

  const openDraft = useCallback((id: string, draft?: DraftRow) => {
    if (draft) cacheRef.current.set(draft.id, draft);
    setActiveDraftIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }, []);

  const closeDraft = useCallback((id: string) => {
    setActiveDraftIds((current) =>
      current.filter((existing) => existing !== id),
    );
  }, []);

  const reorderDrafts = useCallback((fromIndex: number, toIndex: number) => {
    setActiveDraftIds((current) => {
      if (
        fromIndex < 0 ||
        fromIndex >= current.length ||
        toIndex < 0 ||
        toIndex >= current.length ||
        fromIndex === toIndex
      ) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const closeAllDrafts = useCallback(() => {
    setActiveDraftIds((current) => (current.length === 0 ? current : []));
  }, []);

  const getCached = useCallback((id: string) => cacheRef.current.get(id), []);

  const primeCache = useCallback((rows: DraftRow[]) => {
    for (const row of rows) {
      cacheRef.current.set(row.id, row);
    }
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      activeDraftIds,
      openDraft,
      closeDraft,
      reorderDrafts,
      closeAllDrafts,
      getCached,
      primeCache,
    }),
    [
      activeDraftIds,
      openDraft,
      closeDraft,
      reorderDrafts,
      closeAllDrafts,
      getCached,
      primeCache,
    ],
  );

  return (
    <ActiveDraftsContext.Provider value={value}>
      {children}
    </ActiveDraftsContext.Provider>
  );
}

export function useActiveDrafts(): ContextValue {
  const ctx = useContext(ActiveDraftsContext);
  if (!ctx) {
    throw new Error("useActiveDrafts must be used within ActiveDraftsProvider");
  }
  return ctx;
}

export { ACTIVE_DRAFTS_PARAM };

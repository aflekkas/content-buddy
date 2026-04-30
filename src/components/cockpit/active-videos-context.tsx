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
  ACTIVE_VIDEOS_PARAM,
  parseActiveVideoIds,
  writeActiveVideoIds,
} from "@/lib/active-videos";
import type { VideoRow } from "@/lib/db/types";

const VIDEO_EVENT_NAME = "shortform-studio:video";

type VideoEvent =
  | { type: "updated"; video: VideoRow }
  | { type: "deleted"; id: string };

type ContextValue = {
  activeVideoIds: string[];
  openVideo: (id: string) => void;
  closeVideo: (id: string) => void;
  reorderVideos: (fromIndex: number, toIndex: number) => void;
  closeAllVideos: () => void;
  getCached: (id: string) => VideoRow | undefined;
  primeCache: (rows: VideoRow[]) => void;
};

const ActiveVideosContext = createContext<ContextValue | null>(null);

function readInitialIds(): string[] {
  if (typeof window === "undefined") return [];
  return parseActiveVideoIds(window.location.search);
}

function mirrorIdsToUrl(ids: string[]) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  writeActiveVideoIds(url.searchParams, ids);
  const next = `${url.pathname}${url.search ? url.search : ""}${url.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}

export function ActiveVideosProvider({ children }: { children: ReactNode }) {
  const [activeVideoIds, setActiveVideoIds] = useState<string[]>(readInitialIds);
  const cacheRef = useRef<Map<string, VideoRow>>(new Map());
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      const fromUrl = parseActiveVideoIds(window.location.search);
      setActiveVideoIds((current) => {
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
    mirrorIdsToUrl(activeVideoIds);
  }, [activeVideoIds]);

  useEffect(() => {
    function onPopState() {
      setActiveVideoIds(parseActiveVideoIds(window.location.search));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    function onVideoEvent(event: Event) {
      const detail = (event as CustomEvent<VideoEvent>).detail;
      if (!detail) return;
      if (detail.type === "updated") {
        cacheRef.current.set(detail.video.id, detail.video);
      } else if (detail.type === "deleted") {
        cacheRef.current.delete(detail.id);
        setActiveVideoIds((current) =>
          current.includes(detail.id)
            ? current.filter((id) => id !== detail.id)
            : current,
        );
      }
    }
    window.addEventListener(VIDEO_EVENT_NAME, onVideoEvent);
    return () => window.removeEventListener(VIDEO_EVENT_NAME, onVideoEvent);
  }, []);

  const openVideo = useCallback((id: string) => {
    setActiveVideoIds((current) =>
      current.includes(id) ? current : [...current, id],
    );
  }, []);

  const closeVideo = useCallback((id: string) => {
    setActiveVideoIds((current) => current.filter((existing) => existing !== id));
  }, []);

  const reorderVideos = useCallback((fromIndex: number, toIndex: number) => {
    setActiveVideoIds((current) => {
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

  const closeAllVideos = useCallback(() => {
    setActiveVideoIds((current) => (current.length === 0 ? current : []));
  }, []);

  const getCached = useCallback(
    (id: string) => cacheRef.current.get(id),
    [],
  );

  const primeCache = useCallback((rows: VideoRow[]) => {
    for (const row of rows) {
      cacheRef.current.set(row.id, row);
    }
  }, []);

  const value = useMemo<ContextValue>(
    () => ({
      activeVideoIds,
      openVideo,
      closeVideo,
      reorderVideos,
      closeAllVideos,
      getCached,
      primeCache,
    }),
    [
      activeVideoIds,
      openVideo,
      closeVideo,
      reorderVideos,
      closeAllVideos,
      getCached,
      primeCache,
    ],
  );

  return (
    <ActiveVideosContext.Provider value={value}>
      {children}
    </ActiveVideosContext.Provider>
  );
}

export function useActiveVideos(): ContextValue {
  const ctx = useContext(ActiveVideosContext);
  if (!ctx) {
    throw new Error("useActiveVideos must be used within ActiveVideosProvider");
  }
  return ctx;
}

export { ACTIVE_VIDEOS_PARAM };

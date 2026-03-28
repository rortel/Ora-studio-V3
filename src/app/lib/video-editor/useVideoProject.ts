import { useCallback, useRef, useState } from "react";
import {
  type VideoProject,
  type VideoTrack,
  type TrackItem,
  type TrackItemData,
  type Transition,
  computeDuration,
  createDefaultProject,
} from "./types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Video Editor — State Management + Undo/Redo
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const MAX_HISTORY = 50;

export function useVideoProject(initialName?: string) {
  const [project, setProject] = useState<VideoProject>(() => createDefaultProject(initialName));
  const historyRef = useRef<VideoProject[]>([project]);
  const historyIdxRef = useRef(0);
  const [playheadFrame, setPlayheadFrame] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  /* ── Internal: push state to history ── */
  const commit = useCallback((next: VideoProject) => {
    next = { ...next, durationInFrames: computeDuration(next.tracks) };
    const h = historyRef.current.slice(0, historyIdxRef.current + 1);
    h.push(next);
    if (h.length > MAX_HISTORY) h.shift();
    historyRef.current = h;
    historyIdxRef.current = h.length - 1;
    setProject(next);
  }, []);

  /* ── Undo / Redo ── */
  const undo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--;
      setProject(historyRef.current[historyIdxRef.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++;
      setProject(historyRef.current[historyIdxRef.current]);
    }
  }, []);

  const canUndo = historyIdxRef.current > 0;
  const canRedo = historyIdxRef.current < historyRef.current.length - 1;

  /* ── Track operations ── */
  const addTrack = useCallback((type: VideoTrack["type"], label: string) => {
    const track: VideoTrack = {
      id: crypto.randomUUID(),
      type,
      label,
      locked: false,
      muted: false,
      visible: true,
      items: [],
    };
    commit({ ...project, tracks: [...project.tracks, track] });
    return track.id;
  }, [project, commit]);

  const removeTrack = useCallback((trackId: string) => {
    commit({ ...project, tracks: project.tracks.filter((t) => t.id !== trackId) });
  }, [project, commit]);

  const updateTrack = useCallback((trackId: string, updates: Partial<Pick<VideoTrack, "label" | "locked" | "muted" | "visible">>) => {
    commit({
      ...project,
      tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
    });
  }, [project, commit]);

  /* ── Item operations ── */
  const addItem = useCallback((trackId: string, item: Omit<TrackItem, "id" | "trackId">) => {
    const newItem: TrackItem = { ...item, id: crypto.randomUUID(), trackId };
    commit({
      ...project,
      tracks: project.tracks.map((t) =>
        t.id === trackId ? { ...t, items: [...t.items, newItem] } : t
      ),
    });
    setSelectedItemId(newItem.id);
    return newItem.id;
  }, [project, commit]);

  const removeItem = useCallback((itemId: string) => {
    commit({
      ...project,
      tracks: project.tracks.map((t) => ({
        ...t,
        items: t.items.filter((i) => i.id !== itemId),
      })),
    });
    if (selectedItemId === itemId) setSelectedItemId(null);
  }, [project, commit, selectedItemId]);

  const updateItem = useCallback((itemId: string, updates: Partial<Omit<TrackItem, "id" | "trackId">>) => {
    commit({
      ...project,
      tracks: project.tracks.map((t) => ({
        ...t,
        items: t.items.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
      })),
    });
  }, [project, commit]);

  const updateItemData = useCallback((itemId: string, dataUpdates: Partial<TrackItemData>) => {
    commit({
      ...project,
      tracks: project.tracks.map((t) => ({
        ...t,
        items: t.items.map((i) =>
          i.id === itemId ? { ...i, data: { ...i.data, ...dataUpdates } as TrackItemData } : i
        ),
      })),
    });
  }, [project, commit]);

  const moveItem = useCallback((itemId: string, newFrom: number, newTrackId?: string) => {
    if (newTrackId) {
      // Move to different track
      let item: TrackItem | null = null;
      const tracksWithout = project.tracks.map((t) => {
        const found = t.items.find((i) => i.id === itemId);
        if (found) item = { ...found, from: Math.max(0, newFrom), trackId: newTrackId };
        return { ...t, items: t.items.filter((i) => i.id !== itemId) };
      });
      if (item) {
        commit({
          ...project,
          tracks: tracksWithout.map((t) =>
            t.id === newTrackId ? { ...t, items: [...t.items, item!] } : t
          ),
        });
      }
    } else {
      updateItem(itemId, { from: Math.max(0, newFrom) });
    }
  }, [project, commit, updateItem]);

  /* ── Split clip at playhead ── */
  const splitAtPlayhead = useCallback((itemId: string) => {
    for (const track of project.tracks) {
      const item = track.items.find((i) => i.id === itemId);
      if (!item) continue;
      if (playheadFrame <= item.from || playheadFrame >= item.from + item.durationInFrames) return;

      const splitPoint = playheadFrame - item.from;
      const leftItem: TrackItem = {
        ...item,
        durationInFrames: splitPoint,
      };
      const rightItem: TrackItem = {
        ...item,
        id: crypto.randomUUID(),
        from: playheadFrame,
        durationInFrames: item.durationInFrames - splitPoint,
        trimStart: (item.trimStart ?? 0) + splitPoint,
      };

      commit({
        ...project,
        tracks: project.tracks.map((t) =>
          t.id === track.id
            ? { ...t, items: t.items.map((i) => (i.id === itemId ? leftItem : i)).concat(rightItem) }
            : t
        ),
      });
      return;
    }
  }, [project, commit, playheadFrame]);

  /* ── Duplicate clip ── */
  const duplicateItem = useCallback((itemId: string) => {
    for (const track of project.tracks) {
      const item = track.items.find((i) => i.id === itemId);
      if (!item) continue;
      const clone: TrackItem = {
        ...item,
        id: crypto.randomUUID(),
        from: item.from + item.durationInFrames,
        transition: undefined,
      };
      commit({
        ...project,
        tracks: project.tracks.map((t) =>
          t.id === track.id ? { ...t, items: [...t.items, clone] } : t
        ),
      });
      setSelectedItemId(clone.id);
      return;
    }
  }, [project, commit]);

  /* ── Set transition on clip ── */
  const setTransition = useCallback((itemId: string, transition: Transition | undefined) => {
    commit({
      ...project,
      tracks: project.tracks.map((t) => ({
        ...t,
        items: t.items.map((i) => (i.id === itemId ? { ...i, transition } : i)),
      })),
    });
  }, [project, commit]);

  /* ── Find helpers ── */
  const getItem = useCallback((itemId: string): TrackItem | undefined => {
    for (const track of project.tracks) {
      const item = track.items.find((i) => i.id === itemId);
      if (item) return item;
    }
    return undefined;
  }, [project]);

  const getTrackForItem = useCallback((itemId: string): VideoTrack | undefined => {
    return project.tracks.find((t) => t.items.some((i) => i.id === itemId));
  }, [project]);

  return {
    project,
    setProject: commit,
    playheadFrame,
    setPlayheadFrame,
    selectedItemId,
    setSelectedItemId,
    // History
    undo, redo, canUndo, canRedo,
    // Tracks
    addTrack, removeTrack, updateTrack,
    // Items
    addItem, removeItem, updateItem, updateItemData, moveItem, splitAtPlayhead, duplicateItem, setTransition,
    // Helpers
    getItem, getTrackForItem,
  };
}

export type VideoProjectActions = ReturnType<typeof useVideoProject>;

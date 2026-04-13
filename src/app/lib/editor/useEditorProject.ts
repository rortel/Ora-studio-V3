/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Unified Editor — State Management + Undo/Redo
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useCallback, useRef, useState } from "react";
import type {
  EditorProject,
  UnifiedLayer,
  AudioTrackItem,
  AnimationPreset,
  SpatialProps,
} from "./types";
import {
  createDefaultProject,
  createVideoClipLayer,
  createImageLayer,
  createTextLayer,
  createAudioTrack,
  createDefaultSpatial,
  createDefaultTemporal,
} from "./types";
import type { VideoProject, TrackItem } from "../video-editor/types";
import { interpolateSpatialAtFrame } from "./interpolation";
import { generatePresetKeyframes } from "./presets";

const MAX_HISTORY = 50;

export function useEditorProject(initialName?: string, initialWidth = 1024, initialHeight = 1024) {
  const [project, setProject] = useState<EditorProject>(() =>
    createDefaultProject(initialName, initialWidth, initialHeight),
  );
  const historyRef = useRef<EditorProject[]>([project]);
  const historyIdxRef = useRef(0);
  const [playheadFrame, setPlayheadFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // ── Internal: push state to history ──

  const commit = useCallback((next: EditorProject) => {
    // Recompute duration from layers + audio
    let max = 300; // 10s minimum
    for (const l of next.layers) {
      const end = l.temporal.startFrame + l.temporal.durationInFrames;
      if (end > max) max = end;
    }
    for (const a of next.audioTracks) {
      const end = a.startFrame + a.durationInFrames;
      if (end > max) max = end;
    }
    next = { ...next, durationInFrames: max };

    const h = historyRef.current.slice(0, historyIdxRef.current + 1);
    h.push(next);
    if (h.length > MAX_HISTORY) h.shift();
    historyRef.current = h;
    historyIdxRef.current = h.length - 1;
    setProject(next);
  }, []);

  // ── Undo / Redo ──

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

  // ── Layer CRUD ──

  const addLayer = useCallback(<T extends UnifiedLayer>(layer: T) => {
    const maxZ = project.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
    const newLayer = { ...layer, zIndex: maxZ + 1 };
    commit({ ...project, layers: [...project.layers, newLayer] });
    setSelectedLayerId(newLayer.id);
    return newLayer.id;
  }, [project, commit]);

  const removeLayer = useCallback((layerId: string) => {
    commit({ ...project, layers: project.layers.filter(l => l.id !== layerId) });
    if (selectedLayerId === layerId) setSelectedLayerId(null);
  }, [project, commit, selectedLayerId]);

  const updateLayer = useCallback((layerId: string, updates: Partial<UnifiedLayer>) => {
    commit({
      ...project,
      layers: project.layers.map(l =>
        l.id === layerId ? { ...l, ...updates } as UnifiedLayer : l,
      ),
    });
  }, [project, commit]);

  const updateLayerSpatial = useCallback((layerId: string, spatialUpdates: Partial<SpatialProps>) => {
    commit({
      ...project,
      layers: project.layers.map(l =>
        l.id === layerId ? { ...l, spatial: { ...l.spatial, ...spatialUpdates } } : l,
      ),
    });
  }, [project, commit]);

  const setLayerAnimation = useCallback((layerId: string, preset: AnimationPreset) => {
    commit({
      ...project,
      layers: project.layers.map(l =>
        l.id === layerId ? { ...l, animationPreset: preset } : l,
      ),
    });
  }, [project, commit]);

  // ── Layer z-order ──

  const moveLayerOrder = useCallback((layerId: string, direction: "up" | "down" | "top" | "bottom") => {
    const sorted = [...project.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex(l => l.id === layerId);
    if (idx < 0) return;

    let newSorted = [...sorted];
    switch (direction) {
      case "up":
        if (idx < sorted.length - 1) {
          [newSorted[idx], newSorted[idx + 1]] = [newSorted[idx + 1], newSorted[idx]];
        }
        break;
      case "down":
        if (idx > 0) {
          [newSorted[idx], newSorted[idx - 1]] = [newSorted[idx - 1], newSorted[idx]];
        }
        break;
      case "top":
        newSorted = [...sorted.filter(l => l.id !== layerId), sorted[idx]];
        break;
      case "bottom":
        newSorted = [sorted[idx], ...sorted.filter(l => l.id !== layerId)];
        break;
    }

    // Reassign zIndex values
    const updated = newSorted.map((l, i) => ({ ...l, zIndex: i }));
    commit({ ...project, layers: updated as UnifiedLayer[] });
  }, [project, commit]);

  // ── Audio CRUD ──

  const addAudioTrack = useCallback((track: AudioTrackItem) => {
    commit({ ...project, audioTracks: [...project.audioTracks, track] });
  }, [project, commit]);

  const removeAudioTrack = useCallback((trackId: string) => {
    commit({ ...project, audioTracks: project.audioTracks.filter(t => t.id !== trackId) });
  }, [project, commit]);

  const updateAudioTrack = useCallback((trackId: string, updates: Partial<AudioTrackItem>) => {
    commit({
      ...project,
      audioTracks: project.audioTracks.map(t =>
        t.id === trackId ? { ...t, ...updates } : t,
      ),
    });
  }, [project, commit]);

  // ── Project-level updates ──

  const updateProjectProps = useCallback((updates: Partial<Pick<EditorProject, "name" | "width" | "height" | "fps" | "backgroundImageUrl" | "durationInFrames">>) => {
    commit({ ...project, ...updates });
  }, [project, commit]);

  const loadProject = useCallback((p: EditorProject) => {
    historyRef.current = [p];
    historyIdxRef.current = 0;
    setProject(p);
    setPlayheadFrame(0);
    setSelectedLayerId(null);
  }, []);

  // ── Query helpers ──

  /** Get layers visible at a given frame, sorted by zIndex */
  const getVisibleLayersAtFrame = useCallback((frame: number): UnifiedLayer[] => {
    return project.layers
      .filter(l => {
        if (!l.visible) return false;
        const start = l.temporal.startFrame;
        const end = start + l.temporal.durationInFrames;
        return frame >= start && frame < end;
      })
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [project]);

  /** Compute interpolated spatial props for a layer at a given frame */
  const getInterpolatedSpatial = useCallback((layer: UnifiedLayer, frame: number): SpatialProps => {
    const relFrame = frame - layer.temporal.startFrame;
    const presetKfs = generatePresetKeyframes(layer.animationPreset, layer.temporal.durationInFrames, layer.spatial);
    const allKfs = [...presetKfs, ...layer.temporal.keyframes];
    return interpolateSpatialAtFrame(layer.spatial, allKfs, relFrame);
  }, []);

  const getLayer = useCallback((layerId: string): UnifiedLayer | undefined => {
    return project.layers.find(l => l.id === layerId);
  }, [project]);

  const selectedLayer = selectedLayerId ? project.layers.find(l => l.id === selectedLayerId) : undefined;

  return {
    project,
    loadProject,
    updateProjectProps,

    // Playback
    playheadFrame,
    setPlayheadFrame,
    isPlaying,
    setIsPlaying,

    // Selection
    selectedLayerId,
    setSelectedLayerId,
    selectedLayer,

    // History
    undo, redo, canUndo, canRedo,

    // Layers
    addLayer,
    removeLayer,
    updateLayer,
    updateLayerSpatial,
    setLayerAnimation,
    moveLayerOrder,

    // Audio
    addAudioTrack,
    removeAudioTrack,
    updateAudioTrack,

    // Queries
    getVisibleLayersAtFrame,
    getInterpolatedSpatial,
    getLayer,
  };
}

export type EditorProjectActions = ReturnType<typeof useEditorProject>;

// ── Convert a VideoProject (from VideoAssemblerPage) into an EditorProject ──

export function importFromVideoProject(vp: VideoProject): EditorProject {
  const layers: UnifiedLayer[] = [];
  const audioTracks: AudioTrackItem[] = [];
  let zIndex = 0;

  for (const track of vp.tracks) {
    for (const item of track.items) {
      const { data } = item;

      if (data.kind === "video" && item.sourceUrl) {
        layers.push(createVideoClipLayer(item.sourceUrl, {
          name: track.label || "Video",
          zIndex: zIndex++,
          spatial: createDefaultSpatial(0, 0, vp.width, vp.height),
          temporal: createDefaultTemporal(item.durationInFrames),
          trimStart: item.trimStart ?? 0,
          trimEnd: item.trimEnd ?? item.durationInFrames / vp.fps,
          volume: data.volume,
        }));
        // Override startFrame
        layers[layers.length - 1].temporal.startFrame = item.from;
      }

      if (data.kind === "image" && item.sourceUrl) {
        layers.push(createImageLayer(item.sourceUrl, {
          name: track.label || "Image",
          zIndex: zIndex++,
          spatial: createDefaultSpatial(data.x ?? 0, data.y ?? 0, data.width ?? vp.width, data.height ?? vp.height),
          temporal: { startFrame: item.from, durationInFrames: item.durationInFrames, keyframes: [] },
          animationPreset: "ken-burns-in",
        }));
      }

      if (data.kind === "text") {
        layers.push(createTextLayer({
          name: data.text?.slice(0, 20) || "Text",
          zIndex: zIndex++,
          text: data.text,
          fontSize: data.fontSize,
          fontFamily: data.fontFamily,
          fill: data.color,
          align: data.align || "center",
          spatial: createDefaultSpatial(data.x, data.y, data.width, data.height),
          temporal: { startFrame: item.from, durationInFrames: item.durationInFrames, keyframes: [] },
        }));
      }

      if (data.kind === "audio" && item.sourceUrl) {
        audioTracks.push(createAudioTrack(item.sourceUrl, track.label || "Audio", {
          startFrame: item.from,
          durationInFrames: item.durationInFrames,
          trimStart: item.trimStart ?? 0,
          volume: data.volume,
          fadeIn: data.fadeIn ?? 0,
          fadeOut: data.fadeOut ?? 0,
        }));
      }
    }
  }

  return {
    id: crypto.randomUUID(),
    name: vp.name || "Imported Project",
    fps: vp.fps,
    width: vp.width,
    height: vp.height,
    durationInFrames: vp.durationInFrames,
    backgroundImageUrl: null,
    layers,
    audioTracks,
  };
}

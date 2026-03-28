/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Video Editor — Data Model
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export interface VideoProject {
  id: string;
  name: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number; // computed from tracks
  tracks: VideoTrack[];
}

export interface VideoTrack {
  id: string;
  type: "video" | "audio" | "text" | "overlay" | "background";
  label: string;
  locked: boolean;
  muted: boolean;
  visible: boolean;
  items: TrackItem[];
}

export interface TrackItem {
  id: string;
  trackId: string;
  from: number; // start frame
  durationInFrames: number;
  // Source
  sourceType: "library" | "upload" | "generated";
  sourceId?: string;
  sourceUrl?: string;
  // Type-specific
  data: TrackItemData;
  // Trim (for video/audio)
  trimStart?: number;
  trimEnd?: number;
  // Transition (applied at the START of this clip, overlapping with previous)
  transition?: Transition;
}

export interface Transition {
  type: "crossfade" | "fade-black" | "fade-white" | "wipe-left" | "wipe-right";
  durationInFrames: number; // overlap duration
}

export type TrackItemData =
  | VideoClipData
  | AudioClipData
  | TextOverlayData
  | ImageOverlayData
  | ColorBackgroundData;

export interface VideoClipData {
  kind: "video";
  volume: number;
}

export interface AudioClipData {
  kind: "audio";
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
}

export interface TextOverlayData {
  kind: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  color: string;
  backgroundColor?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  align: "left" | "center" | "right";
}

export interface ImageOverlayData {
  kind: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface ColorBackgroundData {
  kind: "background";
  color: string;
}

/* ── Presets ── */

export const VIDEO_PRESETS = {
  "landscape-1080p": { width: 1920, height: 1080, label: "Landscape 1080p (16:9)" },
  "portrait-1080p": { width: 1080, height: 1920, label: "Portrait 1080p (9:16)" },
  "square-1080": { width: 1080, height: 1080, label: "Square (1:1)" },
  "landscape-720p": { width: 1280, height: 720, label: "Landscape 720p (16:9)" },
} as const;

export type VideoPresetKey = keyof typeof VIDEO_PRESETS;

/* ── Helpers ── */

export function createDefaultProject(name = "Untitled"): VideoProject {
  return {
    id: crypto.randomUUID(),
    name,
    fps: 30,
    width: 1920,
    height: 1080,
    durationInFrames: 300, // 10s default
    tracks: [
      { id: crypto.randomUUID(), type: "video", label: "Video 1", locked: false, muted: false, visible: true, items: [] },
      { id: crypto.randomUUID(), type: "audio", label: "Audio 1", locked: false, muted: false, visible: true, items: [] },
      { id: crypto.randomUUID(), type: "text", label: "Text", locked: false, muted: false, visible: true, items: [] },
      { id: crypto.randomUUID(), type: "overlay", label: "Overlays", locked: false, muted: false, visible: true, items: [] },
    ],
  };
}

export function computeDuration(tracks: VideoTrack[]): number {
  let max = 300; // minimum 10s at 30fps
  for (const track of tracks) {
    for (const item of track.items) {
      const end = item.from + item.durationInFrames;
      if (end > max) max = end;
    }
  }
  return max;
}

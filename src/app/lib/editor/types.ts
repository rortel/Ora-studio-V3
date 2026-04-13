/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Unified Editor — Data Model
   Combines spatial (Konva) + temporal (timeline) layers
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ── Project ──

export interface EditorProject {
  id: string;
  name: string;
  fps: number;           // default 30
  width: number;
  height: number;
  durationInFrames: number;
  backgroundImageUrl: string | null;
  layers: UnifiedLayer[];
  audioTracks: AudioTrackItem[];
}

// ── Spatial props (position, transform) ──

export interface SpatialProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
}

// ── Temporal props (when + keyframes) ──

export interface TemporalProps {
  startFrame: number;
  durationInFrames: number;
  keyframes: Keyframe[];
}

export interface Keyframe {
  frame: number; // relative to layer startFrame
  property: AnimatableProperty;
  value: number | string;
  easing: EasingType;
}

export type AnimatableProperty =
  | keyof SpatialProps
  | "fontSize" | "fill" | "volume";

export type EasingType = "linear" | "ease-in" | "ease-out" | "ease-in-out";

// ── Animation presets ──

export type AnimationPreset =
  | "none"
  | "ken-burns-in"
  | "ken-burns-out"
  | "fade-in"
  | "fade-out"
  | "zoom-in"
  | "zoom-out"
  | "slide-left"
  | "slide-right";

// ── Layer base ──

export interface BaseUnifiedLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  spatial: SpatialProps;
  temporal: TemporalProps;
  animationPreset: AnimationPreset;
}

// ── Layer types ──

export interface ImageLayer extends BaseUnifiedLayer {
  type: "image";
  sourceUrl: string;
}

export interface VideoClipLayer extends BaseUnifiedLayer {
  type: "video";
  sourceUrl: string;
  trimStart: number; // seconds
  trimEnd: number;   // seconds
  volume: number;    // 0..1
}

export interface TextLayer extends BaseUnifiedLayer {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string; // "normal" | "bold" | "italic" | "bold italic"
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  shadow: {
    enabled: boolean;
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export interface LogoLayer extends BaseUnifiedLayer {
  type: "logo";
  sourceUrl: string; // data URL or signed URL
}

export type ShapeKind = "rect" | "patch" | "circle" | "star" | "triangle" | "arrow" | "pill";

export interface ShapeLayer extends BaseUnifiedLayer {
  type: "shape";
  shape: ShapeKind;
  fillType: "solid" | "gradient";
  fill: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  // Star specific
  numPoints: number;
  innerRadiusRatio: number;
}

export interface SubjectLayer extends BaseUnifiedLayer {
  type: "subject";
  sourceUrl: string; // PNG with alpha
}

export type UnifiedLayer =
  | ImageLayer
  | VideoClipLayer
  | TextLayer
  | LogoLayer
  | ShapeLayer
  | SubjectLayer;

export type LayerType = UnifiedLayer["type"];

// ── Audio tracks ──

export interface AudioTrackItem {
  id: string;
  name: string;
  sourceUrl: string;
  startFrame: number;
  durationInFrames: number;
  trimStart: number; // seconds
  volume: number;    // 0..1
  fadeIn: number;    // seconds
  fadeOut: number;   // seconds
}

// ── Editor tool (AI-powered) ──

export type EditorTool = "move" | "clean" | "replace" | "background" | "reframe" | "upscale";

// ── Mask (for AI tools) ──

export interface MaskLine {
  points: number[];
  brushSize: number;
}

// ── History ──

export interface HistoryEntry {
  imageData: string;
  maskData: MaskLine[];
}

// ── Transitions (for timeline clips) ──

export interface Transition {
  type: "crossfade" | "fade-black" | "fade-white" | "wipe-left" | "wipe-right";
  durationInFrames: number;
}

// ── Helpers ──

export function createDefaultSpatial(x = 0, y = 0, width = 200, height = 200): SpatialProps {
  return { x, y, width, height, rotation: 0, opacity: 1, scaleX: 1, scaleY: 1 };
}

export function createDefaultTemporal(durationInFrames = 150): TemporalProps {
  return { startFrame: 0, durationInFrames, keyframes: [] };
}

export function createDefaultProject(name = "Untitled", width = 1024, height = 1024): EditorProject {
  return {
    id: crypto.randomUUID(),
    name,
    fps: 30,
    width,
    height,
    durationInFrames: 300, // 10s at 30fps
    backgroundImageUrl: null,
    layers: [],
    audioTracks: [],
  };
}

export function createTextLayer(overrides?: Partial<TextLayer>): TextLayer {
  return {
    id: crypto.randomUUID(),
    name: "Text",
    type: "text",
    visible: true,
    locked: false,
    zIndex: 0,
    spatial: createDefaultSpatial(100, 100, 300, 60),
    temporal: createDefaultTemporal(),
    animationPreset: "none",
    text: "Your text",
    fontSize: 32,
    fontFamily: "Inter, sans-serif",
    fontStyle: "normal",
    fill: "#ffffff",
    align: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
    shadow: { enabled: false, color: "rgba(0,0,0,0.5)", blur: 4, offsetX: 2, offsetY: 2 },
    ...overrides,
  };
}

export function createLogoLayer(sourceUrl: string, overrides?: Partial<LogoLayer>): LogoLayer {
  return {
    id: crypto.randomUUID(),
    name: "Logo",
    type: "logo",
    visible: true,
    locked: false,
    zIndex: 0,
    spatial: createDefaultSpatial(50, 50, 150, 150),
    temporal: createDefaultTemporal(),
    animationPreset: "none",
    sourceUrl,
    ...overrides,
  };
}

export function createShapeLayer(shape: ShapeKind = "rect", overrides?: Partial<ShapeLayer>): ShapeLayer {
  return {
    id: crypto.randomUUID(),
    name: shape === "patch" ? "Badge" : shape.charAt(0).toUpperCase() + shape.slice(1),
    type: "shape",
    visible: true,
    locked: false,
    zIndex: 0,
    spatial: createDefaultSpatial(100, 100, 200, 200),
    temporal: createDefaultTemporal(),
    animationPreset: "none",
    shape,
    fillType: "solid",
    fill: "rgba(124, 58, 237, 0.85)",
    gradientStart: "#7C3AED",
    gradientEnd: "#3B82F6",
    gradientAngle: 0,
    stroke: "",
    strokeWidth: 0,
    cornerRadius: shape === "patch" || shape === "pill" ? 16 : 0,
    numPoints: 5,
    innerRadiusRatio: 0.5,
    ...overrides,
  };
}

export function createImageLayer(sourceUrl: string, overrides?: Partial<ImageLayer>): ImageLayer {
  return {
    id: crypto.randomUUID(),
    name: "Image",
    type: "image",
    visible: true,
    locked: false,
    zIndex: 0,
    spatial: createDefaultSpatial(0, 0, 512, 512),
    temporal: createDefaultTemporal(),
    animationPreset: "none",
    sourceUrl,
    ...overrides,
  };
}

export function createVideoClipLayer(sourceUrl: string, overrides?: Partial<VideoClipLayer>): VideoClipLayer {
  return {
    id: crypto.randomUUID(),
    name: "Video Clip",
    type: "video",
    visible: true,
    locked: false,
    zIndex: 0,
    spatial: createDefaultSpatial(0, 0, 1920, 1080),
    temporal: createDefaultTemporal(300),
    animationPreset: "none",
    sourceUrl,
    trimStart: 0,
    trimEnd: 10,
    volume: 1,
    ...overrides,
  };
}

export function createSubjectLayer(sourceUrl: string, overrides?: Partial<SubjectLayer>): SubjectLayer {
  return {
    id: crypto.randomUUID(),
    name: "Subject",
    type: "subject",
    visible: true,
    locked: false,
    zIndex: 0,
    spatial: createDefaultSpatial(0, 0),
    temporal: createDefaultTemporal(),
    animationPreset: "none",
    sourceUrl,
    ...overrides,
  };
}

export function createAudioTrack(sourceUrl: string, name = "Audio", overrides?: Partial<AudioTrackItem>): AudioTrackItem {
  return {
    id: crypto.randomUUID(),
    name,
    sourceUrl,
    startFrame: 0,
    durationInFrames: 300,
    trimStart: 0,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    ...overrides,
  };
}

// ── Format presets ──

export const FORMAT_PRESETS = {
  "square":       { width: 1080, height: 1080, label: "Square (1:1)" },
  "portrait":     { width: 1080, height: 1920, label: "Portrait (9:16)" },
  "landscape":    { width: 1920, height: 1080, label: "Landscape (16:9)" },
  "feed-4x5":     { width: 1080, height: 1350, label: "Feed (4:5)" },
  "story":        { width: 1080, height: 1920, label: "Story (9:16)" },
} as const;

export type FormatPresetKey = keyof typeof FORMAT_PRESETS;

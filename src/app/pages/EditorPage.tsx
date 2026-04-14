import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Stage, Layer, Image as KonvaImage, Line, Rect, Text as KonvaText, Transformer, Circle as KonvaCircle, Star as KonvaStar } from "react-konva";
import Konva from "konva";
import {
  ImageIcon, Loader2, Maximize,
  Upload, X as XIcon, Film,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "react-router";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { PublishModal, type PublishableAsset } from "../components/PublishModal";
import { useI18n } from "../lib/i18n";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { LibrarySidebar } from "../components/editor/LibrarySidebar";
import { EditorToolbar } from "../components/editor/EditorToolbar";
// ContextBar merged into EditorToolbar
import { LayersPanel } from "../components/editor/LayersPanel";
import { PropertiesSidebar } from "../components/editor/PropertiesSidebar";
import { EditorTimeline } from "../components/editor/EditorTimeline";
import { ExportDialog } from "../components/editor/ExportDialog";
import { composeCanvasDataUrl as composeUnifiedCanvas } from "../lib/editor/compose-export";
import { useEditorProject, importFromVideoProject } from "../lib/editor/useEditorProject";
import { AnimationEngine } from "../lib/editor/animation-engine";
import {
  createVideoClipLayer, createAudioTrack,
  createDefaultSpatial, createDefaultTemporal,
} from "../lib/editor/types";
import type { VideoClipLayer as VideoClipLayerType } from "../lib/editor/types";
import type { VideoProject } from "../lib/video-editor/types";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

type EditorTool = "move" | "clean" | "replace" | "cutout" | "background" | "reframe" | "upscale";

interface MaskLine {
  points: number[];
  brushSize: number;
}

interface HistoryEntry {
  imageData: string;
  maskData: MaskLine[];
}

// Fields shared by every layer type
interface BaseLayerFields {
  id: string;
  opacity: number; // 0..1
  visible: boolean;
}

interface EditorTextLayer extends BaseLayerFields {
  type: "text";
  x: number;
  y: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string; // "normal" | "bold" | "italic" | "bold italic"
  fill: string;
}

interface EditorLogoLayer extends BaseLayerFields {
  type: "logo";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  imageUrl: string; // data URL (source of truth for export)
}

type ShapeKind = "rect" | "patch" | "circle" | "star";

interface EditorShapeLayer extends BaseLayerFields {
  type: "shape";
  shape: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // Fill
  fillType: "solid" | "gradient";
  fill: string;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number; // 0 = left->right, 90 = top->bottom
  // Stroke
  stroke: string;
  strokeWidth: number;
  // Rect/patch specific
  cornerRadius: number;
  // Star specific
  numPoints: number;
  innerRadiusRatio: number; // 0..1
}

// "subject" layer = the cut-out foreground of the base photo (via AI segmentation)
// It lives in the layer stack so users can reorder other layers BELOW it to get
// the "behind the subject" effect.
interface EditorSubjectLayer extends BaseLayerFields {
  type: "subject";
  imageUrl: string; // PNG with alpha of the isolated subject
  // Subject is drawn at stage origin at full image size — no transform,
  // since it must stay aligned with the (inpainted) background photo.
}

type EditorLayer = EditorTextLayer | EditorLogoLayer | EditorShapeLayer | EditorSubjectLayer;

interface AnimateState {
  prompt: string;
  model: string;
  duration: number;
  running: boolean;
  videoUrl: string | null;
  sourceImageUrl: string | null;
}

interface LibraryItem {
  id: string;
  type: string;
  model: { id: string; name: string; provider: string; speed: string; quality: number };
  prompt: string;
  timestamp: string;
  preview: any;
  folderId: string | null;
  savedAt: string;
  updatedAt: string;
  customName?: string;
}

/* ═══════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════ */

const REFRAME_FORMATS = [
  { label: "1:1", value: "1:1", w: 1, h: 1 },
  { label: "16:9", value: "16:9", w: 16, h: 9 },
  { label: "9:16", value: "9:16", w: 9, h: 16 },
  { label: "4:5", value: "4:5", w: 4, h: 5 },
  { label: "3:4", value: "3:4", w: 3, h: 4 },
];

const CHECKERBOARD_SIZE = 16;

const PROMPT_PLACEHOLDERS: Record<EditorTool, string> = {
  clean: "",
  replace: "Describe what should replace the selected area...",
  background: "Describe the new background...",
  reframe: "Describe what should fill the extended area...",
  upscale: "",
};

/* ═══════════════════════════════════
   HELPERS
   ═══════════════════════════════════ */

function getAssetUrl(item: LibraryItem): string | null {
  if (!item.preview) return null;
  if (item.preview.kind === "image") return item.preview.imageUrl || null;
  return null;
}

function getItemName(item: LibraryItem): string {
  return item.customName || item.prompt || "Untitled";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/* ═══════════════════════════════════
   CHECKERBOARD PATTERN (canvas-based)
   ═══════════════════════════════════ */

function createCheckerboardPattern(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CHECKERBOARD_SIZE * 2;
  canvas.height = CHECKERBOARD_SIZE * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f0f0f2";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e4e4e7";
  ctx.fillRect(0, 0, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE);
  ctx.fillRect(CHECKERBOARD_SIZE, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE, CHECKERBOARD_SIZE);
  return canvas;
}

/* ═══════════════════════════════════
   EDITOR PAGE (exported)
   ═══════════════════════════════════ */

export function EditorPage() {
  return (
    <RouteGuard requireAuth>
      <EditorPageContent />
    </RouteGuard>
  );
}

/* ═══════════════════════════════════
   EDITOR CONTENT
   ═══════════════════════════════════ */

function EditorPageContent() {
  const { t, locale } = useI18n();
  const isFr = locale === "fr";
  const { getAuthHeader } = useAuth();
  const location = useLocation();
  const navState = location.state as {
    assetUrl?: string; assetId?: string; assetType?: string;
    prompt?: string; model?: string;
    videoProject?: VideoProject;
  } | null;
  const preloadUrl = navState?.assetUrl || null;

  // --- Publish modal ---
  const [publishTarget, setPublishTarget] = useState<PublishableAsset | null>(null);

  // --- Unified project model (timeline + layers + audio) ---
  const editorProject = useEditorProject("Untitled", 1024, 1024);
  const [timelineOpen, setTimelineOpen] = useState(false);

  // --- Animation engine + media element registries ---
  const animationEngineRef = useRef<AnimationEngine | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // --- Core state ---
  const [tool, setTool] = useState<EditorTool>("move");
  const [brushSize, setBrushSize] = useState(30);
  const [maskLines, setMaskLines] = useState<MaskLine[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [invertMask, setInvertMask] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [reframeFormat, setReframeFormat] = useState("1:1");

  // --- Library state ---
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // --- Canvas state ---
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // --- Drag & drop state ---
  const [isDragging, setIsDragging] = useState(false);

  // --- Refs ---
  const stageRef = useRef<Konva.Stage>(null);
  const maskLayerRef = useRef<Konva.Layer>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Server call helper ---
  const serverPost = useCallback((path: string, bodyData: any) => {
    const token = getAuthHeader();
    const url = `${API_BASE}${path}`;
    return fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...bodyData, _token: token }),
    }).then(res => res.json());
  }, [getAuthHeader]);

  // --- Mobile detection ---
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // --- Animation engine init ---
  useEffect(() => {
    const engine = new AnimationEngine({
      onFrameChange: (frame) => editorProject.setPlayheadFrame(frame),
      onPlayStateChange: (playing) => editorProject.setIsPlaying(playing),
      onEnd: () => {},
    });
    animationEngineRef.current = engine;
    return () => engine.destroy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync engine ↔ project data
  useEffect(() => {
    animationEngineRef.current?.setProject(editorProject.project);
  }, [editorProject.project]);

  // Play/pause via timeline controls
  useEffect(() => {
    const engine = animationEngineRef.current;
    if (!engine) return;
    if (editorProject.isPlaying) {
      engine.seek(editorProject.playheadFrame);
      engine.play();
    } else {
      engine.pause();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorProject.isPlaying]);

  // Scrub playhead → seek engine (only when NOT playing to avoid feedback loop)
  const prevPlayheadRef = useRef(0);
  useEffect(() => {
    if (!editorProject.isPlaying && editorProject.playheadFrame !== prevPlayheadRef.current) {
      animationEngineRef.current?.seek(editorProject.playheadFrame);
    }
    prevPlayheadRef.current = editorProject.playheadFrame;
  }, [editorProject.playheadFrame, editorProject.isPlaying]);

  // batchDraw during playback to update video frames in Konva
  useEffect(() => {
    if (!editorProject.isPlaying) return;
    let rafId: number;
    const draw = () => {
      stageRef.current?.batchDraw();
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [editorProject.isPlaying]);

  // --- Video element lifecycle: create/destroy offscreen <video> for each video layer ---
  useEffect(() => {
    const videoLayers = editorProject.project.layers.filter(
      (l): l is VideoClipLayerType => l.type === "video",
    );
    const currentIds = new Set(videoElementsRef.current.keys());
    const neededIds = new Set(videoLayers.map(l => l.id));

    // Create new
    for (const layer of videoLayers) {
      if (!currentIds.has(layer.id)) {
        const vid = document.createElement("video");
        vid.crossOrigin = "anonymous";
        vid.preload = "auto";
        vid.muted = true; // engine controls volume
        vid.playsInline = true;
        vid.src = layer.sourceUrl;
        vid.load();
        videoElementsRef.current.set(layer.id, vid);
        animationEngineRef.current?.registerVideo(layer.id, vid);
      }
    }
    // Destroy removed
    for (const id of currentIds) {
      if (!neededIds.has(id)) {
        const vid = videoElementsRef.current.get(id);
        if (vid) { vid.pause(); vid.src = ""; }
        videoElementsRef.current.delete(id);
        animationEngineRef.current?.unregisterVideo(id);
      }
    }
  }, [editorProject.project.layers]);

  // --- Audio element lifecycle: create/destroy <audio> for each audio track ---
  useEffect(() => {
    const tracks = editorProject.project.audioTracks;
    const currentIds = new Set(audioElementsRef.current.keys());
    const neededIds = new Set(tracks.map(t => t.id));

    for (const track of tracks) {
      if (!currentIds.has(track.id)) {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        audio.src = track.sourceUrl;
        audio.load();
        audioElementsRef.current.set(track.id, audio);
        animationEngineRef.current?.registerAudio(track.id, audio);
      }
    }
    for (const id of currentIds) {
      if (!neededIds.has(id)) {
        const audio = audioElementsRef.current.get(id);
        if (audio) { audio.pause(); audio.src = ""; }
        audioElementsRef.current.delete(id);
        animationEngineRef.current?.unregisterAudio(id);
      }
    }
  }, [editorProject.project.audioTracks]);

  // --- Canvas container resize ---
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // --- Load library images ---
  useEffect(() => {
    (async () => {
      setLoadingLibrary(true);
      try {
        const data = await serverPost("/library/list", {});
        if (data.success && data.items) {
          const mediaItems = data.items.filter(
            (item: LibraryItem) =>
              item.type === "image" || item.type === "film" ||
              item.preview?.kind === "image" || item.preview?.kind === "film"
          );
          setLibraryItems(mediaItems);
        }
      } catch {
        // silent
      } finally {
        setLoadingLibrary(false);
      }
    })();
  }, [serverPost]);

  // --- Load image into canvas ---
  const loadImage = useCallback((url: string) => {
    setImageUrl(url);
    setMaskLines([]);
    setVariants([]);
    setSelectedVariant(null);
    setPrompt("");

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      // Auto-fit
      const containerW = canvasSize.width;
      const containerH = canvasSize.height;
      const scaleX = (containerW * 0.85) / img.width;
      const scaleY = (containerH * 0.85) / img.height;
      const fitScale = Math.min(scaleX, scaleY, 1);
      setZoom(fitScale);
      setStagePos({
        x: (containerW - img.width * fitScale) / 2,
        y: (containerH - img.height * fitScale) / 2,
      });
      // Init history
      setHistory([{ imageData: url, maskData: [] }]);
      setHistoryIndex(0);
    };
    img.onerror = () => toast.error("Failed to load image");
    img.src = url;
  }, [canvasSize]);

  // --- Preload asset from navigation state (e.g. from ComparePage/LibraryPage) ---
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (preloadedRef.current) return;
    if (!preloadUrl) return;
    if (canvasSize.width === 0) return; // wait for canvas measure
    preloadedRef.current = true;
    loadImage(preloadUrl);
  }, [preloadUrl, canvasSize.width, loadImage]);

  // --- Import VideoProject from VideoAssemblerPage ---
  const videoProjectImportedRef = useRef(false);
  useEffect(() => {
    if (videoProjectImportedRef.current) return;
    if (!navState?.videoProject) return;
    videoProjectImportedRef.current = true;
    const imported = importFromVideoProject(navState.videoProject);
    editorProject.loadProject(imported);
    setTimelineOpen(true);
    toast.success(isFr ? "Projet vidéo importé dans l'éditeur" : "Video project imported into editor");
  }, [navState?.videoProject, editorProject, isFr]);

  // --- Add video clip layer (unified model) ---
  const handleVideoFileChosen = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error(isFr ? "Fichier vidéo requis" : "Video file required");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      const fps = editorProject.project.fps;
      const durationInFrames = Math.max(30, Math.round(probe.duration * fps));
      const vw = probe.videoWidth || 1920;
      const vh = probe.videoHeight || 1080;
      const layer = createVideoClipLayer(url, {
        name: file.name.replace(/\.[^.]+$/, ""),
        spatial: createDefaultSpatial(0, 0, vw, vh),
        temporal: createDefaultTemporal(durationInFrames),
        trimEnd: probe.duration,
      });
      editorProject.addLayer(layer);
      setTimelineOpen(true);
      toast.success(isFr ? "Clip vidéo ajouté" : "Video clip added");
    };
  }, [editorProject, isFr]);

  // --- Select video from library ---
  const handleSelectLibraryVideo = useCallback((url: string) => {
    const probe = document.createElement("video");
    probe.crossOrigin = "anonymous";
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      const fps = editorProject.project.fps;
      const durationInFrames = Math.max(30, Math.round(probe.duration * fps));
      const vw = probe.videoWidth || 1920;
      const vh = probe.videoHeight || 1080;
      const layer = createVideoClipLayer(url, {
        name: "Library video",
        spatial: createDefaultSpatial(0, 0, vw, vh),
        temporal: createDefaultTemporal(durationInFrames),
        trimEnd: probe.duration,
      });
      editorProject.addLayer(layer);
      setTimelineOpen(true);
      toast.success(isFr ? "Clip vidéo ajouté" : "Video clip added");
    };
    probe.onerror = () => toast.error(isFr ? "Impossible de charger la vidéo" : "Failed to load video");
  }, [editorProject, isFr]);

  // --- Add audio track (unified model) ---
  const handleAudioFileChosen = useCallback((file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error(isFr ? "Fichier audio requis" : "Audio file required");
      return;
    }
    const url = URL.createObjectURL(file);
    const probe = new Audio();
    probe.src = url;
    probe.onloadedmetadata = () => {
      const fps = editorProject.project.fps;
      const durationInFrames = Math.max(30, Math.round(probe.duration * fps));
      const track = createAudioTrack(url, file.name.replace(/\.[^.]+$/, ""), {
        durationInFrames,
      });
      editorProject.addAudioTrack(track);
      setTimelineOpen(true);
      toast.success(isFr ? "Piste audio ajoutée" : "Audio track added");
    };
  }, [editorProject, isFr]);

  // --- Load from local file (image or video) ---
  const handleFileLoad = useCallback((file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => loadImage(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      handleVideoFileChosen(file);
    } else {
      toast.error("Please drop an image or video file");
    }
  }, [loadImage, handleVideoFileChosen]);

  // --- Drag & drop handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileLoad(file);
  }, [handleFileLoad]);

  // --- Apply variant ---
  const applyVariant = useCallback((index: number) => {
    setSelectedVariant(index);
    const url = variants[index];
    if (url) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImage(img);
        setImageUrl(url);
        setMaskLines([]);
        // Push to history
        setHistory(prev => {
          const sliced = prev.slice(0, historyIndex + 1);
          return [...sliced, { imageData: url, maskData: [] }];
        });
        setHistoryIndex(prev => prev + 1);
      };
      img.src = url;
    }
  }, [variants, historyIndex]);

  // --- History: undo / redo ---
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const newIdx = historyIndex - 1;
    const entry = history[newIdx];
    setHistoryIndex(newIdx);
    setMaskLines(entry.maskData);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setImageUrl(entry.imageData);
    };
    img.src = entry.imageData;
  }, [canUndo, historyIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const newIdx = historyIndex + 1;
    const entry = history[newIdx];
    setHistoryIndex(newIdx);
    setMaskLines(entry.maskData);
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setImageUrl(entry.imageData);
    };
    img.src = entry.imageData;
  }, [canRedo, historyIndex, history]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === " ") {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.key === "v" || e.key === "V") setTool("move");
      if (e.key === "e" || e.key === "E") setTool("clean");
      if (e.key === "i" || e.key === "I") setTool("replace");
      if (e.key === "c" || e.key === "C") setTool("cutout");
      if (e.key === "b" || e.key === "B") setTool("background");
      if (e.key === "f" || e.key === "F") setTool("reframe");
      if (e.key === "u" || e.key === "U") setTool("upscale");
      if (e.key === "[") setBrushSize(prev => clamp(prev - 5, 5, 150));
      if (e.key === "]") setBrushSize(prev => clamp(prev + 5, 5, 150));
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") { e.preventDefault(); redo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") setSpaceHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo, redo]);

  const isBrushTool = tool === "clean" || tool === "replace" || tool === "cutout";

  // --- Canvas mouse handlers ---
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Pan with space + drag or middle click
    if (spaceHeld || e.evt.button === 1) {
      setIsPanning(true);
      lastPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }
    if (tool !== "clean" && tool !== "replace") {
      // Non-brush tools: clicking empty stage space deselects any layer.
      const stage = e.target.getStage();
      if (e.target === stage) setSelectedLayerId(null);
      return;
    }
    if (!image) return;
    setIsDrawing(true);
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    const adjustedPos = { x: (pos.x - stagePos.x) / zoom, y: (pos.y - stagePos.y) / zoom };
    setMaskLines(prev => [...prev, { points: [adjustedPos.x, adjustedPos.y], brushSize }]);
  }, [tool, image, spaceHeld, stagePos, zoom, brushSize]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();

    // Only track cursor position for brush tools (avoid re-renders during drag)
    if (isBrushTool && pos) setCursorPos(pos);

    // Panning
    if (isPanning && lastPanPos.current) {
      const dx = e.evt.clientX - lastPanPos.current.x;
      const dy = e.evt.clientY - lastPanPos.current.y;
      setStagePos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    if (!isDrawing) return;
    if (!pos) return;
    const adjustedPos = { x: (pos.x - stagePos.x) / zoom, y: (pos.y - stagePos.y) / zoom };
    setMaskLines(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastLine = { ...updated[updated.length - 1] };
      lastLine.points = [...lastLine.points, adjustedPos.x, adjustedPos.y];
      updated[updated.length - 1] = lastLine;
      return updated;
    });
  }, [isDrawing, isPanning, isBrushTool, stagePos, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setIsPanning(false);
    lastPanPos.current = null;
  }, []);

  // --- Zoom with scroll wheel ---
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const oldZoom = zoom;
    const newZoom = e.evt.deltaY < 0 ? oldZoom * scaleBy : oldZoom / scaleBy;
    const clampedZoom = clamp(newZoom, 0.1, 10);

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldZoom,
      y: (pointer.y - stagePos.y) / oldZoom,
    };
    setZoom(clampedZoom);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedZoom,
      y: pointer.y - mousePointTo.y * clampedZoom,
    });
  }, [zoom, stagePos]);

  // --- Fit to screen ---
  const fitToScreen = useCallback(() => {
    if (!image) return;
    const containerW = canvasSize.width;
    const containerH = canvasSize.height;
    const scaleX = (containerW * 0.85) / image.width;
    const scaleY = (containerH * 0.85) / image.height;
    const fitScale = Math.min(scaleX, scaleY, 1);
    setZoom(fitScale);
    setStagePos({
      x: (containerW - image.width * fitScale) / 2,
      y: (containerH - image.height * fitScale) / 2,
    });
  }, [image, canvasSize]);

  // --- Clear mask ---
  const clearMask = useCallback(() => {
    setMaskLines([]);
  }, []);

  // --- Download / Export ---
  const handleDownload = useCallback(() => {
    // Open export dialog if timeline has content, otherwise quick download
    if (editorProject.project.layers.length > 0 || editorProject.project.audioTracks.length > 0) {
      setExportOpen(true);
    } else if (imageUrl) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `ora-editor-${Date.now()}.png`;
      a.click();
    }
  }, [imageUrl, editorProject.project]);

  // --- Layers (text + logo) ---
  const [layers, setLayers] = useState<EditorLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const logoImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const subjectImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const transformerRef = useRef<Konva.Transformer>(null);
  const layerNodesRef = useRef<Record<string, Konva.Node>>({});
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const textLayerInputRef = useRef<HTMLInputElement>(null);
  const [pendingTextFocus, setPendingTextFocus] = useState<string | null>(null);
  const [shapesOpen, setShapesOpen] = useState(false);

  const selectedLayer = useMemo(
    () => layers.find(l => l.id === selectedLayerId) || null,
    [layers, selectedLayerId],
  );

  // Compose layers onto an off-screen canvas (base image + text + logo overlays)
  const composeCanvasDataUrl = useCallback((): string | null => {
    if (!image) return null;
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      if (layer.type === "text") {
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        const weight = layer.fontStyle.includes("bold") ? "bold" : "normal";
        const italic = layer.fontStyle.includes("italic") ? "italic " : "";
        ctx.font = `${italic}${weight} ${layer.fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.fill;
        ctx.textBaseline = "top";
        // Konva.Text has a slight padding; mimic by drawing at 0,0 with topline
        ctx.fillText(layer.text, 0, 0);
      } else if (layer.type === "logo") {
        const logoImg = logoImagesRef.current[layer.id];
        if (logoImg) {
          ctx.translate(layer.x, layer.y);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.drawImage(logoImg, 0, 0, layer.width, layer.height);
        }
      } else if (layer.type === "subject") {
        const subjImg = subjectImagesRef.current[layer.id];
        if (subjImg) {
          // Subject is aligned to base image — draw at its natural size
          ctx.drawImage(subjImg, 0, 0, image.width, image.height);
        }
      } else if (layer.type === "shape") {
        ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-layer.width / 2, -layer.height / 2);

        // Build path
        ctx.beginPath();
        if (layer.shape === "rect" || layer.shape === "patch") {
          const r = Math.min(layer.cornerRadius, layer.width / 2, layer.height / 2);
          const w = layer.width;
          const h = layer.height;
          ctx.moveTo(r, 0);
          ctx.lineTo(w - r, 0);
          ctx.quadraticCurveTo(w, 0, w, r);
          ctx.lineTo(w, h - r);
          ctx.quadraticCurveTo(w, h, w - r, h);
          ctx.lineTo(r, h);
          ctx.quadraticCurveTo(0, h, 0, h - r);
          ctx.lineTo(0, r);
          ctx.quadraticCurveTo(0, 0, r, 0);
          ctx.closePath();
        } else if (layer.shape === "circle") {
          const rx = layer.width / 2;
          const ry = layer.height / 2;
          ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
        } else if (layer.shape === "star") {
          const cx = layer.width / 2;
          const cy = layer.height / 2;
          const outer = Math.min(layer.width, layer.height) / 2;
          const inner = outer * layer.innerRadiusRatio;
          const points = layer.numPoints;
          for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = (Math.PI * i) / points - Math.PI / 2;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }

        // Fill (solid or linear gradient)
        if (layer.fillType === "gradient") {
          const a = (layer.gradientAngle * Math.PI) / 180;
          const cx = layer.width / 2;
          const cy = layer.height / 2;
          const diag = Math.sqrt(layer.width * layer.width + layer.height * layer.height) / 2;
          const x0 = cx - Math.cos(a) * diag;
          const y0 = cy - Math.sin(a) * diag;
          const x1 = cx + Math.cos(a) * diag;
          const y1 = cy + Math.sin(a) * diag;
          const grad = ctx.createLinearGradient(x0, y0, x1, y1);
          grad.addColorStop(0, layer.gradientStart);
          grad.addColorStop(1, layer.gradientEnd);
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = layer.fill;
        }
        ctx.fill();

        if (layer.strokeWidth > 0) {
          ctx.lineWidth = layer.strokeWidth;
          ctx.strokeStyle = layer.stroke;
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    return c.toDataURL("image/png");
  }, [image, layers]);

  // Export image at current frame using compose-export module
  const handleExportImage = useCallback((format: "png" | "jpeg" | "webp", quality: number): string | null => {
    const unified = composeUnifiedCanvas(
      image,
      editorProject.project.layers,
      {
        logos: logoImagesRef.current,
        subjects: subjectImagesRef.current,
        videos: Object.fromEntries(videoElementsRef.current),
      },
      editorProject.playheadFrame,
      editorProject.project.fps,
      editorProject.getInterpolatedSpatial,
    );
    const dataUrl = unified || composeCanvasDataUrl();
    if (!dataUrl) return null;
    if (format === "png") return dataUrl;
    // Re-encode for jpeg/webp
    const img2 = new window.Image();
    img2.src = dataUrl;
    const c = document.createElement("canvas");
    c.width = image?.width || editorProject.project.width;
    c.height = image?.height || editorProject.project.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img2, 0, 0);
    return c.toDataURL(`image/${format}`, quality);
  }, [image, editorProject, composeCanvasDataUrl]);

  // Video export stub
  const handleExportVideo = useCallback(async (_quality: "standard" | "high"): Promise<string | null> => {
    toast.info(isFr ? "Export vidéo bientôt disponible" : "Video export coming soon");
    return null;
  }, [isFr]);

  const addTextLayer = useCallback(() => {
    if (!image) {
      toast.error(isFr ? "Chargez d'abord une image" : "Load an image first");
      return;
    }
    const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fontSize = Math.max(32, Math.round(image.width / 16));
    setLayers(prev => [
      ...prev,
      {
        id,
        type: "text",
        opacity: 1,
        visible: true,
        x: image.width * 0.1,
        y: image.height * 0.45,
        rotation: 0,
        text: isFr ? "Votre texte" : "Your text",
        fontSize,
        fontFamily: "Inter, sans-serif",
        fontStyle: "bold",
        fill: "#ffffff",
      },
    ]);
    setSelectedLayerId(id);
    setPendingTextFocus(id);
  }, [image, isFr]);

  // Auto-focus the text input when a new text layer is created, and select
  // its contents so the user can immediately overwrite the placeholder.
  useEffect(() => {
    if (!pendingTextFocus) return;
    // Wait two frames so React has committed the new <input> into the DOM.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const input = textLayerInputRef.current;
        if (input) {
          input.focus();
          try { input.select(); } catch {}
        }
        setPendingTextFocus(null);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [pendingTextFocus]);

  const addShapeLayer = useCallback(
    (shape: ShapeKind) => {
      if (!image) {
        toast.error(isFr ? "Chargez d'abord une image" : "Load an image first");
        return;
      }
      const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      // Default size: ~25% of image's shorter side
      const base = Math.min(image.width, image.height) * 0.25;
      const w = shape === "rect" || shape === "patch" ? base * 1.4 : base;
      const h = base;
      const cornerRadius = shape === "patch" ? base * 0.35 : shape === "rect" ? 0 : 0;
      setLayers(prev => [
        ...prev,
        {
          id,
          type: "shape",
          opacity: 1,
          visible: true,
          shape,
          x: image.width * 0.1,
          y: image.height * 0.1,
          width: w,
          height: h,
          rotation: 0,
          fillType: "gradient",
          fill: "#EC4899",
          gradientStart: "#7C3AED",
          gradientEnd: "#EC4899",
          gradientAngle: 135,
          stroke: "#ffffff",
          strokeWidth: 0,
          cornerRadius,
          numPoints: 5,
          innerRadiusRatio: 0.5,
        },
      ]);
      setSelectedLayerId(id);
    },
    [image, isFr],
  );

  // --- Layer z-order (array order = paint order; last = top) ---
  const moveLayer = useCallback(
    (id: string, direction: "up" | "down" | "top" | "bottom") => {
      setLayers(prev => {
        const idx = prev.findIndex(l => l.id === id);
        if (idx < 0) return prev;
        const next = [...prev];
        const [item] = next.splice(idx, 1);
        if (direction === "up") next.splice(Math.min(idx + 1, next.length), 0, item);
        else if (direction === "down") next.splice(Math.max(idx - 1, 0), 0, item);
        else if (direction === "top") next.push(item);
        else next.unshift(item);
        return next;
      });
    },
    [],
  );

  const handleLogoFileChosen = useCallback(
    (file: File) => {
      if (!image) {
        toast.error(isFr ? "Chargez d'abord une image" : "Load an image first");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(isFr ? "Fichier image requis" : "Image file required");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
          const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const targetW = image.width * 0.22;
          const targetH = (img.height / img.width) * targetW;
          logoImagesRef.current[id] = img;
          setLayers(prev => [
            ...prev,
            {
              id,
              type: "logo",
              opacity: 1,
              visible: true,
              x: image.width * 0.05,
              y: image.height * 0.05,
              width: targetW,
              height: targetH,
              rotation: 0,
              imageUrl: dataUrl,
            },
          ]);
          setSelectedLayerId(id);
        };
        img.onerror = () => toast.error(isFr ? "Impossible de charger le logo" : "Failed to load logo");
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [image, isFr],
  );

  const updateLayer = useCallback((id: string, patch: Partial<EditorLayer>) => {
    setLayers(prev => prev.map(l => (l.id === id ? ({ ...l, ...patch } as EditorLayer) : l)));
  }, []);

  const deleteLayer = useCallback(
    (id: string) => {
      setLayers(prev => prev.filter(l => l.id !== id));
      delete logoImagesRef.current[id];
      delete subjectImagesRef.current[id];
      delete layerNodesRef.current[id];
      setSelectedLayerId(prev => (prev === id ? null : prev));
    },
    [],
  );

  // Attach Konva Transformer to the selected layer node.
  // Subject layers are not transformable (they must stay aligned to the base photo).
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const selectedLayer = layers.find(l => l.id === selectedLayerId);
    if (!selectedLayerId || !selectedLayer || selectedLayer.type === "subject") {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = layerNodesRef.current[selectedLayerId];
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedLayerId, layers]);

  // Delete key removes selected layer (when not typing in an input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedLayerId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteLayer(selectedLayerId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedLayerId, deleteLayer]);

  // Clear layers whenever a fundamentally different base image is loaded
  // (avoid stale overlays sitting in wrong coordinates after reframe/upload).
  const prevImageDimsRef = useRef<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!image) {
      prevImageDimsRef.current = null;
      return;
    }
    const prev = prevImageDimsRef.current;
    if (prev && (prev.w !== image.width || prev.h !== image.height)) {
      setLayers([]);
      setSelectedLayerId(null);
      logoImagesRef.current = {};
      layerNodesRef.current = {};
    }
    prevImageDimsRef.current = { w: image.width, h: image.height };
  }, [image]);

  // --- Save to Library ---
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const handleSaveToLibrary = useCallback(async () => {
    if (!imageUrl || !image) return;
    setSaving(true);
    try {
      // Composite base image + all layers (text/logo) at native resolution.
      const dataUrl = composeCanvasDataUrl();
      if (!dataUrl) {
        toast.error(isFr ? "Rien à enregistrer" : "Nothing to save");
        setSaving(false);
        return;
      }

      const res = await serverPost("/editor/save", {
        imageDataUrl: dataUrl,
        prompt: prompt || "Edited in ORA Editor",
      });
      if (res.success) {
        setSavedAt(Date.now());
        toast.success(isFr ? "Enregistré dans la bibliothèque" : "Saved to Library");
      } else {
        toast.error(res.error || (isFr ? "Erreur lors de l'enregistrement" : "Save failed"));
      }
    } catch (err: any) {
      toast.error(err?.message || (isFr ? "Erreur lors de l'enregistrement" : "Save failed"));
    } finally {
      setSaving(false);
    }
  }, [imageUrl, image, serverPost, prompt, isFr, composeCanvasDataUrl]);

  // Reset savedAt flag whenever the image changes (so user can re-save edits)
  useEffect(() => { setSavedAt(null); }, [imageUrl]);

  // --- Split subject (AI cutout + inpaint background) ---
  const [splitting, setSplitting] = useState(false);

  // --- Layers panel visibility (toggleable like the Library panel) ---
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // --- Animate (image-to-video) ---
  const [animateOpen, setAnimateOpen] = useState(false);
  const [animate, setAnimate] = useState<AnimateState>({
    prompt: "",
    model: "kling-2.5",
    duration: 5,
    running: false,
    videoUrl: null,
    sourceImageUrl: null,
  });

  const runAnimate = useCallback(async () => {
    if (!image) return;
    if (!animate.prompt.trim()) {
      toast.error(isFr ? "Décrivez le mouvement souhaité" : "Describe the desired motion");
      return;
    }
    setAnimate(a => ({ ...a, running: true, videoUrl: null }));
    try {
      // 1) Composite current canvas and upload to Supabase Storage via /editor/save
      const dataUrl = composeCanvasDataUrl();
      if (!dataUrl) throw new Error("No image to animate");
      const upRes = await serverPost("/editor/save", {
        imageDataUrl: dataUrl,
        prompt: `Animate source: ${animate.prompt}`,
      });
      if (!upRes.success || !upRes.imageUrl) {
        throw new Error(upRes.error || "Upload failed");
      }
      const sourceImageUrl: string = upRes.imageUrl;
      setAnimate(a => ({ ...a, sourceImageUrl }));

      // 2) Start video generation (POST to avoid URI Too Long with large _token)
      const startRes = await fetch(`${API_BASE}/generate/video-start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({
          prompt: animate.prompt,
          model: animate.model,
          imageUrl: sourceImageUrl,
          duration: String(animate.duration),
          aspectRatio: image.width >= image.height ? "16:9" : "9:16",
          _token: getAuthHeader(),
        }),
      });
      const startJson = await startRes.json();
      if (!startJson.success || !startJson.generationId) {
        throw new Error(startJson.error || "Video start failed");
      }
      const genId: string = startJson.generationId;

      // 3) Poll until completed (fast polling — webhook + KV makes server respond instantly)
      let videoUrl: string | null = null;
      for (let i = 0; i < 150; i++) {
        await new Promise(r => setTimeout(r, i < 10 ? 2000 : 4000));
        try {
          const pollRes = await fetch(`${API_BASE}/generate/video-status?id=${encodeURIComponent(genId)}&apikey=${publicAnonKey}`);
          const pollJson = await pollRes.json();
          if (pollJson.state === "completed" && pollJson.videoUrl) {
            videoUrl = pollJson.videoUrl;
            break;
          }
          if (pollJson.state === "failed") {
            throw new Error(pollJson.error || "Video generation failed");
          }
        } catch (pollErr) {
          // transient, keep polling
        }
      }
      if (!videoUrl) throw new Error(isFr ? "Délai dépassé" : "Timeout");

      // 4) Save to library as film
      await serverPost("/editor/save-video", {
        videoUrl,
        prompt: animate.prompt,
        sourceImageUrl,
        posterUrl: sourceImageUrl,
      });

      setAnimate(a => ({ ...a, running: false, videoUrl }));
      toast.success(isFr ? "Vidéo enregistrée dans la bibliothèque" : "Video saved to Library");
    } catch (err: any) {
      console.error("[editor/animate] error:", err);
      toast.error(err?.message || (isFr ? "Erreur d'animation" : "Animate error"));
      setAnimate(a => ({ ...a, running: false }));
    }
  }, [animate.prompt, animate.model, animate.duration, image, composeCanvasDataUrl, serverPost, getAuthHeader, isFr]);

  // --- Split subject: isolate the foreground subject via AI segmentation,
  //     inpaint the background to remove the subject, then add the subject as
  //     a top-most layer. Other layers can then be reordered to sit BETWEEN
  //     the background and the subject — giving a "behind-the-subject" effect.
  const runSplitSubject = useCallback(async () => {
    if (!image || !imageUrl) return;
    if (splitting) return;
    setSplitting(true);
    const toastId = toast.loading(isFr ? "Découpe du sujet en cours…" : "Splitting subject…");
    try {
      // 1) Ensure the current composite is hosted so the backend can fetch it.
      //    We ship the base photo (without overlays) to keep the cutout clean.
      let sourceUrl = imageUrl;
      if (sourceUrl.startsWith("data:") || sourceUrl.startsWith("blob:")) {
        const c = document.createElement("canvas");
        c.width = image.width;
        c.height = image.height;
        c.getContext("2d")!.drawImage(image, 0, 0);
        const dataUrl = c.toDataURL("image/png");
        const upRes = await serverPost("/editor/save", { imageDataUrl: dataUrl, prompt: "Split subject source" });
        if (!upRes.success || !upRes.imageUrl) throw new Error(upRes.error || "Upload failed");
        sourceUrl = upRes.imageUrl;
      }

      // 2) Call segmentation → subjectUrl (PNG with alpha)
      const segRes = await serverPost("/editor/segment-subject", { imageUrl: sourceUrl });
      if (!segRes.success || !segRes.subjectUrl) {
        throw new Error(segRes.error || "Segmentation failed");
      }
      const subjectUrl: string = segRes.subjectUrl;

      // 3) Load subject locally and derive a white-on-black mask from its alpha.
      const subjImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new window.Image();
        im.crossOrigin = "anonymous";
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = subjectUrl;
      });
      const mc = document.createElement("canvas");
      mc.width = image.width;
      mc.height = image.height;
      const mctx = mc.getContext("2d")!;
      mctx.fillStyle = "#000";
      mctx.fillRect(0, 0, mc.width, mc.height);
      // Draw subject and convert its opaque pixels to solid white.
      const sc = document.createElement("canvas");
      sc.width = image.width;
      sc.height = image.height;
      const sctx = sc.getContext("2d")!;
      sctx.drawImage(subjImg, 0, 0, image.width, image.height);
      const subjData = sctx.getImageData(0, 0, image.width, image.height);
      const maskData = mctx.getImageData(0, 0, image.width, image.height);
      for (let i = 0; i < subjData.data.length; i += 4) {
        const a = subjData.data[i + 3];
        if (a > 32) {
          maskData.data[i] = 255;
          maskData.data[i + 1] = 255;
          maskData.data[i + 2] = 255;
          maskData.data[i + 3] = 255;
        }
      }
      // Dilate the mask slightly to avoid halo around the subject edges.
      mctx.putImageData(maskData, 0, 0);
      const maskDataUrl = mc.toDataURL("image/png");

      // 4) Call inpainting → new background photo URL (no subject)
      const bgRes = await serverPost("/editor/inpaint-background", {
        imageUrl: sourceUrl,
        maskDataUrl,
      });
      if (!bgRes.success || !bgRes.backgroundUrl) {
        throw new Error(bgRes.error || "Inpaint failed");
      }
      const backgroundUrl: string = bgRes.backgroundUrl;

      // 5) Load the new background and install it as the base image.
      await new Promise<void>((resolve, reject) => {
        const bgImg = new window.Image();
        bgImg.crossOrigin = "anonymous";
        bgImg.onload = () => {
          setImage(bgImg);
          setImageUrl(backgroundUrl);
          resolve();
        };
        bgImg.onerror = reject;
        bgImg.src = backgroundUrl;
      });

      // 6) Register the subject image and push a new subject layer at the top
      const subjectLayerId = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      subjectImagesRef.current[subjectLayerId] = subjImg;
      setLayers(prev => [
        ...prev,
        {
          id: subjectLayerId,
          type: "subject",
          opacity: 1,
          visible: true,
          imageUrl: subjectUrl,
        },
      ]);
      setSelectedLayerId(subjectLayerId);

      toast.success(
        isFr
          ? "Sujet isolé. Placez vos calques entre le fond et le sujet pour passer derrière."
          : "Subject isolated. Place layers between background and subject to go behind.",
        { id: toastId },
      );
    } catch (err: any) {
      console.error("[editor/split-subject] error:", err);
      toast.error(err?.message || (isFr ? "Erreur de découpe" : "Split failed"), { id: toastId });
    } finally {
      setSplitting(false);
    }
  }, [image, imageUrl, splitting, serverPost, isFr]);

  // --- Build mask as black/white image matching original image dimensions ---
  const buildMaskDataUrl = useCallback((): string | null => {
    if (!image || maskLines.length === 0) return null;
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    // Ideogram convention: Black = areas to EDIT, White = areas to KEEP
    ctx.fillStyle = invertMask ? "#000000" : "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = invertMask ? "#ffffff" : "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const line of maskLines) {
      ctx.lineWidth = line.brushSize;
      ctx.beginPath();
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i];
        const y = line.points[i + 1];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return c.toDataURL("image/png");
  }, [image, maskLines, invertMask]);

  // --- Client-side cutout: extract painted region as a new subject layer ---
  const handleCutout = useCallback(() => {
    if (!image || maskLines.length === 0) return;

    // 1) Build an alpha mask from the painted brush strokes (white = keep)
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = image.width;
    maskCanvas.height = image.height;
    const mctx = maskCanvas.getContext("2d")!;
    // Start fully transparent (black/0 alpha)
    mctx.clearRect(0, 0, image.width, image.height);
    // Draw brush strokes as solid white
    mctx.strokeStyle = "#ffffff";
    mctx.lineCap = "round";
    mctx.lineJoin = "round";
    for (const line of maskLines) {
      mctx.lineWidth = line.brushSize;
      mctx.beginPath();
      for (let i = 0; i < line.points.length; i += 2) {
        const x = line.points[i];
        const y = line.points[i + 1];
        if (i === 0) mctx.moveTo(x, y);
        else mctx.lineTo(x, y);
      }
      mctx.stroke();
    }

    // 2) Composite: keep only the original image pixels inside the mask
    const outCanvas = document.createElement("canvas");
    outCanvas.width = image.width;
    outCanvas.height = image.height;
    const octx = outCanvas.getContext("2d")!;
    // Draw original image
    octx.drawImage(image, 0, 0);
    // Use destination-in: keep only pixels where mask is opaque
    octx.globalCompositeOperation = "destination-in";
    octx.drawImage(maskCanvas, 0, 0);
    octx.globalCompositeOperation = "source-over";

    // 3) Create HTMLImageElement from the result
    const dataUrl = outCanvas.toDataURL("image/png");
    const subjImg = new window.Image();
    subjImg.crossOrigin = "anonymous";
    subjImg.onload = () => {
      const layerId = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      subjectImagesRef.current[layerId] = subjImg;
      setLayers(prev => [
        ...prev,
        {
          id: layerId,
          type: "subject" as const,
          opacity: 1,
          visible: true,
          imageUrl: dataUrl,
        },
      ]);
      setSelectedLayerId(layerId);
      setMaskLines([]);
      toast.success(isFr ? "Élément détouré ajouté comme calque" : "Cutout added as layer");
    };
    subjImg.src = dataUrl;
  }, [image, maskLines, isFr]);

  // --- Server action ---
  const handleAction = useCallback(async () => {
    if (!imageUrl) return;
    // Cutout is client-side only — no server call
    if (tool === "cutout") { handleCutout(); return; }
    setProcessing(true);
    try {
      const body: any = { imageUrl, tool, _token: getAuthHeader() };

      if (tool === "clean" || tool === "replace") {
        const maskDataUrl = buildMaskDataUrl();
        if (!maskDataUrl) {
          toast.error("Please paint a mask on the image first");
          setProcessing(false);
          return;
        }
        body.mask = maskDataUrl;
        body.invertMask = invertMask;
      }
      if (prompt && tool !== "clean" && tool !== "upscale") body.prompt = prompt;
      if (tool === "reframe") body.format = reframeFormat;

      const serverRes = await fetch(`${API_BASE}/editor/${tool}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify(body),
      });
      const res = await serverRes.json();

      if (res.success && (res.variants?.length || res.imageUrl)) {
        const urls: string[] = res.variants || [res.imageUrl];
        setVariants(urls);
        setSelectedVariant(0);
        // Auto-apply first variant to canvas
        const resultUrl = urls[0];
        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setImage(img);
          setImageUrl(resultUrl);
          setMaskLines([]);
          setHistory(prev => [...prev.slice(0, historyIndex + 1), { imageData: resultUrl, maskData: [] }]);
          setHistoryIndex(prev => prev + 1);
          toast.success(`${tool.charAt(0).toUpperCase() + tool.slice(1)} completed`);
        };
        img.onerror = () => {
          toast.error("Failed to load result image");
        };
        img.src = resultUrl;
      } else {
        toast.error(res.error || "Editor processing error");
      }
    } catch (err: any) {
      console.error("Editor action error:", err);
      toast.error(err?.message || "Network error — server unreachable");
    } finally {
      setProcessing(false);
    }
  }, [imageUrl, tool, prompt, invertMask, reframeFormat, getAuthHeader, buildMaskDataUrl, handleCutout]);

  // --- Library filtered ---
  const filteredLibrary = useMemo(() => {
    if (!librarySearch.trim()) return libraryItems;
    const q = librarySearch.toLowerCase();
    return libraryItems.filter(item => {
      const name = getItemName(item).toLowerCase();
      const tags = item.preview?.tags?.join(" ").toLowerCase() || "";
      return name.includes(q) || tags.includes(q);
    });
  }, [libraryItems, librarySearch]);

  // --- Prompt bar visibility ---
  const showPromptBar = tool === "replace" || tool === "background" || tool === "reframe";
  const showActionBar = showPromptBar || tool === "clean" || tool === "upscale" || tool === "cutout";

  // --- Cursor style ---
  const getCursorStyle = (): string => {
    if (spaceHeld || isPanning) return "grab";
    if (isBrushTool && image) return "none";
    return "default";
  };

  // --- Action button label ---
  const getActionLabel = (): string => {
    switch (tool) {
      case "clean": return "Clean";
      case "replace": return "Replace";
      case "cutout": return isFr ? "Détourer" : "Cutout";
      case "background": return "Replace Background";
      case "reframe": return "Fill";
      case "upscale": return "Upscale";
      default: return "Apply";
    }
  };

  // --- Can execute action ---
  const canExecute = (): boolean => {
    if (!imageUrl || processing) return false;
    if ((tool === "clean" || tool === "replace" || tool === "cutout") && maskLines.length === 0) return false;
    if (tool === "replace" && !prompt.trim()) return false;
    if (tool === "background" && !prompt.trim()) return false;
    if (tool === "reframe" && !prompt.trim()) return false;
    return true;
  };

  // --- Checkerboard pattern ---
  const checkerPattern = useMemo(() => createCheckerboardPattern(), []);

  // --- Mobile message ---
  if (isMobile) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#fff", color: "#1a1a1a",
        padding: "32px", textAlign: "center",
      }}>
        <div>
          <Maximize size={48} style={{ color: "#7C3AED", marginBottom: 16, margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Desktop Only</h2>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.6, maxWidth: 320 }}>
            The AI image editor requires a desktop screen for the best experience.
            Please open this page on a computer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", height: "100vh", background: "#f5f5f7", color: "#1a1a1a",
      overflow: "hidden", userSelect: "none",
    }}>

      {/* ═══════ LIBRARY PANEL ═══════ */}
      <LibrarySidebar
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        search={librarySearch}
        onSearchChange={setLibrarySearch}
        items={filteredLibrary}
        loading={loadingLibrary}
        activeImageUrl={imageUrl}
        onSelectImage={loadImage}
        onSelectVideo={handleSelectLibraryVideo}
      />

      {/* ═══════ MAIN AREA (canvas + panels) ═══════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

        {/* ─── Canvas + Timeline (resizable split) ─── */}
        <PanelGroup direction="vertical" style={{ flex: 1 }}>
          <Panel defaultSize={timelineOpen ? 75 : 100} minSize={30}>
        {/* ─── Canvas area ─── */}
        <div
          ref={canvasContainerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            width: "100%", height: "100%", position: "relative", overflow: "hidden",
            cursor: getCursorStyle(),
          }}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileLoad(file);
              e.target.value = "";
            }}
          />

          {/* Drag overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute", inset: 0, zIndex: 50,
                  background: "rgba(124, 58, 237, 0.15)",
                  border: "3px dashed #7C3AED",
                  borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: 8,
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <Upload size={40} style={{ color: "#7C3AED", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#7C3AED" }}>
                    Drop image here
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {!image && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 16, zIndex: 5,
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, #7C3AED20, #7C3AED10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ImageIcon size={32} style={{ color: "#7C3AED" }} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 500, color: "#555", marginBottom: 4 }}>
                  Select an image to edit
                </p>
                <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
                  Choose from your library or drag and drop
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: "10px 24px", borderRadius: 10, border: "none",
                    background: "#7C3AED",
                    color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    transition: "transform 0.12s, box-shadow 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.25)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <Upload size={16} />
                  Upload image
                </button>
              </div>
            </div>
          )}

          {/* Konva Stage */}
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { setCursorPos(null); handleMouseUp(); }}
            onWheel={handleWheel}
          >
            {/* Checkerboard background */}
            <Layer>
              <Rect
                x={-5000}
                y={-5000}
                width={10000}
                height={10000}
                fillPatternImage={checkerPattern}
                fillPatternRepeat="repeat"
                fillPatternScale={{ x: 1, y: 1 }}
                listening={false}
              />
            </Layer>

            {/* Image layer */}
            <Layer x={stagePos.x} y={stagePos.y} scaleX={zoom} scaleY={zoom}>
              {image && (
                <KonvaImage
                  image={image}
                  x={0}
                  y={0}
                  width={image.width}
                  height={image.height}
                  listening={!isBrushTool}
                  onMouseDown={(e) => {
                    if (isBrushTool) return;
                    // Click on base image deselects any layer
                    if (e.target === e.target.getStage()?.findOne("Image")) {
                      setSelectedLayerId(null);
                    }
                  }}
                />
              )}

              {/* Text + Logo + Shape + Subject layers */}
              {image && layers.map((layer) => {
                if (!layer.visible) return null;
                if (layer.type === "subject") {
                  const subjImg = subjectImagesRef.current[layer.id];
                  if (!subjImg) return null;
                  return (
                    <KonvaImage
                      key={layer.id}
                      ref={(node) => { if (node) layerNodesRef.current[layer.id] = node; }}
                      image={subjImg}
                      x={0}
                      y={0}
                      width={image.width}
                      height={image.height}
                      opacity={layer.opacity}
                      listening={!isBrushTool}
                      onMouseDown={(e) => { e.cancelBubble = true; setSelectedLayerId(layer.id); }}
                      onTap={() => setSelectedLayerId(layer.id)}
                    />
                  );
                }
                if (layer.type === "text") {
                  return (
                    <KonvaText
                      key={layer.id}
                      ref={(node) => { if (node) layerNodesRef.current[layer.id] = node; }}
                      text={layer.text}
                      x={layer.x}
                      y={layer.y}
                      fontSize={layer.fontSize}
                      fontFamily={layer.fontFamily}
                      fontStyle={layer.fontStyle}
                      fill={layer.fill}
                      opacity={layer.opacity}
                      rotation={layer.rotation}
                      draggable={!isBrushTool}
                      listening={!isBrushTool}
                      onMouseDown={(e) => { e.cancelBubble = true; setSelectedLayerId(layer.id); }}
                      onTap={() => setSelectedLayerId(layer.id)}
                      onDragEnd={(e) => updateLayer(layer.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => {
                        const n = e.target;
                        const sx = n.scaleX();
                        updateLayer(layer.id, {
                          x: n.x(),
                          y: n.y(),
                          rotation: n.rotation(),
                          fontSize: Math.max(8, layer.fontSize * sx),
                        });
                        n.scaleX(1);
                        n.scaleY(1);
                      }}
                    />
                  );
                }
                if (layer.type === "logo") {
                  const logoImg = logoImagesRef.current[layer.id];
                  if (!logoImg) return null;
                  return (
                    <KonvaImage
                      key={layer.id}
                      ref={(node) => { if (node) layerNodesRef.current[layer.id] = node; }}
                      image={logoImg}
                      x={layer.x}
                      y={layer.y}
                      width={layer.width}
                      height={layer.height}
                      opacity={layer.opacity}
                      rotation={layer.rotation}
                      draggable={!isBrushTool}
                      listening={!isBrushTool}
                      onMouseDown={(e) => { e.cancelBubble = true; setSelectedLayerId(layer.id); }}
                      onTap={() => setSelectedLayerId(layer.id)}
                      onDragEnd={(e) => updateLayer(layer.id, { x: e.target.x(), y: e.target.y() })}
                      onTransformEnd={(e) => {
                        const n = e.target;
                        const sx = n.scaleX();
                        const sy = n.scaleY();
                        updateLayer(layer.id, {
                          x: n.x(),
                          y: n.y(),
                          rotation: n.rotation(),
                          width: Math.max(10, layer.width * sx),
                          height: Math.max(10, layer.height * sy),
                        });
                        n.scaleX(1);
                        n.scaleY(1);
                      }}
                    />
                  );
                }
                // Shape layer
                const commonShapeProps = {
                  ref: (node: Konva.Node | null) => { if (node) layerNodesRef.current[layer.id] = node; },
                  x: layer.x,
                  y: layer.y,
                  rotation: layer.rotation,
                  opacity: layer.opacity,
                  draggable: !isBrushTool,
                  listening: !isBrushTool,
                  stroke: layer.strokeWidth > 0 ? layer.stroke : undefined,
                  strokeWidth: layer.strokeWidth,
                  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => { e.cancelBubble = true; setSelectedLayerId(layer.id); },
                  onTap: () => setSelectedLayerId(layer.id),
                  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => updateLayer(layer.id, { x: e.target.x(), y: e.target.y() }),
                };

                // Gradient direction vector for Konva (expects startPoint/endPoint in local coords)
                const gradAngleRad = (layer.gradientAngle * Math.PI) / 180;
                const diag = Math.sqrt(layer.width * layer.width + layer.height * layer.height) / 2;
                const gradCenter = { x: layer.width / 2, y: layer.height / 2 };
                const gradStart = {
                  x: gradCenter.x - Math.cos(gradAngleRad) * diag,
                  y: gradCenter.y - Math.sin(gradAngleRad) * diag,
                };
                const gradEnd = {
                  x: gradCenter.x + Math.cos(gradAngleRad) * diag,
                  y: gradCenter.y + Math.sin(gradAngleRad) * diag,
                };
                const fillProps = layer.fillType === "gradient"
                  ? {
                      fillLinearGradientStartPoint: gradStart,
                      fillLinearGradientEndPoint: gradEnd,
                      fillLinearGradientColorStops: [0, layer.gradientStart, 1, layer.gradientEnd],
                    }
                  : { fill: layer.fill };

                if (layer.shape === "rect" || layer.shape === "patch") {
                  return (
                    <Rect
                      key={layer.id}
                      {...commonShapeProps}
                      width={layer.width}
                      height={layer.height}
                      cornerRadius={layer.cornerRadius}
                      {...fillProps}
                      onTransformEnd={(e) => {
                        const n = e.target;
                        const sx = n.scaleX();
                        const sy = n.scaleY();
                        updateLayer(layer.id, {
                          x: n.x(),
                          y: n.y(),
                          rotation: n.rotation(),
                          width: Math.max(10, layer.width * sx),
                          height: Math.max(10, layer.height * sy),
                        });
                        n.scaleX(1);
                        n.scaleY(1);
                      }}
                    />
                  );
                }
                if (layer.shape === "circle") {
                  // Konva Circle is center-based, use offset trick to keep x/y as top-left like other layers
                  return (
                    <KonvaCircle
                      key={layer.id}
                      {...commonShapeProps}
                      x={layer.x + layer.width / 2}
                      y={layer.y + layer.height / 2}
                      radius={Math.min(layer.width, layer.height) / 2}
                      {...fillProps}
                      onDragEnd={(e) => updateLayer(layer.id, {
                        x: e.target.x() - layer.width / 2,
                        y: e.target.y() - layer.height / 2,
                      })}
                      onTransformEnd={(e) => {
                        const n = e.target;
                        const sx = n.scaleX();
                        const sy = n.scaleY();
                        const newW = Math.max(10, layer.width * sx);
                        const newH = Math.max(10, layer.height * sy);
                        updateLayer(layer.id, {
                          x: n.x() - newW / 2,
                          y: n.y() - newH / 2,
                          rotation: n.rotation(),
                          width: newW,
                          height: newH,
                        });
                        n.scaleX(1);
                        n.scaleY(1);
                      }}
                    />
                  );
                }
                // Star
                return (
                  <KonvaStar
                    key={layer.id}
                    {...commonShapeProps}
                    x={layer.x + layer.width / 2}
                    y={layer.y + layer.height / 2}
                    numPoints={layer.numPoints}
                    outerRadius={Math.min(layer.width, layer.height) / 2}
                    innerRadius={(Math.min(layer.width, layer.height) / 2) * layer.innerRadiusRatio}
                    {...fillProps}
                    onDragEnd={(e) => updateLayer(layer.id, {
                      x: e.target.x() - layer.width / 2,
                      y: e.target.y() - layer.height / 2,
                    })}
                    onTransformEnd={(e) => {
                      const n = e.target;
                      const sx = n.scaleX();
                      const sy = n.scaleY();
                      const newW = Math.max(10, layer.width * sx);
                      const newH = Math.max(10, layer.height * sy);
                      updateLayer(layer.id, {
                        x: n.x() - newW / 2,
                        y: n.y() - newH / 2,
                        rotation: n.rotation(),
                        width: newW,
                        height: newH,
                      });
                      n.scaleX(1);
                      n.scaleY(1);
                    }}
                  />
                );
              })}

              {/* Video clip layers (from unified model) */}
              {editorProject.project.layers
                .filter((l): l is VideoClipLayerType => l.type === "video" && l.visible)
                .map(layer => {
                  const vid = videoElementsRef.current.get(layer.id);
                  if (!vid || vid.readyState < 2) return null;
                  const spatial = editorProject.getInterpolatedSpatial(layer, editorProject.playheadFrame);
                  return (
                    <KonvaImage
                      key={layer.id}
                      ref={(node) => { if (node) layerNodesRef.current[layer.id] = node; }}
                      image={vid}
                      x={spatial.x}
                      y={spatial.y}
                      width={spatial.width}
                      height={spatial.height}
                      rotation={spatial.rotation}
                      opacity={spatial.opacity}
                      scaleX={spatial.scaleX}
                      scaleY={spatial.scaleY}
                      draggable={!isBrushTool}
                      listening={!isBrushTool}
                      onMouseDown={(e) => { e.cancelBubble = true; editorProject.setSelectedLayerId(layer.id); }}
                      onTap={() => editorProject.setSelectedLayerId(layer.id)}
                      onDragEnd={(e) => {
                        editorProject.updateLayerSpatial(layer.id, { x: e.target.x(), y: e.target.y() });
                      }}
                      onTransformEnd={(e) => {
                        const n = e.target;
                        editorProject.updateLayerSpatial(layer.id, {
                          x: n.x(), y: n.y(),
                          rotation: n.rotation(),
                          width: spatial.width * n.scaleX(),
                          height: spatial.height * n.scaleY(),
                        });
                        n.scaleX(1);
                        n.scaleY(1);
                      }}
                    />
                  );
                })}

              {/* Transformer for selected layer */}
              {!isBrushTool && (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  borderStroke="#7C3AED"
                  borderStrokeWidth={2 / zoom}
                  anchorFill="#fff"
                  anchorStroke="#7C3AED"
                  anchorSize={10 / zoom}
                  anchorCornerRadius={2}
                  keepRatio={false}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 10 || newBox.height < 10) return oldBox;
                    return newBox;
                  }}
                />
              )}
            </Layer>

            {/* Mask layer */}
            <Layer ref={maskLayerRef} x={stagePos.x} y={stagePos.y} scaleX={zoom} scaleY={zoom}>
              {maskLines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke="rgba(239, 68, 68, 0.4)"
                  strokeWidth={line.brushSize}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation="source-over"
                  tension={0.5}
                  listening={false}
                />
              ))}
            </Layer>
          </Stage>

          {/* Custom brush cursor overlay */}
          {isBrushTool && image && cursorPos && (
            <div
              style={{
                position: "absolute",
                left: cursorPos.x - (brushSize * zoom) / 2,
                top: cursorPos.y - (brushSize * zoom) / 2,
                width: brushSize * zoom,
                height: brushSize * zoom,
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.6)",
                pointerEvents: "none",
                transition: "width 0.1s, height 0.1s, left 0.05s, top 0.05s",
                zIndex: 10,
              }}
            />
          )}

          {/* ─── Floating toolbar (bottom center) ─── */}
          <EditorToolbar
            tool={tool}
            onToolChange={setTool}
            hasImage={!!image}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onAddText={addTextLayer}
            logoFileInputRef={logoFileInputRef}
            onLogoFileChosen={handleLogoFileChosen}
            shapesOpen={shapesOpen}
            onShapesOpenChange={setShapesOpen}
            onAddShape={addShapeLayer}
            splitting={splitting}
            onSplitSubject={runSplitSubject}
            onOpenAnimate={() => { if (image) setAnimateOpen(true); }}
            videoFileInputRef={videoFileInputRef}
            onVideoFileChosen={handleVideoFileChosen}
            audioFileInputRef={audioFileInputRef}
            onAudioFileChosen={handleAudioFileChosen}
            timelineOpen={timelineOpen}
            onToggleTimeline={() => setTimelineOpen(o => !o)}
            layersPanelOpen={layersPanelOpen}
            onToggleLayersPanel={() => setLayersPanelOpen(o => !o)}
            propertiesOpen={propertiesOpen}
            onToggleProperties={() => setPropertiesOpen(o => !o)}
            saving={saving}
            savedAt={savedAt}
            onSave={handleSaveToLibrary}
            imageUrl={imageUrl}
            onPublish={() => { if (imageUrl) setPublishTarget({ imageUrl, defaultCaption: "" }); }}
            onDownload={handleDownload}
            libraryOpen={libraryOpen}
            onOpenLibrary={() => setLibraryOpen(true)}
            isBrushTool={isBrushTool}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            invertMask={invertMask}
            onInvertMaskToggle={() => setInvertMask(prev => !prev)}
            maskLinesCount={maskLines.length}
            onClearMask={clearMask}
            reframeFormat={reframeFormat}
            onReframeFormatChange={setReframeFormat}
            zoom={zoom}
            onZoomChange={setZoom}
            onFitToScreen={fitToScreen}
            selectedLayer={selectedLayer}
            onUpdateLayer={updateLayer}
            onMoveLayer={moveLayer}
            onDeleteLayer={deleteLayer}
            textLayerInputRef={textLayerInputRef}
            isFr={isFr}
          />

          {/* ─── Variants overlay (bottom right, above toolbar) ─── */}
          <AnimatePresence>
            {variants.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                style={{
                  position: "absolute", bottom: 68, right: 16,
                  display: "flex", gap: 8, zIndex: 20,
                }}
              >
                {variants.map((url, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => applyVariant(i)}
                    style={{
                      width: 80, height: 80, borderRadius: 10, overflow: "hidden",
                      cursor: "pointer",
                      border: selectedVariant === i ? "2px solid #7C3AED" : "2px solid #e8e8e8",
                      boxShadow: selectedVariant === i ? "0 0 12px rgba(124,58,237,0.2)" : "0 2px 8px rgba(0,0,0,0.08)",
                      background: "#fff",
                      transition: "border-color 0.15s",
                    }}
                  >
                    <img
                      src={url}
                      alt={`Variant ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </Panel>

          {/* ── Timeline panel (resizable) ── */}
          {timelineOpen && (
            <>
              <PanelResizeHandle style={{ height: 3, background: "#e8e8e8", cursor: "row-resize" }} />
              <Panel defaultSize={25} minSize={12} maxSize={50}>
                <EditorTimeline
                  layers={editorProject.project.layers}
                  audioTracks={editorProject.project.audioTracks}
                  fps={editorProject.project.fps}
                  durationInFrames={editorProject.project.durationInFrames}
                  playheadFrame={editorProject.playheadFrame}
                  isPlaying={editorProject.isPlaying}
                  selectedLayerId={editorProject.selectedLayerId}
                  onSelectLayer={editorProject.setSelectedLayerId}
                  onPlayheadChange={editorProject.setPlayheadFrame}
                  onTogglePlay={() => editorProject.setIsPlaying(p => !p)}
                  onLayerTemporalChange={(id, start, dur) => {
                    editorProject.updateLayer(id, { temporal: { ...editorProject.getLayer(id)!.temporal, startFrame: start, durationInFrames: dur } });
                  }}
                  onLayerAnimationChange={editorProject.setLayerAnimation}
                  onAudioTemporalChange={(id, start, dur) => {
                    editorProject.updateAudioTrack(id, { startFrame: start, durationInFrames: dur });
                  }}
                  isFr={isFr}
                />
              </Panel>
            </>
          )}
        </PanelGroup>

        {/* ─── Bottom prompt bar ─── */}
        <AnimatePresence>
          {showActionBar && image && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                height: showPromptBar ? 64 : 52,
                background: "#fff", borderTop: "1px solid #e8e8e8",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 20px", gap: 12, flexShrink: 0,
              }}
            >
              {/* Prompt input (only for tools that need it) */}
              {showPromptBar && (
                <div style={{
                  flex: 1, maxWidth: 560, display: "flex", alignItems: "center",
                  background: "#f5f5f7", borderRadius: 10, padding: "0 14px",
                  border: "1px solid #e8e8e8", height: 40,
                }}>
                  <input
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={PROMPT_PLACEHOLDERS[tool]}
                    onKeyDown={e => { if (e.key === "Enter" && canExecute()) handleAction(); }}
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      color: "#1a1a1a", fontSize: 13,
                    }}
                  />
                </div>
              )}

              {/* Action button */}
              <motion.button
                whileHover={{ scale: canExecute() ? 1.02 : 1 }}
                whileTap={{ scale: canExecute() ? 0.98 : 1 }}
                onClick={handleAction}
                disabled={!canExecute()}
                style={{
                  padding: "0 24px", height: 40, borderRadius: 10, border: "none",
                  background: canExecute()
                    ? "#7C3AED"
                    : "#e8e8e8",
                  color: canExecute() ? "#fff" : "#bbb",
                  fontSize: 13, fontWeight: 600, cursor: canExecute() ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 8,
                  transition: "all 0.15s",
                }}
              >
                {processing ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Processing...
                  </>
                ) : (
                  getActionLabel()
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════ LAYERS PANEL (right side, collapsible) ═══════ */}
      <LayersPanel
        open={layersPanelOpen}
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
        onUpdateLayer={updateLayer}
        onDeleteLayer={deleteLayer}
        onMoveLayer={moveLayer}
        hasImage={!!image}
        isFr={isFr}
      />

      {/* ═══════ PROPERTIES PANEL (right side, unified layers) ═══════ */}
      <PropertiesSidebar
        open={propertiesOpen}
        layer={editorProject.selectedLayer}
        onUpdateLayer={editorProject.updateLayer}
        onUpdateSpatial={editorProject.updateLayerSpatial}
        onSetAnimation={editorProject.setLayerAnimation}
        isFr={isFr}
      />

      {/* ═══════ GLOBAL STYLES (keyframes) ═══════ */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          height: 3px;
          border-radius: 2px;
          background: #e0e0e0;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7C3AED;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7C3AED;
          cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        div::-webkit-scrollbar {
          width: 4px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: #ddd;
          border-radius: 2px;
        }
      `}</style>

      {/* ═══ ANIMATE MODAL ═══ */}
      <AnimatePresence>
        {animateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 1000, padding: 16,
            }}
            onClick={() => { if (!animate.running) setAnimateOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: "#fff", border: "1px solid #e8e8e8",
                borderRadius: 14, width: "100%", maxWidth: 520,
                boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{
                padding: "16px 20px", borderBottom: "1px solid #f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Film size={18} style={{ color: "#7C3AED" }} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>
                    {isFr ? "Animer cette image" : "Animate this image"}
                  </h3>
                </div>
                <button
                  onClick={() => { if (!animate.running) setAnimateOpen(false); }}
                  disabled={animate.running}
                  style={{
                    background: "none", border: "none", color: "#bbb",
                    cursor: animate.running ? "default" : "pointer", padding: 4,
                  }}
                >
                  <XIcon size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    {isFr ? "Description du mouvement" : "Motion description"}
                  </label>
                  <textarea
                    value={animate.prompt}
                    onChange={e => setAnimate(a => ({ ...a, prompt: e.target.value }))}
                    placeholder={isFr ? "Ex: caméra lente qui zoome, vent léger..." : "e.g. slow camera push-in, gentle wind..."}
                    rows={3}
                    disabled={animate.running}
                    style={{
                      width: "100%", background: "#f5f5f7", border: "1px solid #e8e8e8",
                      borderRadius: 8, padding: "10px 12px", color: "#1a1a1a", fontSize: 13,
                      outline: "none", resize: "vertical", fontFamily: "inherit",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                      {isFr ? "Modèle" : "Model"}
                    </label>
                    <select
                      value={animate.model}
                      onChange={e => setAnimate(a => ({ ...a, model: e.target.value }))}
                      disabled={animate.running}
                      style={{
                        width: "100%", background: "#f5f5f7", border: "1px solid #e8e8e8",
                        borderRadius: 8, padding: "10px 12px", color: "#1a1a1a", fontSize: 13, outline: "none",
                      }}
                    >
                      <option value="kling-2.5">Kling 2.5 Turbo Pro</option>
                      <option value="hailuo-02">Minimax Hailuo 02</option>
                      <option value="ora-motion">Luma Ray 2</option>
                    </select>
                  </div>
                  <div style={{ width: 140 }}>
                    <label style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                      {isFr ? "Durée" : "Duration"}
                    </label>
                    <select
                      value={animate.duration}
                      onChange={e => setAnimate(a => ({ ...a, duration: Number(e.target.value) }))}
                      disabled={animate.running}
                      style={{
                        width: "100%", background: "#f5f5f7", border: "1px solid #e8e8e8",
                        borderRadius: 8, padding: "10px 12px", color: "#1a1a1a", fontSize: 13, outline: "none",
                      }}
                    >
                      <option value={5}>5s</option>
                      <option value={10}>10s</option>
                    </select>
                  </div>
                </div>

                {/* Result preview */}
                {animate.videoUrl && (
                  <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #e8e8e8" }}>
                    <video
                      src={animate.videoUrl}
                      controls
                      autoPlay
                      loop
                      style={{ width: "100%", display: "block", background: "#000" }}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: "14px 20px", borderTop: "1px solid #f0f0f0",
                display: "flex", justifyContent: "flex-end", gap: 10,
              }}>
                <button
                  onClick={() => setAnimateOpen(false)}
                  disabled={animate.running}
                  style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid #e8e8e8",
                    background: "#fff", color: "#999",
                    fontSize: 13, cursor: animate.running ? "default" : "pointer",
                  }}
                >
                  {isFr ? "Fermer" : "Close"}
                </button>
                <button
                  onClick={runAnimate}
                  disabled={animate.running || !animate.prompt.trim()}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "none",
                    background: animate.running || !animate.prompt.trim()
                      ? "#e8e8e8"
                      : "#7C3AED",
                    color: animate.running || !animate.prompt.trim() ? "#bbb" : "#fff",
                    fontSize: 13, fontWeight: 600,
                    cursor: animate.running || !animate.prompt.trim() ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  {animate.running ? (
                    <>
                      <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      {isFr ? "Génération..." : "Generating..."}
                    </>
                  ) : (
                    <>
                      <Film size={14} />
                      {isFr ? "Animer" : "Animate"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ EXPORT DIALOG ═══ */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        project={editorProject.project}
        currentFrame={editorProject.playheadFrame}
        onExportImage={handleExportImage}
        onExportVideo={handleExportVideo}
        hasTimeline={timelineOpen}
        isFr={isFr}
      />

      {/* ═══ PUBLISH MODAL ═══ */}
      <PublishModal
        open={!!publishTarget}
        asset={publishTarget || { defaultCaption: "" }}
        onClose={() => setPublishTarget(null)}
        onPublished={outcomes => {
          const published = outcomes.filter(o => o.status === "published").length;
          const scheduled = outcomes.filter(o => o.status === "scheduled").length;
          if (published > 0) toast.success(isFr ? `Publié sur ${published} réseau(x)` : `Published to ${published} network(s)`);
          if (scheduled > 0) toast.success(isFr ? `Planifié sur ${scheduled} réseau(x)` : `Scheduled on ${scheduled} network(s)`);
        }}
      />
    </div>
  );
}

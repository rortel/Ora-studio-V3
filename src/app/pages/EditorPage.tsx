/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Ora Editor — agency-grade image composer with optional AI fill.
   Manual layers (text, logo, shapes) are first-class. AI Fill +
   Expand let the user retouch / extend the underlying photo.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router";
import type Konva from "konva";
import { Stage, Layer as KonvaLayerGroup, Rect, Circle as KonvaCircle, Text as KonvaText, Image as KonvaImage, Transformer } from "react-konva";
import { toast } from "sonner";
import {
  Type as TypeIcon, ImagePlus, Square, Circle as CircleIcon, Download, Save,
  Undo2, Redo2, Trash2, Loader2, Wand2, Maximize2, X,
} from "lucide-react";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { Button } from "../components/ora/Button";
import { COLORS } from "../components/ora/tokens";
import { useEditorProject } from "../lib/editor/useEditorProject";
import {
  createTextLayer, createLogoLayer, createShapeLayer, createDefaultSpatial,
  type UnifiedLayer, type TextLayer, type LogoLayer, type ShapeLayer,
} from "../lib/editor/types";
import { inpaintImage, expandImage, type ExpandPercents } from "../lib/editor/aiFill";

/* ──────────────────────────────────────────────────────────────
   Format presets — the platforms Ora ships into. Selecting one
   resizes the canvas to exactly that platform's native spec.
   ────────────────────────────────────────────────────────────── */
const FORMATS = [
  { id: "square",      label: "1:1 Square",   w: 1080, h: 1080, hint: "IG Feed · Facebook" },
  { id: "portrait",    label: "4:5 Portrait", w: 1080, h: 1350, hint: "IG Portrait" },
  { id: "story",       label: "9:16 Story",   w: 1080, h: 1920, hint: "IG Story · TikTok · Reels" },
  { id: "wide",        label: "16:9 Wide",    w: 1920, h: 1080, hint: "YouTube · Facebook Cover" },
  { id: "landscape",   label: "1.91:1",       w: 1200, h: 628,  hint: "OG card · Facebook post" },
] as const;

type FormatId = typeof FORMATS[number]["id"];

/* Fonts available in the text layer inspector — small curated list,
 * not a system-wide picker. Bagel for display, Inter for editorial,
 * a classic serif and a mono for contrast. */
const FONTS = [
  { label: "Bagel Fat One",   value: '"Bagel Fat One", sans-serif' },
  { label: "Inter",           value: 'Inter, sans-serif' },
  { label: "Playfair",        value: '"Playfair Display", Georgia, serif' },
  { label: "Mono",            value: 'ui-monospace, "SFMono-Regular", Menlo, monospace' },
];

const WEIGHTS = [
  { label: "Regular", value: "normal" },
  { label: "Bold",    value: "bold" },
  { label: "Italic",  value: "italic" },
  { label: "B·I",     value: "bold italic" },
];

/* A tight default palette — always shown, regardless of Vault. */
const DEFAULT_SWATCHES = [
  COLORS.ink, "#FFFFFF", COLORS.coral, COLORS.butter, COLORS.violet, COLORS.warm,
];

/* ──────────────────────────────────────────────────────────────
   Route entry — MUST be exported as BOTH named and default.
   routes.ts uses lazyRetry with pick="EditorPage" which reads
   `m["EditorPage"]` off the module namespace; a default-only
   export would resolve to undefined there and React would throw
   the infamous #306 from createFiberFromTypeAndProps (case 16,
   REACT_LAZY_TYPE) with args=[undefined, ""]. Every other lazy
   page in routes.ts follows this same named-export convention.
   ────────────────────────────────────────────────────────────── */
export function EditorPage() {
  return (
    <RouteGuard requireAuth>
      <EditorAgency />
    </RouteGuard>
  );
}
export default EditorPage;

/* ──────────────────────────────────────────────────────────────
   Main shell — split in 3 zones: top toolbar, format rail,
   canvas, right inspector. No timeline, no video panels, no AI
   prompt bar. Every action is explicit.
   ────────────────────────────────────────────────────────────── */
function EditorAgency() {
  const { getAuthHeader } = useAuth();
  const location = useLocation();
  const navState = location.state as { assetUrl?: string; assetId?: string } | null;
  const preloadUrl = navState?.assetUrl || null;
  const preloadId  = navState?.assetId  || null;

  // Core project state (layers, history, selection) — reuses the shared hook
  const p = useEditorProject("Untitled", 1080, 1080);

  // Visual state specific to this shell
  const [activeFormat, setActiveFormat] = useState<FormatId>("square");
  const [zoom, setZoom] = useState(1);

  // Background image (if the user arrived from Library via Pencil icon)
  const [backgroundImg, setBackgroundImg] = useState<HTMLImageElement | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  // AI fill / expand mode + companion state. The mask canvas overlays the
  // Stage when aiMode === "fill"; expand uses 4 percent sliders instead.
  const [aiMode, setAiMode] = useState<"off" | "fill" | "expand">("off");
  const [aiPrompt, setAiPrompt] = useState("");
  const [brushSize, setBrushSize] = useState(40);
  const [expandPct, setExpandPct] = useState<ExpandPercents>({ top: 0.2, bottom: 0.2, left: 0.2, right: 0.2 });
  const [aiBusy, setAiBusy] = useState(false);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Vault data — the logo URL the +Logo button will place, and palette
  // colours the inspector (next commit) will render as one-click swatches.
  const [vaultLogoUrl, setVaultLogoUrl] = useState<string | null>(null);
  const [vaultColors, setVaultColors] = useState<string[]>([]);

  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const nodeRegistry = useRef<Map<string, Konva.Node>>(new Map());

  // Attach / detach the shared Transformer whenever selection flips.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const sel = p.selectedLayerId;
    const node = sel ? nodeRegistry.current.get(sel) : null;
    if (node) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [p.selectedLayerId, p.project.layers]);

  // Load the Brand Vault on mount. Studio+-gated server-side; for Creator
  // users this will return 402 and we silently leave vaultLogoUrl null
  // (the +Logo button will prompt to upload from Vault if pressed).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = getAuthHeader();
        const r = await fetch(`${API_BASE}/vault/load`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
          body: JSON.stringify({ _token: token }),
        });
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        const v = d?.vault;
        if (v) {
          setVaultLogoUrl(v.logo_url || v.logoUrl || null);
          const hexes = (v.colors || [])
            .map((c: any) => String(c?.hex || "").toUpperCase())
            .filter((h: string) => /^#[0-9A-F]{3,8}$/.test(h));
          setVaultColors(hexes);
        }
      } catch { /* silent — Vault is optional */ }
    })();
    return () => { cancelled = true; };
  }, [getAuthHeader]);

  // Preload asset handed over by Library's Pencil icon. Loaded into an
  // <img> element with crossOrigin so Konva can use it as a full-canvas
  // background; the canvas format is auto-matched to the image AR so
  // the user starts on exactly the asset they were editing.
  useEffect(() => {
    if (!preloadUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBackgroundImg(img);
      setBackgroundUrl(preloadUrl);
      // Match the project to the image dimensions. If the image AR maps
      // to one of our format presets, switch the active chip too.
      const w = img.naturalWidth || 1080;
      const h = img.naturalHeight || 1080;
      p.updateProjectProps({ width: w, height: h, backgroundImageUrl: preloadUrl });
      const ar = w / h;
      const match = FORMATS.find((f) => Math.abs(f.w / f.h - ar) < 0.02);
      if (match) setActiveFormat(match.id);
    };
    img.onerror = () => { toast.error("Couldn't load that post."); };
    img.src = preloadUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadUrl]);

  const applyFormat = useCallback((f: typeof FORMATS[number]) => {
    setActiveFormat(f.id);
    p.updateProjectProps({ width: f.w, height: f.h });
  }, [p]);

  // ── Layer add actions ──
  // Each action drops a new layer roughly centred for the current canvas,
  // sensibly sized, and selects it so the inspector (next commit) can
  // pick it up immediately.
  const addText = useCallback(() => {
    const W = p.project.width, H = p.project.height;
    const w = Math.round(W * 0.65), h = Math.round(W * 0.12);
    const layer = createTextLayer({
      text: "Your headline",
      fontSize: Math.round(W * 0.065),
      fontFamily: '"Bagel Fat One", "Inter", sans-serif',
      fill: COLORS.ink,
      align: "left",
      spatial: { ...createDefaultSpatial(), x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), width: w, height: h },
    });
    p.addLayer(layer);
    p.setSelectedLayerId(layer.id);
  }, [p]);

  const addShape = useCallback((shape: "rect" | "circle") => {
    const W = p.project.width, H = p.project.height;
    const size = Math.round(W * 0.25);
    const layer = createShapeLayer(shape, {
      fill: COLORS.coral,
      fillType: "solid",
      cornerRadius: shape === "rect" ? 24 : 0,
      spatial: { ...createDefaultSpatial(), x: Math.round((W - size) / 2), y: Math.round((H - size) / 2), width: size, height: size },
    });
    p.addLayer(layer);
    p.setSelectedLayerId(layer.id);
  }, [p]);

  const addLogo = useCallback(() => {
    if (!vaultLogoUrl) {
      toast.error("No logo in your Brand Vault. Upload one there first.");
      return;
    }
    // External logo URLs (the brand's own CDN, e.g. wp-content uploads)
    // typically don't return Access-Control-Allow-Origin, so Konva can't
    // load them onto the canvas. Route them through our /image-proxy
    // which adds the CORS header. URLs already on our Supabase storage
    // are passed through untouched.
    const isOurStorage = vaultLogoUrl.includes("supabase") || vaultLogoUrl.includes("make-cad57f79") || vaultLogoUrl.startsWith("data:") || vaultLogoUrl.startsWith("blob:");
    const safeLogoUrl = isOurStorage
      ? vaultLogoUrl
      : `${API_BASE}/image-proxy?url=${encodeURIComponent(vaultLogoUrl)}`;
    const W = p.project.width, H = p.project.height;
    const size = Math.round(W * 0.15);
    const layer = createLogoLayer(safeLogoUrl, {
      name: "Logo",
      spatial: { ...createDefaultSpatial(), x: W - size - 40, y: H - size - 40, width: size, height: size },
    });
    p.addLayer(layer);
    p.setSelectedLayerId(layer.id);
  }, [p, vaultLogoUrl]);

  // ── AI fill helpers ──
  // Replace the background photo with one returned by Pollo's inpaint /
  // uncrop pipeline. We always operate on the URL we already loaded; the
  // mask (for inpaint) is the painted overlay scaled to the displayed
  // canvas — Pollo resizes internally to the source image dims.
  const swapBackground = useCallback((nextUrl: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setBackgroundImg(img);
      setBackgroundUrl(nextUrl);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      p.updateProjectProps({ width: w, height: h, backgroundImageUrl: nextUrl });
    };
    img.onerror = () => toast.error("Couldn't load AI result.");
    img.src = nextUrl;
  }, [p]);

  const applyAiFill = useCallback(async () => {
    if (aiBusy) return;
    if (!backgroundUrl) { toast.error("Open an image from your Library first."); return; }
    if (!aiPrompt.trim()) { toast.error("Describe what should appear in the painted zone."); return; }
    const mask = maskCanvasRef.current;
    if (!mask) { toast.error("Paint the area you want to change first."); return; }
    // Detect empty mask — if no pixels have been painted, skip the call.
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    const px = ctx.getImageData(0, 0, mask.width, mask.height).data;
    let painted = false;
    for (let i = 3; i < px.length; i += 4) { if (px[i] > 0) { painted = true; break; } }
    if (!painted) { toast.error("Paint the area you want to change first."); return; }

    setAiBusy(true);
    try {
      const maskBase64 = mask.toDataURL("image/png").split(",")[1];
      const url = await inpaintImage({
        imageUrl: backgroundUrl,
        maskBase64,
        prompt: aiPrompt,
        getAuthHeader,
      });
      swapBackground(url);
      ctx.clearRect(0, 0, mask.width, mask.height);
      setAiMode("off");
      setAiPrompt("");
      toast.success("AI fill applied");
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setAiBusy(false);
    }
  }, [aiBusy, backgroundUrl, aiPrompt, getAuthHeader, swapBackground]);

  const applyAiExpand = useCallback(async () => {
    if (aiBusy) return;
    if (!backgroundUrl) { toast.error("Open an image from your Library first."); return; }
    setAiBusy(true);
    try {
      const url = await expandImage({ imageUrl: backgroundUrl, extend: expandPct, getAuthHeader });
      swapBackground(url);
      setAiMode("off");
      toast.success("Image expanded");
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setAiBusy(false);
    }
  }, [aiBusy, backgroundUrl, expandPct, getAuthHeader, swapBackground]);

  // ── Save to Library ──
  // Rasterises the current Stage at 2× pixel ratio, POSTs the data URL to
  // /editor/save which uploads to storage and creates a Library item
  // (type:"image", preview.kind:"image", editedFrom: preloadId for lineage).
  const [saving, setSaving] = useState(false);
  const handleSave = useCallback(async () => {
    if (saving) return;
    const stage = stageRef.current;
    if (!stage) return;
    setSaving(true);
    try {
      // Take the dataURL at canvas-native size, not the zoomed display.
      const dataUrl = stage.toDataURL({ pixelRatio: 2 / Math.max(0.01, zoom) });
      const token = getAuthHeader();
      const r = await fetch(`${API_BASE}/editor/save`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          prompt: p.project.name || "Edited in ORA Editor",
          sourceItemId: preloadId || null,
          _token: token,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (d?.success) toast.success("Saved to Library");
      else toast.error(d?.error || "Save failed");
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setSaving(false);
    }
  }, [saving, zoom, getAuthHeader, p.project.name, preloadId]);

  // ── Export PNG at canvas-exact resolution ──
  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 / Math.max(0.01, zoom) });
    const slug = (p.project.name || "ora").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ora";
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slug}-${p.project.width}x${p.project.height}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [zoom, p.project.name, p.project.width, p.project.height]);

  // ── Keyboard shortcuts ──
  // - ⌘/Ctrl + Z → undo, ⇧⌘/Ctrl+Z → redo (Y alias)
  // - ⌘/Ctrl + S → save to Library
  // - ⌘/Ctrl + E → export PNG
  // - Delete / Backspace → remove selected layer
  // - Arrow keys → nudge 1px (10px with Shift)
  // Respects form focus: shortcuts skip when the active element is an
  // input, textarea, select or contentEditable field.
  useEffect(() => {
    const isFormTarget = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isFormTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) p.redo(); else p.undo();
        return;
      }
      if (mod && (e.key.toLowerCase() === "y")) { e.preventDefault(); p.redo(); return; }
      if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); handleSave(); return; }
      if (mod && e.key.toLowerCase() === "e") { e.preventDefault(); handleExport(); return; }
      const sel = p.selectedLayer;
      if (!sel) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        p.removeLayer(sel.id);
        return;
      }
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft")  { e.preventDefault(); p.updateLayer(sel.id, { spatial: { ...sel.spatial, x: sel.spatial.x - step } } as any); }
      if (e.key === "ArrowRight") { e.preventDefault(); p.updateLayer(sel.id, { spatial: { ...sel.spatial, x: sel.spatial.x + step } } as any); }
      if (e.key === "ArrowUp")    { e.preventDefault(); p.updateLayer(sel.id, { spatial: { ...sel.spatial, y: sel.spatial.y - step } } as any); }
      if (e.key === "ArrowDown")  { e.preventDefault(); p.updateLayer(sel.id, { spatial: { ...sel.spatial, y: sel.spatial.y + step } } as any); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p, handleSave, handleExport]);

  // Fit-to-viewport zoom: canvas should never overflow the center column.
  const canvasRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const recalc = () => {
      const el = canvasRef.current;
      if (!el) return;
      const pad = 64;
      const avW = el.clientWidth - pad;
      const avH = el.clientHeight - pad;
      const z = Math.min(avW / p.project.width, avH / p.project.height, 1);
      setZoom(z > 0 ? z : 1);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    if (canvasRef.current) ro.observe(canvasRef.current);
    window.addEventListener("resize", recalc);
    return () => { ro.disconnect(); window.removeEventListener("resize", recalc); };
  }, [p.project.width, p.project.height]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.cream, color: COLORS.ink, display: "flex", flexDirection: "column" }}>
      <AppTabs active="edit" />

      {/* ── Top toolbar ── */}
      <header
        className="flex items-center gap-2 px-5 md:px-8 h-14 border-b"
        style={{ background: "#FFFFFF", borderColor: COLORS.line }}
      >
        {/* Project name */}
        <input
          value={p.project.name}
          onChange={(e) => p.updateProjectProps({ name: e.target.value })}
          className="bg-transparent outline-none font-medium"
          style={{ fontSize: 14, color: COLORS.ink, minWidth: 140, maxWidth: 260 }}
          placeholder="Untitled"
        />
        <span style={{ fontSize: 12, color: COLORS.subtle }}>·</span>
        <span style={{ fontSize: 12, color: COLORS.muted, fontVariantNumeric: "tabular-nums" }}>
          {p.project.width} × {p.project.height}
        </span>

        <div className="flex-1" />

        {/* Undo / redo */}
        <button
          onClick={p.undo}
          disabled={!p.canUndo}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Undo (⌘Z)"
        >
          <Undo2 size={15} />
        </button>
        <button
          onClick={p.redo}
          disabled={!p.canRedo}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Redo (⇧⌘Z)"
        >
          <Redo2 size={15} />
        </button>

        <div className="w-px h-6 mx-1" style={{ background: COLORS.line }} />

        <Button variant="ghost" size="sm" onClick={handleSave} disabled={saving} title="Save to Library (⌘S)">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="accent" size="sm" onClick={handleExport} title="Export PNG (⌘E)">
          <Download size={13} /> Export
        </Button>
      </header>

      {/* ── Body: left formats · canvas · right inspector ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Format rail (left) */}
        <aside
          className="hidden md:flex flex-col gap-1 p-4 border-r overflow-y-auto"
          style={{ width: 200, background: "#FFFFFF", borderColor: COLORS.line }}
        >
          <div className="text-[10px] uppercase tracking-[0.18em] mb-3 px-1" style={{ color: COLORS.subtle, fontWeight: 700 }}>
            Format
          </div>
          {FORMATS.map((f) => {
            const on = activeFormat === f.id;
            return (
              <button
                key={f.id}
                onClick={() => applyFormat(f)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition"
                style={{
                  background: on ? COLORS.ink : "transparent",
                  color: on ? "#FFFFFF" : COLORS.ink,
                }}
                onMouseEnter={(e) => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = "rgba(17,17,17,0.04)"; }}
                onMouseLeave={(e) => { if (!on) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span
                  className="shrink-0 rounded"
                  style={{
                    background: on ? "#FFFFFF" : COLORS.warm,
                    width: 20,
                    height: 20 * (f.h / f.w),
                    minHeight: 10,
                    maxHeight: 28,
                  }}
                />
                <span className="flex flex-col min-w-0">
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>{f.label}</span>
                  <span style={{ fontSize: 10.5, opacity: 0.65 }}>{f.hint}</span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* Canvas */}
        <main
          ref={canvasRef}
          className="flex-1 flex items-center justify-center overflow-hidden relative"
          style={{ background: COLORS.cream }}
        >
          <div
            style={{
              width:  p.project.width  * zoom,
              height: p.project.height * zoom,
              boxShadow: "0 24px 60px -20px rgba(17,17,17,0.25), 0 2px 4px rgba(17,17,17,0.06)",
              borderRadius: 10,
              overflow: "hidden",
              background: "#FFFFFF",
              position: "relative",
            }}
          >
            {/* AI Fill mask overlay — paints a binary mask on top of the
             *  Stage. White pixels = inpaint zone, black/transparent = keep.
             *  Sized to the displayed canvas so coordinates map 1:1; Pollo
             *  handles the resize back to the source-image dimensions. */}
            {aiMode === "fill" && (
              <MaskOverlay
                width={p.project.width * zoom}
                height={p.project.height * zoom}
                brushSize={brushSize}
                canvasRef={maskCanvasRef}
              />
            )}
            <Stage
              ref={stageRef}
              width={p.project.width * zoom}
              height={p.project.height * zoom}
              scaleX={zoom}
              scaleY={zoom}
              onMouseDown={(e) => {
                // Click-away deselect: Stage root targeted directly.
                if (e.target === e.target.getStage()) p.setSelectedLayerId(null);
              }}
              style={{ cursor: "default" }}
            >
              <KonvaLayerGroup>
                {/* Canvas background */}
                <Rect x={0} y={0} width={p.project.width} height={p.project.height} fill="#FFFFFF" listening={false} />
                {/* Optional preloaded asset — ternary (not &&) so react-konva
                 *  never sees a `false` child in its Layer tree.
                 *  Aspect-preserving fit (object-fit: cover): scale the image
                 *  to fill the canvas while preserving its native aspect, and
                 *  centre-crop any overflow. Without this the image stretched
                 *  whenever the user picked a different format (e.g. 1:1 →
                 *  16:9 squashed the cake horizontally). */}
                {backgroundImg ? (() => {
                  const cw = p.project.width;
                  const ch = p.project.height;
                  const iw = backgroundImg.width || cw;
                  const ih = backgroundImg.height || ch;
                  const scale = Math.max(cw / iw, ch / ih);
                  const drawW = iw * scale;
                  const drawH = ih * scale;
                  const dx = (cw - drawW) / 2;
                  const dy = (ch - drawH) / 2;
                  return (
                    <KonvaImage
                      image={backgroundImg}
                      x={dx}
                      y={dy}
                      width={drawW}
                      height={drawH}
                      listening={false}
                    />
                  );
                })() : null}

                {/* User layers — insertion order = z-index */}
                {p.project.layers.filter((l) => l.visible).map((layer) => (
                  <LayerNode
                    key={layer.id}
                    layer={layer}
                    onSelect={() => p.setSelectedLayerId(layer.id)}
                    onChange={(next) => p.updateLayer(layer.id, next)}
                    registerNode={(n) => { if (n) nodeRegistry.current.set(layer.id, n); else nodeRegistry.current.delete(layer.id); }}
                  />
                ))}
              </KonvaLayerGroup>
              {/* Transformer lives in its own Layer so the primary Layer's
               *  child list stays stable (no conditional siblings) — avoids
               *  the react-konva #306 seen in production. The Transformer
               *  renders unconditionally and attaches by node reference via
               *  the useEffect above; when nothing is selected it simply
               *  transforms an empty node list and draws nothing. */}
              <KonvaLayerGroup>
                <Transformer
                  ref={transformerRef}
                  rotateEnabled
                  flipEnabled={false}
                  borderStroke={COLORS.coral}
                  borderStrokeWidth={1.5}
                  anchorStroke={COLORS.coral}
                  anchorFill="#FFFFFF"
                  anchorSize={8}
                  anchorCornerRadius={4}
                  boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)}
                />
              </KonvaLayerGroup>
            </Stage>
          </div>
        </main>

        {/* Inspector (right) — context-aware controls for the selected layer.
         *  When AI Fill or Expand is active, this slot swaps to the AI
         *  controls instead so the user has the brush + prompt + apply
         *  flow in the same column as the canvas. */}
        <aside
          className="hidden lg:flex flex-col border-l overflow-y-auto"
          style={{ width: 300, background: "#FFFFFF", borderColor: COLORS.line }}
        >
          {aiMode === "fill" ? (
            <AiFillPanel
              prompt={aiPrompt}
              onPromptChange={setAiPrompt}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              busy={aiBusy}
              onApply={applyAiFill}
              onCancel={() => { setAiMode("off"); setAiPrompt(""); }}
              onClearMask={() => {
                const m = maskCanvasRef.current;
                m?.getContext("2d")?.clearRect(0, 0, m.width, m.height);
              }}
            />
          ) : aiMode === "expand" ? (
            <AiExpandPanel
              extend={expandPct}
              onChange={setExpandPct}
              busy={aiBusy}
              onApply={applyAiExpand}
              onCancel={() => setAiMode("off")}
            />
          ) : (
            <Inspector
              selected={p.selectedLayer}
              onUpdate={(next) => p.selectedLayer && p.updateLayer(p.selectedLayer.id, next)}
              onDelete={() => p.selectedLayer && p.removeLayer(p.selectedLayer.id)}
              vaultColors={vaultColors}
            />
          )}
        </aside>
      </div>

      {/* Layer tools */}
      <footer
        className="flex items-center justify-center gap-2 px-5 py-3 border-t flex-wrap"
        style={{ background: "#FFFFFF", borderColor: COLORS.line }}
      >
        <Button variant="ghost" size="sm" onClick={addText}>
          <TypeIcon size={14} /> Text
        </Button>
        <Button variant="ghost" size="sm" onClick={addLogo}>
          <ImagePlus size={14} /> Logo
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addShape("rect")}>
          <Square size={14} /> Rectangle
        </Button>
        <Button variant="ghost" size="sm" onClick={() => addShape("circle")}>
          <CircleIcon size={14} /> Circle
        </Button>
        <span className="w-px h-5 mx-1" style={{ background: COLORS.line }} />
        <Button
          variant={aiMode === "fill" ? "accent" : "ghost"}
          size="sm"
          onClick={() => setAiMode(aiMode === "fill" ? "off" : "fill")}
          disabled={!backgroundImg}
          title={backgroundImg ? "Paint a zone, describe what should appear" : "Open an image first"}
        >
          <Wand2 size={14} /> AI Fill
        </Button>
        <Button
          variant={aiMode === "expand" ? "accent" : "ghost"}
          size="sm"
          onClick={() => setAiMode(aiMode === "expand" ? "off" : "expand")}
          disabled={!backgroundImg}
          title={backgroundImg ? "Extend the canvas with AI-generated edges" : "Open an image first"}
        >
          <Maximize2 size={14} /> Expand
        </Button>
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   LayerNode — renders ONE Konva primitive for a layer. Returns a
   single element (no fragment, no conditional) so react-konva's
   reconciler sees a stable tree even when selection changes. The
   Transformer is rendered once at the Layer level in the parent.
   ────────────────────────────────────────────────────────────── */
function LayerNode({
  layer, onSelect, onChange, registerNode,
}: {
  layer: UnifiedLayer;
  onSelect: () => void;
  onChange: (next: Partial<UnifiedLayer>) => void;
  registerNode: (n: Konva.Node | null) => void;
}) {
  const nodeRef = useRef<Konva.Node | null>(null);

  // Register the Konva node in the parent's registry so the shared
  // Transformer can attach by id.
  const attachRef = useCallback((n: Konva.Node | null) => {
    nodeRef.current = n;
    registerNode(n);
  }, [registerNode]);

  const commitTransform = () => {
    const node = nodeRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      spatial: {
        ...layer.spatial,
        x: node.x(),
        y: node.y(),
        width: Math.max(10, node.width() * scaleX),
        height: Math.max(10, node.height() * scaleY),
        rotation: node.rotation(),
      },
    } as any);
  };

  const common = {
    x: layer.spatial.x,
    y: layer.spatial.y,
    rotation: layer.spatial.rotation,
    opacity: layer.spatial.opacity,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: commitTransform,
    onTransformEnd: commitTransform,
  };

  if (layer.type === "text") {
    const t = layer as TextLayer;
    return (
      <KonvaText
        {...common}
        ref={attachRef as any}
        text={t.text}
        width={t.spatial.width}
        fontSize={t.fontSize}
        fontFamily={t.fontFamily}
        fontStyle={t.fontStyle}
        fill={t.fill}
        align={t.align}
        lineHeight={t.lineHeight}
        letterSpacing={t.letterSpacing}
      />
    );
  }
  if (layer.type === "shape") {
    const s = layer as ShapeLayer;
    if (s.shape === "circle") {
      return (
        <KonvaCircle
          {...common}
          ref={attachRef as any}
          x={layer.spatial.x + layer.spatial.width / 2}
          y={layer.spatial.y + layer.spatial.height / 2}
          radius={Math.min(layer.spatial.width, layer.spatial.height) / 2}
          fill={s.fill}
          stroke={s.stroke || undefined}
          strokeWidth={s.strokeWidth}
        />
      );
    }
    return (
      <Rect
        {...common}
        ref={attachRef as any}
        width={layer.spatial.width}
        height={layer.spatial.height}
        fill={s.fill}
        cornerRadius={s.cornerRadius}
        stroke={s.stroke || undefined}
        strokeWidth={s.strokeWidth}
      />
    );
  }
  if (layer.type === "logo") {
    return (
      <LogoImageNode
        layer={layer as LogoLayer}
        common={common}
        forwardRef={attachRef}
      />
    );
  }
  // Fallback for unhandled layer types: render nothing rather than undefined.
  return null;
}

/* ──────────────────────────────────────────────────────────────
   LogoImageNode — loads a logo URL into an Image element once,
   then renders it as a Konva Image. Extracted into its own
   component so the load hook stays local and doesn't pollute
   the LayerNode render body.
   ────────────────────────────────────────────────────────────── */
function LogoImageNode({
  layer, common, forwardRef,
}: {
  layer: LogoLayer;
  common: Record<string, any>;
  forwardRef: (r: Konva.Node | null) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!layer.sourceUrl) { setImg(null); return; }
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => setImg(i);
    i.src = layer.sourceUrl;
  }, [layer.sourceUrl]);

  // Before the image resolves (or if sourceUrl is empty), show a
  // dashed placeholder so the layer is still selectable.
  if (!img) {
    return (
      <Rect
        {...common}
        ref={forwardRef as any}
        width={layer.spatial.width}
        height={layer.spatial.height}
        fill="rgba(17,17,17,0.06)"
        stroke="rgba(17,17,17,0.2)"
        strokeWidth={1.5}
        dash={[6, 6]}
        cornerRadius={8}
      />
    );
  }
  return (
    <KonvaImage
      {...common}
      ref={forwardRef as any}
      image={img}
      width={layer.spatial.width}
      height={layer.spatial.height}
    />
  );
}

/* ──────────────────────────────────────────────────────────────
   Inspector — right panel. Switches on the selected layer type:
     · text   → content, font, weight, size, line-height,
                letter-spacing, colour, alignment
     · shape  → fill colour, corner radius, opacity
     · logo   → opacity, rotation
   A shared "Position" block shows X / Y / W / H for every type.
   Vault palette swatches sit above the hex input so one click
   locks the colour into the current selection.
   ────────────────────────────────────────────────────────────── */
function Inspector({
  selected, onUpdate, onDelete, vaultColors,
}: {
  selected: UnifiedLayer | undefined;
  onUpdate: (next: Partial<UnifiedLayer>) => void;
  onDelete: () => void;
  vaultColors: string[];
}) {
  if (!selected) {
    return (
      <div className="p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: COLORS.subtle, fontWeight: 700 }}>
          Inspector
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: COLORS.muted }}>
          Pick a layer on the canvas, or drop a new one with Text, Logo, Rectangle or Circle below.
        </p>
      </div>
    );
  }

  const label =
    selected.type === "text"  ? "Text"
    : selected.type === "logo" ? "Logo"
    : selected.type === "shape" ? (selected as ShapeLayer).shape === "circle" ? "Circle" : "Rectangle"
    : selected.type;

  const swatches = [...new Set([...DEFAULT_SWATCHES, ...vaultColors])].slice(0, 12);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: COLORS.line }}>
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: COLORS.subtle, fontWeight: 700 }}>
            {label}
          </div>
          <div className="text-[13px] truncate max-w-[180px]" style={{ color: COLORS.ink, fontWeight: 600 }}>
            {selected.name}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition"
          title="Delete layer"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Type-specific block */}
      {selected.type === "text"  && <TextControls  layer={selected as TextLayer}  onUpdate={onUpdate} swatches={swatches} />}
      {selected.type === "shape" && <ShapeControls layer={selected as ShapeLayer} onUpdate={onUpdate} swatches={swatches} />}
      {selected.type === "logo"  && <LogoControls  layer={selected as LogoLayer}  onUpdate={onUpdate} />}

      {/* Position + size — common to every layer */}
      <div className="px-5 py-4 border-t" style={{ borderColor: COLORS.line }}>
        <div className="text-[10px] uppercase tracking-[0.14em] mb-3" style={{ color: COLORS.subtle, fontWeight: 700 }}>
          Position
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={Math.round(selected.spatial.x)}       onChange={(v) => onUpdate({ spatial: { ...selected.spatial, x: v } } as any)} />
          <NumberField label="Y" value={Math.round(selected.spatial.y)}       onChange={(v) => onUpdate({ spatial: { ...selected.spatial, y: v } } as any)} />
          <NumberField label="W" value={Math.round(selected.spatial.width)}   onChange={(v) => onUpdate({ spatial: { ...selected.spatial, width:  Math.max(10, v) } } as any)} />
          <NumberField label="H" value={Math.round(selected.spatial.height)}  onChange={(v) => onUpdate({ spatial: { ...selected.spatial, height: Math.max(10, v) } } as any)} />
        </div>
        <div className="mt-3">
          <RangeField label="Opacity" value={Math.round(selected.spatial.opacity * 100)} min={0} max={100}
                      onChange={(v) => onUpdate({ spatial: { ...selected.spatial, opacity: v / 100 } } as any)} />
        </div>
      </div>
    </div>
  );
}

/* ── Text controls ── */
function TextControls({ layer, onUpdate, swatches }: { layer: TextLayer; onUpdate: (n: any) => void; swatches: string[] }) {
  return (
    <div className="px-5 py-4 flex flex-col gap-4 border-b" style={{ borderColor: COLORS.line }}>
      {/* Content */}
      <div>
        <Label>Content</Label>
        <textarea
          value={layer.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          rows={2}
          className="w-full resize-none rounded-lg px-2.5 py-2 text-[13px] outline-none"
          style={{ background: "rgba(17,17,17,0.04)", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
        />
      </div>
      {/* Font family */}
      <div>
        <Label>Font</Label>
        <select
          value={layer.fontFamily}
          onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          className="w-full rounded-lg px-2.5 h-9 text-[13px] outline-none cursor-pointer"
          style={{ background: "rgba(17,17,17,0.04)", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
        >
          {FONTS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
        </select>
      </div>
      {/* Weight + alignment */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Weight</Label>
          <div className="flex gap-1">
            {WEIGHTS.map((w) => (
              <button
                key={w.value}
                onClick={() => onUpdate({ fontStyle: w.value })}
                className="flex-1 h-9 rounded-lg text-[11.5px] transition"
                style={{
                  background: layer.fontStyle === w.value ? COLORS.ink : "rgba(17,17,17,0.04)",
                  color: layer.fontStyle === w.value ? "#FFFFFF" : COLORS.ink,
                  border: `1px solid ${COLORS.line}`,
                  fontWeight: 600,
                }}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Align</Label>
          <div className="flex gap-1">
            {(["left","center","right"] as const).map((a) => (
              <button
                key={a}
                onClick={() => onUpdate({ align: a })}
                className="flex-1 h-9 rounded-lg text-[11.5px] capitalize transition"
                style={{
                  background: layer.align === a ? COLORS.ink : "rgba(17,17,17,0.04)",
                  color: layer.align === a ? "#FFFFFF" : COLORS.ink,
                  border: `1px solid ${COLORS.line}`,
                  fontWeight: 600,
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Size / line-height / letter-spacing */}
      <div className="grid grid-cols-3 gap-2">
        <NumberField label="Size"   value={layer.fontSize}            onChange={(v) => onUpdate({ fontSize: Math.max(8, v) })} />
        <NumberField label="Line"   value={Number(layer.lineHeight.toFixed(2))} step={0.1} onChange={(v) => onUpdate({ lineHeight: v })} />
        <NumberField label="Letter" value={layer.letterSpacing}       onChange={(v) => onUpdate({ letterSpacing: v })} />
      </div>
      {/* Colour */}
      <ColourField label="Colour" value={layer.fill} swatches={swatches} onChange={(v) => onUpdate({ fill: v })} />
    </div>
  );
}

/* ── Shape controls ── */
function ShapeControls({ layer, onUpdate, swatches }: { layer: ShapeLayer; onUpdate: (n: any) => void; swatches: string[] }) {
  return (
    <div className="px-5 py-4 flex flex-col gap-4 border-b" style={{ borderColor: COLORS.line }}>
      <ColourField label="Fill" value={layer.fill} swatches={swatches} onChange={(v) => onUpdate({ fill: v })} />
      {layer.shape !== "circle" && (
        <div>
          <Label>Corner radius</Label>
          <RangeField label="" hideLabel value={layer.cornerRadius} min={0} max={120}
                      onChange={(v) => onUpdate({ cornerRadius: v })} />
        </div>
      )}
    </div>
  );
}

/* ── Logo controls ── */
function LogoControls({ layer, onUpdate }: { layer: LogoLayer; onUpdate: (n: any) => void }) {
  return (
    <div className="px-5 py-4 flex flex-col gap-4 border-b" style={{ borderColor: COLORS.line }}>
      <div>
        <Label>Rotation</Label>
        <RangeField label="" hideLabel value={Math.round(layer.spatial.rotation)} min={-180} max={180}
                    onChange={(v) => onUpdate({ spatial: { ...layer.spatial, rotation: v } } as any)} />
      </div>
    </div>
  );
}

/* ── Reusable fields ── */
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.12em] mb-1.5" style={{ color: COLORS.muted, fontWeight: 600 }}>{children}</div>;
}

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col">
      <Label>{label}</Label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg px-2.5 h-9 text-[13px] outline-none font-mono"
        style={{ background: "rgba(17,17,17,0.04)", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
      />
    </label>
  );
}

function RangeField({ label, hideLabel, value, min, max, onChange }: { label: string; hideLabel?: boolean; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div>
      {!hideLabel && <div className="flex items-center justify-between mb-1"><Label>{label}</Label><span className="text-[11px] font-mono" style={{ color: COLORS.muted }}>{value}</span></div>}
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ accentColor: COLORS.coral, background: "rgba(17,17,17,0.08)" }}
      />
    </div>
  );
}

function ColourField({ label, value, swatches, onChange }: { label: string; value: string; swatches: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>{label}</Label>
        <span className="font-mono text-[11px]" style={{ color: COLORS.muted }}>{value}</span>
      </div>
      <div className="flex items-center flex-wrap gap-1 mb-2">
        {swatches.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            aria-label={`Set color ${c}`}
            className="w-7 h-7 rounded-full transition hover:scale-110"
            style={{
              background: c,
              boxShadow: value.toUpperCase() === c.toUpperCase()
                ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${COLORS.coral}`
                : "inset 0 0 0 1px rgba(17,17,17,0.08)",
            }}
          />
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#RRGGBB"
        className="w-full rounded-lg px-2.5 h-9 text-[12.5px] outline-none font-mono"
        style={{ background: "rgba(17,17,17,0.04)", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
      />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MaskOverlay — HTML5 canvas painted with the user's brush.
   Sits absolutely on top of the Konva Stage; same dimensions so
   pointer coordinates map 1:1 to mask pixels. Strokes are pure
   white at full alpha; the canvas starts transparent so cleared
   regions keep the original photo intact.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function MaskOverlay({
  width, height, brushSize, canvasRef,
}: {
  width: number;
  height: number;
  brushSize: number;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);

  const draw = useCallback((x: number, y: number) => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    if (lastRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastRef.current.x, lastRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    lastRef.current = { x, y };
  }, [brushSize, canvasRef]);

  const toLocal = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(width)}
      height={Math.round(height)}
      onPointerDown={(e) => {
        drawingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const { x, y } = toLocal(e);
        lastRef.current = null;
        draw(x, y);
      }}
      onPointerMove={(e) => {
        if (!drawingRef.current) return;
        const { x, y } = toLocal(e);
        draw(x, y);
      }}
      onPointerUp={(e) => {
        drawingRef.current = false;
        lastRef.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerLeave={() => { drawingRef.current = false; lastRef.current = null; }}
      style={{
        position: "absolute",
        inset: 0,
        cursor: "crosshair",
        opacity: 0.55,
        mixBlendMode: "screen",
        touchAction: "none",
      }}
    />
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AiFillPanel — right rail when AI Fill is active.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function AiFillPanel({
  prompt, onPromptChange, brushSize, onBrushSizeChange, busy, onApply, onCancel, onClearMask,
}: {
  prompt: string;
  onPromptChange: (s: string) => void;
  brushSize: number;
  onBrushSizeChange: (n: number) => void;
  busy: boolean;
  onApply: () => void;
  onCancel: () => void;
  onClearMask: () => void;
}) {
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 size={14} style={{ color: COLORS.coral }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>AI Fill</span>
        </div>
        <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 transition" title="Close">
          <X size={13} />
        </button>
      </div>

      <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>
        Paint the area you want to change, then describe what should appear there.
      </p>

      <div>
        <Label>Prompt</Label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="e.g. blue sky with soft clouds"
          rows={3}
          className="w-full rounded-lg px-2.5 py-2 text-[12.5px] outline-none resize-none"
          style={{ background: "rgba(17,17,17,0.04)", border: `1px solid ${COLORS.line}`, color: COLORS.ink, fontFamily: "inherit" }}
        />
      </div>

      <RangeField label={`Brush · ${brushSize}px`} value={brushSize} min={8} max={120} onChange={onBrushSizeChange} />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClearMask} disabled={busy}>
          <Trash2 size={13} /> Clear mask
        </Button>
      </div>

      <Button variant="accent" size="sm" onClick={onApply} disabled={busy}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
        {busy ? "Generating…" : "Apply"}
      </Button>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AiExpandPanel — right rail when Expand is active. Four sliders
   that map directly to Pollo's `extend` percent payload.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function AiExpandPanel({
  extend, onChange, busy, onApply, onCancel,
}: {
  extend: ExpandPercents;
  onChange: (v: ExpandPercents) => void;
  busy: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const setSide = (k: keyof ExpandPercents) => (v: number) => onChange({ ...extend, [k]: v / 100 });
  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Maximize2 size={14} style={{ color: COLORS.coral }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>Expand canvas</span>
        </div>
        <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 transition" title="Close">
          <X size={13} />
        </button>
      </div>

      <p style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>
        Push out one or more edges. AI fills the new area in the same style as the photo.
      </p>

      <RangeField label={`Top · ${Math.round(extend.top * 100)}%`}    value={Math.round(extend.top * 100)}    min={0} max={50} onChange={setSide("top")} />
      <RangeField label={`Right · ${Math.round(extend.right * 100)}%`} value={Math.round(extend.right * 100)} min={0} max={50} onChange={setSide("right")} />
      <RangeField label={`Bottom · ${Math.round(extend.bottom * 100)}%`} value={Math.round(extend.bottom * 100)} min={0} max={50} onChange={setSide("bottom")} />
      <RangeField label={`Left · ${Math.round(extend.left * 100)}%`}   value={Math.round(extend.left * 100)}   min={0} max={50} onChange={setSide("left")} />

      <Button variant="accent" size="sm" onClick={onApply} disabled={busy}>
        {busy ? <Loader2 size={13} className="animate-spin" /> : <Maximize2 size={13} />}
        {busy ? "Generating…" : "Apply"}
      </Button>
    </div>
  );
}

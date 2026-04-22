/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Ora Editor — agency-grade, single-purpose image composer.
   Targets the pricing promise exactly: add logo, text, overlays.
   No timeline, no video pipeline, no AI retouch. Precision > magic.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router";
import { Stage, Layer as KonvaLayerGroup, Rect, Circle as KonvaCircle, Text as KonvaText, Transformer } from "react-konva";
import Konva from "konva";
import {
  Type as TypeIcon, ImagePlus, Square, Circle as CircleIcon, Download, Save,
  Undo2, Redo2,
} from "lucide-react";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { Button } from "../components/ora/Button";
import { COLORS } from "../components/ora/tokens";
import { useEditorProject } from "../lib/editor/useEditorProject";
import {
  createTextLayer, createLogoLayer, createShapeLayer, createDefaultSpatial,
  type UnifiedLayer, type TextLayer, type LogoLayer, type ShapeLayer,
} from "../lib/editor/types";

/* ──────────────────────────────────────────────────────────────
   Format presets — the platforms Ora ships into. Selecting one
   resizes the canvas to exactly that platform's native spec.
   ────────────────────────────────────────────────────────────── */
const FORMATS = [
  { id: "square",      label: "1:1 Square",   w: 1080, h: 1080, hint: "IG Feed · LinkedIn" },
  { id: "portrait",    label: "4:5 Portrait", w: 1080, h: 1350, hint: "IG Portrait" },
  { id: "story",       label: "9:16 Story",   w: 1080, h: 1920, hint: "IG Story · TikTok · Reels" },
  { id: "wide",        label: "16:9 Wide",    w: 1920, h: 1080, hint: "LinkedIn Cover · YouTube" },
  { id: "landscape",   label: "1.91:1",       w: 1200, h: 628,  hint: "OG card · LinkedIn post" },
] as const;

type FormatId = typeof FORMATS[number]["id"];

/* ──────────────────────────────────────────────────────────────
   Route entry
   ────────────────────────────────────────────────────────────── */
export default function EditorPage() {
  return (
    <RouteGuard requireAuth>
      <EditorAgency />
    </RouteGuard>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main shell — split in 3 zones: top toolbar, format rail,
   canvas, right inspector. No timeline, no video panels, no AI
   prompt bar. Every action is explicit.
   ────────────────────────────────────────────────────────────── */
function EditorAgency() {
  // Route state (preload asset from Library) wires up in the next commit.
  useLocation();

  // Core project state (layers, history, selection) — reuses the shared hook
  const p = useEditorProject("Untitled", 1080, 1080);

  // Visual state specific to this shell
  const [activeFormat, setActiveFormat] = useState<FormatId>("square");
  const [zoom, setZoom] = useState(1);

  const stageRef = useRef<Konva.Stage | null>(null);

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
    // Vault logo pull lands in commit 3. Placeholder shape for now so the
    // button is clickable and the user sees a layer appear.
    const W = p.project.width, H = p.project.height;
    const size = Math.round(W * 0.15);
    const layer = createLogoLayer("", {
      name: "Logo",
      spatial: { ...createDefaultSpatial(), x: W - size - 40, y: H - size - 40, width: size, height: size },
    });
    p.addLayer(layer);
    p.setSelectedLayerId(layer.id);
  }, [p]);

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

        <Button variant="ghost" size="sm">
          <Save size={13} /> Save
        </Button>
        <Button variant="accent" size="sm">
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
          className="flex-1 flex items-center justify-center overflow-hidden"
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
            }}
          >
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

                {/* User layers — rendered in insertion order. z-index by array position. */}
                {p.project.layers.filter((l) => l.visible).map((layer) => (
                  <LayerNode
                    key={layer.id}
                    layer={layer}
                    selected={p.selectedLayerId === layer.id}
                    onSelect={() => p.setSelectedLayerId(layer.id)}
                    onChange={(next) => p.updateLayer(layer.id, next)}
                  />
                ))}
              </KonvaLayerGroup>
            </Stage>
          </div>
        </main>

        {/* Inspector (right) — stays empty in this first pass */}
        <aside
          className="hidden lg:flex flex-col border-l overflow-y-auto"
          style={{ width: 280, background: "#FFFFFF", borderColor: COLORS.line }}
        >
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: COLORS.subtle, fontWeight: 700 }}>
              Inspector
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: COLORS.muted }}>
              Add a text, logo or shape layer to start editing.
            </p>
          </div>
        </aside>
      </div>

      {/* Layer tools */}
      <footer
        className="flex items-center justify-center gap-2 px-5 py-3 border-t"
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
      </footer>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   LayerNode — renders a single layer onto the Konva stage and
   wires up draggable / Transformer. Keeps the Stage render
   block clean; each layer type gets its own minimal mapping.
   ────────────────────────────────────────────────────────────── */
function LayerNode({
  layer, selected, onSelect, onChange,
}: {
  layer: UnifiedLayer;
  selected: boolean;
  onSelect: () => void;
  onChange: (next: Partial<UnifiedLayer>) => void;
}) {
  const nodeRef = useRef<Konva.Node | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);

  // Attach / detach the Transformer when selection flips.
  useEffect(() => {
    const tr = trRef.current;
    const node = nodeRef.current;
    if (!tr) return;
    if (selected && node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    } else {
      tr.nodes([]);
    }
  }, [selected]);

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

  let node: React.ReactNode = null;
  if (layer.type === "text") {
    const t = layer as TextLayer;
    node = (
      <KonvaText
        {...common}
        ref={(r) => { nodeRef.current = r; }}
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
  } else if (layer.type === "shape") {
    const s = layer as ShapeLayer;
    if (s.shape === "circle") {
      node = (
        <KonvaCircle
          {...common}
          ref={(r) => { nodeRef.current = r; }}
          x={layer.spatial.x + layer.spatial.width / 2}
          y={layer.spatial.y + layer.spatial.height / 2}
          radius={Math.min(layer.spatial.width, layer.spatial.height) / 2}
          fill={s.fill}
          stroke={s.stroke || undefined}
          strokeWidth={s.strokeWidth}
        />
      );
    } else {
      node = (
        <Rect
          {...common}
          ref={(r) => { nodeRef.current = r; }}
          width={layer.spatial.width}
          height={layer.spatial.height}
          fill={s.fill}
          cornerRadius={s.cornerRadius}
          stroke={s.stroke || undefined}
          strokeWidth={s.strokeWidth}
        />
      );
    }
  } else if (layer.type === "logo") {
    const l = layer as LogoLayer;
    // Until the Vault logo pull lands (commit 3), render a ghosted
    // placeholder rectangle so the dropped layer is still visible and
    // selectable. Swap for a loaded image once sourceUrl is populated.
    node = (
      <Rect
        {...common}
        ref={(r) => { nodeRef.current = r; }}
        width={layer.spatial.width}
        height={layer.spatial.height}
        fill="rgba(17,17,17,0.06)"
        stroke="rgba(17,17,17,0.2)"
        strokeWidth={1.5}
        dash={[6, 6]}
        cornerRadius={8}
      />
    );
    void l;
  }

  return (
    <>
      {node}
      {selected && (
        <Transformer
          ref={(r) => { trRef.current = r; }}
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
      )}
    </>
  );
}

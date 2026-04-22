/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Context Bar — Top bar (brush/zoom) + Layer properties row
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import type { RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FlipHorizontal2, RotateCcw, Minus, Plus, Maximize,
  ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
  Trash2,
} from "lucide-react";

type EditorTool = "move" | "clean" | "replace" | "background" | "reframe" | "upscale";
type ShapeKind = "rect" | "patch" | "circle" | "star";

interface BaseLayerFields {
  id: string;
  opacity: number;
  visible: boolean;
}
interface EditorTextLayer extends BaseLayerFields {
  type: "text"; x: number; y: number; rotation: number;
  text: string; fontSize: number; fontFamily: string; fontStyle: string; fill: string;
}
interface EditorLogoLayer extends BaseLayerFields {
  type: "logo"; x: number; y: number; width: number; height: number; rotation: number; imageUrl: string;
}
interface EditorShapeLayer extends BaseLayerFields {
  type: "shape"; shape: ShapeKind;
  x: number; y: number; width: number; height: number; rotation: number;
  fillType: "solid" | "gradient"; fill: string;
  gradientStart: string; gradientEnd: string; gradientAngle: number;
  stroke: string; strokeWidth: number; cornerRadius: number;
  numPoints: number; innerRadiusRatio: number;
}
interface EditorSubjectLayer extends BaseLayerFields {
  type: "subject"; imageUrl: string;
}
type EditorLayer = EditorTextLayer | EditorLogoLayer | EditorShapeLayer | EditorSubjectLayer;

const REFRAME_FORMATS = [
  { label: "1:1", value: "1:1" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "4:5", value: "4:5" },
  { label: "3:4", value: "3:4" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface ContextBarProps {
  tool: EditorTool;
  hasImage: boolean;
  isBrushTool: boolean;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  invertMask: boolean;
  onInvertMaskToggle: () => void;
  maskLinesCount: number;
  onClearMask: () => void;
  reframeFormat: string;
  onReframeFormatChange: (format: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  selectedLayer: EditorLayer | null;
  onUpdateLayer: (id: string, updates: Partial<any>) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onDeleteLayer: (id: string) => void;
  textLayerInputRef: RefObject<HTMLInputElement | null>;
  isFr: boolean;
}

/* ── Shared styles ── */
const ctxBtn: React.CSSProperties = {
  padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(17,17,17,0.08)",
  background: "transparent", color: "#666",
  fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
};

const ctxInput: React.CSSProperties = {
  background: "rgba(17,17,17,0.04)", border: "1px solid rgba(17,17,17,0.08)", borderRadius: 6,
  padding: "5px 8px", color: "#111111", fontSize: 12, outline: "none",
};

const zoomBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: "none",
  background: "transparent", color: "#888", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

export function ContextBar({
  tool, hasImage, isBrushTool,
  brushSize, onBrushSizeChange,
  invertMask, onInvertMaskToggle,
  maskLinesCount, onClearMask,
  reframeFormat, onReframeFormatChange,
  zoom, onZoomChange, onFitToScreen,
  selectedLayer, onUpdateLayer, onMoveLayer, onDeleteLayer,
  textLayerInputRef, isFr,
}: ContextBarProps) {
  return (
    <>
      {/* ─── Top bar ─── */}
      <div style={{
        height: 44, background: "#fff", borderBottom: "1px solid rgba(17,17,17,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", flexShrink: 0,
      }}>
        {/* Left controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AnimatePresence>
            {isBrushTool && hasImage && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <span style={{ fontSize: 11, color: "#999" }}>Brush</span>
                <input
                  type="range" min={5} max={150}
                  value={brushSize}
                  onChange={e => onBrushSizeChange(Number(e.target.value))}
                  style={{ width: 100, accentColor: "#FF5C39" }}
                />
                <span style={{ fontSize: 11, color: "#666", width: 28, textAlign: "right" }}>
                  {brushSize}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isBrushTool && hasImage && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={onInvertMaskToggle}
                title="Invert mask"
                style={{
                  ...ctxBtn,
                  background: invertMask ? "#FF5C39" : "transparent",
                  color: invertMask ? "#fff" : "#666",
                  border: invertMask ? "1px solid #FF5C39" : "1px solid rgba(17,17,17,0.08)",
                }}
              >
                <FlipHorizontal2 size={13} />
                Invert
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {isBrushTool && maskLinesCount > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={onClearMask}
                title="Clear mask"
                style={ctxBtn}
              >
                <RotateCcw size={13} />
                Clear
              </motion.button>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {tool === "reframe" && hasImage && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <span style={{ fontSize: 11, color: "#999", marginRight: 4 }}>Format</span>
                {REFRAME_FORMATS.map(fmt => (
                  <button
                    key={fmt.value}
                    onClick={() => onReframeFormatChange(fmt.value)}
                    style={{
                      padding: "3px 8px", borderRadius: 5, border: "1px solid rgba(17,17,17,0.08)",
                      background: reframeFormat === fmt.value ? "#FF5C39" : "transparent",
                      color: reframeFormat === fmt.value ? "#fff" : "#666",
                      fontSize: 11, cursor: "pointer", fontWeight: 500,
                    }}
                  >
                    {fmt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: zoom */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button onClick={() => onZoomChange(clamp(zoom / 1.2, 0.1, 10))} style={zoomBtn} title="Zoom out">
            <Minus size={14} />
          </button>
          <span style={{ fontSize: 11, color: "#666", minWidth: 42, textAlign: "center" }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => onZoomChange(clamp(zoom * 1.2, 0.1, 10))} style={zoomBtn} title="Zoom in">
            <Plus size={14} />
          </button>
          <button onClick={onFitToScreen} style={zoomBtn} title="Fit to screen">
            <Maximize size={14} />
          </button>
        </div>
      </div>

      {/* ─── Layer properties row ─── */}
      <AnimatePresence initial={false}>
        {selectedLayer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 42, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              background: "#fafafa",
              borderBottom: "1px solid rgba(17,17,17,0.08)",
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 16px", overflow: "hidden", flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, marginRight: 4, fontWeight: 600 }}>
              {selectedLayer.type === "text" ? (isFr ? "Texte" : "Text")
                : selectedLayer.type === "logo" ? "Logo"
                : selectedLayer.type === "shape" ? (isFr ? "Forme" : "Shape")
                : (isFr ? "Sujet" : "Subject")}
            </span>

            {selectedLayer.type === "text" ? (
              <TextLayerControls layer={selectedLayer} onUpdate={onUpdateLayer} inputRef={textLayerInputRef} isFr={isFr} />
            ) : selectedLayer.type === "logo" ? (
              <span style={{ fontSize: 11, color: "#999" }}>
                {isFr ? "Glissez pour déplacer · poignées pour redimensionner" : "Drag to move · handles to resize"}
              </span>
            ) : selectedLayer.type === "subject" ? (
              <span style={{ fontSize: 11, color: "#999" }}>
                {isFr ? "Sujet isolé — ordre de plan pour superposer" : "Isolated subject — use z-order to layer"}
              </span>
            ) : (
              <ShapeLayerControls layer={selectedLayer} onUpdate={onUpdateLayer} isFr={isFr} />
            )}

            {/* Opacity */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 10, borderLeft: "1px solid rgba(17,17,17,0.08)" }}>
              <span style={{ fontSize: 10, color: "#999" }}>{isFr ? "Opacité" : "Opacity"}</span>
              <input
                type="range" min={0} max={100}
                value={Math.round(selectedLayer.opacity * 100)}
                onChange={e => onUpdateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
                style={{ width: 80, accentColor: "#FF5C39" }}
              />
              <span style={{ fontSize: 11, color: "#666", width: 30, textAlign: "right" }}>
                {Math.round(selectedLayer.opacity * 100)}%
              </span>
            </div>

            {/* Z-order */}
            <div style={{ display: "flex", gap: 2, marginLeft: 8, paddingLeft: 10, borderLeft: "1px solid rgba(17,17,17,0.08)" }}>
              {([
                { dir: "top" as const, icon: ArrowUpToLine, title: isFr ? "Premier plan" : "To front" },
                { dir: "up" as const, icon: ArrowUp, title: isFr ? "Avancer" : "Forward" },
                { dir: "down" as const, icon: ArrowDown, title: isFr ? "Reculer" : "Backward" },
                { dir: "bottom" as const, icon: ArrowDownToLine, title: isFr ? "Arrière-plan" : "To back" },
              ]).map(({ dir, icon: Icon, title }) => (
                <button
                  key={dir}
                  onClick={() => onMoveLayer(selectedLayer.id, dir)}
                  title={title}
                  style={{ padding: "4px 6px", borderRadius: 5, border: "1px solid rgba(17,17,17,0.08)", background: "#fff", color: "#888", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => onDeleteLayer(selectedLayer.id)}
              title={isFr ? "Supprimer" : "Delete"}
              style={{
                padding: "5px 10px", borderRadius: 6, border: "1px solid #fca5a5",
                background: "#fef2f2", color: "#dc2626",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11,
              }}
            >
              <Trash2 size={13} />
              {isFr ? "Supprimer" : "Delete"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sub-components ──

function TextLayerControls({ layer, onUpdate, inputRef, isFr }: {
  layer: EditorTextLayer;
  onUpdate: (id: string, updates: Partial<any>) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  isFr: boolean;
}) {
  return (
    <>
      <input
        ref={inputRef}
        value={layer.text}
        onChange={e => onUpdate(layer.id, { text: e.target.value })}
        onFocus={e => e.currentTarget.select()}
        onKeyDown={e => e.stopPropagation()}
        placeholder={isFr ? "Votre texte" : "Your text"}
        style={{ ...ctxInput, width: 220 }}
      />
      <input
        type="number"
        value={Math.round(layer.fontSize)}
        onChange={e => { const v = Number(e.target.value); if (v > 0) onUpdate(layer.id, { fontSize: v }); }}
        title={isFr ? "Taille" : "Size"}
        style={{ ...ctxInput, width: 52 }}
      />
      <input
        type="color" value={layer.fill}
        onChange={e => onUpdate(layer.id, { fill: e.target.value })}
        title={isFr ? "Couleur" : "Color"}
        style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(17,17,17,0.08)", background: "#fff", cursor: "pointer", padding: 0 }}
      />
      <button
        onClick={() => {
          const next = layer.fontStyle.includes("bold")
            ? layer.fontStyle.replace("bold", "").trim() || "normal"
            : (layer.fontStyle === "normal" ? "bold" : `bold ${layer.fontStyle}`);
          onUpdate(layer.id, { fontStyle: next });
        }}
        title="Bold"
        style={{
          ...ctxBtn,
          background: layer.fontStyle.includes("bold") ? "#FF5C39" : "#fff",
          color: layer.fontStyle.includes("bold") ? "#fff" : "#666",
          border: layer.fontStyle.includes("bold") ? "1px solid #FF5C39" : "1px solid rgba(17,17,17,0.08)",
          fontWeight: 700, fontSize: 12,
        }}
      >
        B
      </button>
      <button
        onClick={() => {
          const next = layer.fontStyle.includes("italic")
            ? layer.fontStyle.replace("italic", "").trim() || "normal"
            : (layer.fontStyle === "normal" ? "italic" : `${layer.fontStyle} italic`);
          onUpdate(layer.id, { fontStyle: next });
        }}
        title="Italic"
        style={{
          ...ctxBtn,
          background: layer.fontStyle.includes("italic") ? "#FF5C39" : "#fff",
          color: layer.fontStyle.includes("italic") ? "#fff" : "#666",
          border: layer.fontStyle.includes("italic") ? "1px solid #FF5C39" : "1px solid rgba(17,17,17,0.08)",
          fontStyle: "italic", fontSize: 12,
        }}
      >
        I
      </button>
    </>
  );
}

function ShapeLayerControls({ layer, onUpdate, isFr }: {
  layer: EditorShapeLayer;
  onUpdate: (id: string, updates: Partial<any>) => void;
  isFr: boolean;
}) {
  return (
    <>
      <button
        onClick={() => onUpdate(layer.id, { fillType: "solid" })}
        style={{
          ...ctxBtn,
          background: layer.fillType === "solid" ? "#FF5C39" : "#fff",
          color: layer.fillType === "solid" ? "#fff" : "#666",
          border: layer.fillType === "solid" ? "1px solid #FF5C39" : "1px solid rgba(17,17,17,0.08)",
        }}
      >
        {isFr ? "Uni" : "Solid"}
      </button>
      <button
        onClick={() => onUpdate(layer.id, { fillType: "gradient" })}
        style={{
          ...ctxBtn,
          background: layer.fillType === "gradient" ? "#FF5C39" : "#fff",
          color: layer.fillType === "gradient" ? "#fff" : "#666",
          border: layer.fillType === "gradient" ? "1px solid #FF5C39" : "1px solid rgba(17,17,17,0.08)",
        }}
      >
        {isFr ? "Dégradé" : "Gradient"}
      </button>
      {layer.fillType === "solid" ? (
        <input
          type="color" value={layer.fill}
          onChange={e => onUpdate(layer.id, { fill: e.target.value })}
          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(17,17,17,0.08)", background: "#fff", cursor: "pointer", padding: 0 }}
        />
      ) : (
        <>
          <input type="color" value={layer.gradientStart}
            onChange={e => onUpdate(layer.id, { gradientStart: e.target.value })}
            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(17,17,17,0.08)", background: "#fff", cursor: "pointer", padding: 0 }}
          />
          <input type="color" value={layer.gradientEnd}
            onChange={e => onUpdate(layer.id, { gradientEnd: e.target.value })}
            style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(17,17,17,0.08)", background: "#fff", cursor: "pointer", padding: 0 }}
          />
          <input type="range" min={0} max={360}
            value={layer.gradientAngle}
            onChange={e => onUpdate(layer.id, { gradientAngle: Number(e.target.value) })}
            title={`Angle: ${layer.gradientAngle}°`}
            style={{ width: 70, accentColor: "#FF5C39" }}
          />
        </>
      )}
      <input
        type="number" min={0} max={40}
        value={layer.strokeWidth}
        onChange={e => onUpdate(layer.id, { strokeWidth: Math.max(0, Number(e.target.value) || 0) })}
        title={isFr ? "Contour" : "Stroke"}
        style={{ ...ctxInput, width: 48, fontSize: 11 }}
      />
      {layer.strokeWidth > 0 && (
        <input type="color" value={layer.stroke}
          onChange={e => onUpdate(layer.id, { stroke: e.target.value })}
          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(17,17,17,0.08)", background: "#fff", cursor: "pointer", padding: 0 }}
        />
      )}
      {(layer.shape === "rect" || layer.shape === "patch") && (
        <input
          type="range" min={0} max={Math.min(layer.width, layer.height) / 2}
          value={layer.cornerRadius}
          onChange={e => onUpdate(layer.id, { cornerRadius: Number(e.target.value) })}
          title={`${isFr ? "Arrondi" : "Radius"}: ${Math.round(layer.cornerRadius)}`}
          style={{ width: 70, accentColor: "#FF5C39" }}
        />
      )}
    </>
  );
}

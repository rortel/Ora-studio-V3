/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Editor Toolbar — Floating bottom bar (Figma/Canva style)
   Positioned absolute at the bottom of the canvas area
   Dropdowns open upward
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState, useEffect, type RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Eraser, Paintbrush, ImageIcon, Expand, Sparkles,
  MousePointer2, Undo2, Redo2, Type, Image as ImageLucide,
  Shapes, Square as SquareIcon, Circle as CircleIcon, Star as StarIcon,
  Scissors, Film,
  Layers3, Save, Share2, Download,
  ChevronLeft, ChevronDown, Loader2, Check, Clock, Video, Music2, Settings2,
  Plus, Minus, Maximize, FlipHorizontal2, RotateCcw, Trash2,
  ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
} from "lucide-react";

type EditorTool = "move" | "clean" | "replace" | "background" | "reframe" | "upscale";
type ShapeKind = "rect" | "patch" | "circle" | "star";

const TOOLS: { id: EditorTool; label: string; icon: typeof Eraser; shortcut: string }[] = [
  { id: "move", label: "Move", icon: MousePointer2, shortcut: "V" },
  { id: "clean", label: "Clean", icon: Eraser, shortcut: "E" },
  { id: "replace", label: "Replace", icon: Paintbrush, shortcut: "I" },
  { id: "background", label: "Background", icon: ImageIcon, shortcut: "B" },
  { id: "reframe", label: "Reframe", icon: Expand, shortcut: "F" },
  { id: "upscale", label: "Upscale", icon: Sparkles, shortcut: "U" },
];

const REFRAME_FORMATS = [
  { label: "Post", value: "1:1", ratio: "1:1" },
  { label: "Feed", value: "4:5", ratio: "4:5" },
  { label: "Story", value: "9:16", ratio: "9:16" },
  { label: "Cover", value: "16:9", ratio: "16:9" },
  { label: "Photo", value: "3:2", ratio: "3:2" },
];

function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max); }

/* ── Layer types (for context row) ── */
interface BaseLayerFields { id: string; opacity: number; visible: boolean; }
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
interface EditorSubjectLayer extends BaseLayerFields { type: "subject"; imageUrl: string; }
type EditorLayer = EditorTextLayer | EditorLogoLayer | EditorShapeLayer | EditorSubjectLayer;

/* ── Props ── */
export interface EditorToolbarProps {
  /* Tools */
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  hasImage: boolean;
  /* Undo/Redo */
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /* Layer creation */
  onAddText: () => void;
  logoFileInputRef: RefObject<HTMLInputElement | null>;
  onLogoFileChosen: (file: File) => void;
  shapesOpen: boolean;
  onShapesOpenChange: (open: boolean) => void;
  onAddShape: (kind: ShapeKind) => void;
  splitting: boolean;
  onSplitSubject: () => void;
  onOpenAnimate: () => void;
  /* Media */
  videoFileInputRef: RefObject<HTMLInputElement | null>;
  onVideoFileChosen: (file: File) => void;
  audioFileInputRef: RefObject<HTMLInputElement | null>;
  onAudioFileChosen: (file: File) => void;
  /* Panels */
  timelineOpen: boolean;
  onToggleTimeline: () => void;
  layersPanelOpen: boolean;
  onToggleLayersPanel: () => void;
  propertiesOpen: boolean;
  onToggleProperties: () => void;
  /* Actions */
  saving: boolean;
  savedAt: number | null;
  onSave: () => void;
  imageUrl: string | null;
  onPublish: () => void;
  onDownload: () => void;
  /* Library */
  libraryOpen: boolean;
  onOpenLibrary: () => void;
  /* Brush/Mask */
  isBrushTool: boolean;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  invertMask: boolean;
  onInvertMaskToggle: () => void;
  maskLinesCount: number;
  onClearMask: () => void;
  /* Reframe */
  reframeFormat: string;
  onReframeFormatChange: (format: string) => void;
  /* Zoom */
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  /* Layer context row */
  selectedLayer: EditorLayer | null;
  onUpdateLayer: (id: string, updates: Partial<any>) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  onDeleteLayer: (id: string) => void;
  textLayerInputRef: RefObject<HTMLInputElement | null>;
  isFr: boolean;
}

export function EditorToolbar(props: EditorToolbarProps) {
  const {
    tool, onToolChange, hasImage,
    canUndo, canRedo, onUndo, onRedo,
    onAddText, logoFileInputRef, onLogoFileChosen,
    shapesOpen, onShapesOpenChange, onAddShape,
    splitting, onSplitSubject, onOpenAnimate,
    videoFileInputRef, onVideoFileChosen,
    audioFileInputRef, onAudioFileChosen,
    timelineOpen, onToggleTimeline,
    layersPanelOpen, onToggleLayersPanel,
    propertiesOpen, onToggleProperties,
    saving, savedAt, onSave, imageUrl, onPublish, onDownload,
    libraryOpen, onOpenLibrary,
    isBrushTool, brushSize, onBrushSizeChange,
    invertMask, onInvertMaskToggle, maskLinesCount, onClearMask,
    reframeFormat, onReframeFormatChange,
    zoom, onZoomChange, onFitToScreen,
    selectedLayer, onUpdateLayer, onMoveLayer, onDeleteLayer,
    textLayerInputRef, isFr,
  } = props;

  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Close add menu on click outside
  useEffect(() => {
    if (!addMenuOpen) return;
    const handler = () => setAddMenuOpen(false);
    window.addEventListener("click", handler, { once: true, capture: false });
    return () => window.removeEventListener("click", handler);
  }, [addMenuOpen]);

  return (
    <div style={{
      position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
      zIndex: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      pointerEvents: "none",
    }}>

      {/* ═══ LAYER CONTEXT ROW (above main bar, collapsible) ═══ */}
      <AnimatePresence initial={false}>
        {selectedLayer && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              background: "#fff", border: "1px solid #e8e8e8",
              borderRadius: 10, height: 36,
              display: "flex", alignItems: "center", gap: 8,
              padding: "0 12px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              pointerEvents: "auto",
            }}
          >
            <span style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
              {selectedLayer.type === "text" ? (isFr ? "Texte" : "Text")
                : selectedLayer.type === "logo" ? "Logo"
                : selectedLayer.type === "shape" ? (isFr ? "Forme" : "Shape")
                : (isFr ? "Sujet" : "Subject")}
            </span>

            {selectedLayer.type === "text" && (
              <TextControls layer={selectedLayer} onUpdate={onUpdateLayer} inputRef={textLayerInputRef} isFr={isFr} />
            )}
            {selectedLayer.type === "logo" && (
              <span style={{ fontSize: 11, color: "#999" }}>{isFr ? "Glissez pour déplacer" : "Drag to move"}</span>
            )}
            {selectedLayer.type === "subject" && (
              <span style={{ fontSize: 11, color: "#999" }}>{isFr ? "Sujet isolé" : "Isolated subject"}</span>
            )}
            {selectedLayer.type === "shape" && (
              <ShapeControls layer={selectedLayer} onUpdate={onUpdateLayer} isFr={isFr} />
            )}

            {/* Opacity */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", paddingLeft: 8, borderLeft: "1px solid #e8e8e8" }}>
              <span style={{ fontSize: 10, color: "#bbb" }}>Op</span>
              <input type="range" min={0} max={100}
                value={Math.round(selectedLayer.opacity * 100)}
                onChange={e => onUpdateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
                style={{ width: 50, accentColor: "#7C3AED" }}
              />
              <span style={{ fontSize: 10, color: "#888", width: 26 }}>{Math.round(selectedLayer.opacity * 100)}%</span>
            </div>

            {/* Z-order */}
            <div style={{ display: "flex", gap: 1, paddingLeft: 6, borderLeft: "1px solid #e8e8e8" }}>
              {([
                { dir: "top" as const, icon: ArrowUpToLine },
                { dir: "up" as const, icon: ArrowUp },
                { dir: "down" as const, icon: ArrowDown },
                { dir: "bottom" as const, icon: ArrowDownToLine },
              ]).map(({ dir, icon: Icon }) => (
                <button key={dir} onClick={() => onMoveLayer(selectedLayer.id, dir)}
                  style={{ width: 22, height: 22, borderRadius: 4, border: "none", background: "transparent", color: "#bbb", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={11} />
                </button>
              ))}
            </div>

            <button onClick={() => onDeleteLayer(selectedLayer.id)}
              style={{
                padding: "3px 7px", borderRadius: 5, border: "1px solid #fca5a5",
                background: "#fef2f2", color: "#dc2626",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 3, fontSize: 10,
              }}
            >
              <Trash2 size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ MAIN FLOATING TOOLBAR ═══ */}
      <div style={{
        background: "#fff", border: "1px solid #e8e8e8",
        borderRadius: 12, height: 44,
        display: "flex", alignItems: "center", gap: 4,
        padding: "0 8px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        pointerEvents: "auto",
      }}>
        {/* ── Library toggle ── */}
        {!libraryOpen && (
          <ToolbarBtn onClick={onOpenLibrary} title="Library" icon={<ChevronLeft size={14} style={{ transform: "rotate(180deg)" }} />} />
        )}

        {/* ── Tool segmented picker ── */}
        <div style={{
          display: "flex", alignItems: "center",
          background: "#f5f5f7", borderRadius: 8, padding: 2,
        }}>
          {TOOLS.map(({ id, label, icon: Icon, shortcut }) => {
            const active = tool === id;
            return (
              <button
                key={id}
                onClick={() => onToolChange(id)}
                title={`${label} (${shortcut})`}
                style={{
                  height: 28, padding: "0 8px", borderRadius: 6, border: "none",
                  background: active ? "#fff" : "transparent",
                  color: active ? "#7C3AED" : "#888",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.12s",
                }}
              >
                <Icon size={13} />
                <span style={{ display: active ? "inline" : "none" }}>{label}</span>
              </button>
            );
          })}
        </div>

        <Divider />

        {/* ── Undo / Redo ── */}
        <ToolbarBtn onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" icon={<Undo2 size={14} />} />
        <ToolbarBtn onClick={onRedo} disabled={!canRedo} title="Redo" icon={<Redo2 size={14} />} />

        <Divider />

        {/* ── Brush controls (contextual) ── */}
        <AnimatePresence>
          {isBrushTool && hasImage && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}
            >
              <span style={{ fontSize: 10, color: "#999", whiteSpace: "nowrap" }}>Brush</span>
              <input
                type="range" min={5} max={150}
                value={brushSize}
                onChange={e => onBrushSizeChange(Number(e.target.value))}
                style={{ width: 70, accentColor: "#7C3AED" }}
              />
              <span style={{ fontSize: 10, color: "#666", width: 20, textAlign: "right" }}>{brushSize}</span>
              <button
                onClick={onInvertMaskToggle}
                style={{
                  ...pillBtn,
                  background: invertMask ? "#7C3AED" : "transparent",
                  color: invertMask ? "#fff" : "#888",
                  border: invertMask ? "1px solid #7C3AED" : "1px solid #e8e8e8",
                }}
              >
                <FlipHorizontal2 size={11} /> Inv
              </button>
              {maskLinesCount > 0 && (
                <button onClick={onClearMask} style={pillBtn}>
                  <RotateCcw size={11} />
                </button>
              )}
              <Divider />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Reframe format (contextual) ── */}
        <AnimatePresence>
          {tool === "reframe" && hasImage && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 3, overflow: "hidden" }}
            >
              {REFRAME_FORMATS.map(fmt => (
                <button
                  key={fmt.value}
                  onClick={() => onReframeFormatChange(fmt.value)}
                  title={fmt.ratio}
                  style={{
                    padding: "3px 7px", borderRadius: 5, border: "1px solid #e8e8e8",
                    background: reframeFormat === fmt.value ? "#7C3AED" : "transparent",
                    color: reframeFormat === fmt.value ? "#fff" : "#888",
                    fontSize: 10, cursor: "pointer", fontWeight: 500,
                  }}
                >
                  {fmt.label}
                </button>
              ))}
              <Divider />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Add menu (dropdown opens UPWARD) ── */}
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setAddMenuOpen(o => !o); }}
            disabled={!hasImage}
            style={{
              ...pillBtn,
              background: addMenuOpen ? "#f0f0f2" : "transparent",
              color: hasImage ? "#555" : "#ccc",
              fontWeight: 500, gap: 4,
            }}
          >
            <Plus size={13} />
            <span style={{ fontSize: 11 }}>{isFr ? "Ajouter" : "Add"}</span>
            <ChevronDown size={11} style={{ transition: "transform 0.15s", transform: addMenuOpen ? "rotate(180deg)" : "none" }} />
          </button>
          <AnimatePresence>
            {addMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                onClick={e => e.stopPropagation()}
                style={{
                  position: "absolute", bottom: "100%", left: 0, marginBottom: 6,
                  background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10,
                  padding: 4, zIndex: 50,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  minWidth: 170,
                }}
              >
                <DropdownItem icon={<Type size={13} />} label={isFr ? "Texte" : "Text"} onClick={() => { onAddText(); setAddMenuOpen(false); }} />
                <DropdownItem icon={<ImageLucide size={13} />} label="Logo" onClick={() => { logoFileInputRef.current?.click(); setAddMenuOpen(false); }} />

                {/* Shapes submenu */}
                <DropdownItem icon={<Shapes size={13} />} label={isFr ? "Formes" : "Shapes"} hasSubmenu
                  onClick={() => onShapesOpenChange(!shapesOpen)} />
                <AnimatePresence>
                  {shapesOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: "hidden", paddingLeft: 12 }}
                    >
                      {([
                        { kind: "rect" as ShapeKind, icon: SquareIcon, label: "Rectangle" },
                        { kind: "patch" as ShapeKind, icon: SquareIcon, label: "Patch" },
                        { kind: "circle" as ShapeKind, icon: CircleIcon, label: isFr ? "Pastille" : "Circle" },
                        { kind: "star" as ShapeKind, icon: StarIcon, label: isFr ? "Étoile" : "Star" },
                      ]).map(({ kind, icon: Icon, label }) => (
                        <DropdownItem key={kind} icon={<Icon size={12} style={{ color: "#7C3AED" }} />}
                          label={label} onClick={() => { onAddShape(kind); setAddMenuOpen(false); onShapesOpenChange(false); }} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ height: 1, background: "#f0f0f0", margin: "3px 0" }} />

                <DropdownItem
                  icon={splitting ? <Loader2 size={13} className="animate-spin" /> : <Scissors size={13} />}
                  label={isFr ? "Isoler le sujet" : "Split subject"}
                  onClick={() => { onSplitSubject(); setAddMenuOpen(false); }}
                  disabled={splitting}
                />
                <DropdownItem icon={<Film size={13} />} label={isFr ? "Animer" : "Animate"}
                  onClick={() => { onOpenAnimate(); setAddMenuOpen(false); }} />

                <div style={{ height: 1, background: "#f0f0f0", margin: "3px 0" }} />

                <DropdownItem icon={<Video size={13} />} label={isFr ? "Clip vidéo" : "Video clip"}
                  onClick={() => { videoFileInputRef.current?.click(); setAddMenuOpen(false); }} />
                <DropdownItem icon={<Music2 size={13} />} label={isFr ? "Piste audio" : "Audio track"}
                  onClick={() => { audioFileInputRef.current?.click(); setAddMenuOpen(false); }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden file inputs */}
        <input ref={logoFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onLogoFileChosen(f); e.target.value = ""; }} />
        <input ref={videoFileInputRef} type="file" accept="video/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onVideoFileChosen(f); e.target.value = ""; }} />
        <input ref={audioFileInputRef} type="file" accept="audio/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) onAudioFileChosen(f); e.target.value = ""; }} />

        <Divider />

        {/* ── Panel toggles ── */}
        <PanelToggle active={timelineOpen} onClick={onToggleTimeline} icon={<Clock size={14} />} title="Timeline" />
        <PanelToggle active={layersPanelOpen} onClick={onToggleLayersPanel} icon={<Layers3 size={14} />} title={isFr ? "Calques" : "Layers"} />
        <PanelToggle active={propertiesOpen} onClick={onToggleProperties} icon={<Settings2 size={14} />} title={isFr ? "Propriétés" : "Properties"} />

        <Divider />

        {/* ── Zoom ── */}
        <ToolbarBtn onClick={() => onZoomChange(clamp(zoom / 1.2, 0.1, 10))} title="Zoom out" icon={<Minus size={13} />} />
        <span style={{ fontSize: 10, color: "#888", minWidth: 32, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarBtn onClick={() => onZoomChange(clamp(zoom * 1.2, 0.1, 10))} title="Zoom in" icon={<Plus size={13} />} />
        <ToolbarBtn onClick={onFitToScreen} title="Fit" icon={<Maximize size={13} />} />

        <Divider />

        {/* ── Actions ── */}
        <ToolbarBtn
          onClick={onSave} disabled={!imageUrl || saving}
          title={isFr ? "Enregistrer" : "Save"}
          icon={saving ? <Loader2 size={14} className="animate-spin" /> : savedAt ? <Check size={14} style={{ color: "#22c55e" }} /> : <Save size={14} />}
        />
        <button
          onClick={onPublish} disabled={!imageUrl}
          title={isFr ? "Publier" : "Publish"}
          style={{
            width: 30, height: 30, borderRadius: 7, border: "none",
            background: imageUrl ? "#7C3AED" : "#f0f0f2",
            color: imageUrl ? "#fff" : "#ccc",
            cursor: imageUrl ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Share2 size={13} />
        </button>
        <ToolbarBtn onClick={onDownload} disabled={!imageUrl} title="Download" icon={<Download size={14} />} />
      </div>
    </div>
  );
}

/* ━━━━ Sub-components ━━━━ */

function Divider() {
  return <div style={{ width: 1, height: 16, background: "#e8e8e8", flexShrink: 0, margin: "0 1px" }} />;
}

function ToolbarBtn({ onClick, disabled, title, icon }: {
  onClick: () => void; disabled?: boolean; title: string; icon: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{
        width: 30, height: 30, borderRadius: 6, border: "none",
        background: "transparent", color: disabled ? "#ccc" : "#888",
        cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );
}

function PanelToggle({ active, onClick, icon, title }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string;
}) {
  return (
    <button onClick={onClick} title={title}
      style={{
        width: 30, height: 30, borderRadius: 6, border: "none",
        background: active ? "rgba(124,58,237,0.06)" : "transparent",
        color: active ? "#7C3AED" : "#bbb",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {icon}
    </button>
  );
}

function DropdownItem({ icon, label, onClick, disabled, hasSubmenu }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  disabled?: boolean; hasSubmenu?: boolean;
}) {
  return (
    <button onClick={disabled ? undefined : onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "6px 10px", borderRadius: 6, border: "none",
        background: "transparent", color: disabled ? "#ccc" : "#444",
        cursor: disabled ? "default" : "pointer", fontSize: 12, whiteSpace: "nowrap",
        textAlign: "left",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "#f5f5f7"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {hasSubmenu && <ChevronDown size={11} style={{ color: "#bbb" }} />}
    </button>
  );
}

const pillBtn: React.CSSProperties = {
  padding: "3px 7px", borderRadius: 5, border: "1px solid #e8e8e8",
  background: "transparent", color: "#888",
  fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
  whiteSpace: "nowrap",
};

const ctxInput: React.CSSProperties = {
  background: "#f5f5f7", border: "1px solid #e8e8e8", borderRadius: 5,
  padding: "3px 6px", color: "#1a1a1a", fontSize: 11, outline: "none",
};

/* ── Text layer inline controls ── */
function TextControls({ layer, onUpdate, inputRef, isFr }: {
  layer: EditorTextLayer; onUpdate: (id: string, updates: Partial<any>) => void;
  inputRef: RefObject<HTMLInputElement | null>; isFr: boolean;
}) {
  return (
    <>
      <input ref={inputRef} value={layer.text}
        onChange={e => onUpdate(layer.id, { text: e.target.value })}
        onFocus={e => e.currentTarget.select()} onKeyDown={e => e.stopPropagation()}
        placeholder={isFr ? "Texte" : "Text"}
        style={{ ...ctxInput, width: 140 }}
      />
      <input type="number" value={Math.round(layer.fontSize)}
        onChange={e => { const v = Number(e.target.value); if (v > 0) onUpdate(layer.id, { fontSize: v }); }}
        style={{ ...ctxInput, width: 40 }}
      />
      <input type="color" value={layer.fill}
        onChange={e => onUpdate(layer.id, { fill: e.target.value })}
        style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #e8e8e8", background: "#fff", cursor: "pointer", padding: 0 }}
      />
      <button onClick={() => {
        const next = layer.fontStyle.includes("bold")
          ? layer.fontStyle.replace("bold", "").trim() || "normal"
          : (layer.fontStyle === "normal" ? "bold" : `bold ${layer.fontStyle}`);
        onUpdate(layer.id, { fontStyle: next });
      }} style={{
        ...pillBtn, fontWeight: 700, fontSize: 11,
        background: layer.fontStyle.includes("bold") ? "#7C3AED" : "transparent",
        color: layer.fontStyle.includes("bold") ? "#fff" : "#888",
        border: layer.fontStyle.includes("bold") ? "1px solid #7C3AED" : "1px solid #e8e8e8",
      }}>B</button>
      <button onClick={() => {
        const next = layer.fontStyle.includes("italic")
          ? layer.fontStyle.replace("italic", "").trim() || "normal"
          : (layer.fontStyle === "normal" ? "italic" : `${layer.fontStyle} italic`);
        onUpdate(layer.id, { fontStyle: next });
      }} style={{
        ...pillBtn, fontStyle: "italic", fontSize: 11,
        background: layer.fontStyle.includes("italic") ? "#7C3AED" : "transparent",
        color: layer.fontStyle.includes("italic") ? "#fff" : "#888",
        border: layer.fontStyle.includes("italic") ? "1px solid #7C3AED" : "1px solid #e8e8e8",
      }}>I</button>
    </>
  );
}

/* ── Shape layer inline controls ── */
function ShapeControls({ layer, onUpdate, isFr }: {
  layer: EditorShapeLayer; onUpdate: (id: string, updates: Partial<any>) => void; isFr: boolean;
}) {
  return (
    <>
      {(["solid", "gradient"] as const).map(ft => (
        <button key={ft} onClick={() => onUpdate(layer.id, { fillType: ft })}
          style={{
            ...pillBtn,
            background: layer.fillType === ft ? "#7C3AED" : "transparent",
            color: layer.fillType === ft ? "#fff" : "#888",
            border: layer.fillType === ft ? "1px solid #7C3AED" : "1px solid #e8e8e8",
          }}>
          {ft === "solid" ? (isFr ? "Uni" : "Solid") : "Gradient"}
        </button>
      ))}
      {layer.fillType === "solid" ? (
        <input type="color" value={layer.fill}
          onChange={e => onUpdate(layer.id, { fill: e.target.value })}
          style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #e8e8e8", background: "#fff", cursor: "pointer", padding: 0 }}
        />
      ) : (
        <>
          <input type="color" value={layer.gradientStart}
            onChange={e => onUpdate(layer.id, { gradientStart: e.target.value })}
            style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #e8e8e8", background: "#fff", cursor: "pointer", padding: 0 }}
          />
          <input type="color" value={layer.gradientEnd}
            onChange={e => onUpdate(layer.id, { gradientEnd: e.target.value })}
            style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid #e8e8e8", background: "#fff", cursor: "pointer", padding: 0 }}
          />
          <input type="range" min={0} max={360} value={layer.gradientAngle}
            onChange={e => onUpdate(layer.id, { gradientAngle: Number(e.target.value) })}
            style={{ width: 40, accentColor: "#7C3AED" }}
          />
        </>
      )}
      <input type="number" min={0} max={40} value={layer.strokeWidth}
        onChange={e => onUpdate(layer.id, { strokeWidth: Math.max(0, Number(e.target.value) || 0) })}
        style={{ ...ctxInput, width: 36 }}
      />
    </>
  );
}

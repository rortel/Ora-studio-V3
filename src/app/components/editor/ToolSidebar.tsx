/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Tool Sidebar — Vertical icon bar (52px)
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import type { RefObject } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Eraser, Paintbrush, ImageIcon, Expand, Sparkles,
  MousePointer2, Undo2, Redo2, Type, Image as ImageLucide,
  Shapes, Square as SquareIcon, Circle as CircleIcon, Star as StarIcon,
  Scissors, Film, Layers3, Save, Share2, Download,
  ChevronRight, Loader2, Check, Clock, Video, Music2, Settings2,
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

interface ToolSidebarProps {
  tool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  hasImage: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddText: () => void;
  onLogoFileClick: () => void;
  logoFileInputRef: RefObject<HTMLInputElement | null>;
  onLogoFileChosen: (file: File) => void;
  shapesOpen: boolean;
  onShapesOpenChange: (open: boolean) => void;
  onAddShape: (kind: ShapeKind) => void;
  splitting: boolean;
  onSplitSubject: () => void;
  onOpenAnimate: () => void;
  videoFileInputRef: RefObject<HTMLInputElement | null>;
  onVideoFileChosen: (file: File) => void;
  audioFileInputRef: RefObject<HTMLInputElement | null>;
  onAudioFileChosen: (file: File) => void;
  timelineOpen: boolean;
  onToggleTimeline: () => void;
  layersPanelOpen: boolean;
  onToggleLayersPanel: () => void;
  propertiesOpen: boolean;
  onToggleProperties: () => void;
  saving: boolean;
  savedAt: number | null;
  onSave: () => void;
  imageUrl: string | null;
  onPublish: () => void;
  onDownload: () => void;
  libraryOpen: boolean;
  onOpenLibrary: () => void;
  isFr: boolean;
}

/* ── Shared button style ── */
const iconBtn = (active: boolean, enabled: boolean): React.CSSProperties => ({
  width: 36, height: 36, borderRadius: 8, border: "none",
  background: active ? "#7C3AED" : "transparent",
  color: active ? "#fff" : enabled ? "#555" : "#ccc",
  cursor: enabled ? "pointer" : "default",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.12s",
});

export function ToolSidebar({
  tool, onToolChange, hasImage, canUndo, canRedo, onUndo, onRedo,
  onAddText, logoFileInputRef, onLogoFileChosen,
  shapesOpen, onShapesOpenChange, onAddShape,
  splitting, onSplitSubject, onOpenAnimate,
  videoFileInputRef, onVideoFileChosen,
  audioFileInputRef, onAudioFileChosen,
  timelineOpen, onToggleTimeline,
  layersPanelOpen, onToggleLayersPanel,
  propertiesOpen, onToggleProperties,
  saving, savedAt, onSave, imageUrl, onPublish, onDownload,
  libraryOpen, onOpenLibrary, isFr,
}: ToolSidebarProps) {
  return (
    <div style={{
      width: 52, background: "#fff", borderRight: "1px solid #e8e8e8",
      display: "flex", flexDirection: "column", alignItems: "center",
      paddingTop: 8, gap: 1, flexShrink: 0,
    }}>
      {/* Toggle library */}
      {!libraryOpen && (
        <button
          onClick={onOpenLibrary}
          style={{ ...iconBtn(false, true), marginBottom: 4 }}
          title="Open library"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Tool buttons */}
      {TOOLS.map(({ id, label, icon: Icon, shortcut }) => {
        const active = tool === id;
        return (
          <button
            key={id}
            onClick={() => onToolChange(id)}
            title={`${label} (${shortcut})`}
            style={iconBtn(active, true)}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f0f0f2"; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
          >
            <Icon size={16} />
          </button>
        );
      })}

      {/* Divider */}
      <div style={{ width: 24, height: 1, background: "#e8e8e8", margin: "4px 0" }} />

      {/* Undo / Redo */}
      <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" style={iconBtn(false, canUndo)}>
        <Undo2 size={15} />
      </button>
      <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" style={iconBtn(false, canRedo)}>
        <Redo2 size={15} />
      </button>

      <div style={{ width: 24, height: 1, background: "#e8e8e8", margin: "4px 0" }} />

      {/* Add Text */}
      <button
        onClick={onAddText} disabled={!hasImage}
        title={isFr ? "Ajouter un texte" : "Add text layer"}
        style={iconBtn(false, hasImage)}
        onMouseEnter={e => { if (hasImage) e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <Type size={16} />
      </button>

      {/* Add Logo */}
      <button
        onClick={() => logoFileInputRef.current?.click()} disabled={!hasImage}
        title={isFr ? "Ajouter un logo" : "Add logo layer"}
        style={iconBtn(false, hasImage)}
        onMouseEnter={e => { if (hasImage) e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <ImageLucide size={16} />
      </button>
      <input
        ref={logoFileInputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onLogoFileChosen(f); e.target.value = ""; }}
      />

      {/* Shapes */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => { if (hasImage) onShapesOpenChange(!shapesOpen); }}
          disabled={!hasImage}
          title={isFr ? "Ajouter une forme" : "Add shape"}
          style={{ ...iconBtn(false, hasImage), background: shapesOpen ? "#f0f0f2" : "transparent" }}
          onMouseEnter={e => { if (hasImage && !shapesOpen) e.currentTarget.style.background = "#f0f0f2"; }}
          onMouseLeave={e => { if (!shapesOpen) e.currentTarget.style.background = "transparent"; }}
        >
          <Shapes size={16} />
        </button>
        <AnimatePresence>
          {shapesOpen && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              style={{
                position: "absolute", left: 44, top: 0,
                background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10,
                padding: 4, display: "flex", flexDirection: "column", gap: 1,
                zIndex: 40, boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
            >
              {([
                { kind: "rect" as ShapeKind, icon: SquareIcon, label: "Rectangle" },
                { kind: "patch" as ShapeKind, icon: SquareIcon, label: "Patch" },
                { kind: "circle" as ShapeKind, icon: CircleIcon, label: isFr ? "Pastille" : "Circle" },
                { kind: "star" as ShapeKind, icon: StarIcon, label: isFr ? "Étoile" : "Star" },
              ]).map(({ kind, icon: Icon, label }) => (
                <button
                  key={kind}
                  onClick={() => { onAddShape(kind); onShapesOpenChange(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 12px", borderRadius: 6, border: "none",
                    background: "transparent", color: "#444", cursor: "pointer",
                    fontSize: 12, whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f7"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Icon size={13} style={{ color: "#7C3AED" }} />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Split subject */}
      <button
        onClick={onSplitSubject} disabled={!hasImage || splitting}
        title={isFr ? "Isoler le sujet" : "Split subject"}
        style={{ ...iconBtn(false, hasImage && !splitting), background: splitting ? "#f0f0f2" : "transparent" }}
        onMouseEnter={e => { if (hasImage && !splitting) e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { if (!splitting) e.currentTarget.style.background = "transparent"; }}
      >
        {splitting ? <Loader2 size={15} className="animate-spin" /> : <Scissors size={16} />}
      </button>

      {/* Animate */}
      <button
        onClick={onOpenAnimate} disabled={!hasImage}
        title={isFr ? "Animer" : "Animate"}
        style={iconBtn(false, hasImage)}
        onMouseEnter={e => { if (hasImage) e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <Film size={16} />
      </button>

      <div style={{ width: 24, height: 1, background: "#e8e8e8", margin: "4px 0" }} />

      {/* Video clip */}
      <button
        onClick={() => videoFileInputRef.current?.click()}
        title={isFr ? "Ajouter un clip vidéo" : "Add video clip"}
        style={iconBtn(false, true)}
        onMouseEnter={e => { e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <Video size={16} />
      </button>
      <input
        ref={videoFileInputRef} type="file" accept="video/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onVideoFileChosen(f); e.target.value = ""; }}
      />

      {/* Audio track */}
      <button
        onClick={() => audioFileInputRef.current?.click()}
        title={isFr ? "Ajouter une piste audio" : "Add audio track"}
        style={iconBtn(false, true)}
        onMouseEnter={e => { e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
      >
        <Music2 size={16} />
      </button>
      <input
        ref={audioFileInputRef} type="file" accept="audio/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onAudioFileChosen(f); e.target.value = ""; }}
      />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Toggle Timeline */}
      <button
        onClick={onToggleTimeline}
        title={isFr ? "Timeline" : "Toggle timeline"}
        style={{
          ...iconBtn(false, true),
          background: timelineOpen ? "rgba(124,58,237,0.06)" : "transparent",
          color: timelineOpen ? "#7C3AED" : "#999",
        }}
        onMouseEnter={e => { if (!timelineOpen) e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { if (!timelineOpen) e.currentTarget.style.background = timelineOpen ? "rgba(124,58,237,0.06)" : "transparent"; }}
      >
        <Clock size={16} />
      </button>

      {/* Toggle Layers */}
      <button
        onClick={onToggleLayersPanel}
        title={isFr ? "Calques" : "Layers"}
        style={{
          ...iconBtn(false, true),
          background: layersPanelOpen ? "rgba(124,58,237,0.06)" : "transparent",
          color: layersPanelOpen ? "#7C3AED" : "#999",
          marginBottom: 2,
        }}
        onMouseEnter={e => { if (!layersPanelOpen) e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { if (!layersPanelOpen) e.currentTarget.style.background = layersPanelOpen ? "rgba(124,58,237,0.06)" : "transparent"; }}
      >
        <Layers3 size={16} />
      </button>

      {/* Toggle Properties */}
      <button
        onClick={onToggleProperties}
        title={isFr ? "Propriétés" : "Properties"}
        style={{
          ...iconBtn(false, true),
          background: propertiesOpen ? "rgba(124,58,237,0.06)" : "transparent",
          color: propertiesOpen ? "#7C3AED" : "#999",
          marginBottom: 4,
        }}
        onMouseEnter={e => { if (!propertiesOpen) e.currentTarget.style.background = "#f0f0f2"; }}
        onMouseLeave={e => { if (!propertiesOpen) e.currentTarget.style.background = propertiesOpen ? "rgba(124,58,237,0.06)" : "transparent"; }}
      >
        <Settings2 size={16} />
      </button>

      <div style={{ width: 24, height: 1, background: "#e8e8e8", margin: "2px 0" }} />

      {/* Save */}
      <button
        onClick={onSave} disabled={!imageUrl || saving}
        title={isFr ? "Enregistrer" : "Save"}
        style={{
          ...iconBtn(false, !!imageUrl && !saving),
          color: savedAt ? "#22c55e" : (imageUrl ? "#555" : "#ccc"),
          marginBottom: 4,
        }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : savedAt ? <Check size={15} /> : <Save size={15} />}
      </button>

      {/* Publish */}
      <button
        onClick={onPublish} disabled={!imageUrl}
        title={isFr ? "Publier" : "Publish"}
        style={{
          width: 36, height: 36, borderRadius: 8, border: "none",
          background: imageUrl ? "#7C3AED" : "#f0f0f2",
          color: imageUrl ? "#fff" : "#ccc",
          cursor: imageUrl ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 4,
          transition: "transform 0.12s",
        }}
        onMouseEnter={e => { if (imageUrl) e.currentTarget.style.transform = "scale(1.05)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <Share2 size={15} />
      </button>

      {/* Download */}
      <button
        onClick={onDownload} disabled={!imageUrl}
        title="Download"
        style={{ ...iconBtn(false, !!imageUrl), marginBottom: 8 }}
      >
        <Download size={15} />
      </button>
    </div>
  );
}

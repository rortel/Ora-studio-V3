/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Layers Panel — Right-side collapsible panel
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { motion, AnimatePresence } from "motion/react";
import {
  Layers3, Type, Image as ImageLucide, Scissors,
  Square as SquareIcon, Circle as CircleIcon, Star as StarIcon,
  Eye, EyeOff, Trash2, Image as ImageIcon,
  ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine,
} from "lucide-react";

type ShapeKind = "rect" | "patch" | "circle" | "star";

interface BaseLayerFields {
  id: string;
  opacity: number;
  visible: boolean;
}
interface EditorTextLayer extends BaseLayerFields {
  type: "text"; text: string; [k: string]: any;
}
interface EditorLogoLayer extends BaseLayerFields {
  type: "logo"; [k: string]: any;
}
interface EditorShapeLayer extends BaseLayerFields {
  type: "shape"; shape: ShapeKind; [k: string]: any;
}
interface EditorSubjectLayer extends BaseLayerFields {
  type: "subject"; [k: string]: any;
}
type EditorLayer = EditorTextLayer | EditorLogoLayer | EditorShapeLayer | EditorSubjectLayer;

interface LayersPanelProps {
  open: boolean;
  layers: EditorLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<any>) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  hasImage: boolean;
  isFr: boolean;
}

export function LayersPanel({
  open, layers, selectedLayerId, onSelectLayer,
  onUpdateLayer, onDeleteLayer, onMoveLayer,
  hasImage, isFr,
}: LayersPanelProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 240, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            background: "#fff", borderLeft: "1px solid #e8e8e8",
            display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
          }}
        >
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid #e8e8e8",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Layers3 size={14} style={{ color: "#999" }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#999",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {isFr ? "Calques" : "Layers"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#ccc" }}>
              {layers.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 8px" }}>
            {layers.length === 0 && (
              <div style={{ fontSize: 11, color: "#bbb", padding: "12px 4px", lineHeight: 1.5 }}>
                {hasImage
                  ? (isFr ? "Aucun calque. Ajoutez du texte, un logo ou une forme." : "No layers. Add text, logo, or shape.")
                  : (isFr ? "Chargez une image pour commencer." : "Load an image to start.")}
              </div>
            )}

            {[...layers].reverse().map((layer) => {
              const selected = selectedLayerId === layer.id;
              const label =
                layer.type === "text" ? (layer.text || (isFr ? "Texte" : "Text")).slice(0, 20)
                : layer.type === "logo" ? "Logo"
                : layer.type === "subject" ? (isFr ? "Sujet" : "Subject")
                : layer.shape === "rect" ? "Rectangle"
                : layer.shape === "patch" ? "Patch"
                : layer.shape === "circle" ? (isFr ? "Pastille" : "Circle")
                : (isFr ? "Étoile" : "Star");
              const Icon =
                layer.type === "text" ? Type
                : layer.type === "logo" ? ImageLucide
                : layer.type === "subject" ? Scissors
                : layer.shape === "circle" ? CircleIcon
                : layer.shape === "star" ? StarIcon
                : SquareIcon;
              return (
                <div
                  key={layer.id}
                  onClick={() => onSelectLayer(layer.id)}
                  style={{
                    padding: "8px 10px", marginBottom: 2, borderRadius: 8,
                    background: selected ? "rgba(124,58,237,0.05)" : "transparent",
                    border: selected ? "1px solid rgba(124,58,237,0.2)" : "1px solid transparent",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#f8f8f8"; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon size={13} style={{ color: selected ? "#7C3AED" : "#bbb", flexShrink: 0 }} />
                    <div style={{
                      flex: 1, minWidth: 0, fontSize: 12, color: selected ? "#1a1a1a" : "#555",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      fontWeight: selected ? 500 : 400,
                    }}>
                      {label}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onUpdateLayer(layer.id, { visible: !layer.visible }); }}
                      title={layer.visible ? (isFr ? "Masquer" : "Hide") : (isFr ? "Afficher" : "Show")}
                      style={{
                        width: 22, height: 22, border: "none", borderRadius: 4,
                        background: "transparent", color: layer.visible ? "#bbb" : "#ddd",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                      title={isFr ? "Supprimer" : "Delete"}
                      style={{
                        width: 22, height: 22, border: "none", borderRadius: 4,
                        background: "transparent", color: "#ccc", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "#ef4444"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "#ccc"; }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {/* Opacity */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: "#bbb", width: 30 }}>
                      {Math.round(layer.opacity * 100)}%
                    </span>
                    <input
                      type="range" min={0} max={100}
                      value={Math.round(layer.opacity * 100)}
                      onClick={e => e.stopPropagation()}
                      onChange={e => onUpdateLayer(layer.id, { opacity: Number(e.target.value) / 100 })}
                      style={{ flex: 1, accentColor: "#7C3AED" }}
                    />
                  </div>
                  {/* Z-order */}
                  <div style={{ display: "flex", gap: 2, marginTop: 6, justifyContent: "flex-end" }}>
                    {([
                      { dir: "top" as const, icon: ArrowUpToLine, title: isFr ? "Devant" : "Front" },
                      { dir: "up" as const, icon: ArrowUp, title: isFr ? "Avancer" : "Forward" },
                      { dir: "down" as const, icon: ArrowDown, title: isFr ? "Reculer" : "Backward" },
                      { dir: "bottom" as const, icon: ArrowDownToLine, title: isFr ? "Derrière" : "Back" },
                    ]).map(({ dir, icon: ZIcon, title }) => (
                      <button
                        key={dir}
                        onClick={e => { e.stopPropagation(); onMoveLayer(layer.id, dir); }}
                        title={title}
                        style={{
                          width: 20, height: 20, border: "none", borderRadius: 4,
                          background: "#f5f5f7", color: "#bbb", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <ZIcon size={10} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {hasImage && (
              <div style={{
                marginTop: 6, padding: "8px 10px", borderRadius: 8,
                background: "#f8f8f8", fontSize: 11, color: "#bbb",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <ImageIcon size={12} />
                <span>{isFr ? "Arrière-plan (photo)" : "Background (photo)"}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Properties Sidebar — Right-side detailed layer properties
   Clean white expert UI
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings2, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Eye, EyeOff, Lock, Unlock,
  ChevronDown, ChevronRight,
} from "lucide-react";
import type { UnifiedLayer, TextLayer, ShapeLayer, LogoLayer, SpatialProps, AnimationPreset } from "../../lib/editor/types";
import { ANIMATION_PRESET_OPTIONS } from "../../lib/editor/presets";

const FONT_OPTIONS = [
  "Inter, sans-serif",
  "Roboto, sans-serif",
  "Open Sans, sans-serif",
  "Montserrat, sans-serif",
  "Poppins, sans-serif",
  "Lato, sans-serif",
  "Oswald, sans-serif",
  "Playfair Display, serif",
  "Merriweather, serif",
  "Lora, serif",
  "PT Serif, serif",
  "Raleway, sans-serif",
  "Nunito, sans-serif",
  "Bebas Neue, sans-serif",
  "DM Sans, sans-serif",
  "Space Grotesk, sans-serif",
  "JetBrains Mono, monospace",
  "Fira Code, monospace",
];

interface PropertiesSidebarProps {
  open: boolean;
  layer: UnifiedLayer | undefined;
  onUpdateLayer: (id: string, updates: Partial<UnifiedLayer>) => void;
  onUpdateSpatial: (id: string, updates: Partial<SpatialProps>) => void;
  onSetAnimation: (id: string, preset: AnimationPreset) => void;
  isFr: boolean;
}

export function PropertiesSidebar({
  open, layer, onUpdateLayer, onUpdateSpatial, onSetAnimation, isFr,
}: PropertiesSidebarProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            background: "#fff", borderLeft: "1px solid rgba(17,17,17,0.08)",
            display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden",
          }}
        >
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid rgba(17,17,17,0.08)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Settings2 size={14} style={{ color: "#999" }} />
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#999",
              textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              {isFr ? "Propriétés" : "Properties"}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "6px 12px" }}>
            {!layer && (
              <div style={{ fontSize: 11, color: "#bbb", padding: "16px 4px", lineHeight: 1.5 }}>
                {isFr
                  ? "Sélectionnez un calque pour afficher ses propriétés."
                  : "Select a layer to view its properties."}
              </div>
            )}

            {layer && (
              <>
                <Section title={isFr ? "Général" : "General"}>
                  <Row label={isFr ? "Nom" : "Name"}>
                    <input value={layer.name} onChange={e => onUpdateLayer(layer.id, { name: e.target.value })} style={inputStyle} />
                  </Row>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <MiniToggle
                      active={layer.visible}
                      onClick={() => onUpdateLayer(layer.id, { visible: !layer.visible })}
                      iconOn={<Eye size={12} />} iconOff={<EyeOff size={12} />}
                      title={layer.visible ? "Hide" : "Show"}
                    />
                    <MiniToggle
                      active={!layer.locked}
                      onClick={() => onUpdateLayer(layer.id, { locked: !layer.locked })}
                      iconOn={<Unlock size={12} />} iconOff={<Lock size={12} />}
                      title={layer.locked ? "Unlock" : "Lock"}
                    />
                  </div>
                </Section>

                <Section title="Transform">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <NumInput label="X" value={layer.spatial.x} onChange={v => onUpdateSpatial(layer.id, { x: v })} />
                    <NumInput label="Y" value={layer.spatial.y} onChange={v => onUpdateSpatial(layer.id, { y: v })} />
                    <NumInput label="W" value={layer.spatial.width} onChange={v => onUpdateSpatial(layer.id, { width: v })} min={1} />
                    <NumInput label="H" value={layer.spatial.height} onChange={v => onUpdateSpatial(layer.id, { height: v })} min={1} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                    <NumInput label="Rot" value={layer.spatial.rotation} onChange={v => onUpdateSpatial(layer.id, { rotation: v })} suffix="°" />
                    <NumInput label="Op" value={Math.round(layer.spatial.opacity * 100)} onChange={v => onUpdateSpatial(layer.id, { opacity: v / 100 })} min={0} max={100} suffix="%" />
                  </div>
                </Section>

                <Section title="Animation">
                  <select
                    value={layer.animationPreset}
                    onChange={e => onSetAnimation(layer.id, e.target.value as AnimationPreset)}
                    style={selectStyle}
                  >
                    {ANIMATION_PRESET_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </Section>

                {layer.type === "text" && <TextProperties layer={layer} onUpdate={onUpdateLayer} isFr={isFr} />}
                {layer.type === "shape" && <ShapeProperties layer={layer} onUpdate={onUpdateLayer} isFr={isFr} />}
                {layer.type === "logo" && <LogoProperties isFr={isFr} />}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Text Properties ──

function TextProperties({ layer, onUpdate, isFr }: {
  layer: TextLayer;
  onUpdate: (id: string, updates: Partial<UnifiedLayer>) => void;
  isFr: boolean;
}) {
  const upd = (patch: Partial<TextLayer>) => onUpdate(layer.id, patch as Partial<UnifiedLayer>);

  return (
    <>
      <Section title={isFr ? "Texte" : "Text"}>
        <textarea
          value={layer.text}
          onChange={e => upd({ text: e.target.value })}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </Section>

      <Section title={isFr ? "Police" : "Font"}>
        <select value={layer.fontFamily} onChange={e => upd({ fontFamily: e.target.value })} style={selectStyle}>
          {FONT_OPTIONS.map(f => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f.split(",")[0]}</option>
          ))}
        </select>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 6, marginTop: 6 }}>
          <NumInput label={isFr ? "Taille" : "Size"} value={layer.fontSize} onChange={v => upd({ fontSize: Math.max(8, v) })} min={8} suffix="px" />
          <MiniToggle
            active={layer.fontStyle.includes("bold")}
            onClick={() => {
              const has = layer.fontStyle.includes("bold");
              const base = layer.fontStyle.replace("bold", "").trim() || "normal";
              upd({ fontStyle: has ? base : `bold ${base === "normal" ? "" : base}`.trim() });
            }}
            iconOn={<Bold size={12} />} iconOff={<Bold size={12} />} title="Bold"
          />
          <MiniToggle
            active={layer.fontStyle.includes("italic")}
            onClick={() => {
              const has = layer.fontStyle.includes("italic");
              const base = layer.fontStyle.replace("italic", "").trim() || "normal";
              upd({ fontStyle: has ? base : `${base === "normal" ? "" : base} italic`.trim() });
            }}
            iconOn={<Italic size={12} />} iconOff={<Italic size={12} />} title="Italic"
          />
        </div>
      </Section>

      <Section title="Style">
        <Row label={isFr ? "Couleur" : "Color"}>
          <input type="color" value={layer.fill} onChange={e => upd({ fill: e.target.value })}
            style={{ width: 28, height: 22, border: "1px solid rgba(17,17,17,0.08)", borderRadius: 4, cursor: "pointer", background: "#fff" }}
          />
        </Row>
        <Row label={isFr ? "Alignement" : "Align"}>
          <div style={{ display: "flex", gap: 2 }}>
            {(["left", "center", "right"] as const).map(a => (
              <button
                key={a} onClick={() => upd({ align: a })}
                style={{
                  ...miniBtn,
                  background: layer.align === a ? "rgba(255,92,57,0.08)" : "rgba(17,17,17,0.04)",
                  color: layer.align === a ? "#FF5C39" : "#999",
                }}
              >
                {a === "left" ? <AlignLeft size={12} /> : a === "center" ? <AlignCenter size={12} /> : <AlignRight size={12} />}
              </button>
            ))}
          </div>
        </Row>
        <NumInput label={isFr ? "Interligne" : "Line H"} value={Math.round(layer.lineHeight * 100)} onChange={v => upd({ lineHeight: v / 100 })} min={50} max={300} suffix="%" />
        <NumInput label={isFr ? "Espacement" : "Spacing"} value={layer.letterSpacing} onChange={v => upd({ letterSpacing: v })} min={-10} max={50} suffix="px" />
      </Section>

      <Section title={isFr ? "Ombre" : "Shadow"}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <MiniToggle
            active={layer.shadow.enabled}
            onClick={() => upd({ shadow: { ...layer.shadow, enabled: !layer.shadow.enabled } })}
            iconOn={<Eye size={12} />} iconOff={<EyeOff size={12} />}
            title={layer.shadow.enabled ? "Disable" : "Enable"}
          />
          <span style={{ fontSize: 11, color: "#999" }}>{layer.shadow.enabled ? "On" : "Off"}</span>
        </div>
        {layer.shadow.enabled && (
          <>
            <Row label={isFr ? "Couleur" : "Color"}>
              <input type="color"
                value={layer.shadow.color.startsWith("rgba") ? "#000000" : layer.shadow.color}
                onChange={e => upd({ shadow: { ...layer.shadow, color: e.target.value } })}
                style={{ width: 28, height: 22, border: "1px solid rgba(17,17,17,0.08)", borderRadius: 4, cursor: "pointer", background: "#fff" }}
              />
            </Row>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <NumInput label="Blur" value={layer.shadow.blur} onChange={v => upd({ shadow: { ...layer.shadow, blur: v } })} min={0} max={50} />
              <NumInput label="X" value={layer.shadow.offsetX} onChange={v => upd({ shadow: { ...layer.shadow, offsetX: v } })} />
              <NumInput label="Y" value={layer.shadow.offsetY} onChange={v => upd({ shadow: { ...layer.shadow, offsetY: v } })} />
            </div>
          </>
        )}
      </Section>
    </>
  );
}

// ── Shape Properties ──

function ShapeProperties({ layer, onUpdate, isFr }: {
  layer: ShapeLayer;
  onUpdate: (id: string, updates: Partial<UnifiedLayer>) => void;
  isFr: boolean;
}) {
  const upd = (patch: Partial<ShapeLayer>) => onUpdate(layer.id, patch as Partial<UnifiedLayer>);

  return (
    <>
      <Section title={isFr ? "Forme" : "Shape"}>
        <select value={layer.shape} onChange={e => upd({ shape: e.target.value as ShapeLayer["shape"] })} style={selectStyle}>
          <option value="rect">Rectangle</option>
          <option value="patch">Badge / Patch</option>
          <option value="circle">{isFr ? "Pastille" : "Circle"}</option>
          <option value="star">{isFr ? "Étoile" : "Star"}</option>
          <option value="triangle">Triangle</option>
          <option value="pill">Pill</option>
        </select>
        {(layer.shape === "rect" || layer.shape === "patch" || layer.shape === "pill") && (
          <NumInput label={isFr ? "Arrondi" : "Radius"} value={layer.cornerRadius} onChange={v => upd({ cornerRadius: v })} min={0} max={200} suffix="px" />
        )}
        {layer.shape === "star" && (
          <>
            <NumInput label={isFr ? "Pointes" : "Points"} value={layer.numPoints} onChange={v => upd({ numPoints: Math.max(3, v) })} min={3} max={20} />
            <NumInput label={isFr ? "Ratio int." : "Inner %"} value={Math.round(layer.innerRadiusRatio * 100)} onChange={v => upd({ innerRadiusRatio: v / 100 })} min={10} max={90} suffix="%" />
          </>
        )}
      </Section>

      <Section title={isFr ? "Remplissage" : "Fill"}>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {(["solid", "gradient"] as const).map(ft => (
            <button
              key={ft} onClick={() => upd({ fillType: ft })}
              style={{
                ...miniBtn, flex: 1, fontSize: 11, padding: "4px 8px",
                background: layer.fillType === ft ? "rgba(255,92,57,0.08)" : "rgba(17,17,17,0.04)",
                color: layer.fillType === ft ? "#FF5C39" : "#999",
              }}
            >
              {ft === "solid" ? (isFr ? "Uni" : "Solid") : "Gradient"}
            </button>
          ))}
        </div>
        {layer.fillType === "solid" ? (
          <Row label={isFr ? "Couleur" : "Color"}>
            <input type="color"
              value={layer.fill.startsWith("rgba") ? "#FF5C39" : layer.fill}
              onChange={e => upd({ fill: e.target.value })}
              style={{ width: 28, height: 22, border: "1px solid rgba(17,17,17,0.08)", borderRadius: 4, cursor: "pointer", background: "#fff" }}
            />
          </Row>
        ) : (
          <>
            <Row label={isFr ? "Début" : "Start"}>
              <input type="color" value={layer.gradientStart} onChange={e => upd({ gradientStart: e.target.value })}
                style={{ width: 28, height: 22, border: "1px solid rgba(17,17,17,0.08)", borderRadius: 4, cursor: "pointer", background: "#fff" }}
              />
            </Row>
            <Row label={isFr ? "Fin" : "End"}>
              <input type="color" value={layer.gradientEnd} onChange={e => upd({ gradientEnd: e.target.value })}
                style={{ width: 28, height: 22, border: "1px solid rgba(17,17,17,0.08)", borderRadius: 4, cursor: "pointer", background: "#fff" }}
              />
            </Row>
            <NumInput label="Angle" value={layer.gradientAngle} onChange={v => upd({ gradientAngle: v })} min={0} max={360} suffix="°" />
          </>
        )}
      </Section>

      <Section title={isFr ? "Contour" : "Stroke"}>
        <Row label={isFr ? "Couleur" : "Color"}>
          <input type="color" value={layer.stroke || "#ffffff"} onChange={e => upd({ stroke: e.target.value })}
            style={{ width: 28, height: 22, border: "1px solid rgba(17,17,17,0.08)", borderRadius: 4, cursor: "pointer", background: "#fff" }}
          />
        </Row>
        <NumInput label={isFr ? "Épaisseur" : "Width"} value={layer.strokeWidth} onChange={v => upd({ strokeWidth: v })} min={0} max={20} suffix="px" />
      </Section>
    </>
  );
}

// ── Logo Properties ──

function LogoProperties({ isFr }: { isFr: boolean }) {
  return (
    <Section title="Logo">
      <div style={{ fontSize: 11, color: "#999", lineHeight: 1.5 }}>
        {isFr
          ? "Utilisez le panneau Transform pour positionner et redimensionner."
          : "Use the Transform panel to position and resize."}
      </div>
    </Section>
  );
}

// ── Reusable sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 6 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          width: "100%", padding: "6px 0", border: "none",
          background: "none", color: "#999", cursor: "pointer",
          fontSize: 10, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {title}
      </button>
      {open && <div style={{ paddingLeft: 2 }}>{children}</div>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: "#999" }}>{label}</span>
      {children}
    </div>
  );
}

function NumInput({ label, value, onChange, min, max, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 10, color: "#bbb", width: 28, flexShrink: 0 }}>{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={e => {
          let v = Number(e.target.value);
          if (min !== undefined) v = Math.max(min, v);
          if (max !== undefined) v = Math.min(max, v);
          onChange(v);
        }}
        style={{ ...inputStyle, width: "100%", textAlign: "right", fontSize: 11, padding: "3px 6px", MozAppearance: "textfield" }}
      />
      {suffix && <span style={{ fontSize: 10, color: "#bbb" }}>{suffix}</span>}
    </div>
  );
}

function MiniToggle({ active, onClick, iconOn, iconOff, title }: {
  active: boolean; onClick: () => void;
  iconOn: React.ReactNode; iconOff: React.ReactNode; title: string;
}) {
  return (
    <button onClick={onClick} title={title}
      style={{
        ...miniBtn,
        background: active ? "rgba(255,92,57,0.08)" : "rgba(17,17,17,0.04)",
        color: active ? "#FF5C39" : "#bbb",
      }}
    >
      {active ? iconOn : iconOff}
    </button>
  );
}

// ── Shared styles ──

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(17,17,17,0.04)",
  border: "1px solid rgba(17,17,17,0.08)",
  borderRadius: 6,
  padding: "5px 8px",
  color: "#111111",
  fontSize: 12,
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const miniBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 6, border: "none",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer",
};

/**
 * SlideTextOverlay — V3 multi-block draggable text editor for pack slides.
 *
 * Where V2 (SlideOverlay) rendered a single LLM headline anchored to one of
 * three flex positions (top/center/bottom), V3 lets the user:
 *   • drop multiple text blocks per slide (headline + price + CTA badge…)
 *   • drag each block anywhere with center / edge snap guides
 *   • style each block independently (size, color from Vault palette,
 *     align, bold, transform) via a floating toolbar on selection
 *   • flatten the result into a PNG at download time so what you see in
 *     the preview is exactly what ends up in the user's file
 *
 * Coordinates are expressed as percentages of the container (0..1) so they
 * scale identically across the small grid preview, the lightbox, and the
 * full-resolution flatten — no absolute pixels stored.
 *
 * Font size uses `cqh` (container query height) so a single number scales
 * with the container without needing JS measurement.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, Bold, Plus, Trash2, Type } from "lucide-react";
import { toPng } from "html-to-image";

export type OverlayBlock = {
  id: string;
  text: string;
  // Anchor in % of container (0..1). Block is centered on this point so
  // align-changes don't shift the apparent position.
  x: number;
  y: number;
  // Max width as % of container — drives wrapping.
  width: number;
  // Font size in cqh units (container query height %) — 5 means 5% of
  // container height. Scales free across preview sizes.
  fontSize: number;
  fontFamily: "display" | "sans";
  fontWeight: 400 | 600 | 700 | 800;
  color: string;
  align: "left" | "center" | "right";
  textTransform: "none" | "uppercase";
  letterSpacing: number;
  lineHeight: number;
  textShadow: boolean;
};

const DISPLAY_FONT = `"Bagel Fat One", "Inter", sans-serif`;
const SANS_FONT = `"Inter", sans-serif`;

function uid() { return Math.random().toString(36).slice(2, 10); }

/**
 * Build the initial block array from the LLM's single-overlay output. Lets
 * the user start from Ora's headline and edit/extend rather than facing a
 * blank slide.
 */
export function seedBlocksFromLLM(opts: {
  text: string | undefined;
  position: "top" | "center" | "bottom" | undefined;
  style: "headline" | "value-prop" | "cta" | "caption" | undefined;
}): OverlayBlock[] {
  const { text, position = "bottom", style = "value-prop" } = opts;
  if (!text) return [];
  const y = position === "top" ? 0.12 : position === "center" ? 0.5 : 0.88;
  const styleProps: Pick<OverlayBlock, "fontSize" | "fontFamily" | "fontWeight" | "textTransform" | "letterSpacing" | "lineHeight"> =
    style === "headline" ? { fontSize: 8.5, fontFamily: "display", fontWeight: 800, textTransform: "none", letterSpacing: -0.005, lineHeight: 1.05 }
  : style === "cta"      ? { fontSize: 5.0, fontFamily: "sans",    fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.04, lineHeight: 1.2 }
  : style === "caption"  ? { fontSize: 3.0, fontFamily: "sans",    fontWeight: 500, textTransform: "none", letterSpacing: 0, lineHeight: 1.3 }
  /* value-prop */       : { fontSize: 5.2, fontFamily: "sans",    fontWeight: 700, textTransform: "none", letterSpacing: -0.003, lineHeight: 1.2 };
  return [{
    id: uid(),
    text,
    x: 0.5, y,
    width: 0.86,
    color: "#FFFFFF",
    align: "center",
    textShadow: true,
    ...styleProps,
  }];
}

export function newBlock(palette?: string[]): OverlayBlock {
  return {
    id: uid(),
    text: "Tap to edit",
    x: 0.5, y: 0.5,
    width: 0.7,
    fontSize: 6,
    fontFamily: "sans",
    fontWeight: 800,
    color: palette?.[0] || "#FFFFFF",
    align: "center",
    textTransform: "none",
    letterSpacing: -0.003,
    lineHeight: 1.15,
    textShadow: true,
  };
}

/**
 * Render the slide-area child container + the editor overlay. Designed to
 * wrap the <img> so the overlay's coordinate system always matches the
 * rendered image bounds exactly (including aspect-ratio letterboxing).
 */
export function SlideTextOverlay({
  blocks, onBlocksChange, palette, fonts, editable = true, snapEnabled = true, slideAreaRef,
}: {
  blocks: OverlayBlock[];
  onBlocksChange: (next: OverlayBlock[]) => void;
  palette?: string[];
  fonts?: { display?: string; sans?: string };
  editable?: boolean;
  snapEnabled?: boolean;
  // The slide image wrapper element — must have position:relative and
  // match the displayed image bounds (1:1). Used for pointer coords.
  slideAreaRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<null | { id: string; pointerId: number; offsetX: number; offsetY: number; w: number; h: number }>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const liveBlocksRef = useRef(blocks);
  liveBlocksRef.current = blocks;

  // Clear selection when clicking outside the slide area.
  useEffect(() => {
    if (!editable) return;
    const onDoc = (e: MouseEvent) => {
      const el = slideAreaRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setSelectedId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [editable, slideAreaRef]);

  const update = useCallback((id: string, patch: Partial<OverlayBlock>) => {
    onBlocksChange(liveBlocksRef.current.map(b => b.id === id ? { ...b, ...patch } : b));
  }, [onBlocksChange]);

  const remove = useCallback((id: string) => {
    onBlocksChange(liveBlocksRef.current.filter(b => b.id !== id));
    setSelectedId(null);
  }, [onBlocksChange]);

  const onPointerDownBlock = (e: React.PointerEvent, block: OverlayBlock) => {
    if (!editable) return;
    // Don't start drag if user clicked on the contentEditable text node
    // and is in edit mode for that block.
    if ((e.target as HTMLElement).closest("[data-overlay-text]") && selectedId === block.id) {
      // Already selected → let the user enter text editing instead of drag.
      return;
    }
    e.stopPropagation();
    setSelectedId(block.id);
    const area = slideAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    setDrag({
      id: block.id,
      pointerId: e.pointerId,
      offsetX: e.clientX - (rect.left + block.x * rect.width),
      offsetY: e.clientY - (rect.top + block.y * rect.height),
      w: rect.width,
      h: rect.height,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const area = slideAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    let nx = (e.clientX - rect.left - drag.offsetX) / rect.width;
    let ny = (e.clientY - rect.top - drag.offsetY) / rect.height;
    // Clamp to slide area + small breathing room
    nx = Math.max(0.02, Math.min(0.98, nx));
    ny = Math.max(0.03, Math.min(0.97, ny));
    // Snap to center / thirds
    let snapV = false, snapH = false;
    if (snapEnabled) {
      const SNAP = 0.018;
      if (Math.abs(nx - 0.5) < SNAP) { nx = 0.5; snapV = true; }
      if (Math.abs(ny - 0.5) < SNAP) { ny = 0.5; snapH = true; }
      // Snap to "rule of thirds" bottom band — common for hero CTA placement
      if (Math.abs(ny - 0.88) < SNAP) { ny = 0.88; snapH = true; }
      if (Math.abs(ny - 0.12) < SNAP) { ny = 0.12; snapH = true; }
    }
    setGuides({ v: snapV, h: snapH });
    update(drag.id, { x: nx, y: ny });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(drag.pointerId); } catch {}
    setDrag(null);
    setGuides({ v: false, h: false });
  };

  const resolveFont = (kind: "display" | "sans") => {
    if (kind === "display") return fonts?.display || DISPLAY_FONT;
    return fonts?.sans || SANS_FONT;
  };

  const selected = blocks.find(b => b.id === selectedId) || null;

  return (
    <div
      className="absolute inset-0"
      style={{ containerType: "size", pointerEvents: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Snap guides (only visible during a snapping drag) */}
      {guides.v && (
        <div className="absolute pointer-events-none" style={{ top: 0, bottom: 0, left: "50%", width: 1, background: "rgba(255,92,57,0.85)", boxShadow: "0 0 6px rgba(255,92,57,0.6)" }} />
      )}
      {guides.h && drag && (
        <div className="absolute pointer-events-none" style={{ left: 0, right: 0, top: `${(blocks.find(b => b.id === drag.id)?.y ?? 0.5) * 100}%`, height: 1, background: "rgba(255,92,57,0.85)", boxShadow: "0 0 6px rgba(255,92,57,0.6)" }} />
      )}

      {blocks.map((b) => {
        const isSelected = selectedId === b.id;
        const isEditingText = isSelected;
        return (
          <div
            key={b.id}
            onPointerDown={(e) => onPointerDownBlock(e, b)}
            className="absolute"
            style={{
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              transform: "translate(-50%, -50%)",
              width: `${b.width * 100}%`,
              maxWidth: `${b.width * 100}%`,
              pointerEvents: editable ? "auto" : "none",
              cursor: drag?.id === b.id ? "grabbing" : (editable ? "grab" : "default"),
              outline: isSelected ? "1.5px dashed rgba(255,92,57,0.85)" : "none",
              outlineOffset: 4,
              borderRadius: 4,
              touchAction: "none",
            }}
          >
            <div
              data-overlay-text
              contentEditable={editable && isEditingText}
              suppressContentEditableWarning
              onPointerDown={(e) => {
                // If already selected, allow text editing — block stops bubbling so drag doesn't start.
                if (isSelected) e.stopPropagation();
              }}
              onBlur={(e) => update(b.id, { text: e.currentTarget.textContent || "" })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
                if (e.key === "Escape") { (e.currentTarget as HTMLElement).blur(); setSelectedId(null); }
                if (e.key === "Delete" || e.key === "Backspace") {
                  if ((e.currentTarget.textContent || "").length === 0) { e.preventDefault(); remove(b.id); }
                }
              }}
              className="outline-none select-text"
              style={{
                color: b.color,
                fontFamily: resolveFont(b.fontFamily),
                fontWeight: b.fontWeight,
                fontSize: `${b.fontSize}cqh`,
                lineHeight: b.lineHeight,
                letterSpacing: `${b.letterSpacing}em`,
                textTransform: b.textTransform,
                textAlign: b.align,
                textShadow: b.textShadow ? "0 2px 12px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.45)" : "none",
                wordBreak: "break-word",
                cursor: isSelected ? "text" : "inherit",
                userSelect: isSelected ? "text" : "none",
              }}
            >
              {b.text || "Tap to edit"}
            </div>
          </div>
        );
      })}

      {/* Floating toolbar — pinned bottom-center of the slide when a block is selected */}
      {editable && selected && (
        <FloatingToolbar
          block={selected}
          palette={palette}
          onChange={(patch) => update(selected.id, patch)}
          onDelete={() => remove(selected.id)}
        />
      )}
    </div>
  );
}

function FloatingToolbar({
  block, palette, onChange, onDelete,
}: {
  block: OverlayBlock;
  palette?: string[];
  onChange: (patch: Partial<OverlayBlock>) => void;
  onDelete: () => void;
}) {
  // Vault palette + safe defaults so users always have a black/white option.
  const swatches = Array.from(new Set([...(palette || []), "#FFFFFF", "#111111", "#FF5C39"])).slice(0, 8);
  const stop = (e: React.PointerEvent) => { e.stopPropagation(); };
  return (
    <div
      onPointerDown={stop}
      className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-xl"
      style={{
        bottom: "calc(100% + 8px)",
        background: "rgba(20,20,20,0.92)",
        backdropFilter: "blur(8px)",
        boxShadow: "0 10px 28px -8px rgba(0,0,0,0.45)",
        pointerEvents: "auto",
        whiteSpace: "nowrap",
        zIndex: 30,
      }}
    >
      {/* Font family */}
      <button
        onClick={() => onChange({ fontFamily: block.fontFamily === "display" ? "sans" : "display" })}
        className="w-7 h-7 rounded-md flex items-center justify-center text-white hover:bg-white/10 transition"
        title={block.fontFamily === "display" ? "Switch to body font" : "Switch to display font"}
      >
        <Type size={13} style={{ fontWeight: block.fontFamily === "display" ? 900 : 400 }} />
      </button>
      {/* Size slider */}
      <div className="flex items-center gap-1 px-1.5">
        <input
          type="range" min={2.5} max={14} step={0.25}
          value={block.fontSize}
          onChange={(e) => onChange({ fontSize: parseFloat(e.target.value) })}
          className="w-20 accent-white"
          aria-label="Font size"
        />
      </div>
      {/* Bold toggle */}
      <button
        onClick={() => onChange({ fontWeight: block.fontWeight >= 700 ? 400 : 800 })}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition ${block.fontWeight >= 700 ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
        title="Bold"
      >
        <Bold size={12} />
      </button>
      {/* Align */}
      <div className="flex">
        {(["left", "center", "right"] as const).map((al) => {
          const Icon = al === "left" ? AlignLeft : al === "center" ? AlignCenter : AlignRight;
          const on = block.align === al;
          return (
            <button
              key={al}
              onClick={() => onChange({ align: al })}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition ${on ? "bg-white text-black" : "text-white hover:bg-white/10"}`}
              title={`Align ${al}`}
            >
              <Icon size={12} />
            </button>
          );
        })}
      </div>
      {/* Color swatches */}
      <div className="flex items-center gap-1 pl-1.5 ml-0.5" style={{ borderLeft: "1px solid rgba(255,255,255,0.15)" }}>
        {swatches.map((hex) => {
          const active = block.color.toUpperCase() === hex.toUpperCase();
          return (
            <button
              key={hex}
              onClick={() => onChange({ color: hex })}
              className="w-5 h-5 rounded-full transition"
              style={{
                background: hex,
                border: active ? "2px solid #FFFFFF" : "1px solid rgba(255,255,255,0.4)",
                boxShadow: active ? "0 0 0 1.5px rgba(255,92,57,0.9)" : "none",
              }}
              title={hex}
              aria-label={`Color ${hex}`}
            />
          );
        })}
      </div>
      {/* Shadow toggle */}
      <button
        onClick={() => onChange({ textShadow: !block.textShadow })}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition ${block.textShadow ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10"}`}
        title="Toggle drop shadow"
        style={{ fontSize: 11, fontWeight: 700 }}
      >
        Sh
      </button>
      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-7 h-7 rounded-md flex items-center justify-center text-white/80 hover:bg-red-500 hover:text-white transition"
        title="Delete block"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

/**
 * Compact "Add text" button — drop it next to the slide so the user has an
 * obvious way to add a 2nd / 3rd block. Calls back with a fresh block built
 * from the palette's primary color.
 */
export function AddTextButton({
  onAdd, palette,
}: {
  onAdd: (block: OverlayBlock) => void;
  palette?: string[];
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(newBlock(palette))}
      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-medium transition hover:bg-black/5"
      style={{ color: "#111", border: "1px solid rgba(17,17,17,0.12)", background: "#FFFFFF" }}
      title="Add a text block"
    >
      <Plus size={11} /> Add text
    </button>
  );
}

/**
 * Flatten a slide DOM node (image + overlay) to a PNG blob. Pixel ratio is
 * chosen so the export matches the slide's intended publish resolution
 * (default 1080 on the long edge). Returns null on CORS / canvas failure
 * so the caller can fall back to the raw image URL.
 */
export async function flattenSlideToBlob(node: HTMLElement, opts?: { targetLongEdge?: number }): Promise<Blob | null> {
  try {
    const target = opts?.targetLongEdge ?? 1080;
    const rect = node.getBoundingClientRect();
    const longEdge = Math.max(rect.width, rect.height);
    const pixelRatio = Math.max(1, Math.min(4, target / Math.max(1, longEdge)));
    const dataUrl = await toPng(node, {
      pixelRatio,
      cacheBust: true,
      // Skip the regenerate-pack overlay buttons / toolbars during flatten.
      filter: (n) => {
        if (!(n instanceof HTMLElement)) return true;
        return n.dataset.flattenExclude !== "true";
      },
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch (err) {
    console.warn("[flattenSlideToBlob] failed, falling back to raw image", err);
    return null;
  }
}

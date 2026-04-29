/**
 * StylePicker — Ideogram-style masonry gallery on Surprise Me.
 *
 * Why this component exists:
 *   The original Surprise Me had zero creative control — drop a photo,
 *   the planner generates 6 random shots in mixed styles. Users with a
 *   clear aesthetic in mind (editorial, minimal, bold magazine, raw UGC)
 *   couldn't steer the output without typing a brief.
 *
 *   The picker solves that without breaking the "stop prompting" promise:
 *   the user clicks ONE tile in a mixed-format gallery, and the chosen
 *   style propagates as a hard directive into the planner so all 6 shots
 *   share the same vibe.
 *
 * Visual design (per founder direction):
 *   Masonry layout like Ideogram's Explore — mixed aspect ratios, mixed
 *   formats per style (a packshot next to a typo card next to a portrait
 *   next to a lifestyle scene). The mix communicates the style's range:
 *   "pick THIS vibe and you'll get a pack with that vibe across formats".
 *
 *   Tiles are grouped by style but shuffled visually, with hover state
 *   revealing the style name + tagline + checkmark on the picked one.
 *
 * Image source:
 *   The 24 reference images are seeded one-time by an admin via
 *   /admin/style-catalog/seed (see server/index.tsx STYLE_CATALOG).
 *   When the catalog hasn't been seeded yet, we render styled fallback
 *   tiles (gradient + style name) so the picker is still functional —
 *   the real images replace them once the admin clicks Seed.
 */

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { API_BASE } from "../lib/supabase";

const COLORS = {
  ink: "#0A0A0A",
  cream: "#F4EFE6",
  coral: "#FF6B47",
  pink: "#FF6B47",
  border: "rgba(10,10,10,0.10)",
  muted: "rgba(10,10,10,0.55)",
};

type Kind = "packshot" | "typo" | "portrait" | "lifestyle";
type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9" | "3:4";

interface StyleExample {
  kind: Kind;
  aspectRatio: AspectRatio;
  imageUrl: string | null;
}

export interface StyleEntry {
  id: string;
  name: string;
  tagline: string;
  examples: StyleExample[];
}

interface StylePickerProps {
  selectedStyleId: string | null;
  onPick: (styleId: string | null) => void;
}

// Fallback gradient backgrounds per style — used when the admin hasn't
// seeded real images yet. Each one paints a recognisable hint of the
// style without pretending to be a photo.
const STYLE_FALLBACK_GRADIENT: Record<string, string> = {
  editorial: "linear-gradient(135deg, #1a1a2e 0%, #2d1b3d 60%, #4a2c4a 100%)",
  studio:    "linear-gradient(135deg, #f5f5f0 0%, #e8e4d8 100%)",
  lifestyle: "linear-gradient(135deg, #f4d9b3 0%, #d8a878 100%)",
  magazine:  "linear-gradient(135deg, #e63946 0%, #f4a261 60%, #2a9d8f 100%)",
  ugc:       "linear-gradient(135deg, #f8e8d8 0%, #c8b594 100%)",
  minimal:   "linear-gradient(135deg, #ffffff 0%, #e8e8e8 100%)",
};

const STYLE_FALLBACK_INK: Record<string, string> = {
  editorial: "#FFFFFF",
  studio:    "#0A0A0A",
  lifestyle: "#0A0A0A",
  magazine:  "#FFFFFF",
  ugc:       "#0A0A0A",
  minimal:   "#0A0A0A",
};

// Map our aspectRatio to a CSS aspect-ratio value
const ARROW: Record<AspectRatio, string> = {
  "1:1": "1 / 1",
  "4:5": "4 / 5",
  "9:16": "9 / 16",
  "16:9": "16 / 9",
  "3:4": "3 / 4",
};

export function StylePicker({ selectedStyleId, onPick }: StylePickerProps) {
  const [styles, setStyles] = useState<StyleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/style-catalog/get`);
        const d = await r.json();
        if (cancelled) return;
        if (d?.success && Array.isArray(d.styles)) setStyles(d.styles);
      } catch { /* picker still works with fallback tiles */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Flatten all style examples into one big list for the masonry, then
  // interleave by style so the gallery doesn't show 4 editorial tiles
  // back-to-back. The shuffle is deterministic (no Math.random) so the
  // tile order is stable across re-renders — important for the visual
  // identity of the picker.
  const tiles = useMemo(() => {
    if (styles.length === 0) return [] as Array<{ style: StyleEntry; example: StyleExample; idx: number }>;
    const cols: Array<Array<{ style: StyleEntry; example: StyleExample; idx: number }>> = styles.map(
      (s) => s.examples.map((e, i) => ({ style: s, example: e, idx: i })),
    );
    const out: Array<{ style: StyleEntry; example: StyleExample; idx: number }> = [];
    let added = true;
    let row = 0;
    while (added) {
      added = false;
      for (let i = 0; i < cols.length; i++) {
        const col = cols[(i + row) % cols.length];
        if (col.length > 0) {
          out.push(col.shift()!);
          added = true;
        }
      }
      row++;
    }
    return out;
  }, [styles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Sparkles size={20} className="animate-pulse" style={{ color: COLORS.coral }} />
      </div>
    );
  }

  if (styles.length === 0) {
    return (
      <div className="text-center py-12 text-[13px]" style={{ color: COLORS.muted }}>
        Style gallery temporarily unavailable. You can still generate without picking a style.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-1" style={{ color: COLORS.coral }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: COLORS.coral }} />
            Pick a vibe
          </div>
          <div className="text-[20px] md:text-[24px] leading-tight font-semibold" style={{ color: COLORS.ink }}>
            Tap any image — your pack will respect that style.
          </div>
        </div>
        {selectedStyleId && (
          <button
            onClick={() => onPick(null)}
            className="text-[12px] font-medium hover:underline"
            style={{ color: COLORS.muted }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Masonry — uses CSS columns, the cleanest cross-browser path
          without a JS layout library. break-inside-avoid keeps each
          tile whole. */}
      <div
        className="gap-3"
        style={{
          columnCount: 3,
          columnGap: "12px",
        }}
      >
        {tiles.map(({ style, example, idx }, i) => {
          const isSelected = selectedStyleId === style.id;
          const isAnotherStyleSelected = selectedStyleId && !isSelected;
          const aspect = ARROW[example.aspectRatio] || "1 / 1";
          return (
            <motion.button
              key={`${style.id}-${idx}-${i}`}
              onClick={() => onPick(style.id)}
              type="button"
              className="block w-full mb-3 break-inside-avoid relative group rounded-2xl overflow-hidden text-left"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: isAnotherStyleSelected ? 0.45 : 1,
                y: 0,
                scale: isSelected ? 1.0 : 1.0,
              }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
              style={{
                aspectRatio: aspect,
                background: example.imageUrl ? "#000" : STYLE_FALLBACK_GRADIENT[style.id] || "#EEE",
                border: `2px solid ${isSelected ? COLORS.coral : "transparent"}`,
                boxShadow: isSelected ? `0 0 0 4px ${COLORS.coral}33` : "none",
                cursor: "pointer",
              }}
            >
              {example.imageUrl ? (
                <img
                  src={example.imageUrl}
                  alt={`${style.name} — ${example.kind}`}
                  loading="lazy"
                  className="w-full h-full object-cover block"
                />
              ) : (
                /* Fallback tile: shows the style name in style-ink colour
                   over a stylised gradient. This is what the user sees
                   before the admin runs /admin/style-catalog/seed. */
                <div className="w-full h-full flex items-center justify-center px-3 text-center">
                  <div>
                    <div
                      className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2 opacity-70"
                      style={{ color: STYLE_FALLBACK_INK[style.id] || "#0A0A0A" }}
                    >
                      {example.kind}
                    </div>
                    <div
                      className="text-[18px] md:text-[22px] font-semibold leading-tight"
                      style={{ color: STYLE_FALLBACK_INK[style.id] || "#0A0A0A" }}
                    >
                      {style.name}
                    </div>
                    <div
                      className="text-[11px] mt-2 opacity-70"
                      style={{ color: STYLE_FALLBACK_INK[style.id] || "#0A0A0A" }}
                    >
                      {style.tagline}
                    </div>
                  </div>
                </div>
              )}

              {/* Hover overlay — surfaces the style name on every tile */}
              <div
                className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0) 60%)",
                }}
              >
                <div>
                  <div className="text-[11px] font-semibold text-white">{style.name}</div>
                  <div className="text-[10px] text-white/80">{style.tagline}</div>
                </div>
              </div>

              {/* Selected check badge */}
              {isSelected && (
                <div
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-md"
                  style={{ background: COLORS.coral }}
                >
                  <Check size={14} strokeWidth={3} className="text-white" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Tablet/mobile fallback: single column on narrow screens */}
      <style>{`
        @media (max-width: 768px) {
          .gap-3[style*="column-count"] { column-count: 2 !important; }
        }
        @media (max-width: 520px) {
          .gap-3[style*="column-count"] { column-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}

import { type ReactNode } from "react";
import { COLORS } from "./tokens";

type BadgeTone = "default" | "ink" | "coral" | "butter" | "cream" | "warm";

const recipes: Record<BadgeTone, { bg: string; fg: string; border?: string }> = {
  default: { bg: "rgba(17,17,17,0.06)", fg: COLORS.ink,    border: "1px solid rgba(17,17,17,0.1)" },
  ink:     { bg: COLORS.ink,            fg: "#FFFFFF" },
  coral:   { bg: COLORS.coral,          fg: "#FFFFFF" },
  butter:  { bg: COLORS.butter,         fg: COLORS.ink },
  cream:   { bg: COLORS.cream,          fg: COLORS.ink,    border: "1px solid rgba(17,17,17,0.1)" },
  warm:    { bg: COLORS.warm,           fg: COLORS.ink },
};

export function Badge({ tone = "default", children }: { tone?: BadgeTone; children: ReactNode }) {
  // Defensive lookup: an unknown tone string used to crash the entire
  // page (`Cannot read properties of undefined (reading 'bg')`) and
  // wipe out routes mid-render. Fall back to default so a bad tone
  // shows as a plain neutral badge instead of taking the route down.
  const r = recipes[tone] ?? recipes.default;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-medium"
      style={{ background: r.bg, color: r.fg, border: r.border }}
    >
      {children}
    </span>
  );
}

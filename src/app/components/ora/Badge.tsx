import { type ReactNode } from "react";
import { COLORS } from "./tokens";

type BadgeTone = "default" | "ink" | "coral" | "butter" | "cream";

const recipes: Record<BadgeTone, { bg: string; fg: string; border?: string }> = {
  default: { bg: "rgba(17,17,17,0.06)", fg: COLORS.ink,    border: "1px solid rgba(17,17,17,0.1)" },
  ink:     { bg: COLORS.ink,            fg: "#FFFFFF" },
  coral:   { bg: COLORS.coral,          fg: "#FFFFFF" },
  butter:  { bg: COLORS.butter,         fg: COLORS.ink },
  cream:   { bg: COLORS.cream,          fg: COLORS.ink,    border: "1px solid rgba(17,17,17,0.1)" },
};

export function Badge({ tone = "default", children }: { tone?: BadgeTone; children: ReactNode }) {
  const r = recipes[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-medium"
      style={{ background: r.bg, color: r.fg, border: r.border }}
    >
      {children}
    </span>
  );
}

/* Ora design tokens — shared palette + display font style. Import from
 * anywhere with `import { bagel, tones } from "../components/ora/tokens"`. */

export const DISPLAY = `"Bagel Fat One", "Inter", system-ui, sans-serif`;

/** Inline style helper for headlines: wraps font-family + letter-spacing. */
export const bagel: React.CSSProperties = {
  fontFamily: DISPLAY,
  letterSpacing: "-0.01em",
};

/** Brand colour tokens. Stick to these six across the app. */
export const COLORS = {
  cream:   "#F4EFE6",
  ink:     "#111111",
  text:    "#111111",
  muted:   "#6C6C6C",
  subtle:  "#9A9A9A",
  line:    "rgba(17,17,17,0.08)",
  coral:   "#FF5C39",
  butter:  "#F4C542",
  violet:  "#7C5CE0",
  warm:    "#EADFD0",
};

/** Surface tone recipes — background + foreground + optional meta */
export type Tone = "default" | "warm" | "butter" | "violet" | "coral" | "ink";

export const TONES: Record<Tone, { bg: string; fg: string; soft: string }> = {
  default: { bg: "#FFFFFF",       fg: COLORS.text,  soft: COLORS.muted },
  warm:    { bg: COLORS.warm,     fg: COLORS.ink,   soft: "rgba(17,17,17,0.6)" },
  butter:  { bg: COLORS.butter,   fg: COLORS.ink,   soft: "rgba(17,17,17,0.7)" },
  violet:  { bg: COLORS.violet,   fg: "#FFFFFF",    soft: "rgba(255,255,255,0.8)" },
  coral:   { bg: COLORS.coral,    fg: "#FFFFFF",    soft: "rgba(255,255,255,0.85)" },
  ink:     { bg: COLORS.ink,      fg: "#FFFFFF",    soft: "rgba(255,255,255,0.6)" },
};

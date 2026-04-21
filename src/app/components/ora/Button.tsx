import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { COLORS, DISPLAY } from "./tokens";

type Variant = "ghost" | "accent" | "ink" | "cream";
type Size    = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const sizes: Record<Size, { h: number; px: number; fs: number }> = {
  sm: { h: 32, px: 14, fs: 13 },
  md: { h: 40, px: 18, fs: 14 },
  lg: { h: 56, px: 26, fs: 16 },
};

const palette: Record<Variant, { bg: string; fg: string; border?: string; hover?: string; font?: string }> = {
  accent: { bg: COLORS.coral, fg: "#FFFFFF",    font: DISPLAY, hover: "#F85025" },
  ink:    { bg: COLORS.ink,   fg: COLORS.butter, font: DISPLAY },
  cream:  { bg: COLORS.cream, fg: COLORS.ink,   font: DISPLAY },
  ghost:  { bg: "transparent", fg: COLORS.ink,  border: "transparent" },
};

/** Pill-shaped button. Four variants (ghost / accent / ink / cream), three
 *  sizes. Display variants use Bagel Fat One for their label. */
export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "accent", size = "md", children, className, style, ...rest },
  ref,
) {
  const s = sizes[size];
  const c = palette[variant];
  return (
    <button
      ref={ref}
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-full transition active:translate-y-px disabled:opacity-40 ${className || ""}`}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        fontSize: s.fs,
        background: c.bg,
        color: c.fg,
        fontFamily: c.font || "inherit",
        fontWeight: c.font ? 400 : 600,
        letterSpacing: c.font ? "-0.01em" : undefined,
        border: c.border || "1px solid transparent",
        ...style,
      }}
    >
      {children}
    </button>
  );
});

import { type ReactNode, type HTMLAttributes } from "react";
import { TONES, type Tone } from "./tokens";

type Pad    = "sm" | "md" | "lg";
type Radius = "md" | "lg" | "xl" | "2xl";

interface Props extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  pad?: Pad;
  radius?: Radius;
  children?: ReactNode;
}

const padding: Record<Pad, string> = {
  sm: "1rem",
  md: "1.5rem",
  lg: "2rem",
};
const radii: Record<Radius, string> = {
  md:   "14px",
  lg:   "20px",
  xl:   "28px",
  "2xl":"36px",
};

/** A tinted content block. Used as the section/block primitive across the
 *  landing and the app — replaces boring white cards with intentional
 *  colour-blocked surfaces. */
export function Surface({
  tone = "default",
  pad = "md",
  radius = "xl",
  className,
  style,
  children,
  ...rest
}: Props) {
  const t = TONES[tone];
  return (
    <div
      {...rest}
      className={`relative overflow-hidden ${className || ""}`}
      style={{
        background: t.bg,
        color: t.fg,
        padding: padding[pad],
        borderRadius: radii[radius],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

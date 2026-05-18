import { Sparkles } from "lucide-react";

/**
 * EU AI Act art. 50 transparency label. Every asset surfaced or
 * downloaded from ORA Studio must carry this badge so users — and any
 * downstream recipient of the file — can identify the content as
 * AI-generated. Pixel-level watermarking and C2PA metadata bake-in
 * are tracked in AUDIT_FOLLOWUP.md for the next pass; this is the UI
 * affordance that goes live today.
 *
 * Designed to be small, low-contrast and unintrusive — it sits on top
 * of generated media without competing with the artwork.
 */
type Size = "xs" | "sm" | "md";

const SIZE: Record<Size, { padding: string; fontSize: number; iconSize: number }> = {
  xs: { padding: "2px 6px", fontSize: 9, iconSize: 9 },
  sm: { padding: "4px 8px", fontSize: 10, iconSize: 11 },
  md: { padding: "6px 10px", fontSize: 11, iconSize: 12 },
};

export function AIGeneratedBadge({ size = "sm", variant = "overlay" }: { size?: Size; variant?: "overlay" | "inline" }) {
  const s = SIZE[size];
  const overlay = variant === "overlay";
  return (
    <span
      role="note"
      aria-label="AI-generated content"
      title="AI-generated content (EU AI Act art. 50)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: s.padding,
        borderRadius: 9999,
        fontSize: s.fontSize,
        fontWeight: 500,
        fontFamily: "var(--font-family, Inter, sans-serif)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: overlay ? "rgba(0,0,0,0.55)" : "var(--secondary, #f3f3f3)",
        color: overlay ? "rgba(255,255,255,0.92)" : "var(--muted-foreground, #666)",
        backdropFilter: overlay ? "blur(4px)" : undefined,
        WebkitBackdropFilter: overlay ? "blur(4px)" : undefined,
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <Sparkles size={s.iconSize} aria-hidden="true" />
      AI-generated
    </span>
  );
}

import { motion } from "motion/react";

interface OraLogoProps {
  /** Height in px — the wordmark scales proportionally from this. */
  size?: number;
  /** Fade-in animation on mount. Leave on for landings, off for navs. */
  animate?: boolean;
  className?: string;
  /** "mark" → just the Bagel "O". "full" or "mascot" → full "Ora" wordmark. */
  variant?: "full" | "mark" | "mascot";
  /** Text colour. Defaults to currentColor. */
  color?: string;
  /** Kept for backward compatibility — no-ops. */
  eyesFollow?: boolean;
  blink?: boolean;
  interactive?: boolean;
}

/**
 * Ora — pure Bagel Fat One wordmark logo.
 *
 * We dropped the Border-Collie mascot: the Bagel Fat One "Ora" wordmark is
 * already iconic (round, bold, editorial) and fits the color-blocked brand
 * system better than a cute animal face. The component keeps the same prop
 * API so every existing consumer (AppSidebar, Footer, Navbar, PulseMotif,
 * AboutPage…) keeps working with zero import changes.
 *
 * - variant="mark"    → just the letter O (compact, icon-sized)
 * - variant="full"    → Ora (default, for headers / wordmark use)
 * - variant="mascot"  → Ora (same as full, kept for back-compat)
 */
export function OraLogo({
  size = 32,
  animate = true,
  className = "",
  variant = "full",
  color,
}: OraLogoProps) {
  const label = variant === "mark" ? "O" : "Ora";
  // Bagel's caps stand a touch taller than the declared pixel height, so we
  // nudge the font-size up a hair to keep the visual height close to `size`.
  const fontSize = Math.round(size * 1.12);
  const content = (
    <span
      className={className}
      style={{
        fontFamily: `"Bagel Fat One", "Inter", system-ui, sans-serif`,
        fontWeight: 400,
        fontSize: `${fontSize}px`,
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: color || "currentColor",
        display: "inline-block",
      }}
      aria-label="Ora"
    >
      {label}
    </span>
  );
  if (!animate) return content;
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      style={{ display: "inline-block" }}
    >
      {content}
    </motion.span>
  );
}

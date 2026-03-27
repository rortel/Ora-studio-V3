import { motion } from "motion/react";

/**
 * ORA Logo — Modern Geometric
 *
 * Clean, modern wordmark. The O is a bold geometric circle.
 * No echo ring — just pure, confident geometry.
 * The mark stands alone or pairs with "ra" in a lowercase modern style.
 */

interface OraLogoProps {
  size?: number;
  animate?: boolean;
  className?: string;
  variant?: "full" | "mark";
  color?: string;
}

export function OraLogo({
  size = 32,
  animate = true,
  className = "",
  variant = "full",
  color,
}: OraLogoProps) {
  const fillColor = color || "currentColor";

  const s = size;
  const c = s / 2;

  // Main O — bold, confident
  const mainR = s * 0.34;
  const mainSW = s * 0.1;

  const oMark = (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      {animate ? (
        <motion.circle
          cx={c}
          cy={c}
          r={mainR}
          stroke={fillColor}
          strokeWidth={mainSW}
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] },
            opacity: { duration: 0.3, delay: 0.1 },
          }}
        />
      ) : (
        <circle
          cx={c}
          cy={c}
          r={mainR}
          stroke={fillColor}
          strokeWidth={mainSW}
          fill="none"
        />
      )}
    </svg>
  );

  if (variant === "mark") {
    return <div className={className}>{oMark}</div>;
  }

  // Full logo: O + ra (lowercase for modern feel)
  const fontSize = s * 0.62;

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: s * 0.02, color: fillColor }}
    >
      {oMark}
      <span
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        ra
      </span>
    </div>
  );
}

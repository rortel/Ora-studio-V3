import { motion } from "motion/react";

/**
 * ORA Logo — Wavy O + "ra" wordmark
 *
 * The O has a regular, elegant undulation — like a smooth sine wave
 * wrapped around a circle. 6 even bumps for visual harmony.
 */

interface OraLogoProps {
  size?: number;
  animate?: boolean;
  className?: string;
  variant?: "full" | "mark";
  color?: string;
}

// Generate a smooth wavy circle with N regular bumps
function wavyCirclePath(
  cx: number,
  cy: number,
  baseR: number,
  amplitude: number,
  bumps: number,
  points: number = 120,
): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = baseR + amplitude * Math.sin(bumps * angle);
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  // Build smooth cubic bezier through all points
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];

    // Catmull-Rom to cubic bezier
    const tension = 6;
    const cp1x = p1[0] + (p2[0] - p0[0]) / tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) / tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) / tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) / tension;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  d += " Z";
  return d;
}

const WAVY_PATH = wavyCirclePath(50, 50, 35, 4, 5, 180);

export function OraLogo({
  size = 32,
  animate = true,
  className = "",
  variant = "full",
  color,
}: OraLogoProps) {
  const fillColor = color || "currentColor";

  const oMark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      {animate ? (
        <motion.path
          d={WAVY_PATH}
          stroke={fillColor}
          strokeWidth={8.5}
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] },
            opacity: { duration: 0.3, delay: 0.1 },
          }}
        />
      ) : (
        <path
          d={WAVY_PATH}
          stroke={fillColor}
          strokeWidth={8.5}
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );

  if (variant === "mark") {
    return <div className={className}>{oMark}</div>;
  }

  const fontSize = size * 0.62;

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: size * 0.02, color: fillColor }}
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

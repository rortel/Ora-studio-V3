import { motion, type Variants } from "motion/react";

/**
 * WavyO — Reusable branding micro-animation
 *
 * The wavy O mark used as a decorative/motion element throughout the site.
 * Supports multiple animation modes: spin, pulse, float, draw, breathe.
 */

// Generate wavy circle path
function wavyCirclePath(
  cx: number,
  cy: number,
  baseR: number,
  amplitude: number,
  bumps: number,
  points: number = 180,
): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const r = baseR + amplitude * Math.sin(bumps * angle);
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];
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

export type WavyOAnimation =
  | "spin"       // slow continuous rotation
  | "pulse"      // scale up/down breathing
  | "float"      // gentle vertical float
  | "draw"       // path draw on scroll
  | "breathe"    // opacity + scale breathing
  | "none";      // static

interface WavyOProps {
  size?: number;
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  animation?: WavyOAnimation;
  duration?: number;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  filled?: boolean;
}

export function WavyO({
  size = 40,
  color = "currentColor",
  opacity = 0.08,
  strokeWidth = 8.5,
  animation = "spin",
  duration = 20,
  delay = 0,
  className = "",
  style,
  filled = false,
}: WavyOProps) {

  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill={filled ? color : "none"}
      className="flex-shrink-0"
      style={{ opacity }}
    >
      {animation === "draw" ? (
        <motion.path
          d={WAVY_PATH}
          stroke={filled ? "none" : color}
          strokeWidth={filled ? 0 : strokeWidth}
          strokeLinejoin="round"
          fill={filled ? color : "none"}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            pathLength: { duration: 1.2, delay, ease: [0.23, 1, 0.32, 1] },
            opacity: { duration: 0.4, delay },
          }}
        />
      ) : (
        <path
          d={WAVY_PATH}
          stroke={filled ? "none" : color}
          strokeWidth={filled ? 0 : strokeWidth}
          strokeLinejoin="round"
          fill={filled ? color : "none"}
        />
      )}
    </svg>
  );

  // Wrap with motion based on animation type
  if (animation === "spin") {
    return (
      <motion.div
        className={`pointer-events-none ${className}`}
        style={style}
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: "linear", delay }}
      >
        {svgContent}
      </motion.div>
    );
  }

  if (animation === "pulse") {
    return (
      <motion.div
        className={`pointer-events-none ${className}`}
        style={style}
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: duration || 4, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {svgContent}
      </motion.div>
    );
  }

  if (animation === "float") {
    return (
      <motion.div
        className={`pointer-events-none ${className}`}
        style={style}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: duration || 6, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {svgContent}
      </motion.div>
    );
  }

  if (animation === "breathe") {
    return (
      <motion.div
        className={`pointer-events-none ${className}`}
        style={style}
        animate={{ scale: [1, 1.05, 1], opacity: [opacity, opacity * 1.5, opacity] }}
        transition={{ duration: duration || 5, repeat: Infinity, ease: "easeInOut", delay }}
      >
        {svgContent}
      </motion.div>
    );
  }

  // "draw" or "none"
  return (
    <div className={`pointer-events-none ${className}`} style={style}>
      {svgContent}
    </div>
  );
}

/** Scattered WavyO background — drops multiple wavy Os with random positions */
interface WavyOFieldProps {
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  opacity?: number;
  className?: string;
}

export function WavyOField({
  count = 6,
  color = "currentColor",
  minSize = 30,
  maxSize = 120,
  opacity = 0.04,
  className = "",
}: WavyOFieldProps) {
  // Deterministic positions based on index for SSR consistency
  const items = Array.from({ length: count }, (_, i) => {
    const seed = (i + 1) * 137.508; // golden angle distribution
    return {
      x: ((seed * 7) % 90) + 5,
      y: ((seed * 3) % 80) + 10,
      size: minSize + ((seed * 11) % (maxSize - minSize)),
      duration: 15 + ((seed * 5) % 25),
      delay: (i * 0.8),
      animation: (["spin", "float", "breathe"] as WavyOAnimation[])[i % 3],
    };
  });

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {items.map((item, i) => (
        <WavyO
          key={i}
          size={item.size}
          color={color}
          opacity={opacity}
          animation={item.animation}
          duration={item.duration}
          delay={item.delay}
          className="absolute"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
        />
      ))}
    </div>
  );
}

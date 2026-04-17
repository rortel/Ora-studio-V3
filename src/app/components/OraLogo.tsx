import { motion } from "motion/react";

interface OraLogoProps {
  size?: number;
  animate?: boolean;
  className?: string;
  variant?: "full" | "mark" | "mascot";
  color?: string;
}

export function OraLogo({
  size = 32,
  animate = true,
  className = "",
  variant = "full",
  color,
}: OraLogoProps) {
  const s = size;
  const fillColor = color || "#0A0A0A";
  const blue = "#1D4ED8";

  const headTilt = -12;

  const mascotMark = (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <g transform={`rotate(${headTilt} 50 50)`}>
        {/* Head — rounded shape */}
        <ellipse cx={50} cy={52} rx={32} ry={30} fill={fillColor} />

        {/* White blaze — center stripe */}
        <path
          d="M 44 30 Q 46 40, 44 52 Q 42 62, 46 72 L 54 72 Q 58 62, 56 52 Q 54 40, 56 30 Z"
          fill="#FFFFFF"
        />

        {/* Left ear — pricked up (triangular) */}
        <path
          d="M 22 38 L 28 12 L 40 34 Z"
          fill={fillColor}
        />
        {/* Left ear inner */}
        <path
          d="M 26 34 L 30 18 L 37 33 Z"
          fill={blue}
        />

        {/* Right ear — folded (rounded triangle, flopped) */}
        <path
          d="M 78 38 Q 76 22, 68 18 Q 62 20, 60 34 Z"
          fill={fillColor}
        />

        {/* Muzzle — white round area */}
        <ellipse cx={50} cy={64} rx={14} ry={10} fill="#FFFFFF" />

        {/* Nose */}
        <ellipse cx={50} cy={60} rx={4.5} ry={3.5} fill={fillColor} />

        {/* Left eye — slightly larger (the focused Ora eye) */}
        <ellipse cx={38} cy={48} rx={5.5} ry={5.8} fill="#FFFFFF" />
        <ellipse cx={39} cy={48} rx={3.2} ry={3.4} fill={fillColor} />
        <circle cx={40.5} cy={46.5} r={1.2} fill="#FFFFFF" />

        {/* Right eye */}
        <ellipse cx={62} cy={48} rx={5} ry={5.3} fill="#FFFFFF" />
        <ellipse cx={63} cy={48} rx={2.8} ry={3} fill={fillColor} />
        <circle cx={64.2} cy={46.5} r={1} fill="#FFFFFF" />

        {/* Mouth — tiny friendly smile */}
        <path
          d="M 46 66 Q 50 69, 54 66"
          stroke={fillColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          fill="none"
        />

        {/* Blue collar accent */}
        <path
          d="M 28 74 Q 50 82, 72 74"
          stroke={blue}
          strokeWidth={3.5}
          strokeLinecap="round"
          fill="none"
        />

        {/* Collar tag */}
        <circle cx={50} cy={80} r={3} fill={blue} />
      </g>
    </svg>
  );

  if (variant === "mascot") {
    if (!animate) return <div className={className}>{mascotMark}</div>;
    return (
      <motion.div
        className={className}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      >
        {mascotMark}
      </motion.div>
    );
  }

  const markOnly = (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      className="flex-shrink-0"
      aria-hidden="true"
    >
      <g transform={`rotate(${headTilt} 50 48)`}>
        {/* Compact head for small sizes */}
        <ellipse cx={50} cy={50} rx={34} ry={32} fill={fillColor} />
        <path
          d="M 43 28 Q 46 40, 44 50 Q 42 60, 46 70 L 54 70 Q 58 60, 56 50 Q 54 40, 57 28 Z"
          fill="#FFFFFF"
        />
        <path d="M 20 38 L 27 10 L 41 34 Z" fill={fillColor} />
        <path d="M 25 34 L 29 16 L 38 32 Z" fill={blue} />
        <path d="M 80 38 Q 78 20, 69 16 Q 63 18, 60 34 Z" fill={fillColor} />
        <ellipse cx={50} cy={62} rx={14} ry={10} fill="#FFFFFF" />
        <ellipse cx={50} cy={58} rx={4.5} ry={3.5} fill={fillColor} />
        <ellipse cx={37} cy={46} rx={5.5} ry={5.8} fill="#FFFFFF" />
        <ellipse cx={38} cy={46} rx={3.2} ry={3.4} fill={fillColor} />
        <circle cx={39.5} cy={44.5} r={1.2} fill="#FFFFFF" />
        <ellipse cx={63} cy={46} rx={5} ry={5.3} fill="#FFFFFF" />
        <ellipse cx={64} cy={46} rx={2.8} ry={3} fill={fillColor} />
        <circle cx={65.2} cy={44.5} r={1} fill="#FFFFFF" />
        <path d="M 46 64 Q 50 67, 54 64" stroke={fillColor} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );

  if (variant === "mark") {
    if (!animate) return <div className={className}>{markOnly}</div>;
    return (
      <motion.div
        className={className}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        {markOnly}
      </motion.div>
    );
  }

  // Full logo: mark + wordmark
  const fontSize = s * 0.7;

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: s * 0.15 }}
    >
      {animate ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        >
          {markOnly}
        </motion.div>
      ) : (
        markOnly
      )}
      <span
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: fillColor,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        Ora
      </span>
    </div>
  );
}

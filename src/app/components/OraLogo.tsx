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
        {/* Blue bandana tied around neck — visible layer behind head */}
        <path
          d="M 18 72 Q 50 88, 82 72 L 86 82 Q 50 96, 14 82 Z"
          fill={blue}
        />
        {/* Bandana knot detail */}
        <path
          d="M 62 78 L 74 76 L 72 86 L 60 84 Z"
          fill={blue}
        />
        <path
          d="M 72 76 L 80 74 L 78 80 L 70 82 Z"
          fill="#1E40AF"
        />

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
        {/* Left ear inner (blue) */}
        <path
          d="M 26 34 L 30 18 L 37 33 Z"
          fill={blue}
        />

        {/* Right ear — folded (rounded triangle, flopped) */}
        <path
          d="M 78 38 Q 76 22, 68 18 Q 62 20, 60 34 Z"
          fill={fillColor}
        />
        {/* Right ear inner (blue, visible through the fold) */}
        <path
          d="M 68 32 Q 66 22, 69 20 Q 64 22, 62 32 Z"
          fill={blue}
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

        {/* Small blue medallion on bandana */}
        <circle cx={50} cy={80} r={2.5} fill="#FFFFFF" />
        <circle cx={50} cy={80} r={1.2} fill={blue} />
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
        {/* Blue bandana peek at bottom (compact) */}
        <path d="M 16 76 Q 50 90, 84 76 L 86 84 Q 50 98, 14 84 Z" fill={blue} />
        {/* Head */}
        <ellipse cx={50} cy={50} rx={34} ry={32} fill={fillColor} />
        {/* Blaze */}
        <path
          d="M 43 28 Q 46 40, 44 50 Q 42 60, 46 70 L 54 70 Q 58 60, 56 50 Q 54 40, 57 28 Z"
          fill="#FFFFFF"
        />
        {/* Left ear + blue inner */}
        <path d="M 20 38 L 27 10 L 41 34 Z" fill={fillColor} />
        <path d="M 25 34 L 29 16 L 38 32 Z" fill={blue} />
        {/* Right ear + blue inner peek */}
        <path d="M 80 38 Q 78 20, 69 16 Q 63 18, 60 34 Z" fill={fillColor} />
        <path d="M 68 32 Q 66 22, 69 20 Q 64 22, 62 32 Z" fill={blue} />
        {/* Muzzle */}
        <ellipse cx={50} cy={62} rx={14} ry={10} fill="#FFFFFF" />
        <ellipse cx={50} cy={58} rx={4.5} ry={3.5} fill={fillColor} />
        {/* Eyes */}
        <ellipse cx={37} cy={46} rx={5.5} ry={5.8} fill="#FFFFFF" />
        <ellipse cx={38} cy={46} rx={3.2} ry={3.4} fill={fillColor} />
        <circle cx={39.5} cy={44.5} r={1.2} fill="#FFFFFF" />
        <ellipse cx={63} cy={46} rx={5} ry={5.3} fill="#FFFFFF" />
        <ellipse cx={64} cy={46} rx={2.8} ry={3} fill={fillColor} />
        <circle cx={65.2} cy={44.5} r={1} fill="#FFFFFF" />
        {/* Smile */}
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

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";

interface OraLogoProps {
  size?: number;
  animate?: boolean;
  className?: string;
  variant?: "full" | "mark" | "mascot";
  color?: string;
  eyesFollow?: boolean;
  blink?: boolean;
  interactive?: boolean;
}

/**
 * Ora — Border Collie mascot (clean geometric style, recognizable)
 * - Rounded head with clear dog proportions
 * - Two pointed asymmetric ears (one up, one slightly tilted)
 * - Prominent white muzzle (the "tuxedo" face)
 * - Almond eyes with pupils + highlight
 * - Proper triangular dog nose
 * - Small smile
 * - Blue bandana on mascot variant only
 */
export function OraLogo({
  size = 32,
  animate = true,
  className = "",
  variant = "full",
  color,
  eyesFollow = true,
  blink = true,
  interactive = true,
}: OraLogoProps) {
  const s = size;
  const fillColor = color || "#0A0A0A";
  const blue = "#1D4ED8";

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (variant !== "mascot" || !eyesFollow) return;
    function handleMove(e: MouseEvent) {
      const el = svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const max = 1.5;
      const scale = Math.min(1, dist / 140);
      setEyeOffset({
        x: (dx / (dist || 1)) * max * scale,
        y: (dy / (dist || 1)) * max * scale,
      });
    }
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [variant, eyesFollow]);

  const [isBlinking, setIsBlinking] = useState(false);
  useEffect(() => {
    if (!blink || !animate) return;
    let cancelled = false;
    function scheduleBlink() {
      const delay = 3500 + Math.random() * 3500;
      setTimeout(() => {
        if (cancelled) return;
        setIsBlinking(true);
        setTimeout(() => {
          if (cancelled) return;
          setIsBlinking(false);
          scheduleBlink();
        }, 130);
      }, delay);
    }
    scheduleBlink();
    return () => { cancelled = true; };
  }, [blink, animate]);

  const headControls = useAnimationControls();
  function onHoverStart() {
    if (!interactive || !animate) return;
    headControls.start({
      rotate: [0, -6, 0, 4, 0],
      transition: { duration: 0.7, ease: "easeInOut" },
    });
  }

  /* ─── Mascot / mark geometry ─── */
  const Head = ({ showBandana = false }: { showBandana?: boolean }) => (
    <>
      {/* BANDANA (mascot only) — behind head */}
      {showBandana && (
        <>
          <path
            d="M 20 82 Q 50 95, 80 82 L 84 92 Q 50 102, 16 92 Z"
            fill={blue}
          />
          <path
            d="M 64 86 L 74 84 L 72 96 L 62 94 Z"
            fill={blue}
          />
          <path
            d="M 72 84 L 80 82 L 78 90 L 70 92 Z"
            fill="#1E40AF"
          />
        </>
      )}

      {/* HEAD — wider than tall (dog proportions) */}
      <ellipse cx={50} cy={54} rx={36} ry={30} fill={fillColor} />

      {/* LEFT EAR — short triangle on the SIDE, angled outward */}
      <path
        d="M 14 48 Q 10 32, 20 28 Q 30 30, 32 42 Z"
        fill={fillColor}
      />
      {/* Left ear blue inner */}
      <path
        d="M 18 42 Q 16 34, 22 32 Q 28 34, 29 42 Z"
        fill={blue}
      />

      {/* RIGHT EAR — mirror, folded/flopped tip (typical Border Collie semi-prick) */}
      <path
        d="M 86 48 Q 90 32, 80 28 Q 70 30, 68 42 Z"
        fill={fillColor}
      />
      {/* Right ear blue inner */}
      <path
        d="M 82 42 Q 84 34, 78 32 Q 72 34, 71 42 Z"
        fill={blue}
      />

      {/* WHITE MUZZLE MASK — large blaze down the center covering lower face */}
      <path
        d="
          M 50 28
          Q 44 40, 42 50
          Q 40 62, 42 72
          Q 46 78, 50 78
          Q 54 78, 58 72
          Q 60 62, 58 50
          Q 56 40, 50 28
          Z
        "
        fill="#FFFFFF"
      />
      {/* Muzzle bulge (makes white area fuller at bottom) */}
      <ellipse cx={50} cy={68} rx={16} ry={11} fill="#FFFFFF" />

      {/* LEFT EYE — almond shape */}
      <g>
        <ellipse
          cx={40}
          cy={50}
          rx={4.3}
          ry={3.4}
          fill="#FFFFFF"
          transform="rotate(-12 40 50)"
        />
        <motion.ellipse
          cx={40}
          cy={50}
          rx={2.6}
          ry={isBlinking ? 0.3 : 2.9}
          fill={fillColor}
          animate={{
            cx: 40 + eyeOffset.x * 0.6,
            cy: 50 + eyeOffset.y * 0.6,
            ry: isBlinking ? 0.3 : 2.9,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
        />
        {!isBlinking && (
          <motion.circle
            r={0.9}
            fill="#FFFFFF"
            animate={{
              cx: 40.8 + eyeOffset.x * 0.6,
              cy: 48.8 + eyeOffset.y * 0.6,
            }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          />
        )}
      </g>

      {/* RIGHT EYE — almond shape */}
      <g>
        <ellipse
          cx={60}
          cy={50}
          rx={4.3}
          ry={3.4}
          fill="#FFFFFF"
          transform="rotate(12 60 50)"
        />
        <motion.ellipse
          cx={60}
          cy={50}
          rx={2.6}
          ry={isBlinking ? 0.3 : 2.9}
          fill={fillColor}
          animate={{
            cx: 60 + eyeOffset.x * 0.6,
            cy: 50 + eyeOffset.y * 0.6,
            ry: isBlinking ? 0.3 : 2.9,
          }}
          transition={{ type: "spring", stiffness: 180, damping: 22 }}
        />
        {!isBlinking && (
          <motion.circle
            r={0.9}
            fill="#FFFFFF"
            animate={{
              cx: 60.8 + eyeOffset.x * 0.6,
              cy: 48.8 + eyeOffset.y * 0.6,
            }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          />
        )}
      </g>

      {/* NOSE — proper triangular dog nose */}
      <path
        d="
          M 46 60
          Q 46 57, 50 57
          Q 54 57, 54 60
          L 52.5 65
          L 50.5 66.5
          L 50 66
          L 49.5 66.5
          L 47.5 65
          Z
        "
        fill={fillColor}
      />
      {/* Nose highlight (tiny) */}
      <ellipse cx={48.5} cy={58.5} rx={0.7} ry={0.5} fill="#FFFFFF" opacity={0.5} />

      {/* MOUTH — small smile with center line */}
      <path
        d="M 50 66.5 L 50 71"
        stroke={fillColor}
        strokeWidth={1.2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M 46 72 Q 50 75, 54 72"
        stroke={fillColor}
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
      />

      {/* Tiny medallion on bandana */}
      {showBandana && (
        <>
          <circle cx={50} cy={88} r={2.5} fill="#FFFFFF" />
          <circle cx={50} cy={88} r={1.2} fill={blue} />
        </>
      )}
    </>
  );

  /* ─── MASCOT variant ─── */
  if (variant === "mascot") {
    const mascotSvg = (
      <motion.svg
        ref={svgRef}
        width={s}
        height={s}
        viewBox="0 0 100 100"
        fill="none"
        className="flex-shrink-0"
        aria-hidden="true"
        onHoverStart={onHoverStart}
        animate={animate ? { y: [0, -1.5, 0] } : undefined}
        transition={animate ? { duration: 3.5, repeat: Infinity, ease: "easeInOut" } : undefined}
      >
        <motion.g animate={headControls} style={{ transformOrigin: "50px 52px" }}>
          <Head showBandana />
        </motion.g>
      </motion.svg>
    );
    if (!animate) return <div className={className}>{mascotSvg}</div>;
    return (
      <motion.div
        className={className}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        {mascotSvg}
      </motion.div>
    );
  }

  /* ─── MARK variant ─── */
  const markSvg = (
    <motion.svg
      ref={svgRef}
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      className="flex-shrink-0"
      aria-hidden="true"
      onHoverStart={onHoverStart}
    >
      <motion.g animate={headControls} style={{ transformOrigin: "50px 52px" }}>
        <Head showBandana={false} />
      </motion.g>
    </motion.svg>
  );

  if (variant === "mark") {
    if (!animate) return <div className={className}>{markSvg}</div>;
    return (
      <motion.div
        className={className}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      >
        {markSvg}
      </motion.div>
    );
  }

  /* ─── FULL variant: mark + wordmark ─── */
  const fontSize = s * 0.7;
  return (
    <div className={`flex items-center ${className}`} style={{ gap: s * 0.15 }}>
      {animate ? (
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        >
          {markSvg}
        </motion.div>
      ) : (
        markSvg
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

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";

interface OraLogoProps {
  size?: number;
  animate?: boolean;
  className?: string;
  variant?: "full" | "mark" | "mascot";
  color?: string;
  /** Mascot pupils follow the cursor. Mascot variant only. */
  eyesFollow?: boolean;
  /** Periodic natural blink. */
  blink?: boolean;
  /** Deeper head tilt on hover. */
  interactive?: boolean;
}

/**
 * Ora — Border Collie mascot
 * Refined silhouette inspired by realistic illustration:
 * - Two forward-pointing ears with jagged fur at base
 * - Continuous black "hood" that frames the face
 * - White blaze wedge down the center
 * - Almond eyes with highlight
 * - Proper triangular dog nose
 * - Heart-shaped chest tuxedo hint below
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

  /* ── Eye tracking (mascot only) ── */
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
      const max = 1.6;
      const scale = Math.min(1, dist / 130);
      setEyeOffset({
        x: (dx / (dist || 1)) * max * scale,
        y: (dy / (dist || 1)) * max * scale,
      });
    }
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [variant, eyesFollow]);

  /* ── Natural blink ── */
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

  /* ── Hover tilt ── */
  const headControls = useAnimationControls();
  function onHoverStart() {
    if (!interactive || !animate) return;
    headControls.start({
      rotate: [0, -5, 0, 3, 0],
      transition: { duration: 0.7, ease: "easeInOut" },
    });
  }

  /* ─── Realistic silhouette SVG ─── */
  const Silhouette = ({ showBandana = false }: { showBandana?: boolean }) => (
    <>
      {/* === HEAD "HOOD" — single continuous silhouette === */}
      {/*
        Traces ear → side of face → jagged fur cheek → chin line →
        crosses under muzzle → up other cheek → other ear.
        The inner white face is carved out by the blaze path.
      */}
      <path
        d="
          M 28 22
          C 24 18, 22 10, 26 6
          C 30 3, 35 6, 38 12
          L 42 24
          L 44 32
          C 43 36, 42 40, 40 44
          L 36 48
          L 32 54
          L 30 60
          L 28 64
          L 32 66
          L 38 70
          C 40 72, 42 73, 44 74
          L 48 75
          L 50 77
          L 52 75
          L 56 74
          C 58 73, 60 72, 62 70
          L 68 66
          L 72 64
          L 70 60
          L 68 54
          L 64 48
          L 60 44
          C 58 40, 57 36, 56 32
          L 58 24
          L 62 12
          C 65 6, 70 3, 74 6
          C 78 10, 76 18, 72 22
          L 68 28
          L 66 34
          C 63 36, 60 37, 57 37
          L 50 36
          L 43 37
          C 40 37, 37 36, 34 34
          L 32 28
          Z
        "
        fill={fillColor}
      />

      {/* === Jagged fur wisps on ear bases (left ear) === */}
      <path
        d="M 28 22 L 26 26 L 29 27 L 27 30 L 31 30 L 30 34 L 34 33 Z"
        fill={fillColor}
      />
      {/* Jagged fur on right ear */}
      <path
        d="M 72 22 L 74 26 L 71 27 L 73 30 L 69 30 L 70 34 L 66 33 Z"
        fill={fillColor}
      />

      {/* === Blue inner ear (left) === */}
      <path
        d="M 30 10 L 32 16 L 36 22 L 34 24 L 31 20 L 29 14 Z"
        fill={blue}
      />
      {/* === Blue inner ear (right) === */}
      <path
        d="M 70 10 L 68 16 L 64 22 L 66 24 L 69 20 L 71 14 Z"
        fill={blue}
      />

      {/* === WHITE BLAZE — central wedge === */}
      {/*
        Starts from forehead, widens to brow, narrows between eyes,
        widens again to muzzle, ends in the furry chin.
      */}
      <path
        d="
          M 50 18
          C 48 22, 47 28, 46 32
          L 43 38
          L 42 44
          C 43 46, 45 48, 48 49
          L 48 53
          L 44 58
          L 42 64
          L 44 68
          C 46 71, 48 73, 50 74
          C 52 73, 54 71, 56 68
          L 58 64
          L 56 58
          L 52 53
          L 52 49
          C 55 48, 57 46, 58 44
          L 57 38
          L 54 32
          C 53 28, 52 22, 50 18
          Z
        "
        fill="#FFFFFF"
      />

      {/* === EYES — almond shaped === */}
      {/* Left eye white */}
      <ellipse cx={40} cy={42} rx={3.2} ry={2.4} fill="#FFFFFF" transform="rotate(-15 40 42)" />
      {/* Left pupil */}
      <motion.ellipse
        cx={40}
        cy={42}
        rx={2}
        ry={isBlinking ? 0.2 : 2.1}
        fill={fillColor}
        animate={{ cx: 40 + eyeOffset.x * 0.7, cy: 42 + eyeOffset.y * 0.7, ry: isBlinking ? 0.2 : 2.1 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
      />
      {!isBlinking && (
        <motion.circle
          r={0.6}
          fill="#FFFFFF"
          animate={{ cx: 40.5 + eyeOffset.x * 0.7, cy: 41.3 + eyeOffset.y * 0.7 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        />
      )}

      {/* Right eye white */}
      <ellipse cx={60} cy={42} rx={3.2} ry={2.4} fill="#FFFFFF" transform="rotate(15 60 42)" />
      <motion.ellipse
        cx={60}
        cy={42}
        rx={2}
        ry={isBlinking ? 0.2 : 2.1}
        fill={fillColor}
        animate={{ cx: 60 + eyeOffset.x * 0.7, cy: 42 + eyeOffset.y * 0.7, ry: isBlinking ? 0.2 : 2.1 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
      />
      {!isBlinking && (
        <motion.circle
          r={0.6}
          fill="#FFFFFF"
          animate={{ cx: 60.5 + eyeOffset.x * 0.7, cy: 41.3 + eyeOffset.y * 0.7 }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
        />
      )}

      {/* === NOSE — triangular dog nose with V bottom === */}
      <path
        d="
          M 46 52
          C 46 50, 48 49, 50 49
          C 52 49, 54 50, 54 52
          L 53 56
          L 51 58
          L 50 57
          L 49 58
          L 47 56
          Z
        "
        fill={fillColor}
      />
      {/* Nose nostrils (small white dots) */}
      <ellipse cx={48.3} cy={53.5} rx={0.7} ry={1.1} fill="#FFFFFF" opacity={0.6} />
      <ellipse cx={51.7} cy={53.5} rx={0.7} ry={1.1} fill="#FFFFFF" opacity={0.6} />

      {/* === MOUTH — subtle smile === */}
      <path
        d="M 46 62 Q 50 65, 54 62"
        stroke={fillColor}
        strokeWidth={1.1}
        strokeLinecap="round"
        fill="none"
      />

      {/* === CHEST tuxedo hint — below the head === */}
      {showBandana && (
        <>
          {/* Blue bandana wrapping the chest */}
          <path
            d="
              M 36 76
              L 46 78
              L 50 76
              L 54 78
              L 64 76
              L 68 85
              L 58 90
              L 50 88
              L 42 90
              L 32 85
              Z
            "
            fill={blue}
          />
          {/* Bandana knot */}
          <path
            d="M 62 79 L 70 77 L 68 86 L 60 84 Z"
            fill={blue}
          />
          <path
            d="M 68 77 L 74 75 L 72 82 L 66 84 Z"
            fill="#1E40AF"
          />
          {/* Small medallion */}
          <circle cx={50} cy={82} r={2.2} fill="#FFFFFF" />
          <circle cx={50} cy={82} r={1} fill={blue} />
        </>
      )}
    </>
  );

  /* ─── MASCOT variant (with bandana, animated) ─── */
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
        <motion.g animate={headControls} style={{ transformOrigin: "50px 50px" }}>
          <Silhouette showBandana />
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

  /* ─── MARK variant (no bandana, compact, still animated) ─── */
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
      <motion.g animate={headControls} style={{ transformOrigin: "50px 50px" }}>
        <Silhouette showBandana={false} />
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

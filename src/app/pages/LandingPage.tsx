import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ora/Button";
import { bagel, COLORS } from "../components/ora/tokens";
import { API_BASE } from "../lib/supabase";
import { BentoGallery, type BentoItem } from "../components/ui/bento-gallery";
import heroVideo from "../../assets/hero-video.mp4";

interface ShowcaseAsset {
  itemId: string; featuredAt: string;
  campaignName: string; campaignSlug: string;
  platform: string; aspectRatio: string;
  imageUrl: string; videoUrl: string;
  caption: string; twistElement: string;
  fileName: string; videoFileName: string;
}


interface ShowcaseCampaign {
  campaignSlug: string;
  campaignName: string;
  featuredAt: string;
  assets: ShowcaseAsset[];
}

/* Fallback content when the public showcase endpoint returns nothing yet
 * (first deploy, admin hasn't featured anything). Once the admin marks
 * items from Library, these get overridden with real campaign output. */
const FALLBACK_GALLERY = [
  { src: "/templates/figma-linkedin-01.png",     label: "linkedin",       platform: "linkedin",        ar: "16:9" },
  { src: "/templates/figma-igp-01.png",          label: "ig feed",        platform: "instagram-feed",  ar: "1:1"  },
  { src: "/templates/figma-story-01.png",        label: "ig story",       platform: "instagram-story", ar: "9:16" },
  { src: "/templates/figma-b2b-01.png",          label: "linkedin · b2b", platform: "linkedin",        ar: "16:9" },
  { src: "/templates/figma-fashion-post-02.png", label: "fashion",        platform: "instagram-feed",  ar: "1:1"  },
  { src: "/templates/figma-skincare-02.png",     label: "skincare",       platform: "instagram-feed",  ar: "1:1"  },
];

function platformLabel(p: string): string {
  const s = (p || "").toLowerCase();
  if (s.includes("instagram-story"))  return "ig story";
  if (s.includes("instagram"))        return "ig feed";
  if (s.includes("linkedin"))         return "linkedin";
  if (s.includes("facebook"))         return "facebook";
  if (s.includes("tiktok"))           return "tiktok";
  return p || "asset";
}

/**
 * Dark cinematic canvas — the core landing primitive.
 *
 * Full-viewport (100vh on tall screens, min 640px) section whose
 * background IS a video (or image fallback). The title, eyebrow and
 * optional CTA sit as overlay content over a bottom-weighted gradient
 * for legibility. Parallax translates the media at ~40% of the scroll
 * speed so it feels anchored in space while the viewport moves.
 *
 * Used for the hero and every subsequent "moment" (Drop / Pick / Ship),
 * so the landing reads as a continuous film rather than a stack of
 * editorial blocks. Motion easings are cubic-bezier — sharp, engineered.
 */
function CinematicPanel({
  videoSrc,
  posterSrc,
  imageSrc,
  eyebrow,
  title,
  subtitle,
  cta,
  tonality = "dark",
}: {
  videoSrc?: string;
  posterSrc?: string;
  imageSrc?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: React.ReactNode;
  /** "dark" (default) = white text over dark gradient, "hero" = same but slightly more prominent glow on title. */
  tonality?: "dark" | "hero";
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Parallax the media ~±10% across the section. Scale slightly to avoid
  // edge reveals when y-translated.
  const mediaY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  // Title slides up and fades as the viewport moves past.
  const textY = useTransform(scrollYProgress, [0, 0.5, 1], [60, 0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.18, 0.78, 1], [0, 1, 1, 0]);

  const hasVideo = !!videoSrc;

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: 640, background: "#0A0A0A" }}
    >
      {/* Media canvas — fills the section, parallax-translated. */}
      <motion.div
        style={{ y: mediaY }}
        className="absolute inset-0 scale-[1.12] will-change-transform"
      >
        {hasVideo ? (
          <video
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        ) : imageSrc ? (
          <img src={imageSrc} alt="" className="h-full w-full object-cover" />
        ) : null}
      </motion.div>

      {/* Bottom gradient for overlay legibility — heavier on hero than on
       *  sub-moments so the title of the first panel punches. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            tonality === "hero"
              ? "linear-gradient(180deg, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.15) 45%, rgba(10,10,10,0.82) 100%)"
              : "linear-gradient(180deg, rgba(10,10,10,0.28) 0%, rgba(10,10,10,0.12) 45%, rgba(10,10,10,0.72) 100%)",
        }}
      />

      {/* Overlay content — bottom-left anchored so titles read like a film
       *  poster caption, not a centered SaaS slide. */}
      <motion.div
        style={{ y: textY, opacity: textOpacity }}
        className="relative z-10 flex h-full flex-col justify-end px-6 md:px-16 pb-[7vh] md:pb-[9vh] max-w-[1500px] mx-auto"
      >
        {eyebrow && (
          <div className="mono-label mb-5 flex items-center gap-2" style={{ color: "rgba(250,250,250,0.72)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#FF6B47" }} />
            <span>{eyebrow}</span>
          </div>
        )}
        <h1
          className="max-w-[16ch] text-white"
          style={{
            ...bagel,
            fontSize: tonality === "hero" ? "clamp(64px, 12vw, 200px)" : "clamp(56px, 10vw, 160px)",
            lineHeight: 0.92,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="body-tight mt-6 max-w-xl text-[16px] md:text-[18px]"
            style={{ color: "rgba(250,250,250,0.8)" }}
          >
            {subtitle}
          </p>
        )}
        {cta && <div className="mt-8 md:mt-10">{cta}</div>}
      </motion.div>
    </section>
  );
}

/**
 * MethodPanel — the "show how it works" primitive.
 *
 * Where CinematicPanel puts media underneath and overlays text (hero
 * feel), MethodPanel splits the viewport: text on the left (title,
 * eyebrow, body), UI mockup on the right. 100vh, dark canvas, hairline
 * between the two columns on desktop. Children render the mockup.
 *
 * The user's feedback on the first cinematic pass was "on ne comprend
 * pas la méthode" — pretty videos without context. MethodPanel solves
 * that by making the UI itself the hero of each step: users see the
 * actual Brand Vault, actual angle cards, actual asset grid as scroll
 * animates them into view.
 */
function MethodPanel({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 0.45, 0.75, 1], [40, 0, 0, -40]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.2, 0.78, 1], [0, 1, 1, 0]);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100vh", background: "#0A0A0A", borderTop: "1px solid rgba(250,250,250,0.06)" }}
    >
      <div className="max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 h-full min-h-screen grid grid-cols-1 md:grid-cols-[minmax(0,360px)_1fr] gap-8 md:gap-14 items-center py-20 md:py-0">
        {/* Text column */}
        <motion.div style={{ y: textY, opacity: textOpacity }} className="flex flex-col justify-center">
          <div className="mono-label mb-5 flex items-center gap-2" style={{ color: "rgba(250,250,250,0.72)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#FF6B47" }} />
            <span>{eyebrow}</span>
          </div>
          <h2 className="text-white max-w-[10ch] mb-6" style={{ ...bagel, fontSize: "clamp(56px, 8vw, 120px)" }}>
            {title}
          </h2>
          <p className="body-tight text-[16px] md:text-[17px] max-w-md" style={{ color: "rgba(250,250,250,0.75)" }}>
            {subtitle}
          </p>
        </motion.div>
        {/* Mockup column */}
        <div className="flex items-center justify-center w-full">
          {children}
        </div>
      </div>
    </section>
  );
}

/* Shared color for mockup surfaces — slightly lifted from the #0A0A0A
 * canvas so panels read as cards, not holes. */
const MOCK_SURFACE = "#141414";
const MOCK_BORDER = "rgba(250,250,250,0.08)";
const MOCK_BORDER_STRONG = "rgba(250,250,250,0.14)";

/**
 * MouseTilt — 3D-like pointer parallax wrapper.
 *
 * Tracks the mouse position relative to its bounding box and applies a
 * subtle rotateX / rotateY transform spring-smoothed. Makes every
 * mockup frame feel responsive and tactile instead of flat. Max tilt
 * capped at ±6deg so it reads "alive" without reading "gimmicky".
 */
function MouseTilt({
  children,
  maxTilt = 6,
  className,
  style,
}: {
  children: React.ReactNode;
  maxTilt?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useSpring(useTransform(my, [-0.5, 0.5], [maxTilt, -maxTilt]), { stiffness: 140, damping: 18 });
  const rY = useSpring(useTransform(mx, [-0.5, 0.5], [-maxTilt, maxTilt]), { stiffness: 140, damping: 18 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        ...style,
        rotateX: rX,
        rotateY: rY,
        transformStyle: "preserve-3d",
        transformPerspective: 1200,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * TypedUrl — letter-by-letter URL typing in a fake input.
 *
 * Mimics the real "paste your URL" moment on /hub/vault so the visitor
 * sees *exactly* what they'll do when they sign up. Uses a local
 * interval so each letter lands on a predictable rhythm — no spring,
 * no bounce, just a clean mechanical type. Starts when the parent
 * calls in via the `active` prop (typically: once the scroll has put
 * the panel in view).
 */
function TypedUrl({ target, active }: { target: string; active: boolean }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) return;
    let i = 0;
    setOut("");
    const id = setInterval(() => {
      i++;
      setOut(target.slice(0, i));
      if (i >= target.length) clearInterval(id);
    }, 55);
    return () => clearInterval(id);
  }, [active, target]);
  return (
    <span className="font-mono text-[13px]" style={{ color: "#FAFAFA" }}>
      {out}
      <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        className="inline-block w-[2px] h-[15px] align-[-2px] ml-[1px]"
        style={{ background: "#FF6B47" }}
      />
    </span>
  );
}

/**
 * DropMockup — animated Brand Vault panel.
 *
 * Shows a fake "scan this URL" flow: URL input, progress, then the
 * extracted brand DNA materialising (logo, palette chips, font sample,
 * tone keywords). Each row fades in on scroll using useInView so the
 * user reads the steps in order as the panel crosses the viewport.
 */
function DropMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 20%"] });
  // Scroll-driven scan progress (0 → 100% as the panel crosses the fold)
  const progress = useTransform(scrollYProgress, [0.12, 0.38], ["0%", "100%"]);
  // Multi-layer scroll parallax: chrome bar moves slower than the content,
  // creating a subtle depth when the user scrolls through the section.
  const chromeY = useTransform(scrollYProgress, [0, 1], ["-2%", "2%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["4%", "-4%"]);
  // Activation gates — each row reveals when the scan bar reaches its mark.
  const [active, setActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState(0); // 0 idle, 1..4 rows visible, 5 done
  useEffect(() => {
    const un = scrollYProgress.on("change", (v) => {
      if (v > 0.1 && !active) setActive(true);
      setScanning(v > 0.12 && v < 0.4);
      setStep(v < 0.22 ? 0 : v < 0.3 ? 1 : v < 0.36 ? 2 : v < 0.42 ? 3 : 4);
    });
    return un;
  }, [scrollYProgress, active]);

  const POP = { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: "spring" as const, stiffness: 320, damping: 18 } };

  return (
    <MouseTilt className="w-full max-w-[960px]" maxTilt={5}>
      <motion.div
        ref={ref}
        className="rounded-2xl overflow-hidden"
        style={{ background: MOCK_SURFACE, border: `1px solid ${MOCK_BORDER}`, boxShadow: "0 60px 140px -40px rgba(255,107,71,0.22)" }}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Chrome bar — parallax layer 1 */}
        <motion.div style={{ y: chromeY }} className="flex items-center gap-2.5 px-5 h-11" >
          <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
          <span className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
          <span className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
          <span className="mono-label ml-auto text-[11px]" style={{ color: "rgba(250,250,250,0.5)", textTransform: "none", letterSpacing: "0.02em" }}>
            ora-studio.app/hub/vault
          </span>
        </motion.div>
        <div style={{ borderTop: `1px solid ${MOCK_BORDER}` }} />

        <motion.div style={{ y: contentY }} className="p-8 md:p-12 space-y-7">
          {/* URL input with animated typing */}
          <div>
            <div className="mono-label mb-3" style={{ color: "rgba(250,250,250,0.5)" }}>Scan your URL</div>
            <div className="flex gap-3">
              <div className="flex-1 h-14 rounded-xl flex items-center px-4" style={{ background: "rgba(250,250,250,0.04)", border: `1px solid ${MOCK_BORDER}` }}>
                <TypedUrl target="https://mybrand.com/" active={active} />
              </div>
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="h-14 px-6 rounded-xl flex items-center gap-2.5 mono-label cursor-pointer"
                style={{ background: "#FF6B47", color: "#FFFFFF", textTransform: "uppercase", fontSize: 13 }}
              >
                {scanning ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="inline-block w-4 h-4 rounded-full"
                    style={{ border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#FFFFFF" }}
                  />
                ) : step >= 4 ? "✓" : null}
                Scan
              </motion.div>
            </div>
          </div>

          {/* Progress bar — scroll-tied */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(250,250,250,0.06)" }}>
            <motion.div className="h-full" style={{ width: progress, background: "#FF6B47" }} />
          </div>

          {/* Extracted rows — pop in with bouncy springs */}
          <div className="pt-3 space-y-5 min-h-[260px]">
            <AnimatePresence>
              {step >= 1 && (
                <motion.div {...POP} key="logo" className="flex items-center gap-6">
                  <div className="mono-label w-20 shrink-0" style={{ color: "rgba(250,250,250,0.5)" }}>Logo</div>
                  <motion.div
                    className="w-14 h-14 rounded-lg flex items-center justify-center"
                    style={{ background: "#FFFFFF", color: "#0A0A0A", ...bagel, fontSize: 24 }}
                    whileHover={{ rotate: -4, scale: 1.05 }}
                  >
                    Ora
                  </motion.div>
                </motion.div>
              )}
              {step >= 2 && (
                <motion.div key="palette" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-6">
                  <div className="mono-label w-20 shrink-0" style={{ color: "rgba(250,250,250,0.5)" }}>Palette</div>
                  <div className="flex gap-2">
                    {["#FF6B47", "#F4C542", "#111111", "#FAFAF7", "#6C6C6C"].map((c, i) => (
                      <motion.div
                        key={c}
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 420, damping: 15, delay: i * 0.06 }}
                        whileHover={{ scale: 1.15, rotate: 6 }}
                        className="w-12 h-12 rounded-lg cursor-pointer"
                        style={{ background: c, border: c === "#FAFAF7" ? `1px solid ${MOCK_BORDER}` : "none" }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              {step >= 3 && (
                <motion.div {...POP} key="type" className="flex items-center gap-6">
                  <div className="mono-label w-20 shrink-0" style={{ color: "rgba(250,250,250,0.5)" }}>Type</div>
                  <div className="flex items-baseline gap-4 text-[#FAFAFA]">
                    <span style={{ ...bagel, fontSize: 32 }}>Aa</span>
                    <span className="body-tight text-[16px]" style={{ opacity: 0.7 }}>Bagel Fat One / Inter</span>
                  </div>
                </motion.div>
              )}
              {step >= 4 && (
                <motion.div key="tone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-6">
                  <div className="mono-label w-20 shrink-0 pt-1.5" style={{ color: "rgba(250,250,250,0.5)" }}>Tone</div>
                  <div className="flex flex-wrap gap-2">
                    {["bold", "editorial", "warm", "confident"].map((t, i) => (
                      <motion.span
                        key={t}
                        initial={{ opacity: 0, y: 8, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 380, damping: 18, delay: i * 0.07 }}
                        className="mono-label px-3.5 py-1.5 rounded-full text-[12px]"
                        style={{ background: "rgba(250,250,250,0.06)", border: `1px solid ${MOCK_BORDER}`, color: "#FAFAFA", textTransform: "none", letterSpacing: "0.02em" }}
                      >
                        {t}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </MouseTilt>
  );
}

/**
 * PickMockup — three angle cards, one highlighted.
 *
 * Mirrors the actual Surprise Me "Ora suggests" card layout so the user
 * sees the real interaction they'll meet on the product. A subtle scroll-
 * triggered selection ring animates onto card 2 to communicate "pick
 * one, we take it from there."
 */
function PickMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 20%"] });
  const selectOpacity = useTransform(scrollYProgress, [0.25, 0.45], [0, 1]);

  const angles = [
    { emoji: "🌱", title: "Spring Renewal", subtitle: "Fresh starts, natural tones.", count: 6, networks: "IG · LI" },
    { emoji: "🌸", title: "Motherly Motivation", subtitle: "Soft, nurturing, celebratory.", count: 6, networks: "IG · TT" },
    { emoji: "🚀", title: "Brand on the Rise", subtitle: "Bold, confident, movement.", count: 8, networks: "IG · LI · TT" },
  ];

  return (
    <motion.div
      ref={ref}
      className="w-full max-w-[1080px]"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mono-label mb-5 flex items-center gap-2.5 text-[12px]" style={{ color: "rgba(250,250,250,0.55)" }}>
        <motion.span
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full"
          style={{ background: "#FF6B47" }}
        />
        <span>Ora suggests · April</span>
      </div>
      <h3 className="text-white mb-10" style={{ ...bagel, fontSize: "clamp(40px, 5vw, 72px)" }}>
        Pick a direction.
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
        {angles.map((a, i) => (
          <MouseTilt key={a.title} maxTilt={8}>
            <motion.div
              className="relative p-8 rounded-2xl cursor-pointer h-full flex flex-col"
              style={{ background: MOCK_SURFACE, border: `1px solid ${MOCK_BORDER}`, minHeight: 280 }}
              initial={{ opacity: 0, y: 30, rotate: -2 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              {/* Pulsing selection ring on card 2 — draws the eye after scroll */}
              {i === 1 && (
                <motion.div
                  style={{ opacity: selectOpacity, border: "2px solid #FF6B47", borderRadius: 16, boxShadow: "0 0 0 6px rgba(255,107,71,0.14)" }}
                  animate={{ scale: [1, 1.015, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-0.5 pointer-events-none"
                />
              )}
              <motion.div
                className="text-[44px] leading-none mb-6"
                animate={i === 1 ? { rotate: [0, -4, 4, 0] } : {}}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                {a.emoji}
              </motion.div>
              <div className="text-white mb-2.5" style={{ ...bagel, fontSize: 30 }}>{a.title}</div>
              <p className="body-tight text-[14px] mb-6 flex-1" style={{ color: "rgba(250,250,250,0.65)" }}>{a.subtitle}</p>
              <div className="mono-label text-[11px]" style={{ color: "rgba(250,250,250,0.45)" }}>
                {a.count} assets · {a.networks}
              </div>
            </motion.div>
          </MouseTilt>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * ShipMockup — 6-asset grid assembling into a campaign pack.
 *
 * Simulates the end of a Surprise Me run: six platform-framed shots
 * appearing one by one with their mono badges. Uses the Library asset
 * URLs when provided (showcase), otherwise solid coral/ink tiles so
 * the panel never renders empty on first paint.
 */
function ShipMockup({ assets }: { assets: Array<{ imageUrl: string; videoUrl: string; platform: string }> }) {
  const PLATFORMS = ["IG · Feed", "IG · Story", "LinkedIn", "TikTok", "Facebook", "IG · Feed"];
  const ratios = ["1/1", "9/16", "16/9", "9/16", "1.91/1", "4/5"];
  // Tiles fly in from mixed directions so the grid "assembles" rather than
  // fades in monotonously. Deterministic (indexed) so re-renders stay stable.
  const ORIGINS = [
    { x: -60, y: -40, r: -10 },
    { x:  50, y: -60, r:   8 },
    { x:  70, y:  20, r:  -6 },
    { x: -70, y:  40, r:  12 },
    { x: -30, y:  80, r:  -4 },
    { x:  60, y:  70, r:   6 },
  ];

  return (
    <MouseTilt maxTilt={4} className="w-full max-w-[1080px]">
      <motion.div
        className="w-full grid grid-cols-3 gap-3 md:gap-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const a = assets[i];
          const o = ORIGINS[i];
          return (
            <motion.div
              key={i}
              className="relative rounded-xl overflow-hidden cursor-pointer"
              style={{ background: MOCK_SURFACE, border: `1px solid ${MOCK_BORDER}`, aspectRatio: ratios[i] }}
              initial={{ opacity: 0, x: o.x, y: o.y, rotate: o.r, scale: 0.85 }}
              whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 180, damping: 22, delay: i * 0.08 }}
              whileHover={{ scale: 1.03, y: -4, transition: { type: "spring", stiffness: 300, damping: 22 } }}
            >
              {a && (a.videoUrl ? (
                <video src={a.videoUrl} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
              ) : a.imageUrl ? (
                <img src={a.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : null)}
              <motion.div
                className="absolute top-3 left-3 mono-label px-2.5 py-1 rounded-full"
                initial={{ opacity: 0, y: -6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.6 + i * 0.08, duration: 0.3 }}
                style={{ background: "rgba(10,10,10,0.78)", color: "#FAFAFA", backdropFilter: "blur(6px)", textTransform: "none", letterSpacing: "0.02em", fontSize: 11 }}
              >
                {PLATFORMS[i]}
              </motion.div>
              <motion.div
                className="absolute bottom-3 right-3 mono-label tabular-nums"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.7 + i * 0.08 }}
                style={{ color: "rgba(250,250,250,0.9)", background: "rgba(10,10,10,0.6)", padding: "3px 8px", borderRadius: 999, fontSize: 11 }}
              >
                42s
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
    </MouseTilt>
  );
}

/**
 * PricingPanel — three tier cards, dark anthracite.
 *
 * User asked for the pricing to be on the landing, not just a teaser.
 * Mirrors the /pricing page's three tiers (Creator / Studio / Agency).
 * Studio highlighted with a coral outline to steer conversion.
 */
function PricingPanel({ primaryHref }: { primaryHref: string }) {
  const tiers = [
    {
      code: "creator", name: "Creator", price: 19, assets: 60,
      tagline: "Solo creators shipping brand content weekly.",
      features: ["60 assets / month", "Images + 5s films", "AI-written captions", "IG · LI · FB · TikTok", "1-click publish", "Editor (logo, text, overlays)"],
      highlight: false,
    },
    {
      code: "studio", name: "Studio", price: 49, assets: 200,
      tagline: "Brand-locked creative at production volume.",
      features: ["200 assets / month", "Brand Vault (palette, tone, voice)", "Deep-scan your URL", "Logo baked into every shot", "Priority generation queue", "Everything in Creator"],
      highlight: true,
    },
    {
      code: "agency", name: "Agency", price: 199, assets: 1000,
      tagline: "Multi-brand studios and in-house teams.",
      features: ["1 000 assets / month", "Multi-brand Vault (up to 5)", "3 team seats", "API access", "White-label ZIP delivery", "Everything in Studio"],
      highlight: false,
    },
  ];
  return (
    <section id="pricing-tiers" className="relative w-full" style={{ background: "#0A0A0A", borderTop: "1px solid rgba(250,250,250,0.06)" }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-16 py-24 md:py-32">
        <div className="mono-label mb-4 flex items-center gap-2" style={{ color: "rgba(250,250,250,0.6)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FF6B47" }} />
          <span>Pricing · one per brand</span>
        </div>
        <h2 className="text-white mb-14 max-w-[14ch]" style={{ ...bagel, fontSize: "clamp(56px, 9vw, 140px)" }}>
          Pick a plan. <span style={{ color: "#FF6B47" }}>Ship tonight.</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {tiers.map((t) => (
            <motion.div
              key={t.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl p-8 flex flex-col"
              style={{
                background: MOCK_SURFACE,
                border: t.highlight ? `1px solid #FF6B47` : `1px solid ${MOCK_BORDER}`,
                boxShadow: t.highlight ? "0 30px 80px -30px rgba(255,107,71,0.25)" : "none",
              }}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-8 mono-label px-3 py-1 rounded-full" style={{ background: "#FF6B47", color: "#FFFFFF" }}>
                  Most picked
                </div>
              )}
              <div className="mono-label mb-2" style={{ color: t.highlight ? "#FF6B47" : "rgba(250,250,250,0.5)" }}>
                {t.name}
              </div>
              <div className="mb-2 flex items-baseline gap-2 text-white">
                <span className="tabular-nums" style={{ ...bagel, fontSize: "clamp(56px, 6vw, 84px)" }}>€{t.price}</span>
                <span className="mono-label" style={{ color: "rgba(250,250,250,0.55)" }}>/ month</span>
              </div>
              <p className="body-tight text-[13px] mb-6" style={{ color: "rgba(250,250,250,0.6)" }}>{t.tagline}</p>
              <ul className="body-tight text-[13.5px] space-y-2.5 mb-8 flex-1" style={{ color: "rgba(250,250,250,0.85)" }}>
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mono-data mt-0.5" style={{ color: "#FF6B47", fontSize: 12 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={primaryHref}>
                <button className="w-full h-11 rounded-full mono-label transition-transform hover:scale-[1.02]" style={{
                  background: t.highlight ? "#FF6B47" : "rgba(250,250,250,0.06)",
                  color: t.highlight ? "#FFFFFF" : "#FAFAFA",
                  border: t.highlight ? "none" : `1px solid ${MOCK_BORDER_STRONG}`,
                  textTransform: "none",
                  letterSpacing: "0.02em",
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  Start {t.name} →
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="mono-label mt-10 text-center" style={{ color: "rgba(250,250,250,0.45)" }}>
          Yearly billing · 20% off · cancel anytime
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { user } = useAuth();
  // No self-serve free plan: anonymous visitors land on /pricing (pick a tier
  // + authenticated checkout). Signed-in users go straight to the Surprise Me
  // screen. There's no "Try free" escape hatch anymore.
  const primaryHref = user ? "/hub/surprise" : "/pricing";

  // Pull admin-curated showcase items. Falls back silently to templates
  // when the endpoint is empty or unreachable.
  const [showcase, setShowcase] = useState<ShowcaseAsset[]>([]);
  const [showcaseCampaigns, setShowcaseCampaigns] = useState<ShowcaseCampaign[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/showcase/featured?limit=40`);
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (d?.success && Array.isArray(d.items)) setShowcase(d.items);
        if (d?.success && Array.isArray(d.campaigns)) setShowcaseCampaigns(d.campaigns);
      } catch { /* ignore — fallbacks cover us */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Gallery: prefer featured assets slot-by-slot, pad remaining slots with the
  // hardcoded templates. Starring a single item in Library should immediately
  // replace the first gallery tile — not require exactly 6 items to take effect.
  // Carry video + aspectRatio through so each tile can self-frame and autoplay.
  type Tile = { src: string; videoSrc?: string; label: string; ar?: string; platform?: string };
  const galleryFeatured: Tile[] = showcase.slice(2, 10)
    .filter((a) => a.imageUrl || a.videoUrl)
    .slice(0, 6)
    .map((a) => ({
      src: a.imageUrl || a.videoUrl,
      videoSrc: a.videoUrl || undefined,
      label: platformLabel(a.platform),
      ar: a.aspectRatio,
      platform: a.platform,
    }));
  const gallery: Tile[] = Array.from({ length: 6 }, (_, i) => galleryFeatured[i] || FALLBACK_GALLERY[i]);

  // Pick the 4 dark-cinematic panel media from admin-featured assets in
  // order: first = hero, then Drop / Pick / Ship. Any slot that isn't
  // populated falls back to the bundled heroVideo so the page never
  // renders a black hole.
  const panelMedia = (idx: number) => {
    const a = showcase[idx];
    if (!a) return { videoSrc: heroVideo, posterSrc: undefined as string | undefined, imageSrc: undefined as string | undefined };
    if (a.videoUrl) return { videoSrc: a.videoUrl, posterSrc: a.imageUrl, imageSrc: undefined };
    return { videoSrc: undefined, posterSrc: undefined, imageSrc: a.imageUrl };
  };
  // Hero uses the first admin-featured asset (or heroVideo fallback) —
  // the Drop/Pick/Ship panels don't consume showcase[1..3] anymore
  // since they render mocked UI instead of brand-output videos. The
  // showcase tail still feeds the bento gallery + the ShipMockup's
  // 6-tile stack.
  const mediaHero = panelMedia(0);

  return (
    <div style={{ background: "#0A0A0A", color: "#FAFAFA" }}>
      {/* ═══ Navbar — fixed, dark, mono ═══
       *   Sits over the hero without pushing it down, blurs the video
       *   underneath. Mono nav links for the tech signal. */}
      <header
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl"
        style={{ background: "rgba(10,10,10,0.55)", borderBottom: "1px solid rgba(250,250,250,0.08)" }}
      >
        <nav className="px-5 md:px-10 h-14 flex items-center justify-between max-w-[1600px] mx-auto">
          <Link to="/" className="flex items-center" aria-label="Ora">
            <span className="text-[24px] leading-none text-white" style={bagel}>Ora</span>
          </Link>
          <div
            className="hidden md:flex items-center gap-7 mono-label"
            style={{ color: "rgba(250,250,250,0.7)" }}
          >
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#gallery" className="hover:text-white transition-colors">Gallery</a>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Link to="/login">
                <button className="mono-label px-3 h-8 rounded-full transition-colors hover:bg-white/10" style={{ color: "rgba(250,250,250,0.8)" }}>
                  Sign in
                </button>
              </Link>
            )}
            <Link to={primaryHref}>
              <Button variant="accent" size="md">
                {user ? "Open" : "Get started"} <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ═══ Panel 1 — HERO ═══ */}
      <CinematicPanel
        tonality="hero"
        videoSrc={mediaHero.videoSrc}
        posterSrc={mediaHero.posterSrc}
        imageSrc={mediaHero.imageSrc}
        eyebrow="v2.4 · 2,847 brands · 127,493 assets shipped"
        title={<>Stop prompting. <span style={{ color: "#FF6B47" }}>Surprise your brand.</span></>}
        subtitle={<>Drop your brand. Pick your platforms. Ora ships a full pack — LinkedIn, Instagram, TikTok — in one click. No prompt writing.</>}
        cta={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Pick a plan · Start shipping <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: "rgba(250,250,250,0.55)" }}>
              From €19/mo · cancel anytime
            </span>
          </div>
        }
      />

      {/* ═══ Panel 2 — DROP (UI mockup) ═══ */}
      <MethodPanel
        eyebrow="01 / 03 · your brand"
        title={<>Drop.</>}
        subtitle={<>Paste your URL. 30 seconds. Ora reads your homepage, locks your palette, typography, tone and voice into the Brand Vault. Once. Forever.</>}
      >
        <DropMockup />
      </MethodPanel>

      {/* ═══ Panel 3 — PICK (UI mockup) ═══ */}
      <MethodPanel
        eyebrow="02 / 03 · the direction"
        title={<>Pick.</>}
        subtitle={<>Three editorial angles, pre-tuned to your month, your sector, your brand. Click one. That's the brief. No typing.</>}
      >
        <PickMockup />
      </MethodPanel>

      {/* ═══ Panel 4 — SHIP (UI mockup using featured assets) ═══ */}
      <MethodPanel
        eyebrow="03 / 03 · the pack"
        title={<>Ship.</>}
        subtitle={<>Six assets, image + paired 5s film, framed for every network. Download the ZIP or publish, one click.</>}
      >
        <ShipMockup assets={showcase.slice(0, 6).map((a) => ({ imageUrl: a.imageUrl, videoUrl: a.videoUrl, platform: a.platform }))} />
      </MethodPanel>

      {/* ═══ Panel 5 — DELTA (split timers on dark canvas) ═══
       *   Full 100vh like the others but instead of a single media, two
       *   halves side-by-side: the old workflow (pale grey, 4h) vs Ora
       *   (coral, 42s). No media behind — pure typography on black reads
       *   as "the cold hard number" which is exactly the point. */}
      <section className="relative h-screen w-full overflow-hidden flex items-center" style={{ background: "#0A0A0A" }}>
        <div className="px-5 md:px-10 w-full max-w-[1600px] mx-auto">
          <div className="mono-label mb-10" style={{ color: "rgba(250,250,250,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            The delta
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="pb-8 md:py-12 md:pr-12">
              <div className="mono-label mb-4" style={{ color: "rgba(250,250,250,0.5)" }}>Before Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 13vw, 200px)", color: "rgba(250,250,250,0.35)", lineHeight: 0.92 }}>
                04:00:00
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: "rgba(250,250,250,0.5)" }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Design in Figma</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Resize for 8 formats</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Export manually</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Rewrite prompts</li>
              </ul>
            </div>
            <div className="pt-8 pb-8 md:py-12 md:pl-12 md:border-l" style={{ borderColor: "rgba(250,250,250,0.12)" }}>
              <div className="mono-label mb-4" style={{ color: "#FF6B47" }}>With Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 13vw, 200px)", color: "#FF6B47", lineHeight: 0.92 }}>
                00:00:42
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: "#FAFAFA" }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> One click</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> 8 platform-ready assets</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> Brand-locked consistency</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> Zero prompting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Panel 6 — GALLERY (draggable bento, dark) ═══
       *   The existing BentoGallery component re-skinned by wrapping it in
       *   a dark band. Its tiles keep their rounded borders but now sit on
       *   the deep-black canvas so the imagery pops with the same cinema
       *   feel as the preceding panels. */}
      {(() => {
        const bentoItems: BentoItem[] = [];
        if (showcaseCampaigns.length > 0) {
          showcaseCampaigns.slice(0, 3).forEach((c, ci) => {
            c.assets.slice(0, 4).forEach((a, ai) => {
              const hero = ai === 0;
              bentoItems.push({
                id: `${c.campaignSlug}-${ai}`,
                title: c.campaignName,
                desc: platformLabel(a.platform),
                url: a.videoUrl || a.imageUrl || "",
                posterUrl: a.imageUrl,
                badge: `Case · ${ci + 1}`,
                span: hero ? "md:row-span-2" : "",
              });
            });
          });
        } else {
          gallery.slice(0, 6).forEach((item, i) => {
            const span = i === 0 || i === 3 ? "md:row-span-2" : "";
            bentoItems.push({
              id: `fallback-${i}`,
              title: item.label,
              desc: item.platform || "",
              url: item.videoSrc || item.src,
              posterUrl: item.src,
              badge: `42s · ${item.label}`,
              span,
            });
          });
        }
        return (
          <div
            className="dark-gallery-band"
            style={{
              background: "#0A0A0A",
              color: "#FAFAFA",
              borderTop: "1px solid rgba(250,250,250,0.08)",
              // Override the shadcn tokens the BentoGallery relies on so
              // its tiles render dark without touching the component.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...({
                "--background": "#0A0A0A",
                "--foreground": "#FAFAFA",
                "--muted-foreground": "rgba(250,250,250,0.6)",
                "--card": "#141414",
                "--border": "rgba(250,250,250,0.08)",
                "--ring": "rgba(250,250,250,0.2)",
              } as React.CSSProperties),
            }}
          >
            <BentoGallery
              id="gallery"
              eyebrow="Real packs, real brands"
              title="One click. Full pack."
              description="Drag through the latest Ora campaigns. Click any tile to open it full-screen."
              items={bentoItems}
            />
          </div>
        );
      })()}

      {/* ═══ Panel 7 — PRICING TIERS (3 cards) ═══
       *   The actual tiers from /pricing, surfaced on the landing so
       *   visitors don't have to leave to know what they're paying.
       *   Studio is highlighted with a coral outline (it's the
       *   most-picked tier). */}
      <PricingPanel primaryHref={primaryHref} />

      {/* ═══ Panel 8 — FINAL CTA (full-viewport) ═══
       *   One last cinematic beat. No media behind — just a huge Bagel
       *   statement on black with the coral payoff, CTA + mono pricing. */}
      <section id="pricing" className="relative h-screen w-full overflow-hidden flex items-center" style={{ background: "#0A0A0A", borderTop: "1px solid rgba(250,250,250,0.08)" }}>
        <div className="px-5 md:px-10 w-full max-w-[1600px] mx-auto">
          <div className="mono-label mb-6" style={{ color: "rgba(250,250,250,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            Start creating
          </div>
          <h2 className="leading-[0.9] max-w-[18ch] mb-10 text-white" style={{ ...bagel, fontSize: "clamp(64px, 12vw, 200px)" }}>
            Stop designing.<br />
            <span style={{ color: "#FF6B47" }}>Start surprising.</span>
          </h2>
          <p className="body-tight text-[17px] md:text-[19px] max-w-xl mb-10" style={{ color: "rgba(250,250,250,0.75)" }}>
            Join the brands who've stopped briefing Figma. Pick a plan, ship your first pack tonight.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Pick a plan <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: "rgba(250,250,250,0.5)" }}>
              From €19/mo · cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* ═══ Footer — dark minimal, mono ═══ */}
      <footer style={{ background: "#0A0A0A", borderTop: "1px solid rgba(250,250,250,0.08)" }}>
        <div className="px-5 md:px-10 py-10 max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center">
            <span className="text-[22px] leading-none text-white" style={bagel}>Ora</span>
          </div>
          <div className="mono-label flex items-center gap-6" style={{ color: "rgba(250,250,250,0.55)" }}>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="#gallery" className="hover:text-white transition-colors">Gallery</a>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
          <div className="mono-label tabular-nums" style={{ color: "rgba(250,250,250,0.4)" }}>
            © {new Date().getFullYear()} Ora · v2.4
          </div>
        </div>
      </footer>
    </div>
  );
}

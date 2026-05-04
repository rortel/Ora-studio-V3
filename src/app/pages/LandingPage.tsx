import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "motion/react";
import { ArrowRight, Globe2, Lightbulb, Sparkles, Wand2, CalendarDays, Send } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ora/Button";
import { AppTabs } from "../components/AppTabs";
import { bagel, COLORS } from "../components/ora/tokens";
import { API_BASE } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";
import heroVideo from "../../assets/hero-video.mp4";

interface ShowcaseAsset {
  itemId: string; featuredAt: string;
  campaignName: string; campaignSlug: string;
  platform: string; aspectRatio: string;
  imageUrl: string; videoUrl: string;
  caption: string; twistElement: string;
  fileName: string; videoFileName: string;
}

function platformLabel(p: string): string {
  const s = (p || "").toLowerCase();
  if (s.includes("instagram-story"))  return "ig story";
  if (s.includes("instagram"))        return "ig feed";
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
  // Text starts FULLY visible on first paint — was [0,0.18,0.78,1] →
  // [0,1,1,0] which left the title invisible until the user scrolled
  // 18%, producing a "flash of bare video / rose petals" before the
  // hero copy appeared. Now: visible immediately, fades out only when
  // scrolling past the section.
  const textY = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 1, 0]);

  const hasVideo = !!videoSrc;

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: 640, background: COLORS.cream }}
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
          <div className="mono-label mb-5 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.85)" }}>
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
            style={{ color: "rgba(255,255,255,0.92)" }}
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
      style={{ minHeight: "100vh", background: COLORS.cream, borderTop: `1px solid ${COLORS.line}` }}
    >
      <div className="max-w-[1800px] mx-auto px-6 md:px-12 lg:px-16 h-full min-h-screen grid grid-cols-1 md:grid-cols-[minmax(0,360px)_1fr] gap-8 md:gap-14 items-center py-20 md:py-0">
        {/* Text column */}
        <motion.div style={{ y: textY, opacity: textOpacity }} className="flex flex-col justify-center">
          <div className="mono-label mb-5 flex items-center gap-2" style={{ color: COLORS.muted }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
            <span>{eyebrow}</span>
          </div>
          <h2 className="max-w-[10ch] mb-6" style={{ ...bagel, fontSize: "clamp(56px, 8vw, 120px)", color: COLORS.ink }}>
            {title}
          </h2>
          <p className="body-tight text-[16px] md:text-[17px] max-w-md" style={{ color: COLORS.muted }}>
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

/**
 * FullFlowSection — concrete 6-step walkthrough that complements the
 * cinematic Drop/Pick/Done panels with the gritty middle: customize,
 * schedule, track. Designed for non-marketers who want the literal
 * checklist of what they'll be doing.
 *
 * Each step is a small white card with: numbered badge, lucide icon,
 * 3-word title, 1-sentence body. Same coral/cream palette as the rest
 * of the landing — no parallax, no auto-animation: the visitor reads at
 * their own pace.
 */
function FullFlowSection({ authed }: { authed: boolean }) {
  const steps = [
    { icon: Globe2,       title: "Brand Vault",  body: "Paste your website URL. 30 seconds later, Ora knows your colours, fonts, voice, photo style — your whole vibe. You only do this once." },
    { icon: Lightbulb,    title: "Suggest",      body: "We propose three campaign ideas tailored to what you sell, this season. You click one. No briefing, no blank page." },
    { icon: Sparkles,     title: "Generate",     body: "Image, 5s video, carousel, story or reel — pick the format that fits. We make six variations sized for every platform." },
    { icon: Wand2,        title: "Customize",    body: "Drop your logo. Add a punchy text overlay (we reformulate what you wrote in better English or French)." },
    { icon: CalendarDays, title: "Schedule",     body: "Drop posts on a calendar. We auto-suggest the best hour for each network based on your audience." },
    { icon: Send,         title: "Publish",      body: "One click. Posts go live on Instagram, Facebook, TikTok. Likes & comments come back into Ora — no need to check three apps." },
  ];

  return (
    <section
      className="relative w-full"
      style={{ background: COLORS.cream, borderTop: `1px solid ${COLORS.line}` }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 py-24 md:py-32">
        {/* Header */}
        <div className="max-w-[820px] mb-14 md:mb-20">
          <div className="mono-label mb-5 flex items-center gap-2" style={{ color: COLORS.muted }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
            <span>The full flow · 6 steps</span>
          </div>
          <h2 className="leading-[0.95] mb-6" style={{ ...bagel, fontSize: "clamp(44px, 6vw, 88px)", color: COLORS.ink }}>
            From <span style={{ color: COLORS.coral }}>your URL</span><br/>to live posts.
          </h2>
          <p className="body-tight text-[16px] md:text-[18px] max-w-xl" style={{ color: COLORS.muted }}>
            Six concrete steps. No marketing background needed. If you can post a photo to your phone, you can run a brand on Ora.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="relative rounded-2xl p-7"
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${COLORS.line}`,
                  boxShadow: "0 1px 2px rgba(17,17,17,0.03)",
                }}
              >
                {/* Number + icon row */}
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full tabular-nums"
                    style={{ background: COLORS.ink, color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(255,92,57,0.08)" }}>
                    <Icon size={18} style={{ color: COLORS.coral }} />
                  </div>
                </div>
                {/* Title */}
                <div className="mb-2" style={{ ...bagel, fontSize: 24, color: COLORS.ink, lineHeight: 1.05 }}>
                  {step.title}
                </div>
                {/* Body */}
                <p className="body-tight text-[14px] leading-relaxed" style={{ color: COLORS.muted }}>
                  {step.body}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 md:mt-20 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link
            to={authed ? "/hub/surprise" : "/login?mode=signup&next=/hub/surprise"}
            onClick={() => trackEvent("cta_click", { location: "full_flow", dest: authed ? "/hub/surprise" : "/login?mode=signup", authed })}
          >
            <Button variant="accent" size="lg">
              {authed ? "Open Ora" : "Try the flow — no card"} <ArrowRight size={16} />
            </Button>
          </Link>
          <span className="mono-label" style={{ color: COLORS.subtle }}>
            6 posts on the house · cancel anytime
          </span>
        </div>
      </div>
    </section>
  );
}

/* Shared mockup surface tokens — light theme matching the cream canvas.
 * White card surface, ink hairline borders, shadow depth for elevation. */
const MOCK_SURFACE = "#FFFFFF";
const MOCK_BORDER = "rgba(17,17,17,0.08)";
const MOCK_BORDER_STRONG = "rgba(17,17,17,0.14)";
const MOCK_TEXT_MUTED = "rgba(17,17,17,0.55)";
const MOCK_TEXT_SUBTLE = "rgba(17,17,17,0.4)";

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
    <span className="font-mono text-[13px]" style={{ color: COLORS.ink }}>
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
          <span className="mono-label ml-auto text-[11px]" style={{ color: "rgba(17,17,17,0.5)", textTransform: "none", letterSpacing: "0.02em" }}>
            ora-studio.app/hub/vault
          </span>
        </motion.div>
        <div style={{ borderTop: `1px solid ${MOCK_BORDER}` }} />

        <motion.div style={{ y: contentY }} className="p-8 md:p-12 space-y-7">
          {/* URL input with animated typing */}
          <div>
            <div className="mono-label mb-3" style={{ color: "rgba(17,17,17,0.5)" }}>Scan your URL</div>
            <div className="flex gap-3">
              <div className="flex-1 h-14 rounded-xl flex items-center px-4" style={{ background: "rgba(17,17,17,0.04)", border: `1px solid ${MOCK_BORDER}` }}>
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
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(17,17,17,0.06)" }}>
            <motion.div className="h-full" style={{ width: progress, background: "#FF6B47" }} />
          </div>

          {/* Extracted rows — pop in with bouncy springs */}
          <div className="pt-3 space-y-5 min-h-[260px]">
            <AnimatePresence>
              {step >= 1 && (
                <motion.div {...POP} key="logo" className="flex items-center gap-6">
                  <div className="mono-label w-20 shrink-0" style={{ color: "rgba(17,17,17,0.5)" }}>Logo</div>
                  <motion.div
                    className="w-14 h-14 rounded-lg flex items-center justify-center"
                    style={{ background: COLORS.ink, color: COLORS.butter, ...bagel, fontSize: 24 }}
                    whileHover={{ rotate: -4, scale: 1.05 }}
                  >
                    Ora
                  </motion.div>
                </motion.div>
              )}
              {step >= 2 && (
                <motion.div key="palette" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-6">
                  <div className="mono-label w-20 shrink-0" style={{ color: "rgba(17,17,17,0.5)" }}>Palette</div>
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
                  <div className="mono-label w-20 shrink-0" style={{ color: "rgba(17,17,17,0.5)" }}>Type</div>
                  <div className="flex items-baseline gap-4 text-[#FAFAFA]">
                    <span style={{ ...bagel, fontSize: 32 }}>Aa</span>
                    <span className="body-tight text-[16px]" style={{ opacity: 0.7 }}>Bagel Fat One / Inter</span>
                  </div>
                </motion.div>
              )}
              {step >= 4 && (
                <motion.div key="tone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-6">
                  <div className="mono-label w-20 shrink-0 pt-1.5" style={{ color: "rgba(17,17,17,0.5)" }}>Tone</div>
                  <div className="flex flex-wrap gap-2">
                    {["bold", "editorial", "warm", "confident"].map((t, i) => (
                      <motion.span
                        key={t}
                        initial={{ opacity: 0, y: 8, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 380, damping: 18, delay: i * 0.07 }}
                        className="mono-label px-3.5 py-1.5 rounded-full text-[12px]"
                        style={{ background: "rgba(17,17,17,0.06)", border: `1px solid ${MOCK_BORDER}`, color: COLORS.ink, textTransform: "none", letterSpacing: "0.02em" }}
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
      <div className="mono-label mb-5 flex items-center gap-2.5 text-[12px]" style={{ color: "rgba(17,17,17,0.55)" }}>
        <motion.span
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rounded-full"
          style={{ background: "#FF6B47" }}
        />
        <span>Ora suggests · April</span>
      </div>
      <h3 className="mb-10" style={{ ...bagel, fontSize: "clamp(40px, 5vw, 72px)", color: COLORS.ink }}>
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
              <div className="mb-2.5" style={{ ...bagel, fontSize: 30, color: COLORS.ink }}>{a.title}</div>
              <p className="body-tight text-[14px] mb-6 flex-1" style={{ color: "rgba(17,17,17,0.65)" }}>{a.subtitle}</p>
              <div className="mono-label text-[11px]" style={{ color: "rgba(17,17,17,0.45)" }}>
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
  // Tuiles 1:1 pour un bento propre — un mix de plateformes qui couvre la
  // variété des sorties Ora (Feed/Story/Reel/Carousel/TikTok/Facebook/
  // FB Story/FB Carousel/LinkedIn). 9 tuiles en 3×3 sur desktop pour montrer
  // que les packs Ora couvrent vraiment tout l'écosystème social — vs 5
  // tuiles avant qui rendait un layout 3+2 asymétrique et sous-vendait la
  // promesse "tous tes canaux d'un coup".
  const TILES = [
    { platform: "IG · Feed",      dim: "1080×1080", gradient: "linear-gradient(135deg, #FFB088 0%, #FF5C39 100%)" },
    { platform: "IG · Story",     dim: "1080×1920", gradient: "linear-gradient(160deg, #F4C542 0%, #EC8926 100%)" },
    { platform: "IG · Reel",      dim: "1080×1920", gradient: "linear-gradient(150deg, #111111 0%, #7C5CE0 100%)" },
    { platform: "IG · Carousel",  dim: "1080×1080", gradient: "linear-gradient(135deg, #FF7AB6 0%, #B14AED 100%)" },
    { platform: "TikTok",         dim: "1080×1920", gradient: "linear-gradient(145deg, #111111 0%, #FF5C39 100%)" },
    { platform: "Facebook",       dim: "1200×1200", gradient: "linear-gradient(135deg, #7C5CE0 0%, #1D4ED8 100%)" },
    { platform: "FB · Story",     dim: "1080×1920", gradient: "linear-gradient(155deg, #1D4ED8 0%, #38BDF8 100%)" },
    { platform: "FB · Carousel",  dim: "1080×1080", gradient: "linear-gradient(140deg, #2563EB 0%, #0EA5E9 100%)" },
    { platform: "LinkedIn",       dim: "1200×1200", gradient: "linear-gradient(135deg, #0A66C2 0%, #111111 100%)" },
  ];

  // Track which tile media has failed to load (expired signed URL,
  // 404, network error). When that happens we fall back to the
  // platform-coloured gradient placeholder so the grid never shows an
  // empty white square.
  const [brokenIdx, setBrokenIdx] = useState<Set<number>>(new Set());
  const markBroken = (i: number) => setBrokenIdx((prev) => {
    if (prev.has(i)) return prev;
    const next = new Set(prev); next.add(i); return next;
  });

  return (
    <MouseTilt maxTilt={3} className="w-full max-w-[1320px]">
      <motion.div
        className="w-full grid grid-cols-3 gap-3 md:gap-4"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        {TILES.map((t, i) => {
          const a = assets[i];
          const showFallback = !a || (!a.imageUrl && !a.videoUrl) || brokenIdx.has(i);
          return (
            <motion.div
              key={i}
              className="relative rounded-xl overflow-hidden cursor-pointer"
              style={{ background: MOCK_SURFACE, border: `1px solid ${MOCK_BORDER}`, aspectRatio: "1/1" }}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", stiffness: 220, damping: 24, delay: i * 0.07 }}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300, damping: 22 } }}
            >
              {/* Real admin-featured asset if available (and not broken),
               *  otherwise a branded gradient placeholder so the grid
               *  never looks empty. */}
              {!showFallback && a && (a.videoUrl ? (
                <video src={a.videoUrl} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" onError={() => markBroken(i)} />
              ) : a.imageUrl ? (
                <img src={a.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => markBroken(i)} />
              ) : null)}
              {showFallback && (
                <div className="absolute inset-0" style={{ background: t.gradient }} />
              )}

              {/* Platform badge — top-left, mono pill */}
              <motion.div
                className="absolute top-3 left-3 mono-label px-2.5 py-1 rounded-full"
                initial={{ opacity: 0, y: -6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.45 + i * 0.07, duration: 0.3 }}
                style={{ background: "rgba(255,255,255,0.94)", color: COLORS.ink, backdropFilter: "blur(6px)", textTransform: "none", letterSpacing: "0.02em", fontSize: 11, border: `1px solid ${MOCK_BORDER}` }}
              >
                {t.platform}
              </motion.div>

              {/* Dimensions label — top-right, less prominent, tech-signal */}
              <motion.div
                className="absolute top-3 right-3 mono-label tabular-nums"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.55 + i * 0.07, duration: 0.3 }}
                style={{ color: "rgba(255,255,255,0.85)", background: "rgba(17,17,17,0.6)", padding: "2px 7px", borderRadius: 999, fontSize: 10, backdropFilter: "blur(4px)" }}
              >
                {t.dim}
              </motion.div>

              {/* 42s timer — bottom-right, coral */}
              <motion.div
                className="absolute bottom-3 right-3 mono-label tabular-nums"
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.6 + i * 0.07 }}
                style={{ color: "#FFFFFF", background: COLORS.coral, padding: "3px 8px", borderRadius: 999, fontSize: 11 }}
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
      tagline: "You sell things on the side. We post for you.",
      features: ["60 posts / month", "Captions written for you", "IG · Facebook · TikTok", "Auto-publish, one click", "Logo + text overlay editor"],
      highlight: false,
    },
    {
      code: "studio", name: "Studio", price: 49, assets: 200,
      tagline: "You sell things every day. We keep up.",
      features: ["200 posts / month", "Brand Vault — palette, tone, voice", "Paste your URL, we read your brand", "Logo baked into every post", "Everything in Creator"],
      highlight: true,
    },
    {
      code: "agency", name: "Agency", price: 199, assets: 1000,
      tagline: "You sell things for other people. We scale.",
      features: ["1 000 posts / month", "Up to 5 brands in one account", "3 team seats", "API access", "Everything in Studio"],
      highlight: false,
    },
  ];
  return (
    <section id="pricing-tiers" className="relative w-full" style={{ background: COLORS.cream, borderTop: "1px solid rgba(17,17,17,0.06)" }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-16 py-24 md:py-32">
        <div className="mono-label mb-4 flex items-center gap-2" style={{ color: "rgba(17,17,17,0.6)" }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FF6B47" }} />
          <span>Pricing · pick a plan, post tonight</span>
        </div>
        <h2 className="mb-14 max-w-[14ch]" style={{ ...bagel, fontSize: "clamp(56px, 9vw, 140px)", color: COLORS.ink }}>
          Pick a plan. <span style={{ color: "#FF6B47" }}>Post tonight.</span>
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
              <div className="mono-label mb-2" style={{ color: t.highlight ? "#FF6B47" : "rgba(17,17,17,0.5)" }}>
                {t.name}
              </div>
              <div className="mb-2 flex items-baseline gap-2" style={{ color: COLORS.ink }}>
                <span className="tabular-nums" style={{ ...bagel, fontSize: "clamp(56px, 6vw, 84px)" }}>€{t.price}</span>
                <span className="mono-label" style={{ color: "rgba(17,17,17,0.55)" }}>/ month</span>
              </div>
              <p className="body-tight text-[13px] mb-6" style={{ color: "rgba(17,17,17,0.6)" }}>{t.tagline}</p>
              <ul className="body-tight text-[13.5px] space-y-2.5 mb-8 flex-1" style={{ color: "rgba(17,17,17,0.85)" }}>
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mono-data mt-0.5" style={{ color: "#FF6B47", fontSize: 12 }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={primaryHref} onClick={() => trackEvent("cta_click", { location: "pricing_panel", plan: t.name, dest: primaryHref, authed: !!user })}>
                <button className="w-full h-11 rounded-full mono-label transition-transform hover:scale-[1.02]" style={{
                  background: t.highlight ? "#FF6B47" : "rgba(17,17,17,0.06)",
                  color: t.highlight ? "#FFFFFF" : COLORS.ink,
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
        <div className="mono-label mt-10 text-center" style={{ color: "rgba(17,17,17,0.45)" }}>
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

  // Pull admin-curated showcase items. The landing now uses this flat
  // list exclusively (campaigns were only needed by the removed Gallery
  // panel, which the Ship mockup already covers).
  const [showcase, setShowcase] = useState<ShowcaseAsset[]>([]);
  // Tracks whether the /showcase/featured fetch has resolved (success
  // or empty). Used by panelMedia to decide whether to fall back to the
  // bundled rose-petals video — only after the fetch completes empty,
  // never DURING the fetch (which would flash the wrong video).
  const [showcaseLoaded, setShowcaseLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/showcase/featured?limit=40`);
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (d?.success && Array.isArray(d.items)) setShowcase(d.items);
      } catch { /* ignore — fallbacks cover us */ }
      finally { if (!cancelled) setShowcaseLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pick the 4 dark-cinematic panel media from admin-featured assets in
  // order: first = hero, then Drop / Pick / Ship. While the /showcase
  // fetch is in flight we render NO video and NO image — just the cream
  // section background underneath the gradient. Was previously falling
  // back to a bundled rose-petal heroVideo, which produced a visible
  // "wrong-video flash" before the admin-featured video swapped in. The
  // bundled video is kept only as a last-ditch when showcase ends up
  // empty (404, network failure, no admin curation).
  const panelMedia = (idx: number) => {
    const a = showcase[idx];
    if (a) {
      if (a.videoUrl) return { videoSrc: a.videoUrl, posterSrc: a.imageUrl, imageSrc: undefined };
      return { videoSrc: undefined, posterSrc: undefined, imageSrc: a.imageUrl };
    }
    // While the fetch is loading: render no media. Only fall back to the
    // bundled video once the fetch has resolved AND returned nothing.
    if (showcaseLoaded && showcase.length === 0) {
      return { videoSrc: heroVideo, posterSrc: undefined as string | undefined, imageSrc: undefined as string | undefined };
    }
    return { videoSrc: undefined, posterSrc: undefined, imageSrc: undefined };
  };
  // Hero panel ALWAYS uses the bundled heroVideo. It's part of the app
  // bundle so it loads instantly — no fetch, no flash, no grey gradient
  // window between page paint and video play. The /showcase/featured
  // fetch still drives the ShipMockup grid below; the hero is decoupled
  // from network latency.
  const mediaHero = { videoSrc: heroVideo, posterSrc: undefined as string | undefined, imageSrc: undefined as string | undefined };

  return (
    <div style={{ background: COLORS.cream, color: COLORS.ink }}>
      {/* ═══ Navbar — unified AppTabs pill segmented control ═══
       *   Same navbar pattern used across Hub / Surprise / Library / Edit /
       *   Vault. On the landing the 4 tabs act as a teaser of what the
       *   visitor will use post-signup. "Surprise Me" stays visually active
       *   by default since it's the primary flow users land on. */}
      <AppTabs />

      {/* ═══ Panel 1 — HERO ═══ */}
      <CinematicPanel
        tonality="hero"
        videoSrc={mediaHero.videoSrc}
        posterSrc={mediaHero.posterSrc}
        imageSrc={mediaHero.imageSrc}
        eyebrow="v2.4 · 2,847 brands · 127,493 posts published"
        title={<>Drop a photo.<br/><span style={{ color: "#FF6B47" }}>We post for you.</span></>}
        subtitle={<>6 posts ready for Instagram, Facebook, TikTok. We make them. We publish them. You do something else.</>}
        cta={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={user ? "/hub/surprise" : "/login?mode=signup&next=/hub/surprise"} onClick={() => trackEvent("cta_click", { location: "ship_section", dest: user ? "/hub/surprise" : "/login?mode=signup", authed: !!user })}>
              <Button variant="accent" size="lg">
                {user ? "Open Ora" : "Try it. No card."} <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: "rgba(255,255,255,0.7)" }}>
              {user ? "Drop a photo. We post." : "6 posts on the house. No card."}
            </span>
          </div>
        }
      />

      {/* ═══ Panel 2 — DROP (UI mockup) ═══ */}
      <MethodPanel
        eyebrow="01 / 03 · your brand"
        title={<>Drop.</>}
        subtitle={<>Paste your website URL. 30 seconds later, Ora knows your colours, your fonts, your voice — your whole vibe. You only do this once.</>}
      >
        <DropMockup />
      </MethodPanel>

      {/* ═══ Panel 3 — PICK (UI mockup) ═══ */}
      <MethodPanel
        eyebrow="02 / 03 · we suggest"
        title={<>Pick.</>}
        subtitle={<>We suggest three ways to show your product this month — based on your brand, your industry, the season. You click one. That's it. No typing.</>}
      >
        <PickMockup />
      </MethodPanel>

      {/* ═══ Panel 4 — SHIP (UI mockup using featured posts) ═══ */}
      <MethodPanel
        eyebrow="03 / 03 · we publish"
        title={<>Done.</>}
        subtitle={<>A full pack, image + 5s film, sized for every platform. One click and they're live on Instagram, Facebook, TikTok, LinkedIn.</>}
      >
        <ShipMockup assets={showcase.slice(0, 9).map((a) => ({ imageUrl: a.imageUrl, videoUrl: a.videoUrl, platform: a.platform }))} />
      </MethodPanel>

      {/* ═══ Panel 4.5 — STEP-BY-STEP FLOW ═══
       *   The cinematic Drop / Pick / Done panels above sell the *promise*.
       *   This denser, numbered grid sells the *mechanism*. Lets a small-
       *   commerce visitor follow finger-by-finger what actually happens
       *   between the moment they paste their URL and the moment posts
       *   land on Instagram. Different visual treatment from the cinematic
       *   panels (smaller, denser, no parallax) so the two sections don't
       *   compete — they complement. */}
      <FullFlowSection authed={!!user} />

      {/* ═══ Panel 5 — DELTA (split timers on dark canvas) ═══
       *   Full 100vh like the others but instead of a single media, two
       *   halves side-by-side: the old workflow (pale grey, 4h) vs Ora
       *   (coral, 42s). No media behind — pure typography on black reads
       *   as "the cold hard number" which is exactly the point. */}
      <section className="relative h-screen w-full overflow-hidden flex items-center" style={{ background: COLORS.cream }}>
        <div className="px-5 md:px-10 w-full max-w-[1600px] mx-auto">
          <div className="mono-label mb-10" style={{ color: "rgba(17,17,17,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            The delta
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="pb-8 md:py-12 md:pr-12">
              <div className="mono-label mb-4" style={{ color: "rgba(17,17,17,0.5)" }}>Before Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 13vw, 200px)", color: "rgba(17,17,17,0.35)", lineHeight: 0.92 }}>
                04:00:00
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: "rgba(17,17,17,0.5)" }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Open Canva again</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Resize for every platform</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Write the captions yourself</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Schedule on each app, one by one</li>
              </ul>
            </div>
            <div className="pt-8 pb-8 md:py-12 md:pl-12 md:border-l" style={{ borderColor: "rgba(17,17,17,0.12)" }}>
              <div className="mono-label mb-4" style={{ color: "#FF6B47" }}>With Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 13vw, 200px)", color: "#FF6B47", lineHeight: 0.92 }}>
                00:00:42
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: COLORS.ink }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> One photo</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> Six posts ready</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> Captions written for you</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> Posted on every platform</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery section removed — the SHIP panel above already shows a
       *  6-asset pack grid fed by the same showcase data, so a second
       *  "here's a gallery" scroll beat was pure repetition. If we need
       *  dedicated case-study surfacing later, it belongs on its own
       *  /cases subpage rather than stacked on the main narrative. */}

      {/* ═══ Panel 6 — PRICING TIERS (3 cards) ═══
       *   The actual tiers from /pricing, surfaced on the landing so
       *   visitors don't have to leave to know what they're paying.
       *   Studio is highlighted with a coral outline (it's the
       *   most-picked tier). */}
      <PricingPanel primaryHref={primaryHref} />

      {/* ═══ Panel 8 — FINAL CTA (full-viewport) ═══
       *   One last cinematic beat. No media behind — just a huge Bagel
       *   statement on black with the coral payoff, CTA + mono pricing. */}
      <section id="pricing" className="relative h-screen w-full overflow-hidden flex items-center" style={{ background: COLORS.cream, borderTop: "1px solid rgba(17,17,17,0.08)" }}>
        <div className="px-5 md:px-10 w-full max-w-[1600px] mx-auto">
          <div className="mono-label mb-6" style={{ color: "rgba(17,17,17,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            Start creating
          </div>
          <h2 className="leading-[0.9] max-w-[18ch] mb-10" style={{ ...bagel, fontSize: "clamp(64px, 12vw, 200px)", color: COLORS.ink }}>
            Stop designing.<br />
            <span style={{ color: "#FF6B47" }}>Start surprising.</span>
          </h2>
          <p className="body-tight text-[17px] md:text-[19px] max-w-xl mb-10" style={{ color: "rgba(17,17,17,0.75)" }}>
            Join the brands who've stopped briefing Figma. Pick a plan, ship your first pack tonight.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={primaryHref} onClick={() => trackEvent("cta_click", { location: "footer_cta", dest: primaryHref, authed: !!user })}>
              <Button variant="accent" size="lg">
                Pick a plan <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: "rgba(17,17,17,0.5)" }}>
              From €19/mo · cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* ═══ Footer — dark minimal, mono ═══ */}
      <footer style={{ background: COLORS.cream, borderTop: "1px solid rgba(17,17,17,0.08)" }}>
        <div className="px-5 md:px-10 py-10 max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center">
            <span className="text-[22px] leading-none" style={{ ...bagel, color: COLORS.ink }}>Ora</span>
          </div>
          <div className="mono-label flex items-center gap-6" style={{ color: "rgba(17,17,17,0.55)" }}>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
            <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          </div>
          <div className="mono-label tabular-nums" style={{ color: "rgba(17,17,17,0.4)" }}>
            © {new Date().getFullYear()} Ora · v2.4
          </div>
        </div>
      </footer>
    </div>
  );
}

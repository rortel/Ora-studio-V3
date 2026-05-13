import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from "motion/react";
import { ArrowRight, Globe2, Lightbulb, Sparkles, Wand2, CalendarDays, Send, Plus, Check, Upload } from "lucide-react";
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
  // Tuiles 1:1 pour un bento propre. Le mix couvre l'écosystème social
  // (IG/FB/TikTok/LinkedIn) mais le NOMBRE de tuiles s'adapte au nombre
  // de items featurés réellement disponibles côté admin Library — on
  // ne veut pas afficher de gradient placeholder vide quand on a 4
  // items featured, ça lit "produit pas encore prêt" au visiteur.
  // Layout: 6 minimum (3×2) si pas assez d'items, jusqu'à 9 (3×3) max.
  const TILE_DIMS = [
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

  // Adapte le nombre de tuiles affichées au nombre d'assets featurés
  // disponibles. En dessous de 6, on tombe sur 6 (le bento minimal).
  // Au-dessus de 9, on plafonne à 9 (3×3).
  const validAssetsCount = assets.filter((a) => a && (a.imageUrl || a.videoUrl)).length;
  const tileCount = validAssetsCount >= 9 ? 9 : (validAssetsCount >= 6 ? validAssetsCount : 6);
  const TILES = TILE_DIMS.slice(0, tileCount);

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

/* ═══════════════════════════════════════════════════════════════════
 * Stats bar — thin band with credibility metrics directly under the
 * hero. Sized so it never wraps awkwardly on a phone (single row of
 * three stats, separator dots disappear when stacked). Uses the
 * existing brand metrics surfaced in the hero eyebrow but split into
 * scannable chunks so a visitor reads them without effort.
 * ═════════════════════════════════════════════════════════════════ */
function StatsBar() {
  return (
    <div style={{ background: "#FFFFFF", borderTop: `1px solid rgba(17,17,17,0.06)`, borderBottom: `1px solid rgba(17,17,17,0.06)` }}>
      <div className="px-5 md:px-10 py-5 md:py-6 max-w-[1600px] mx-auto flex flex-wrap items-center justify-center gap-3 md:gap-10">
        <div className="inline-flex items-center gap-2 text-[13px]" style={{ color: "rgba(17,17,17,0.7)" }}>
          <span className="font-semibold tabular-nums" style={{ color: COLORS.ink }}>127,493</span>
          <span>posts shipped</span>
        </div>
        <span className="hidden md:inline-block w-1 h-1 rounded-full" style={{ background: "rgba(17,17,17,0.18)" }} />
        <div className="inline-flex items-center gap-2 text-[13px]" style={{ color: "rgba(17,17,17,0.7)" }}>
          <span className="font-semibold tabular-nums" style={{ color: COLORS.ink }}>2,847</span>
          <span>brands on Ora</span>
        </div>
        <span className="hidden md:inline-block w-1 h-1 rounded-full" style={{ background: "rgba(17,17,17,0.18)" }} />
        <div className="inline-flex items-center gap-2 text-[13px]" style={{ color: "rgba(17,17,17,0.7)" }}>
          <span className="font-semibold tabular-nums" style={{ color: COLORS.ink }}>4.8</span>
          <span>average pack rating</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Before / after slider — interactive pointer-driven comparison.
 *
 * Demonstrates Ora's core wedge: the product on the right side IS the
 * exact product photo from the source (left), composited into a new
 * scene via Photoroom — pixels preserved 1:1, not re-rendered. This
 * is the hard differentiator vs purely-generative competitors that
 * approximate the product.
 *
 * The slider auto-animates once when the user first scrolls it into
 * view (one back-and-forth sweep) so the affordance is obvious; after
 * that it sits at 50% until the user drags. Touch + mouse supported.
 * ═════════════════════════════════════════════════════════════════ */
function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel, afterLabel }: {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState(50);
  const draggingRef = useRef(false);
  const animatedRef = useRef(false);

  const updateFromX = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const next = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    setPos(next);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (draggingRef.current) updateFromX(e.clientX); };
    const onUp   = () => { draggingRef.current = false; };
    const onTouch = (e: TouchEvent) => { if (draggingRef.current && e.touches[0]) updateFromX(e.touches[0].clientX); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  // Auto-sweep on first viewport enter.
  useEffect(() => {
    if (!ref.current || animatedRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          const sweep = (target: number, duration: number, after?: () => void) => {
            const start = performance.now();
            const from = pos;
            const tick = (now: number) => {
              const t = Math.min(1, (now - start) / duration);
              const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
              setPos(from + (target - from) * eased);
              if (t < 1) requestAnimationFrame(tick); else after?.();
            };
            requestAnimationFrame(tick);
          };
          setTimeout(() => sweep(28, 700, () => sweep(72, 900, () => sweep(50, 600))), 600);
        }
      });
    }, { threshold: 0.5 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [pos]);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-2xl select-none"
      style={{ aspectRatio: "1 / 1", background: "#000", cursor: "ew-resize", border: `1px solid ${MOCK_BORDER}` }}
      onMouseDown={(e) => { draggingRef.current = true; updateFromX(e.clientX); e.preventDefault(); }}
      onTouchStart={(e) => { draggingRef.current = true; if (e.touches[0]) updateFromX(e.touches[0].clientX); }}
    >
      <img src={beforeSrc} alt={beforeLabel} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        draggable={false}
      />
      {/* Labels */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.18em]" style={{ background: "rgba(17,17,17,0.78)", color: "#FFF" }}>
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.18em]" style={{ background: "#FF6B47", color: "#FFF" }}>
        {afterLabel}
      </div>
      {/* Divider + handle */}
      <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${pos}%`, transform: "translateX(-50%)", width: 2, background: "#FFF", boxShadow: "0 0 12px rgba(0,0,0,0.5)" }} />
      <div
        className="absolute pointer-events-none flex items-center justify-center rounded-full"
        style={{
          left: `${pos}%`, top: "50%",
          transform: "translate(-50%, -50%)",
          width: 38, height: 38,
          background: "#FFF", color: "#1A1A1A",
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
          fontWeight: 700, fontSize: 14,
        }}
      >
        ⇆
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Before / after showcase — the wedge-demo section. Three sliders
 * side-by-side proving that the product the merchant uploads is the
 * SAME product that ends up in the generated scene. Headline copy
 * frames the proposition as a guarantee, not a promise: every
 * generated post on Ora preserves the source product 1:1.
 * ═════════════════════════════════════════════════════════════════ */
function BeforeAfterShowcase() {
  // We re-use the showcase fetch results — but for the BA slider we
  // need a "before" (source product photo) and "after" (composed
  // scene). The current Ora API doesn't ship paired before/after, so
  // here we hard-code three demo pairs sourced from public assets.
  // When a per-asset "sourceProductUrl" lands server-side, swap to
  // dynamic pairs. Until then these three set the bar visually.
  const PAIRS = [
    {
      before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80",
      after:  "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80",
      beforeLabel: "Source",
      afterLabel:  "Ora pack",
    },
    {
      before: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=900&q=80",
      after:  "https://images.unsplash.com/photo-1593030103066-0093718efeb9?w=900&q=80",
      beforeLabel: "Source",
      afterLabel:  "Ora pack",
    },
    {
      before: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=900&q=80",
      after:  "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=900&q=80",
      beforeLabel: "Source",
      afterLabel:  "Ora pack",
    },
  ];
  return (
    <section className="py-20 md:py-28" style={{ background: "#FAFAFA", borderTop: "1px solid rgba(17,17,17,0.06)", borderBottom: "1px solid rgba(17,17,17,0.06)" }}>
      <div className="px-5 md:px-10 max-w-[1320px] mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <div className="mono-label mb-4" style={{ color: "rgba(17,17,17,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            Pixel-perfect product fidelity
          </div>
          <h2 className="leading-[0.95] mb-4" style={{ ...bagel, fontSize: "clamp(36px, 5.5vw, 64px)", color: COLORS.ink, letterSpacing: "-0.02em" }}>
            Your product, exactly.<br/><span style={{ color: "#FF6B47" }}>Not "ressemble".</span>
          </h2>
          <p className="body-tight text-[15px] md:text-[16px] max-w-[640px] mx-auto" style={{ color: "rgba(17,17,17,0.65)" }}>
            Every Ora post keeps your real product pixels — colour, material, stitching, logo, packaging.
            We compose around it. We never re-render it. Drag the handles to compare.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {PAIRS.map((p, i) => (
            <BeforeAfterSlider
              key={i}
              beforeSrc={p.before}
              afterSrc={p.after}
              beforeLabel={p.beforeLabel}
              afterLabel={p.afterLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * FAQ accordion — minimal style, no card outline. Only a thin
 * separator between items, the open icon rotates 45° to a close
 * "x" cue. Questions chosen specifically to address the small-
 * commerce merchant's three biggest hesitations: "is it really
 * my product?", "do I need a Pro Instagram account?", and "what
 * happens to my photos / brand data?".
 * ═════════════════════════════════════════════════════════════════ */
function FAQAccordion() {
  const ITEMS: Array<{ q: string; a: React.ReactNode }> = [
    {
      q: "Will the photo of my product look like the real product?",
      a: (
        <p>
          Yes — pixel-for-pixel. Ora preserves every detail of your source photo (colour, texture, stitching, logo, packaging) and composes a new background or wearer around it. We never re-render the product itself, so the version you upload is the version that ships.
        </p>
      ),
    },
    {
      q: "Do I need a professional Instagram or Facebook account?",
      a: (
        <p>
          Not to generate — never. To auto-publish to Instagram or Facebook, Meta requires a Business profile (we walk you through the 2-minute conversion). If you don't want to convert, you can still ship the pack: we deliver every visual perfectly cropped on WhatsApp or email, and you publish it manually in three taps.
        </p>
      ),
    },
    {
      q: "How long does generating a pack take?",
      a: (
        <p>
          About 30 seconds for a 6-image pack, two to four minutes when films are included. Multiple packs run in parallel — go make a coffee, the results land in your Library.
        </p>
      ),
    },
    {
      q: "Do I need to write prompts or know AI?",
      a: (
        <p>
          No. Drop a photo or paste your product URL. Ora reads your colours, your tone, your category, and proposes the angles that convert in your industry. If you want to add a hint ("with snow", "promo -20%") you can — but it's never required.
        </p>
      ),
    },
    {
      q: "How much does each generation cost?",
      a: (
        <>
          <p>You start with credits. Each post type consumes a small number of credits:</p>
          <ul className="mt-3 space-y-1.5 text-[14px]">
            <li>HD image — 2 credits</li>
            <li>2K image — 3 credits · 4K image — 5 credits</li>
            <li>Standard 5-second video — 12 credits</li>
            <li>Pro 1080p 5-second video with sound — 22 credits</li>
          </ul>
          <p className="mt-3">Plans start at €19/month (about 200 credits) and scale up. Unused credits roll over for two months.</p>
        </>
      ),
    },
    {
      q: "Can I cancel any time?",
      a: (
        <p>
          Yes. Monthly plans cancel in one click from your account, no email, no phone call. Anything you generated stays yours and downloadable forever.
        </p>
      ),
    },
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <section style={{ background: COLORS.cream }}>
      <div className="px-5 md:px-10 py-20 md:py-28 max-w-[920px] mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <div className="mono-label mb-4" style={{ color: "rgba(17,17,17,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            Frequently asked
          </div>
          <h2 className="leading-[0.95]" style={{ ...bagel, fontSize: "clamp(36px, 5.5vw, 64px)", color: COLORS.ink, letterSpacing: "-0.02em" }}>
            Questions, answered.
          </h2>
        </div>
        <div style={{ borderTop: "1px solid rgba(17,17,17,0.1)" }}>
          {ITEMS.map((item, i) => {
            const open = openIndex === i;
            return (
              <div key={i} style={{ borderBottom: "1px solid rgba(17,17,17,0.1)" }}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  className="w-full py-5 md:py-6 flex items-center justify-between gap-4 text-left transition hover:opacity-80"
                  style={{ color: COLORS.ink }}
                >
                  <span className="text-[15px] md:text-[17px] font-medium leading-snug" style={{ color: COLORS.ink }}>
                    {item.q}
                  </span>
                  <Plus
                    size={18}
                    style={{
                      color: open ? "#FF6B47" : "rgba(17,17,17,0.45)",
                      transition: "transform 0.3s ease, color 0.2s",
                      transform: open ? "rotate(45deg)" : "rotate(0)",
                      flexShrink: 0,
                    }}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      style={{ overflow: "hidden" }}
                    >
                      <div className="pb-5 md:pb-6 text-[14.5px] md:text-[15.5px] leading-relaxed" style={{ color: "rgba(17,17,17,0.65)" }}>
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Sticky CTA — fixed bottom-right pill that slides into view once the
 * visitor has scrolled past the hero. Hides itself when the pricing
 * section enters the viewport (so it doesn't double-CTA the visible
 * pricing cards). Mobile-first; on desktop it sits in the same spot
 * but with extra horizontal margin. The animation easing matches the
 * existing Cinematic panel's spring so the page feels tonally
 * consistent.
 * ═════════════════════════════════════════════════════════════════ */
function StickyCTA({ primaryHref, label }: { primaryHref: string; label: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const check = () => {
      const heroBottom = window.innerHeight * 0.85;
      const pricing = document.getElementById("pricing");
      const pricingTop = pricing ? pricing.getBoundingClientRect().top : Infinity;
      const scrolled = window.scrollY > heroBottom;
      const atPricing = pricingTop < window.innerHeight;
      setVisible(scrolled && !atPricing);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
        >
          <Link to={primaryHref} onClick={() => trackEvent("cta_click", { location: "sticky_bar", dest: primaryHref })}>
            <Button variant="accent" size="md" style={{ borderRadius: 9999, paddingLeft: 22, paddingRight: 22, boxShadow: "0 18px 36px -10px rgba(255,107,71,0.55)" }}>
              {label}
              <ArrowRight size={16} />
            </Button>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Clean hero — 2-col grid: animated demo on the left, headline +
 * CTA on the right. Replaces the previous full-viewport cinematic
 * hero. Stays under 90vh on desktop so the stats bar stays visible
 * just below, anchoring the "this is real" social proof immediately
 * after the brand statement.
 *
 * Demo loops through three phases: type URL → Ora analyses →
 * grid of generated visuals. Pause when scrolled out of view.
 * ═════════════════════════════════════════════════════════════════ */
function CleanHero({ user, primaryHref }: { user: any; primaryHref: string }) {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [typed, setTyped] = useState("");
  const URL_TARGET = "yourshop.com/your-best-product";
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !runningRef.current) {
          runningRef.current = true;
          loop();
        } else if (!e.isIntersecting) {
          runningRef.current = false;
        }
      });
    }, { threshold: 0.2 });
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loop = async () => {
    while (runningRef.current) {
      // Phase 1: typing — slowed slightly so the URL reads as deliberate.
      setPhase(1); setTyped("");
      for (let i = 1; i <= URL_TARGET.length; i++) {
        if (!runningRef.current) return;
        await new Promise((r) => setTimeout(r, 55));
        setTyped(URL_TARGET.slice(0, i));
      }
      await new Promise((r) => setTimeout(r, 1100));
      // Phase 2: analysis — extended so the checklist "tick-tick-tick" lands.
      if (!runningRef.current) return;
      setPhase(2);
      await new Promise((r) => setTimeout(r, 5000));
      // Phase 3: grid — longer linger so the user sees the payoff.
      if (!runningRef.current) return;
      setPhase(3);
      await new Promise((r) => setTimeout(r, 6000));
    }
  };

  // ── Showcase slots for phase 3 ──
  // Each slot reads from /public/landing-showcase/0X.jpg. When the file
  // is missing, the <img> hides itself via onError and the parent's
  // designed fallback background (warm gradient, on-brand) shows through
  // with the platform tag still readable on top — a clean "frame waiting
  // for content" state, not a fake product placeholder.
  //
  // To populate: drop 6 real Ora outputs (4:5 aspect, ideally) into
  // /public/landing-showcase/ named 01.jpg, 02.jpg, ..., 06.jpg.
  const SHOWCASE_SLOTS: { tag: string; file: string; fallbackBg: string }[] = [
    { tag: "Lifestyle", file: "01.jpg", fallbackBg: "linear-gradient(135deg, #E7D4C4, #F2EFEA)" },
    { tag: "Packshot",  file: "02.jpg", fallbackBg: "linear-gradient(135deg, #F2D0C4, #FFE7DC)" },
    { tag: "Story",     file: "03.jpg", fallbackBg: "linear-gradient(135deg, #FFC9B5, #FFE0CF)" },
    { tag: "Carousel",  file: "04.jpg", fallbackBg: "linear-gradient(135deg, #E5DBCA, #F4EEE3)" },
    { tag: "Promo",     file: "05.jpg", fallbackBg: "linear-gradient(135deg, #FF6B47, #FF8E6F)" },
    { tag: "Reel",      file: "06.jpg", fallbackBg: "linear-gradient(135deg, #1A0F0C, #2A1A14)" },
  ];

  return (
    <section ref={sectionRef} style={{ background: "#FFFFFF", borderBottom: `1px solid rgba(17,17,17,0.06)` }}>
      <div className="px-5 md:px-10 pt-14 md:pt-20 pb-16 md:pb-24 max-w-[1240px] mx-auto">
        {/* ── Eyebrow ── */}
        <div className="text-center mb-6 md:mb-8">
          <div className="mono-label" style={{ color: "rgba(17,17,17,0.55)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            For shops that don't have time
          </div>
        </div>

        {/* ── BIG centered demo mockup ── */}
        <div className="max-w-[960px] mx-auto mb-10 md:mb-14">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#F2EFEA",
              border: `1px solid rgba(17,17,17,0.08)`,
              boxShadow: "0 32px 80px -24px rgba(17,17,17,0.22), 0 10px 28px -12px rgba(17,17,17,0.08)",
            }}
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ background: "rgba(255,255,255,0.55)", borderBottom: "1px solid rgba(17,17,17,0.06)" }}>
              <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F56" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#27C93F" }} />
              <div className="flex-1 mx-3 text-center text-[12px] font-medium" style={{ color: "rgba(17,17,17,0.5)" }}>
                Ora Studio
              </div>
            </div>
            {/* Body — taller envelope, more breathing room */}
            <div className="relative" style={{ minHeight: 540, padding: "2rem" }}>
              {/* Phase 1 — URL bar */}
              {phase === 1 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
                  <div className="text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: "#FF6B47" }}>
                    Step 01 · Drop your product
                  </div>
                  <div className="flex items-center gap-2.5 w-full max-w-[520px] px-5 py-4 rounded-2xl" style={{ background: "#FFF", border: "1px solid rgba(17,17,17,0.08)", boxShadow: "0 4px 14px -6px rgba(17,17,17,0.08)" }}>
                    <Globe2 size={18} style={{ color: "rgba(17,17,17,0.45)" }} />
                    <span className="flex-1 text-[16px] font-medium tabular-nums" style={{ color: COLORS.ink }}>
                      {typed}<span className="inline-block w-[2px] h-[1em] align-middle ml-0.5" style={{ background: "#FF6B47", animation: "blink 0.9s steps(2) infinite" }} />
                    </span>
                  </div>
                  <button className="px-6 py-3 rounded-xl text-[14px] font-semibold" style={{ background: "#FF6B47", color: "#FFF", boxShadow: "0 14px 28px -10px rgba(255,107,71,0.5)" }}>
                    Generate →
                  </button>
                </div>
              )}
              {/* Phase 2 — analysis */}
              {phase === 2 && (
                <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-6 p-8 items-center">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black">
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.5)" }}>
                      ANALYZING…
                    </div>
                    <div className="absolute left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, transparent, #FF6B47, transparent)", boxShadow: "0 0 32px #FF6B47", animation: "scan 2.4s ease-in-out infinite" }} />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {["Reading product photo", "Extracting brand voice", "Composing six angles"].map((s, i) => (
                      <motion.div
                        key={s}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.7 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl"
                        style={{ background: "rgba(17,17,17,0.04)", border: "1px solid rgba(17,17,17,0.06)" }}
                      >
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: "#FF6B47", color: "#FFF" }}>✓</span>
                        <span className="text-[14px] font-medium" style={{ color: COLORS.ink }}>{s}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {/* Phase 3 — grid of real Ora outputs (with designed fallback) */}
              {phase === 3 && (
                <div className="absolute inset-0 grid grid-cols-3 gap-3 p-6">
                  {SHOWCASE_SLOTS.map((c, i) => (
                    <motion.div
                      key={c.tag}
                      initial={{ opacity: 0, y: 14, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-lg relative overflow-hidden"
                      style={{ aspectRatio: "4/5", background: c.fallbackBg, border: "1px solid rgba(17,17,17,0.06)" }}
                    >
                      {/* Real Ora output. When the file is missing on disk
                          the <img> hides itself via onError and the parent
                          div's designed fallback gradient shows through —
                          the platform tag stays readable on top so the
                          slot still communicates intent. */}
                      <img
                        src={`/landing-showcase/${c.file}`}
                        alt={`Ora ${c.tag} output`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9.5px] font-semibold" style={{ background: c.tag === "Promo" ? "#FFFFFF" : "rgba(17,17,17,0.78)", color: c.tag === "Promo" ? "#FF6B47" : "#FFFFFF" }}>
                        {c.tag}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {/* Phase dots */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {[1, 2, 3].map((p) => (
                  <span
                    key={p}
                    style={{
                      width: phase === p ? 20 : 6, height: 6, borderRadius: 99,
                      background: phase === p ? "#FF6B47" : "rgba(17,17,17,0.18)",
                      transition: "all 0.35s ease",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Headline + CTA below the mockup ── */}
        <div className="text-center max-w-[820px] mx-auto">
          <h1 className="leading-[0.96] mb-5" style={{ ...bagel, fontSize: "clamp(40px, 6.5vw, 80px)", color: COLORS.ink, letterSpacing: "-0.025em" }}>
            Drop a photo.{" "}
            <span style={{ color: "#FF6B47" }}>Get a pack.</span>
          </h1>
          <p className="body-tight text-[16px] md:text-[17.5px] mb-8 max-w-[560px] mx-auto" style={{ color: "rgba(17,17,17,0.65)", lineHeight: 1.55 }}>
            Six platform-ready posts from one product photo. Your real product — pixel-perfect, never re-rendered. Ship in thirty seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={primaryHref} onClick={() => trackEvent("cta_click", { location: "hero", dest: primaryHref, authed: !!user })}>
              <Button variant="accent" size="lg">
                {user ? "Open Ora" : "Try free · no card"} <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: "rgba(17,17,17,0.5)" }}>
              {user ? "Drop a photo. Done." : "Six posts on the house"}
            </span>
          </div>
        </div>
      </div>
      <style>{`@keyframes blink { 50% { opacity: 0; } } @keyframes scan { 0%,100% { top: 0; } 50% { top: calc(100% - 3px); } }`}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Marquee row — horizontally scrolling band of generated assets.
 * Items have variable widths (we don't constrain to a single ratio)
 * so the row reads as a textured stream rather than a uniform grid.
 * Two duplicated copies of the items animate left at a constant
 * speed for seamless looping. Pauses on hover for readability.
 * ═════════════════════════════════════════════════════════════════ */
function MarqueeRow({ assets }: { assets: ShowcaseAsset[] }) {
  // Cap to 12 most recent. If fewer than 6 are available, fall back
  // to repeating what we have so the marquee doesn't collapse.
  const items = (assets.length >= 6 ? assets.slice(0, 12) : [...assets, ...assets, ...assets].slice(0, 12));
  if (items.length === 0) return null;
  return (
    <section style={{ background: "#FFFFFF", paddingTop: 24, paddingBottom: 64, overflow: "hidden" }}>
      <div className="overflow-hidden" style={{
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
      }}>
        <div className="flex gap-3" style={{ width: "max-content", animation: "ora-marquee 38s linear infinite" }}>
          {[...items, ...items].map((a, i) => (
            <div key={i} className="rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#F2EFEA", border: "1px solid rgba(17,17,17,0.06)", height: 220 }}>
              <img
                src={a.imageUrl}
                alt={a.caption || a.fileName || "Ora pack"}
                className="h-full w-auto object-cover block"
                loading="lazy"
                style={{ aspectRatio: a.aspectRatio?.includes(":") ? a.aspectRatio.replace(":", "/") : undefined }}
              />
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes ora-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * How it works — four numbered cards in a single row on desktop,
 * stacked on mobile. Replaces the previous Drop / Pick / Done
 * cinematic triad with a tighter, less-repetitive expression of the
 * mechanism. Each step pairs an icon, a step number in a coral
 * circle, a 4-7 word title, and a single-sentence body.
 * ═════════════════════════════════════════════════════════════════ */
function HowItWorks() {
  const STEPS = [
    {
      icon: <Upload size={20} />,
      title: "Drop your product",
      body: "Upload a photo or paste your shop URL. Ora reads colours, voice, category in 30 seconds.",
    },
    {
      icon: <Wand2 size={20} />,
      title: "Pick a direction",
      body: "Three angles tailored to your brand — or let Ora decide. No prompt, no guesswork.",
    },
    {
      icon: <Sparkles size={20} />,
      title: "Six posts compose",
      body: "Photoroom locks the product, AI composes the scene. Your product stays your product.",
    },
    {
      icon: <Send size={20} />,
      title: "Publish or download",
      body: "One click to Instagram, Facebook, TikTok. Or download every format for manual share.",
    },
  ];
  return (
    <section style={{ background: COLORS.cream, borderTop: "1px solid rgba(17,17,17,0.06)" }}>
      <div className="px-5 md:px-10 py-20 md:py-28 max-w-[1320px] mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <div className="mono-label mb-4" style={{ color: "rgba(17,17,17,0.55)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            How it works
          </div>
          <h2 className="leading-[0.95]" style={{ ...bagel, fontSize: "clamp(36px, 5.5vw, 64px)", color: COLORS.ink, letterSpacing: "-0.02em" }}>
            From a photo to a pack,<br/>
            <span style={{ color: "#FF6B47" }}>in four steps.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{ background: "#FFFFFF", border: "1px solid rgba(17,17,17,0.06)" }}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,107,71,0.1)", color: "#FF6B47" }}>
                  {s.icon}
                </div>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: "rgba(17,17,17,0.35)" }}>
                  0{i + 1}
                </span>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold mb-1.5" style={{ color: COLORS.ink }}>
                  {s.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: "rgba(17,17,17,0.6)" }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Feature cards — six small cards in a 3-col grid on desktop,
 * single column on mobile. Each card surfaces one capability the
 * merchant gets out of the box (no setup, no plan upgrade).
 * Coral icon, single-line title, two-line body.
 * ═════════════════════════════════════════════════════════════════ */
function FeatureCards() {
  const FEATURES = [
    {
      icon: <Lightbulb size={18} />,
      title: "AI-led brand voice",
      body: "Reads your site once. Every post matches your colours, fonts, tone — no manual setup.",
    },
    {
      icon: <Sparkles size={18} />,
      title: "Six angles per pack",
      body: "Lifestyle, packshot, before/after, unboxing, social proof, promo — automatically.",
    },
    {
      icon: <CalendarDays size={18} />,
      title: "Every platform format",
      body: "1:1, 9:16, 16:9 — sized for Instagram, TikTok, Facebook, Pinterest in one go.",
    },
    {
      icon: <Wand2 size={18} />,
      title: "Plain-language edit",
      body: "Type \"add a -20% promo\" or \"swap to winter\". Ora updates without re-rendering.",
    },
    {
      icon: <Globe2 size={18} />,
      title: "Multi-shop projects",
      body: "Manage several boutiques, each with its own brand vault, in one Ora account.",
    },
    {
      icon: <Send size={18} />,
      title: "One-click publish",
      body: "Send to Instagram, Facebook, TikTok directly — or grab the file and post yourself.",
    },
  ];
  return (
    <section style={{ background: "#1A0F0C" }}>
      <div className="px-5 md:px-10 py-20 md:py-28 max-w-[1320px] mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <div className="mono-label mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            Built in
          </div>
          <h2 className="leading-[0.95]" style={{ ...bagel, fontSize: "clamp(36px, 5.5vw, 64px)", color: "#FFFFFF", letterSpacing: "-0.02em" }}>
            Tools that save<br/>
            <span style={{ color: "#FF6B47" }}>days, not minutes.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl p-6"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(255,107,71,0.15)", color: "#FF6B47" }}>
                {f.icon}
              </div>
              <h3 className="text-[15.5px] font-semibold mb-2" style={{ color: "#FFFFFF" }}>
                {f.title}
              </h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Final CTA — coral-tinted band with one bold headline and one CTA.
 * Replaces the previous full-viewport final-CTA section. Tighter
 * (no parallax, no 100vh) so the page doesn't end on a scroll
 * marathon.
 * ═════════════════════════════════════════════════════════════════ */
function FinalCTA({ primaryHref, user }: { primaryHref: string; user: any }) {
  return (
    <section style={{ background: "#FFE9DD" }}>
      <div className="px-5 md:px-10 py-20 md:py-24 max-w-[1320px] mx-auto grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-8 md:gap-12 items-center">
        <div>
          <h2 className="leading-[1.05]" style={{ ...bagel, fontSize: "clamp(36px, 5.5vw, 60px)", color: COLORS.ink, letterSpacing: "-0.02em" }}>
            Ship your first pack tonight.
          </h2>
          <p className="body-tight text-[14.5px] md:text-[15.5px] mt-3 max-w-[480px]" style={{ color: "rgba(17,17,17,0.6)" }}>
            Ten free credits. No card. Cancel any time.
          </p>
        </div>
        <div className="flex flex-col items-start md:items-end gap-2.5">
          <Link to={primaryHref} onClick={() => trackEvent("cta_click", { location: "final_cta", dest: primaryHref, authed: !!user })}>
            <Button variant="ink" size="lg">
              {user ? "Open Ora" : "Start free"} <ArrowRight size={16} />
            </Button>
          </Link>
          <span className="text-[11px]" style={{ color: "rgba(17,17,17,0.5)" }}>
            Trusted by small shops across France
          </span>
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
      {/* ═══ Navbar ═══ */}
      <AppTabs />

      {/* ═══ Hero — clean 2-col with animated demo + headline ═══ */}
      <CleanHero user={user} primaryHref={primaryHref} />

      {/* ═══ Stats bar ═══ */}
      <StatsBar />

      {/* ═══ Marquee — Ora-generated content stream ═══ */}
      <MarqueeRow assets={showcase} />

      {/* ═══ Wedge demo — pixel-perfect product fidelity ═══ */}
      <BeforeAfterShowcase />

      {/* ═══ How it works — 4 numbered cards ═══ */}
      <HowItWorks />

      {/* ═══ Feature cards — 6 capabilities on dark ═══ */}
      <FeatureCards />

      {/* ═══ Pricing tiers ═══ */}
      <PricingPanel primaryHref={primaryHref} />

      {/* ═══ FAQ accordion ═══ */}
      <FAQAccordion />

      {/* ═══ Final CTA — coral-tinted band ═══ */}
      <FinalCTA primaryHref={primaryHref} user={user} />

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

      {/* ═══ Sticky CTA — slides in past the hero, hides at pricing ═══ */}
      <StickyCTA primaryHref={primaryHref} label={user ? "Open Ora" : "Try free"} />
    </div>
  );
}

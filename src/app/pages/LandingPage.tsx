import { useRef } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useAuth } from "../lib/auth-context";
import img1 from "../../assets/b545abf4495677ce6104da79f57e7f15edcba5a0.png";
import img2 from "../../assets/fd1a1304c95304459d525edabe5b548965b73ee0.png";
import img3 from "../../assets/e770a4caf934a7f0a280cbbe70316b0d298cff32.png";
import img4 from "../../assets/230b57712f829935f228f72848bf5bb6e9c71731.png";
import img5 from "../../assets/32eda534c6c83cc7126cf387befbc63dc25b3959.png";
import img6 from "../../assets/428667e4725cd7048b2e82e2e4f672082e510ef0.png";
import img7 from "../../assets/44db6247bc4087ebcdc2af0c2e63430b53186f90.png";
import img8 from "../../assets/828548c81c7a529d4277b71a4046525cf852a003.png";

/* ═══ Palette — pop, vibrant, contrasted flats ═══ */
const INK    = "#0A0A0A";
const CREAM  = "#F4EFE6";
const PINK   = "#FF2D92";
const LIME   = "#DFFF3F";
const ORANGE = "#FF5B14";
const BLUE   = "#2E5BFF";

const DISPLAY = `"Bagel Fat One", "Inter", system-ui, sans-serif`;

export function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? "/hub/surprise" : "/login";

  return (
    <div style={{ background: CREAM, color: INK, fontFeatureSettings: '"ss01"', overflowX: "hidden" }}>
      <Header authed={!!user} primaryHref={primaryHref} />
      <Hero primaryHref={primaryHref} />
      <FullBleedVisual img={img1} tag="linkedin · hero · 16:9" bg={INK} />
      <ManifestoBlock />
      <FullBleedVisual img={img3} tag="tiktok · surprise · 9:16" bg={PINK} portrait />
      <PillarPosters />
      <FullBleedVisual img={img2} tag="instagram · twist · 1:1" bg={LIME} square />
      <FinalCta primaryHref={primaryHref} />
      <Footer />
    </div>
  );
}

/* ═══ Header — fixed, mix-blend so it reads on every color block ═══ */
function Header({ authed, primaryHref }: { authed: boolean; primaryHref: string }) {
  return (
    <header
      className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 md:px-10 h-14"
      style={{ mixBlendMode: "difference", color: "#fff" }}
    >
      <Link to="/" className="flex items-center gap-2">
        <OraLogo size={22} color="#fff" />
        <span className="text-[16px]" style={{ fontFamily: DISPLAY, fontWeight: 400, letterSpacing: "-0.01em" }}>Ora</span>
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: "rgba(255,255,255,0.85)" }}>
        <Link to="/pricing">Pricing</Link>
        <Link to="/models">Models</Link>
        <Link to="/about">Manifesto</Link>
      </nav>
      <div className="flex items-center gap-2">
        {!authed && (
          <Link to="/login" className="hidden sm:inline-flex items-center h-8 px-3 text-[13px]">Sign in</Link>
        )}
        <Link to={primaryHref} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px]"
              style={{ background: "#fff", color: INK, fontWeight: 600, mixBlendMode: "normal" }}>
          {authed ? "Open" : "Try Ora"} <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}

/* ═══ Hero — LIME background, giant Bagel Fat One tagline ═══ */
function Hero({ primaryHref }: { primaryHref: string }) {
  return (
    <section className="relative" style={{ background: LIME, minHeight: "100vh", color: INK }}>
      <div className="relative h-screen flex flex-col justify-center px-5 md:px-10">
        {/* Editorial corners */}
        <div className="absolute top-24 left-5 md:left-10 text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: "rgba(10,10,10,0.6)" }}>
          01 / ORA — an app for brands
        </div>
        <div className="absolute top-24 right-5 md:right-10 text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: "rgba(10,10,10,0.6)" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: PINK }} />
          live — 2026
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="leading-none"
          style={{ fontFamily: DISPLAY, fontSize: "clamp(80px, 17vw, 280px)", letterSpacing: "-0.035em", color: INK }}
        >
          Stop
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12 }}
          className="leading-none"
          style={{ fontFamily: DISPLAY, fontSize: "clamp(80px, 17vw, 280px)", letterSpacing: "-0.035em", color: PINK, marginTop: "-0.06em" }}
        >
          prompting.
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.28 }}
          className="leading-none"
          style={{ fontFamily: DISPLAY, fontSize: "clamp(80px, 17vw, 280px)", letterSpacing: "-0.035em", color: INK, marginTop: "-0.06em" }}
        >
          Surprise
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.40 }}
          className="leading-none"
          style={{ fontFamily: DISPLAY, fontSize: "clamp(80px, 17vw, 280px)", letterSpacing: "-0.035em", color: ORANGE, marginTop: "-0.06em" }}
        >
          your brand.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-10 md:mt-14 flex flex-wrap items-center gap-4"
        >
          <Link to={primaryHref}
                className="group inline-flex items-center gap-2.5 h-14 px-8 rounded-full text-[16.5px]"
                style={{ background: INK, color: LIME, fontWeight: 700, fontFamily: DISPLAY, letterSpacing: "-0.01em" }}>
            <Sparkles size={18} /> Try Ora
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <div className="text-[13px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(10,10,10,0.65)" }}>
            8 assets · 42s · one click
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ Full-bleed visual panel — parallax image over colored bg ═══ */
function FullBleedVisual({ img, tag, bg, portrait = false, square = false }: {
  img: string; tag: string; bg: string; portrait?: boolean; square?: boolean;
}) {
  const ratio = square ? "1 / 1" : portrait ? "9 / 16" : "16 / 9";
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Image drifts slower than the page → visible parallax.
  const y     = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.12, 1.04, 1.12]);
  return (
    <section ref={ref} className="relative w-full overflow-hidden" style={{ background: bg }}>
      <div className="relative w-full" style={{ aspectRatio: ratio, maxHeight: "100vh" }}>
        <motion.img
          src={img} alt=""
          style={{ y, scale }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute bottom-4 md:bottom-6 left-5 md:left-10 flex items-center gap-2">
          <span className="px-2.5 h-7 rounded-full text-[11px] font-mono inline-flex items-center"
                style={{ background: "#fff", color: INK }}>
            {tag}
          </span>
          <span className="px-2.5 h-7 rounded-full text-[11px] font-mono inline-flex items-center"
                style={{ background: "rgba(255,255,255,0.18)", color: "#fff", backdropFilter: "blur(6px)" }}>
            brand da locked
          </span>
        </div>
      </div>
    </section>
  );
}

/* ═══ Manifesto — big one-liner on CREAM ═══ */
function ManifestoBlock() {
  return (
    <section className="relative" style={{ background: CREAM, color: INK, minHeight: "90vh" }}>
      <div className="relative h-full flex flex-col justify-between px-5 md:px-10 py-20 md:py-32" style={{ minHeight: "90vh" }}>
        <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: "rgba(10,10,10,0.55)" }}>
          02 / The Thesis
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-140px" }}
          className="flex flex-col"
        >
          <span className="text-[18px] md:text-[22px]" style={{ fontWeight: 500, letterSpacing: "-0.01em" }}>
            Branding is everywhere.
          </span>
          <span className="leading-none"
                style={{ fontFamily: DISPLAY, fontSize: "clamp(100px, 22vw, 360px)", letterSpacing: "-0.035em", color: BLUE, marginTop: "-0.04em" }}>
            Surprise
          </span>
          <span className="text-[18px] md:text-[22px] text-right" style={{ fontWeight: 500, letterSpacing: "-0.01em", color: ORANGE }}>
            is nowhere.
          </span>
        </motion.div>

        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(10,10,10,0.55)" }}>
            — the ora manifesto
          </div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(10,10,10,0.55)" }}>
            2026
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══ Pillars — horizontal scroll sequence pinned while scrolling vertically ═══ */
function PillarPosters() {
  const posters = [
    { word: "LOCKED",  caption: "Brand DA never drifts.",     bg: INK,    fg: "#fff",  accent: LIME   },
    { word: "BOLD",    caption: "Every shot, a twist.",        bg: PINK,   fg: "#fff",  accent: LIME   },
    { word: "UNIQUE",  caption: "Seed + scenes, one of one.",  bg: BLUE,   fg: "#fff",  accent: ORANGE },
  ];

  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // Map vertical scroll progress to horizontal translation of the poster track.
  // Track is 3× viewport wide, moves from 0 to -2/3 (2 viewports of travel).
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-66.666%"]);

  return (
    // Tall outer container drives the scroll. 3× viewport height = 2 full poster transitions.
    <section ref={ref} className="relative" style={{ height: "300vh", background: INK }}>
      {/* Sticky pinned viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute top-5 md:top-7 left-5 md:left-10 z-10 text-[11px] font-mono uppercase tracking-[0.25em] mix-blend-difference" style={{ color: "#fff" }}>
          03 / Three pillars · scroll →
        </div>
        <motion.div style={{ x }} className="flex h-full" aria-label="horizontal pillar track">
          {posters.map((p, i) => (
            <div
              key={i}
              className="shrink-0 relative flex flex-col justify-between px-6 md:px-14 py-14 md:py-20"
              style={{ width: "100vw", height: "100vh", background: p.bg, color: p.fg }}
            >
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ opacity: 0.75 }}>
                  Pillar {"I".repeat(i + 1)}
                </div>
                <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: p.accent }}>
                  {String(i + 1).padStart(2, "0")} / 03
                </div>
              </div>

              <h3 className="leading-none"
                  style={{ fontFamily: DISPLAY, fontSize: "clamp(140px, 34vw, 560px)", letterSpacing: "-0.045em" }}>
                {p.word}
              </h3>

              <div className="flex items-end justify-between gap-6">
                <p className="text-[20px] md:text-[32px] leading-snug" style={{ fontWeight: 500, maxWidth: 720, letterSpacing: "-0.01em" }}>
                  {p.caption}
                </p>
                <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-right" style={{ color: p.accent }}>
                  surprise · brand<br/>no prompt
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ Final CTA — ORANGE color-block, no image ═══ */
function FinalCta({ primaryHref }: { primaryHref: string }) {
  return (
    <section className="relative flex flex-col items-center justify-center px-5 md:px-10 py-36 md:py-56 text-center"
             style={{ background: ORANGE, color: INK }}>
      <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-6" style={{ color: "rgba(10,10,10,0.6)" }}>
        04 / The Move
      </div>
      <motion.h2
        initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}
        className="leading-none"
        style={{ fontFamily: DISPLAY, fontSize: "clamp(100px, 18vw, 320px)", letterSpacing: "-0.04em", maxWidth: 1400 }}
      >
        Surprise<br /><span style={{ color: INK }}>your brand.</span>
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
        viewport={{ once: true }}
        className="mt-10"
      >
        <Link to={primaryHref} className="inline-flex items-center gap-2 h-14 px-8 rounded-full text-[16.5px]"
              style={{ background: INK, color: ORANGE, fontWeight: 700, fontFamily: DISPLAY, letterSpacing: "-0.01em" }}>
          Try Ora — free to start <ArrowRight size={17} />
        </Link>
      </motion.div>
    </section>
  );
}

/* ═══ Footer — INK ═══ */
function Footer() {
  return (
    <footer className="py-10" style={{ background: INK, color: "#fff" }}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <OraLogo size={20} color="#fff" />
          <span className="text-[16px]" style={{ fontFamily: DISPLAY, letterSpacing: "-0.01em" }}>Ora</span>
          <span className="text-[12.5px] ml-2" style={{ color: "rgba(255,255,255,0.55)" }}>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
          <Link to="/models" className="hover:text-white transition">Models</Link>
          <Link to="/about" className="hover:text-white transition">Manifesto</Link>
          <Link to="/terms" className="hover:text-white transition">Terms</Link>
          <Link to="/privacy" className="hover:text-white transition">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}

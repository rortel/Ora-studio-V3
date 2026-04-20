import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
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
import img9 from "../../assets/a46d76935870c25dd77092bb6135d8035f3df8e8.png";
import img10 from "../../assets/c4a860a492b53d3f5716a208e85f575e7f1e18de.png";

const IMGS = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10];

const INK = "#0A0A0A";
const CREAM = "#F4EFE6";
const ACCENT = "#3B82F6";
const RED = "#FF4A1F";

export function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? "/hub/surprise" : "/login";

  return (
    <div style={{ background: INK, color: "#fff", fontFeatureSettings: '"ss01"', overflowX: "hidden" }}>
      <Header authed={!!user} primaryHref={primaryHref} />
      <Hero primaryHref={primaryHref} />
      <PackReveal />
      <ManifestoWord />
      <PosterPillars />
      <FinalCta primaryHref={primaryHref} />
      <Footer />
    </div>
  );
}

/* ═══ Header ═══ */
function Header({ authed, primaryHref }: { authed: boolean; primaryHref: string }) {
  return (
    <header
      className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 md:px-10 h-14"
      style={{ mixBlendMode: "difference", color: "#fff" }}
    >
      <Link to="/" className="flex items-center gap-2">
        <OraLogo size={22} color="#fff" />
        <span className="text-[15px] tracking-tight" style={{ fontWeight: 700 }}>Ora</span>
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: "rgba(255,255,255,0.7)" }}>
        <Link to="/pricing">Pricing</Link>
        <Link to="/models">Models</Link>
        <Link to="/about">Manifesto</Link>
      </nav>
      <div className="flex items-center gap-2">
        {!authed && (
          <Link to="/login" className="hidden sm:inline-flex items-center h-8 px-3 text-[13px]">Sign in</Link>
        )}
        <Link to={primaryHref} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px]"
              style={{ background: "#fff", color: INK, fontWeight: 600, mixBlendMode: "normal" }}>
          {authed ? "Open" : "Try Ora"} <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}

/* ═══ Hero — moodboard drops, tagline types, timer ticks ═══ */
function Hero({ primaryHref }: { primaryHref: string }) {
  // Pseudo-random but stable scatter: rotation + position per image
  const scatter = [
    { img: img1,  top: "6%",  left: "4%",  w: 260, rot: -8,  delay: 0.15, z: 2 },
    { img: img2,  top: "18%", left: "72%", w: 230, rot: 6,   delay: 0.30, z: 3 },
    { img: img3,  top: "58%", left: "2%",  w: 300, rot: 4,   delay: 0.50, z: 1 },
    { img: img4,  top: "64%", left: "76%", w: 220, rot: -6,  delay: 0.65, z: 2 },
    { img: img5,  top: "4%",  left: "40%", w: 200, rot: 2,   delay: 0.80, z: 1 },
    { img: img6,  top: "70%", left: "38%", w: 210, rot: -3,  delay: 0.95, z: 2 },
    { img: img7,  top: "36%", left: "85%", w: 160, rot: 10,  delay: 1.10, z: 3 },
    { img: img8,  top: "30%", left: "-2%", w: 180, rot: -12, delay: 1.25, z: 1 },
  ];

  return (
    <section className="relative" style={{ minHeight: "100vh" }}>
      {/* Scattered moodboard */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {scatter.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 60, rotate: s.rot + 20, scale: 0.85 }}
            animate={{ opacity: 0.85, y: 0, rotate: s.rot, scale: 1 }}
            transition={{ duration: 0.9, delay: s.delay, ease: [0.16, 1, 0.3, 1] }}
            className="absolute shadow-2xl"
            style={{ top: s.top, left: s.left, width: s.w, height: s.w * 1.1, zIndex: s.z }}
          >
            <img src={s.img} alt="" className="w-full h-full object-cover rounded-[2px]" style={{ filter: "grayscale(5%) contrast(1.02)" }} />
          </motion.div>
        ))}
      </div>

      {/* Central vignette so the type reads */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: "radial-gradient(ellipse 55% 55% at 50% 48%, rgba(10,10,10,0.0) 0%, rgba(10,10,10,0.55) 40%, rgba(10,10,10,0.92) 75%)" }} />

      {/* Tagline — types itself */}
      <div className="relative h-screen flex flex-col items-center justify-center px-5 md:px-10 text-center">
        <Typed text="Stop prompting." delay={0.15} color="#fff"   className="hero-line" />
        <Typed text="Surprise your brand." delay={0.95} color={ACCENT} className="hero-line" />

        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.3 }}
          className="mt-12 flex flex-col items-center gap-4"
        >
          <Link to={primaryHref}
            className="group inline-flex items-center gap-2.5 h-14 px-8 rounded-full text-[16.5px]"
            style={{ background: "#fff", color: INK, fontWeight: 700 }}
          >
            Try Ora
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* Design element: the timer */}
          <div className="flex items-center gap-2 text-[11.5px] font-mono uppercase tracking-[0.18em]"
               style={{ color: "rgba(255,255,255,0.55)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: RED }} />
            8 assets · ~42s · no prompt
          </div>
        </motion.div>

        {/* Index number, editorial corner */}
        <div className="absolute top-24 left-5 md:left-10 text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>
          01 / The Pitch
        </div>
        <div className="absolute top-24 right-5 md:right-10 text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>
          Ora — an app by no-prompting
        </div>
      </div>

      <style>{`
        .hero-line {
          font-size: clamp(54px, 11vw, 168px);
          line-height: 0.95;
          font-weight: 800;
          letter-spacing: -0.045em;
          white-space: nowrap;
        }
      `}</style>
    </section>
  );
}

/* ═══ Typed — a tagline that types itself letter by letter ═══ */
function Typed({ text, delay, color, className }: { text: string; delay: number; color: string; className: string }) {
  const [len, setLen] = useState(0);
  useEffect(() => {
    const id0 = window.setTimeout(() => {
      const id = window.setInterval(() => {
        setLen((n) => (n < text.length ? n + 1 : n));
      }, 35);
      return () => window.clearInterval(id);
    }, delay * 1000);
    return () => window.clearTimeout(id0);
  }, [delay, text.length]);
  return (
    <h1 className={className} style={{ color }}>
      <span>{text.slice(0, len)}</span>
      <span style={{ opacity: len < text.length ? 1 : 0, color: color, borderRight: `4px solid ${color}`, marginLeft: 4, animation: "blink 1s step-end infinite" }}>&nbsp;</span>
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </h1>
  );
}

/* ═══ Pack reveal — a single editorial mockup emerging, asymmetric ═══ */
function PackReveal() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0.1, 0.35], [80, 0]);

  return (
    <section className="relative py-28 md:py-44" style={{ background: INK }}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10">
        <div className="flex items-end justify-between mb-12 md:mb-16 gap-6">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-3" style={{ color: "rgba(255,255,255,0.55)" }}>
              02 / The Drop
            </div>
            <h2 className="tracking-tight" style={{ fontSize: "clamp(36px, 6vw, 88px)", lineHeight: 0.98, letterSpacing: "-0.035em", fontWeight: 800, maxWidth: 920 }}>
              One button. Eight visuals. <br/>Zero prompt.
            </h2>
          </div>
          <div className="hidden md:block text-[11px] font-mono uppercase tracking-[0.2em] text-right" style={{ color: "rgba(255,255,255,0.45)" }}>
            Brand DA locked<br/>Captions included
          </div>
        </div>

        {/* Asymmetric pack — one giant hero, irregular siblings, floating platform tags */}
        <motion.div style={{ y }} className="relative">
          <div className="grid grid-cols-12 gap-3 md:gap-4">
            <div className="col-span-12 md:col-span-8 relative" style={{ aspectRatio: "16 / 10" }}>
              <img src={img1} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <FloatingTag label="linkedin" right ratio="16:9" />
            </div>
            <div className="col-span-6 md:col-span-4 relative" style={{ aspectRatio: "9 / 16" }}>
              <img src={img3} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <FloatingTag label="ig story" ratio="9:16" />
            </div>

            <div className="col-span-6 md:col-span-3 relative" style={{ aspectRatio: "1 / 1" }}>
              <img src={img2} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <FloatingTag label="ig feed" ratio="1:1" />
            </div>
            <div className="col-span-6 md:col-span-3 relative" style={{ aspectRatio: "1 / 1" }}>
              <img src={img5} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <FloatingTag label="ig feed" ratio="1:1" />
            </div>
            <div className="col-span-12 md:col-span-6 relative" style={{ aspectRatio: "16 / 9" }}>
              <img src={img4} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <FloatingTag label="facebook" right ratio="16:9" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FloatingTag({ label, ratio, right }: { label: string; ratio: string; right?: boolean }) {
  return (
    <div className={`absolute top-3 ${right ? "right-3" : "left-3"} flex items-center gap-1.5`}>
      <span className="px-2 h-6 rounded-full text-[10.5px] font-mono inline-flex items-center"
            style={{ background: "rgba(255,255,255,0.95)", color: INK, backdropFilter: "blur(6px)" }}>
        {label}
      </span>
      <span className="px-2 h-6 rounded-full text-[10.5px] font-mono inline-flex items-center"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff", backdropFilter: "blur(6px)" }}>
        {ratio}
      </span>
    </div>
  );
}

/* ═══ Manifesto — one word, massive, on cream color-block ═══ */
function ManifestoWord() {
  return (
    <section className="relative" style={{ background: CREAM, color: INK, minHeight: "90vh" }}>
      <div className="relative h-full px-5 md:px-10 py-24 md:py-32 flex flex-col justify-between" style={{ minHeight: "90vh" }}>
        <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: "rgba(10,10,10,0.55)" }}>
          03 / The Thesis
        </div>

        <motion.div
          initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-200px" }}
          className="flex flex-col"
        >
          <span className="tracking-tight" style={{ fontSize: "clamp(22px, 2.4vw, 30px)", letterSpacing: "-0.01em", fontWeight: 500 }}>
            Branding is everywhere.
          </span>
          <span className="tracking-tighter leading-none"
                style={{ fontSize: "clamp(120px, 26vw, 440px)", letterSpacing: "-0.06em", fontWeight: 900, color: INK, marginTop: "-0.08em" }}>
            Surprise
          </span>
          <span className="tracking-tight text-right" style={{ fontSize: "clamp(22px, 2.4vw, 30px)", letterSpacing: "-0.01em", fontWeight: 500, color: RED }}>
            isn't.
          </span>
        </motion.div>

        <div className="self-end text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: "rgba(10,10,10,0.55)" }}>
          — the ora manifesto
        </div>
      </div>
    </section>
  );
}

/* ═══ Posters — 3 typographic posters, not bands with images ═══ */
function PosterPillars() {
  const posters = [
    { n: "I",   word: "LOCKED",   caption: "Brand DA never drifts.",             bg: INK,    fg: "#fff",   accent: ACCENT },
    { n: "II",  word: "BOLD",     caption: "Every shot, a twist.",                bg: RED,    fg: "#fff",   accent: CREAM  },
    { n: "III", word: "UNIQUE",   caption: "Seed + scenes, one of one.",          bg: CREAM,  fg: INK,      accent: RED    },
  ];
  return (
    <section>
      {posters.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true, margin: "-100px" }}
          className="relative overflow-hidden flex flex-col justify-between px-5 md:px-10 py-16 md:py-28"
          style={{ background: p.bg, color: p.fg, minHeight: "80vh" }}
        >
          <div className="flex items-start justify-between">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ opacity: 0.7 }}>
              Pillar {p.n}
            </div>
            <div className="text-[11px] font-mono uppercase tracking-[0.25em]" style={{ color: p.accent }}>
              {String(i + 1).padStart(2, "0")} / 03
            </div>
          </div>

          <motion.h3
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-100px" }}
            className="tracking-tighter leading-none"
            style={{ fontSize: "clamp(120px, 28vw, 440px)", letterSpacing: "-0.06em", fontWeight: 900 }}
          >
            {p.word}
          </motion.h3>

          <div className="flex items-end justify-between gap-6">
            <p className="text-[18px] md:text-[22px] leading-snug" style={{ fontWeight: 500, maxWidth: 520 }}>
              {p.caption}
            </p>
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-right" style={{ color: p.accent }}>
              never / always / never
            </div>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

/* ═══ Final CTA — oversized type, no image ═══ */
function FinalCta({ primaryHref }: { primaryHref: string }) {
  return (
    <section className="relative flex flex-col items-center justify-center px-5 md:px-10 py-36 md:py-56 text-center"
             style={{ background: INK, color: "#fff" }}>
      <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
        04 / The Move
      </div>
      <motion.h2
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} viewport={{ once: true }}
        className="tracking-tight"
        style={{ fontSize: "clamp(48px, 9vw, 144px)", lineHeight: 0.95, letterSpacing: "-0.045em", fontWeight: 800, maxWidth: 1200 }}
      >
        Surprise<br /><span style={{ color: ACCENT }}>your brand.</span>
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
        viewport={{ once: true }}
        className="mt-10"
      >
        <Link to={primaryHref} className="inline-flex items-center gap-2 h-14 px-8 rounded-full text-[16.5px]"
              style={{ background: "#fff", color: INK, fontWeight: 700 }}>
          Try Ora — it's free to start <ArrowRight size={17} />
        </Link>
      </motion.div>
    </section>
  );
}

/* ═══ Footer ═══ */
function Footer() {
  return (
    <footer className="py-10" style={{ background: INK, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <OraLogo size={20} color="#fff" />
          <span className="text-[14px]" style={{ fontWeight: 700 }}>Ora</span>
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

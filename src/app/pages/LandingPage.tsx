import { Link } from "react-router";
import { motion } from "motion/react";
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
import img9 from "../../assets/a46d76935870c25dd77092bb6135d8035f3df8e8.png";
import img10 from "../../assets/c4a860a492b53d3f5716a208e85f575e7f1e18de.png";

const ALL_IMGS = [img1, img2, img3, img4, img5, img6, img7, img8, img9, img10];

/* ═══ Palette ═══ */
const INK = "#0A0A0A";
const INK_TEXT = "#FFFFFF";
const MUTED = "#6E6E73";
const LINE = "rgba(255,255,255,0.12)";
const ACCENT = "#3B82F6";

export function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? "/hub/surprise" : "/login";

  return (
    <div style={{ background: INK, color: INK_TEXT, fontFeatureSettings: '"ss01"' }}>
      <Header authed={!!user} primaryHref={primaryHref} />
      <Hero primaryHref={primaryHref} />
      <MotionShowreel />
      <ManifestoOverlay />
      <PillarBands />
      <FinalCta primaryHref={primaryHref} />
      <Footer />
    </div>
  );
}

/* ═══ Header — transparent, sits over the hero gallery ═══ */
function Header({ authed, primaryHref }: { authed: boolean; primaryHref: string }) {
  return (
    <header
      className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 md:px-10 h-14"
      style={{ background: "rgba(10,10,10,0.35)", backdropFilter: "blur(18px) saturate(180%)", borderBottom: `1px solid ${LINE}` }}
    >
      <Link to="/" className="flex items-center gap-2">
        <OraLogo size={22} color="#fff" />
        <span className="text-[15px] tracking-tight" style={{ fontWeight: 600, color: "#fff" }}>Ora</span>
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
        <Link to="/pricing" className="hover:text-white transition">Pricing</Link>
        <Link to="/models" className="hover:text-white transition">Models</Link>
        <Link to="/about" className="hover:text-white transition">Manifesto</Link>
      </nav>
      <div className="flex items-center gap-2">
        {!authed && (
          <Link to="/login" className="hidden sm:inline-flex items-center h-8 px-3 rounded-full text-[13px] hover:bg-white/10" style={{ color: "#fff" }}>
            Sign in
          </Link>
        )}
        <Link to={primaryHref} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px]"
              style={{ background: "#fff", color: INK, fontWeight: 500 }}>
          {authed ? "Open" : "Try Ora"} <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}

/* ═══ Hero — dark canvas with animated asymmetric gallery behind the tagline ═══ */
function Hero({ primaryHref }: { primaryHref: string }) {
  return (
    <section className="relative overflow-hidden" style={{ minHeight: "100vh" }}>
      {/* Background gallery — full-bleed, irregular tiles, slow parallax */}
      <div className="absolute inset-0 grid grid-cols-4 md:grid-cols-6 grid-rows-3 md:grid-rows-2 gap-1 p-1" aria-hidden>
        {[
          { img: img1,  span: "col-span-2 row-span-2 md:col-span-2 md:row-span-2" },
          { img: img2,  span: "col-span-2 row-span-1 md:col-span-1 md:row-span-1" },
          { img: img3,  span: "col-span-2 row-span-1 md:col-span-1 md:row-span-1" },
          { img: img4,  span: "hidden md:block md:col-span-2 md:row-span-1" },
          { img: img5,  span: "hidden md:block md:col-span-1 md:row-span-1" },
          { img: img6,  span: "hidden md:block md:col-span-1 md:row-span-1" },
        ].map((t, i) => (
          <motion.div
            key={i}
            className={`relative overflow-hidden ${t.span}`}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: i * 0.12, ease: "easeOut" }}
          >
            <motion.img
              src={t.img} alt=""
              className="absolute inset-0 w-full h-full object-cover"
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 16 + i * 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        ))}
      </div>

      {/* Dark vignette overlay — keeps the typography readable without killing the imagery */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.78) 60%, rgba(10,10,10,0.92) 100%)" }} />

      {/* Centered tagline + CTA */}
      <div className="relative h-screen flex flex-col items-center justify-center text-center px-5 md:px-10">
        <motion.h1
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="tracking-tight"
          style={{ fontSize: "clamp(56px, 12vw, 172px)", lineHeight: 0.94, fontWeight: 700, letterSpacing: "-0.045em", color: "#fff" }}
        >
          Stop prompting.
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.45 }}
          className="tracking-tight"
          style={{ fontSize: "clamp(56px, 12vw, 172px)", lineHeight: 0.94, fontWeight: 700, letterSpacing: "-0.045em", color: ACCENT, marginTop: 6 }}
        >
          Surprise your brand.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.75 }}
          className="mt-10 md:mt-14 flex flex-col items-center gap-3"
        >
          <Link to={primaryHref}
            className="group inline-flex items-center gap-2.5 h-14 px-8 rounded-full text-[16.5px]"
            style={{ background: "#fff", color: INK, fontWeight: 600, boxShadow: "0 20px 44px -14px rgba(59,130,246,0.45)" }}
          >
            <Sparkles size={18} /> Surprise me
            <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.55)" }}>
            one click · full pack · every platform
          </span>
        </motion.div>
      </div>

      {/* Soft scroll hint */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4, duration: 0.8 }}
        className="absolute bottom-6 inset-x-0 flex justify-center text-[11px] uppercase tracking-[0.25em]"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        scroll
      </motion.div>
    </section>
  );
}

/* ═══ Motion showreel — infinite horizontal marquee of generated visuals ═══ */
function MotionShowreel() {
  const loop = [...ALL_IMGS, ...ALL_IMGS]; // double for seamless loop
  return (
    <section className="relative overflow-hidden py-14" style={{ background: INK }}>
      <div className="text-center mb-8 px-5 md:px-10">
        <div className="text-[11.5px] uppercase tracking-[0.2em] mb-3" style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}>
          Watch it work
        </div>
        <p className="mx-auto tracking-tight" style={{ fontSize: "clamp(22px, 2.6vw, 30px)", lineHeight: 1.25, maxWidth: 680, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
          Drop your brand. Pick your platforms. Ora ships the pack.
        </p>
      </div>

      {/* Marquee row 1 */}
      <motion.div
        className="flex gap-3 shrink-0"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((src, i) => (
          <div key={i} className="shrink-0 rounded-xl overflow-hidden" style={{ width: 360, height: 220 }}>
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </motion.div>
      {/* Marquee row 2 — opposite direction */}
      <motion.div
        className="flex gap-3 shrink-0 mt-3"
        animate={{ x: ["-50%", "0%"] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {loop.slice().reverse().map((src, i) => (
          <div key={i} className="shrink-0 rounded-xl overflow-hidden" style={{ width: 280, height: 360 }}>
            <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ═══ Manifesto — ONE line, huge, full-bleed image behind ═══ */
function ManifestoOverlay() {
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: 620 }}>
      <img src={img3} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 100%)" }} />
      <div className="relative h-full py-24 md:py-36 flex items-center justify-center text-center px-5 md:px-10" style={{ minHeight: 620 }}>
        <motion.p
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0 }} viewport={{ once: true, margin: "-120px" }}
          className="tracking-tight"
          style={{ fontSize: "clamp(40px, 7vw, 104px)", lineHeight: 1.02, letterSpacing: "-0.03em", fontWeight: 700, color: "#fff", maxWidth: 1200 }}
        >
          Branding is everywhere.<br/><span style={{ color: ACCENT }}>Surprise is nowhere.</span>
        </motion.p>
      </div>
    </section>
  );
}

/* ═══ Pillar bands — 3 full-width cinematic bands, image + overlay text ═══ */
function PillarBands() {
  const bands = [
    { img: img1,  headline: "Loss of brand value,",    tail: "never.",  sub: "Your DA is locked across every asset in the pack.",          align: "left"  as const },
    { img: img2,  headline: "Memorable,",              tail: "always.", sub: "Every shot carries a graphic twist that stops the scroll.", align: "right" as const },
    { img: img4,  headline: "Copyable,",               tail: "never.",  sub: "One concept, one seed, scenes nobody else can replay.",     align: "left"  as const },
  ];
  return (
    <section>
      {bands.map((b, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }} viewport={{ once: true, margin: "-120px" }}
          className="relative w-full overflow-hidden"
          style={{ aspectRatio: "21 / 9", minHeight: 360 }}
        >
          <motion.img
            src={b.img} alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1.06 }} whileInView={{ scale: 1 }}
            transition={{ duration: 1.2 }} viewport={{ once: true, margin: "-120px" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: b.align === "left"
                ? "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 100%)"
                : "linear-gradient(270deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 100%)",
            }}
          />
          <div className={`relative h-full flex items-center ${b.align === "left" ? "justify-start text-left" : "justify-end text-right"} px-8 md:px-20`} style={{ minHeight: 360 }}>
            <div style={{ maxWidth: 540 }}>
              <h3 className="tracking-tight" style={{ fontSize: "clamp(34px, 5vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.025em", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
                {b.headline}<br/>
                <span style={{ color: "#fff", fontWeight: 700 }}>{b.tail}</span>
              </h3>
              <p className="mt-4 text-[16px] md:text-[18px] leading-relaxed" style={{ color: "rgba(255,255,255,0.82)" }}>{b.sub}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </section>
  );
}

/* ═══ Final CTA — full-bleed cinematic ═══ */
function FinalCta({ primaryHref }: { primaryHref: string }) {
  return (
    <section className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9", minHeight: 560 }}>
      <img src={img3} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.75) 100%)" }} />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-5 md:px-10" style={{ color: "#fff" }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-60px" }}
          className="tracking-tight mx-auto"
          style={{ fontSize: "clamp(44px, 8vw, 124px)", lineHeight: 0.96, letterSpacing: "-0.04em", fontWeight: 700, maxWidth: 1100 }}
        >
          Ready to surprise your brand?
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }} viewport={{ once: true, margin: "-60px" }}
          className="mt-10"
        >
          <Link to={primaryHref} className="inline-flex items-center gap-2 h-14 px-8 rounded-full text-[16.5px]"
                style={{ background: "#fff", color: INK, fontWeight: 600 }}>
            <Sparkles size={18} /> Try Ora
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ Footer ═══ */
function Footer() {
  return (
    <footer className="py-10" style={{ background: INK, borderTop: `1px solid ${LINE}` }}>
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <OraLogo size={20} color="#fff" />
          <span className="text-[14px]" style={{ fontWeight: 600 }}>Ora</span>
          <span className="text-[12.5px] ml-2" style={{ color: MUTED }}>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]" style={{ color: MUTED }}>
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

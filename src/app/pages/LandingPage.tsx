import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";
import heroImg from "../../assets/b545abf4495677ce6104da79f57e7f15edcba5a0.png";
import serviceImg from "../../assets/fd1a1304c95304459d525edabe5b548965b73ee0.png";
import sunsetImg from "../../assets/e770a4caf934a7f0a280cbbe70316b0d298cff32.png";

/* ═══ Palette — Apple-like neutral ═══ */
const BG = "#FBFBFD";
const INK = "#0A0A0A";
const INK_SOFT = "#1D1D1F";
const MUTED = "#6E6E73";
const LINE = "rgba(10,10,10,0.08)";
const ACCENT = "#3B82F6";

export function LandingPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";
  const primaryHref = user ? "/hub/surprise" : "/login";

  return (
    <div style={{ background: BG, color: INK, fontFeatureSettings: '"ss01"' }}>
      <LandingHeader isFr={isFr} authed={!!user} primaryHref={primaryHref} />
      <Hero isFr={isFr} primaryHref={primaryHref} />
      <ManifestoLines isFr={isFr} />
      <CinematicBreak />
      <Pillars isFr={isFr} />
      <ProductShowcase isFr={isFr} />
      <HowItWorks isFr={isFr} />
      <FinalCta isFr={isFr} primaryHref={primaryHref} />
      <Footer isFr={isFr} />
    </div>
  );
}

/* ═══ Header ═══ */
function LandingHeader({ isFr, authed, primaryHref }: { isFr: boolean; authed: boolean; primaryHref: string }) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-10 h-14"
      style={{ background: `${BG}CC`, backdropFilter: "blur(18px) saturate(180%)", borderBottom: `1px solid ${LINE}` }}
    >
      <Link to="/" className="flex items-center gap-2">
        <OraLogo size={22} />
        <span className="text-[15px] tracking-tight" style={{ fontWeight: 600 }}>Ora</span>
      </Link>
      <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: MUTED }}>
        <Link to="/pricing" className="hover:text-black transition">{isFr ? "Tarifs" : "Pricing"}</Link>
        <Link to="/models" className="hover:text-black transition">{isFr ? "Modèles" : "Models"}</Link>
        <Link to="/about" className="hover:text-black transition">{isFr ? "Manifesto" : "Manifesto"}</Link>
      </nav>
      <div className="flex items-center gap-2">
        {!authed && (
          <Link to="/login" className="hidden sm:inline-flex items-center h-8 px-3 rounded-full text-[13px] hover:bg-black/5" style={{ color: INK }}>
            {isFr ? "Se connecter" : "Sign in"}
          </Link>
        )}
        <Link to={primaryHref} className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px]"
              style={{ background: INK, color: "#fff", fontWeight: 500 }}>
          {authed ? (isFr ? "Ouvrir" : "Open") : (isFr ? "Essayer" : "Try Ora")} <ArrowRight size={13} />
        </Link>
      </div>
    </header>
  );
}

/* ═══ Hero ═══ */
function Hero({ isFr, primaryHref }: { isFr: boolean; primaryHref: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 pt-24 md:pt-36 pb-16 md:pb-24 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
          className="tracking-tight mx-auto"
          style={{
            fontSize: "clamp(52px, 11vw, 156px)",
            lineHeight: 0.95, fontWeight: 700, letterSpacing: "-0.04em",
            color: INK,
          }}
        >
          Stop prompting.
        </motion.h1>
        <motion.h2
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          className="tracking-tight mx-auto"
          style={{
            fontSize: "clamp(52px, 11vw, 156px)",
            lineHeight: 0.95, fontWeight: 700, letterSpacing: "-0.04em",
            color: ACCENT,
            marginTop: 6,
          }}
        >
          Surprise your brand.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-8 md:mt-10 mx-auto text-[18px] md:text-[22px] leading-relaxed"
          style={{ color: MUTED, maxWidth: 720 }}
        >
          {isFr
            ? "Une app pour surprendre ta marque et ton audience. Tu pose ton univers, Ora écrit le concept, livre le pack. Sans prompt."
            : "An app to surprise your brand and your audience. You drop your world, Ora writes the concept, ships the pack. No prompts."}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link to={primaryHref} className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-[15.5px]"
                style={{ background: INK, color: "#fff", fontWeight: 500, boxShadow: "0 14px 30px -12px rgba(10,10,10,0.35)" }}>
            <Sparkles size={16} /> {isFr ? "Essaie Ora" : "Try Ora"}
          </Link>
          <Link to="/pricing" className="inline-flex items-center h-12 px-5 rounded-full text-[15px] hover:bg-black/5"
                style={{ color: INK, border: `1px solid ${LINE}` }}>
            {isFr ? "Voir les tarifs" : "See pricing"}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ Manifesto ═══ */
function ManifestoLines({ isFr }: { isFr: boolean }) {
  const lines = isFr
    ? [
        { text: "Depuis toujours, le branding est partout.", emphasis: false },
        { text: "La surprise, nulle part.",                   emphasis: true  },
        { text: "Aujourd'hui, les audiences ne demandent qu'une chose : être saisies.", emphasis: false },
      ]
    : [
        { text: "Branding has always been everywhere.", emphasis: false },
        { text: "Surprise, nowhere.",                    emphasis: true  },
        { text: "Audiences today want one thing: to be caught off guard.", emphasis: false },
      ];
  return (
    <section className="py-24 md:py-36">
      <div className="max-w-[1080px] mx-auto px-5 md:px-10 flex flex-col gap-6 md:gap-8">
        {lines.map((l, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: i * 0.05 }} viewport={{ once: true, margin: "-100px" }}
            className="tracking-tight"
            style={{
              fontSize: "clamp(30px, 5.5vw, 72px)",
              lineHeight: 1.08, letterSpacing: "-0.02em",
              fontWeight: l.emphasis ? 700 : 500,
              color: l.emphasis ? INK : INK_SOFT,
            }}
          >
            {l.text}
          </motion.p>
        ))}
      </div>
    </section>
  );
}

/* ═══ Cinematic full-bleed break between manifesto and pillars ═══ */
function CinematicBreak() {
  return (
    <motion.div
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
      transition={{ duration: 1.0 }} viewport={{ once: true, margin: "-120px" }}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "21 / 9" }}
    >
      <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.55) 100%)" }} />
    </motion.div>
  );
}

/* ═══ Three Pillars ═══ */
function Pillars({ isFr }: { isFr: boolean }) {
  const pillars = isFr
    ? [
        { headline: "Perte de brand value,",   tail: "jamais.",  sub: "La DA de ta marque reste verrouillée sur chaque visuel du pack." },
        { headline: "Mémorable,",              tail: "toujours.", sub: "Chaque shot carry un twist graphique ou de scène qui arrête le scroll." },
        { headline: "Copiable,",               tail: "jamais.",   sub: "Un concept, un seed, des scènes pensées — impossible à refaire exactement ailleurs." },
      ]
    : [
        { headline: "Loss of brand value,",    tail: "never.",    sub: "Your brand DA is locked across every visual in the pack." },
        { headline: "Memorable,",              tail: "always.",   sub: "Every shot carries a graphic or scene twist that stops the scroll." },
        { headline: "Copyable,",               tail: "never.",    sub: "One concept, one seed, hand-authored scenes — nobody can replay it elsewhere." },
      ];
  return (
    <section className="py-24 md:py-36" style={{ background: "#F5F5F7" }}>
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {pillars.map((p, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.08 }} viewport={{ once: true, margin: "-80px" }}
          >
            <h3 className="tracking-tight" style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.05, letterSpacing: "-0.02em", fontWeight: 600, color: INK_SOFT }}>
              {p.headline}
              <br />
              <span style={{ color: INK, fontWeight: 700 }}>{p.tail}</span>
            </h3>
            <p className="mt-4 text-[16px] leading-relaxed" style={{ color: MUTED }}>{p.sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ═══ Product Showcase — full-bleed asymmetric gallery, NO card ═══ */
function ProductShowcase({ isFr }: { isFr: boolean }) {
  return (
    <section className="py-24 md:py-36">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 mb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-100px" }}
        >
          <div className="text-[13px] uppercase tracking-[0.18em] mb-4" style={{ color: MUTED, fontWeight: 600 }}>
            {isFr ? "Un clic. Un pack. Toutes les plateformes." : "One click. One pack. Every platform."}
          </div>
          <h2 className="tracking-tight" style={{ fontSize: "clamp(36px, 6vw, 80px)", lineHeight: 1.02, letterSpacing: "-0.03em", fontWeight: 700, maxWidth: 960 }}>
            {isFr
              ? <>Ora livre ta campagne,<br/><span style={{ color: ACCENT }}>complète</span>, cohérente, prête à poster.</>
              : <>Ora ships your campaign,<br/><span style={{ color: ACCENT }}>complete</span>, coherent, post-ready.</>}
          </h2>
        </motion.div>
      </div>

      {/* Full-bleed asymmetric gallery — no frame, no white card */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }} viewport={{ once: true, margin: "-100px" }}
        className="w-full"
      >
        {/* Row 1: giant hero + two portraits */}
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-1.5 md:gap-2">
          <div className="relative overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
            <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <GalleryTag label="linkedin · hero" />
          </div>
          <div className="relative overflow-hidden hidden md:block" style={{ aspectRatio: "9 / 16" }}>
            <img src={sunsetImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <GalleryTag label="story · 9x16" />
          </div>
          <div className="relative overflow-hidden hidden md:block" style={{ aspectRatio: "9 / 16" }}>
            <img src={serviceImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <GalleryTag label="tiktok · 9x16" />
          </div>
        </div>
        {/* Row 2: three squares */}
        <div className="grid grid-cols-3 gap-1.5 md:gap-2 mt-1.5 md:mt-2">
          <div className="relative overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
            <img src={serviceImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <GalleryTag label="insta · 1x1" />
          </div>
          <div className="relative overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
            <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <GalleryTag label="insta · 1x1" />
          </div>
          <div className="relative overflow-hidden" style={{ aspectRatio: "1 / 1" }}>
            <img src={sunsetImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <GalleryTag label="insta · 1x1" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function GalleryTag({ label }: { label: string }) {
  return (
    <div className="absolute top-3 left-3 px-2.5 h-7 rounded-full inline-flex items-center text-[11.5px] font-mono"
         style={{ background: "rgba(255,255,255,0.92)", color: INK, backdropFilter: "blur(8px)" }}>
      {label}
    </div>
  );
}

/* ═══ How it works ═══ */
function HowItWorks({ isFr }: { isFr: boolean }) {
  const steps = isFr
    ? [
        { n: "01", title: "Dépose ton univers.",        sub: "Un visuel, trois mots sur ta marque, le choix des plateformes. C'est tout." },
        { n: "02", title: "Ora écrit la campagne.",     sub: "Concept, angle, ton, message clé. La DA marque reste verrouillée." },
        { n: "03", title: "Le pack arrive.",             sub: "Images, films, carrousels, captions — par plateforme, nommés, téléchargeables en ZIP." },
      ]
    : [
        { n: "01", title: "Drop your world.",            sub: "One visual, three words about your brand, the platforms you want. Done." },
        { n: "02", title: "Ora writes the campaign.",    sub: "Concept, angle, tone, key message. Brand DA stays locked." },
        { n: "03", title: "The pack lands.",              sub: "Images, films, carousels, captions — by platform, named, ZIP-ready." },
      ];
  return (
    <section className="py-24 md:py-36">
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.08 }} viewport={{ once: true, margin: "-80px" }}
          >
            <div className="text-[13px] font-mono mb-3" style={{ color: ACCENT, fontWeight: 600 }}>{s.n}</div>
            <h3 className="tracking-tight" style={{ fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600 }}>
              {s.title}
            </h3>
            <p className="mt-3 text-[16px] leading-relaxed" style={{ color: MUTED }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ═══ Final CTA — full-bleed cinematic image + overlay, no flat box ═══ */
function FinalCta({ isFr, primaryHref }: { isFr: boolean; primaryHref: string }) {
  return (
    <section className="relative w-full overflow-hidden" style={{ aspectRatio: "16 / 9", minHeight: 520 }}>
      <img src={sunsetImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)" }} />
      <div className="relative h-full flex flex-col items-center justify-center text-center px-5 md:px-10" style={{ color: "#fff" }}>
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }} viewport={{ once: true, margin: "-60px" }}
          className="tracking-tight mx-auto"
          style={{ fontSize: "clamp(44px, 8vw, 124px)", lineHeight: 0.96, letterSpacing: "-0.04em", fontWeight: 700, maxWidth: 1100 }}
        >
          {isFr ? "Prête à surprendre ta marque ?" : "Ready to surprise your brand?"}
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }} viewport={{ once: true, margin: "-60px" }}
          className="mt-10"
        >
          <Link to={primaryHref} className="inline-flex items-center gap-2 h-14 px-8 rounded-full text-[16.5px]"
                style={{ background: "#fff", color: INK, fontWeight: 600 }}>
            <Sparkles size={18} /> {isFr ? "Essaie Ora" : "Try Ora"}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══ Footer ═══ */
function Footer({ isFr }: { isFr: boolean }) {
  return (
    <footer className="py-10" style={{ background: BG, borderTop: `1px solid ${LINE}` }}>
      <div className="max-w-[1200px] mx-auto px-5 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <OraLogo size={20} />
          <span className="text-[14px]" style={{ fontWeight: 600 }}>Ora</span>
          <span className="text-[12.5px] ml-2" style={{ color: MUTED }}>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px]" style={{ color: MUTED }}>
          <Link to="/pricing" className="hover:text-black transition">{isFr ? "Tarifs" : "Pricing"}</Link>
          <Link to="/models" className="hover:text-black transition">{isFr ? "Modèles" : "Models"}</Link>
          <Link to="/about" className="hover:text-black transition">Manifesto</Link>
          <Link to="/terms" className="hover:text-black transition">{isFr ? "Conditions" : "Terms"}</Link>
          <Link to="/privacy" className="hover:text-black transition">{isFr ? "Confidentialité" : "Privacy"}</Link>
        </div>
      </div>
    </footer>
  );
}

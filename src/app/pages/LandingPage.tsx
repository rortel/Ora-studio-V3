import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Lock, Sparkles, Zap } from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ora/Button";
import { Badge } from "../components/ora/Badge";
import { Surface } from "../components/ora/Surface";
import { bagel, COLORS } from "../components/ora/tokens";
import heroVideo from "../../assets/hero-video.mp4";

/* Public templates — real examples of what Ora ships. Paths resolve at runtime. */
const HERO_VIDEO = heroVideo;
const HERO_TILES = [
  { kind: "video" as const, src: heroVideo,                       label: "linkedin · hero" },
  { kind: "img"   as const, src: "/templates/figma-fashion-post-01.png",  label: "ig feed · fashion" },
  { kind: "img"   as const, src: "/templates/figma-skincare-01.png",       label: "ig story · skincare" },
];

const GALLERY = [
  { src: "/templates/figma-linkedin-01.png",       label: "linkedin · hero" },
  { src: "/templates/figma-igp-01.png",            label: "ig feed · launch" },
  { src: "/templates/figma-story-01.png",          label: "ig story" },
  { src: "/templates/figma-b2b-01.png",            label: "linkedin · b2b" },
  { src: "/templates/figma-fashion-post-02.png",   label: "ig feed · fashion" },
  { src: "/templates/figma-skincare-02.png",       label: "tiktok · skincare" },
];

export function LandingPage() {
  const { user } = useAuth();
  const primaryHref = user ? "/hub/surprise" : "/login";

  return (
    <div style={{ background: COLORS.cream, color: COLORS.ink }}>
      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(244,239,230,0.82)" }}>
        <nav className="px-5 md:px-10 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <OraLogo size={22} />
            <span className="text-[28px] leading-none" style={bagel}>Ora</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13.5px]" style={{ color: COLORS.muted }}>
            <a href="#how" className="hover:text-black">How it works</a>
            <a href="#gallery" className="hover:text-black">Gallery</a>
            <Link to="/pricing" className="hover:text-black">Pricing</Link>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            )}
            <Link to={primaryHref}>
              <Button variant="accent" size="md">
                {user ? "Open" : "Get started"} <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ═══ Hero ═══ */}
      <section className="px-5 md:px-10 pt-10 pb-20 max-w-[1400px] mx-auto">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex mb-8"
          >
            <Badge tone="cream">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
              2,847 brands · 127,493 assets generated
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="leading-[0.88] mb-8"
            style={{ ...bagel, fontSize: "clamp(64px, 12vw, 156px)" }}
          >
            Stop prompting.<br />
            Surprise <span style={{ color: COLORS.coral }}>your brand.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-[17px] md:text-[20px] max-w-2xl mx-auto mb-10"
            style={{ color: COLORS.muted }}
          >
            Drop your brand. Pick your platforms. Ora ships a full pack — LinkedIn,
            Instagram, TikTok — in one click. No prompt writing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Generate 8 assets free <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="text-[13px]" style={{ color: COLORS.subtle }}>
              No credit card · No prompt writing
            </span>
          </motion.div>
        </div>

        {/* Hero showcase — 1 big video + 2 medium */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4"
        >
          <div className="md:col-span-2 md:row-span-2 rounded-[28px] overflow-hidden aspect-[4/3] md:aspect-auto bg-white relative">
            <video src={HERO_VIDEO} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4"><Badge tone="ink">42s · hero film</Badge></div>
          </div>
          {HERO_TILES.slice(1).map((t, i) => (
            <div key={i} className="rounded-[28px] overflow-hidden aspect-[4/3] bg-white relative">
              <img src={t.src} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3"><Badge tone="ink">42s · {t.label.split(" · ")[1] || t.label}</Badge></div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ═══ Before / After ═══ */}
      <section id="how" className="px-5 md:px-10 pb-20 max-w-[1400px] mx-auto">
        <div className="text-center mb-10">
          <div className="text-[13px] mb-3" style={{ color: COLORS.subtle }}>The difference</div>
          <h2 className="leading-[0.95]" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 104px)" }}>
            4 hours, or 42 seconds.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Surface tone="warm" pad="lg" radius="2xl">
            <Badge tone="cream">Before Ora</Badge>
            <div className="mt-6 mb-4 leading-none" style={{ ...bagel, fontSize: "clamp(56px, 8vw, 96px)" }}>
              4 hours
            </div>
            <ul className="space-y-2 text-[15px]" style={{ color: "rgba(17,17,17,0.7)" }}>
              <li>— Design in Figma</li>
              <li>— Resize for 8 formats</li>
              <li>— Export manually</li>
              <li>— Rewrite prompts</li>
            </ul>
          </Surface>
          <Surface tone="coral" pad="lg" radius="2xl">
            <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[12px] font-medium"
                  style={{ background: "rgba(255,255,255,0.22)", color: "#fff" }}>
              With Ora
            </span>
            <div className="mt-6 mb-4 leading-none" style={{ ...bagel, fontSize: "clamp(56px, 8vw, 96px)" }}>
              42 seconds
            </div>
            <ul className="space-y-2 text-[15px]" style={{ color: "rgba(255,255,255,0.88)" }}>
              <li>— One click</li>
              <li>— 8 platform-ready assets</li>
              <li>— Brand-locked consistency</li>
              <li>— Zero prompting</li>
            </ul>
          </Surface>
        </div>
      </section>

      {/* ═══ Gallery (bento) ═══ */}
      <section id="gallery" className="px-5 md:px-10 pb-20 max-w-[1400px] mx-auto">
        <div className="text-center mb-10">
          <div className="text-[13px] mb-3" style={{ color: COLORS.subtle }}>Real results</div>
          <h2 className="leading-[0.95]" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 104px)" }}>
            Stunning assets, zero effort.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4 auto-rows-[180px] md:auto-rows-[240px]">
          {GALLERY.slice(0, 6).map((item, i) => {
            const span =
              i === 0 ? "md:col-span-4 md:row-span-2"
            : i === 1 ? "md:col-span-2"
            : i === 2 ? "md:col-span-2"
            : i === 3 ? "md:col-span-3 md:row-span-2"
            : "md:col-span-3";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className={`relative rounded-[28px] overflow-hidden bg-white group ${span}`}
              >
                <img src={item.src} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                <div className="absolute top-3 left-3"><Badge tone="ink">42s · {item.label}</Badge></div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══ Pillars (Locked / Bold / Unique) ═══ */}
      <section className="px-5 md:px-10 pb-20 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Surface tone="warm" pad="lg" radius="2xl" className="md:p-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6"
                 style={{ background: COLORS.ink, color: "#fff" }}>
              <Lock size={16} />
            </div>
            <h3 className="leading-none mb-3" style={{ ...bagel, fontSize: "clamp(36px, 4vw, 56px)" }}>
              Locked
            </h3>
            <p style={{ color: "rgba(17,17,17,0.7)" }}>
              Your brand DNA never drifts. Palette, style and tone stay exact.
            </p>
          </Surface>
          <Surface tone="butter" pad="lg" radius="2xl" className="md:p-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6"
                 style={{ background: COLORS.ink, color: "#fff" }}>
              <Sparkles size={16} />
            </div>
            <h3 className="leading-none mb-3" style={{ ...bagel, fontSize: "clamp(36px, 4vw, 56px)" }}>
              Bold
            </h3>
            <p style={{ color: "rgba(17,17,17,0.75)" }}>
              Every batch carries a fresh creative twist — on-brand, always.
            </p>
          </Surface>
          <Surface tone="violet" pad="lg" radius="2xl" className="md:p-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-6"
                 style={{ background: "#fff", color: COLORS.ink }}>
              <Zap size={16} />
            </div>
            <h3 className="leading-none mb-3" style={{ ...bagel, fontSize: "clamp(36px, 4vw, 56px)", color: "#fff" }}>
              Unique
            </h3>
            <p style={{ color: "rgba(255,255,255,0.88)" }}>
              Seed + scenes + variation. One-of-one packs every time.
            </p>
          </Surface>
        </div>
      </section>

      {/* ═══ CTA — ink surface with butter accent ═══ */}
      <section id="pricing" className="px-5 md:px-10 pb-20 max-w-[1400px] mx-auto">
        <Surface tone="ink" pad="lg" radius="2xl" className="md:p-16 text-center">
          <div className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>Start creating</div>
          <h2 className="leading-[0.95] mb-6" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 104px)" }}>
            Stop designing.<br />
            <span style={{ color: COLORS.butter }}>Start surprising.</span>
          </h2>
          <p className="text-[16px] md:text-[18px] max-w-xl mx-auto mb-8" style={{ color: "rgba(255,255,255,0.72)" }}>
            Join the brands who've stopped briefing Figma. Your first pack is free.
          </p>
          <div className="flex items-center justify-center">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Generate 8 assets free <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
          <div className="text-[13px] mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            Free forever · No credit card
          </div>
        </Surface>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="px-5 md:px-10 py-10 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <OraLogo size={22} />
            <span className="text-[28px] leading-none" style={bagel}>Ora</span>
          </div>
          <div className="flex items-center gap-6 text-[13px]" style={{ color: COLORS.muted }}>
            <Link to="/pricing" className="hover:text-black">Pricing</Link>
            <a href="#gallery" className="hover:text-black">Gallery</a>
            <Link to="/terms" className="hover:text-black">Terms</Link>
            <Link to="/privacy" className="hover:text-black">Privacy</Link>
          </div>
          <div className="text-[13px]" style={{ color: COLORS.subtle }}>© {new Date().getFullYear()} Ora</div>
        </div>
      </footer>
    </div>
  );
}

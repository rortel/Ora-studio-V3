import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Lock, Sparkles, Zap } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ora/Button";
import { Badge } from "../components/ora/Badge";
import { Surface } from "../components/ora/Surface";
import { bagel, COLORS } from "../components/ora/tokens";
import { API_BASE } from "../lib/supabase";
import { BentoGallery, type BentoItem } from "../components/ui/bento-gallery";
import heroVideo from "../../assets/hero-video.mp4";

interface ShowcaseAsset {
  itemId: string; featuredAt: string;
  /** Landing slot set by admin in Library. "hero" / "statement" fill the
   *  two full-screen parallax sections; "gallery" (default) flows into the
   *  horizontal bento below. Undefined on legacy records → treated as
   *  "gallery". */
  slot?: "hero" | "statement" | "gallery";
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
const FALLBACK_HERO_VIDEO = heroVideo;
const FALLBACK_HERO = [
  { kind: "video" as const, src: heroVideo,                              label: "hero film" },
  { kind: "img"   as const, src: "/templates/figma-fashion-post-01.png", label: "fashion" },
  { kind: "img"   as const, src: "/templates/figma-skincare-01.png",     label: "skincare" },
];
const FALLBACK_GALLERY = [
  { src: "/templates/figma-linkedin-01.png",     label: "linkedin",       platform: "linkedin",        ar: "16:9" },
  { src: "/templates/figma-igp-01.png",          label: "ig feed",        platform: "instagram-feed",  ar: "1:1"  },
  { src: "/templates/figma-story-01.png",        label: "ig story",       platform: "instagram-story", ar: "9:16" },
  { src: "/templates/figma-b2b-01.png",          label: "linkedin · b2b", platform: "linkedin",        ar: "16:9" },
  { src: "/templates/figma-fashion-post-02.png", label: "fashion",        platform: "instagram-feed",  ar: "1:1"  },
  { src: "/templates/figma-skincare-02.png",     label: "skincare",       platform: "instagram-feed",  ar: "1:1"  },
];

/**
 * Full-screen parallax canvas with an overlay title + optional CTA. Used for
 * the hero ("Stop prompting.") and the statement ("Start shipping.") slots.
 * The admin picks the background asset (image or video) from Library; we
 * fall back to the local hero video when the slot is empty so the page
 * never renders a hole.
 *
 * Parallax: the background moves up slower than the viewport scroll, the
 * title slides in and fades out on exit. All easings are sharp
 * (cubic-bezier 0.16,1,0.3,1) — not spring — so the motion reads as
 * "engineered" rather than "playful", which keeps the Bagel display font
 * feeling confident instead of cozy.
 */
function ParallaxFullscreen({
  videoUrl,
  posterUrl,
  imageUrl,
  eyebrow,
  title,
  subtitle,
  cta,
  alignment = "center",
}: {
  videoUrl?: string;
  posterUrl?: string;
  imageUrl?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: React.ReactNode;
  alignment?: "center" | "bottom-left";
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // Background translates from -15% to 15% as the user scrolls through.
  // 1.2× scale on the wrapper so the parallax doesn't reveal the edge.
  const bgY = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);
  // Title enters from below, holds in the center band, then exits upward.
  const titleY = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [80, 0, 0, -80]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.2, 0.75, 1], [0, 1, 1, 0]);

  const useVideo = !!videoUrl;
  const alignClass =
    alignment === "center"
      ? "items-center justify-center text-center"
      : "items-end justify-start text-left";

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-black">
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 scale-[1.2] will-change-transform"
      >
        {useVideo ? (
          <video
            src={videoUrl}
            poster={posterUrl}
            autoPlay muted loop playsInline preload="auto"
            className="h-full w-full object-cover"
          />
        ) : imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </motion.div>
      {/* Legibility overlay — heavier at the bottom where the title sits. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            alignment === "center"
              ? "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)"
              : "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.75) 100%)",
        }}
      />
      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className={`relative z-10 flex h-full flex-col ${alignClass} px-6 md:px-16 pb-[6vh] md:pb-[8vh]`}
      >
        {eyebrow && (
          <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-white/80">
            • {eyebrow}
          </div>
        )}
        <h1
          className="max-w-[14ch] leading-[0.92] text-white"
          style={{ ...bagel, fontSize: "clamp(56px, 11vw, 180px)" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-6 max-w-xl text-[15px] md:text-[17px] leading-snug text-white/85">
            {subtitle}
          </p>
        )}
        {cta && <div className="mt-8">{cta}</div>}
      </motion.div>
    </section>
  );
}

function platformLabel(p: string): string {
  const s = (p || "").toLowerCase();
  if (s.includes("instagram-story"))  return "ig story";
  if (s.includes("instagram"))        return "ig feed";
  if (s.includes("linkedin"))         return "linkedin";
  if (s.includes("facebook"))         return "facebook";
  if (s.includes("tiktok"))           return "tiktok";
  return p || "asset";
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

  // Resolve full-screen parallax section backgrounds by admin-picked slot.
  // Admin cycles an asset in Library through Hero / Statement / Gallery;
  // the first two drive the big parallax sections below, the rest flow
  // into the bento gallery. Empty slot → fallback hero video (cream-tinted).
  const heroSlotAsset = showcase.find((a) => a.slot === "hero");
  const statementSlotAsset = showcase.find((a) => a.slot === "statement");
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

  return (
    <div style={{ background: COLORS.cream, color: COLORS.ink }}>
      {/* ═══ Header ═══ */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(244,239,230,0.82)" }}>
        <nav className="px-5 md:px-10 py-4 flex items-center justify-between max-w-[1400px] mx-auto">
          <Link to="/" className="flex items-center" aria-label="Ora">
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

      {/* ═══ Hero — full-screen parallax ═══
       *   Background: admin-picked asset (slot=hero) or fallback hero video.
       *   Title: "Stop prompting." in Bagel over the visual, mono eyebrow. */}
      <ParallaxFullscreen
        videoUrl={heroSlotAsset?.videoUrl || (heroSlotAsset ? undefined : FALLBACK_HERO_VIDEO)}
        imageUrl={heroSlotAsset && !heroSlotAsset.videoUrl ? heroSlotAsset.imageUrl : undefined}
        posterUrl={heroSlotAsset?.imageUrl}
        eyebrow="2,847 brands · 127,493 assets generated"
        title={<>Stop prompting.</>}
        subtitle={
          <>Drop your brand. Pick your platforms. Ora ships a full pack — LinkedIn, Instagram, TikTok — in one click. No prompt writing.</>
        }
        cta={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Pick a plan · Start shipping <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="text-[13px] text-white/70">From €19/mo · Cancel anytime</span>
          </div>
        }
        alignment="bottom-left"
      />

      {/* ═══ Statement — full-screen parallax ═══
       *   Second half of the brand tagline ("Start shipping.") on its own
       *   full-screen canvas. Admin picks the background from Library
       *   (slot=statement); falls back to the hero video tinted so the two
       *   sections don't feel identical when the slot is empty. */}
      <ParallaxFullscreen
        videoUrl={statementSlotAsset?.videoUrl || (statementSlotAsset ? undefined : FALLBACK_HERO_VIDEO)}
        imageUrl={statementSlotAsset && !statementSlotAsset.videoUrl ? statementSlotAsset.imageUrl : undefined}
        posterUrl={statementSlotAsset?.imageUrl}
        eyebrow="Brand-locked · 42 seconds · full pack"
        title={<>Start shipping.</>}
        subtitle={
          <>Every asset lands on-brand, on-format, ready to publish. Stop tweaking prompts. Start reviewing output.</>
        }
        alignment="bottom-left"
      />

      {/* ═══ How it works — three moves, no prompting ═══ */}
      <section id="how" className="px-5 md:px-10 pb-24 pt-6 max-w-[1400px] mx-auto">
        <div className="text-center mb-12">
          <div className="text-[13px] mb-3" style={{ color: COLORS.subtle }}>Three moves. No prompt writing.</div>
          <h2 className="leading-[0.95]" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 104px)" }}>
            How it <span style={{ color: COLORS.coral }}>works.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {[
            {
              n: "01",
              tone: "warm" as const,
              title: "Drop your URL.",
              body: "Ora scans your site, locks palette, tone and photo style into your Brand Vault. 30 seconds, once.",
              tag: "Vault",
            },
            {
              n: "02",
              tone: "butter" as const,
              title: "Pick a direction.",
              body: "Three editorial angles waiting — tuned to your month, your sector, your brand. Click one. That's the brief.",
              tag: "Surprise Me",
            },
            {
              n: "03",
              tone: "coral" as const,
              title: "Ship the pack.",
              body: "Six assets, image + paired 5s film, framed for every network. Download the ZIP or publish in one click.",
              tag: "Publish",
            },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Surface tone={step.tone} pad="lg" radius="2xl" className="md:p-10 h-full flex flex-col">
                <div className="flex items-start justify-between mb-10">
                  <span className="leading-none" style={{ ...bagel, fontSize: "clamp(44px, 5vw, 72px)" }}>{step.n}</span>
                  <span className="inline-flex items-center h-7 px-3 rounded-full text-[10.5px]"
                        style={{ background: "rgba(17,17,17,0.08)", color: step.tone === "coral" ? "#fff" : COLORS.ink, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {step.tag}
                  </span>
                </div>
                <h3 className="leading-[0.98] mb-4" style={{ ...bagel, fontSize: "clamp(30px, 3.2vw, 44px)" }}>
                  {step.title}
                </h3>
                <p className="text-[15px] leading-relaxed" style={{ color: step.tone === "coral" ? "rgba(255,255,255,0.85)" : "rgba(17,17,17,0.72)" }}>
                  {step.body}
                </p>
              </Surface>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ Before / After ═══ */}
      <section className="px-5 md:px-10 pb-20 max-w-[1400px] mx-auto">
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

      {/* ═══ Gallery — draggable bento of real packs ═══
       *   Each featured campaign contributes its top 4 assets to the bento.
       *   Users drag horizontally through the pack (image OR video, auto-
       *   detected from URL), click a tile to open a full-screen lightbox.
       *   Falls back to the curated showcase Tile set when no starred
       *   campaigns exist yet. */}
      {(() => {
        // Build the flat BentoItem list. Featured campaigns take priority;
        // each contributes up to its first 4 assets. Falls back to the
        // hardcoded tile set when no campaigns are featured.
        const bentoItems: BentoItem[] = [];
        if (showcaseCampaigns.length > 0) {
          showcaseCampaigns.slice(0, 3).forEach((c, ci) => {
            c.assets.slice(0, 4).forEach((a, ai) => {
              // Give each campaign's first asset a bigger bento span so the
              // grid reads as 3 hero tiles + supporting tiles around them.
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
            const span =
              i === 0 || i === 3 ? "md:row-span-2" : "";
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
          <BentoGallery
            id="gallery"
            eyebrow="Real packs, real brands"
            title="One click. Full pack."
            description="Drag through the latest Ora campaigns. Click any tile to open it full-screen."
            items={bentoItems}
            className="max-w-[1400px] mx-auto"
          />
        );
      })()}

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
            Join the brands who've stopped briefing Figma. Pick a plan, ship your first pack tonight.
          </p>
          <div className="flex items-center justify-center">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Pick a plan <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
          <div className="text-[13px] mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            From €19/mo · Cancel anytime
          </div>
        </Surface>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="px-5 md:px-10 py-10 max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center">
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

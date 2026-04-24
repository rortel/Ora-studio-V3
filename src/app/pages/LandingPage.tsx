import { useEffect, useRef, useState } from "react";
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
 * Hero — editorial full-bleed. Two vertical beats:
 *   1. Statement: mono eyebrow + kinetic Bagel headline + subtitle + CTAs
 *   2. Media: full-viewport-width video with a parallax translate on scroll
 * The cream canvas continues under both beats so Bagel stays legible in ink
 * without needing a dark overlay — the tech signal comes from the mono
 * label, the 95vw media frame, and the sharp motion easings.
 */
function HeroFullBleed({
  primaryHref,
  videoSrc,
  posterSrc,
  videoLabel,
}: {
  primaryHref: string;
  videoSrc: string;
  posterSrc?: string;
  videoLabel: string;
}) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ["start end", "end start"],
  });
  // Gentle parallax — the media translates up slower than the viewport.
  // ±8% max; anything bigger starts to feel gimmicky on a light canvas.
  const mediaY = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  // Entry animation for the media: scales up slightly as it enters view.
  const mediaScale = useTransform(scrollYProgress, [0, 0.3], [1.04, 1]);

  return (
    <section className="relative pt-8 md:pt-12">
      {/* Beat 1 — statement */}
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 pb-10 md:pb-14">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mono-label mb-5 flex items-center gap-2"
          style={{ color: COLORS.muted }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: COLORS.coral }}
          />
          <span>v2.4 · 2,847 brands · 127,493 assets shipped</span>
        </motion.div>

        <h1
          className="mb-8"
          style={{ ...bagel, fontSize: "clamp(64px, 12vw, 180px)" }}
        >
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            Stop prompting.
          </motion.span>
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            Surprise{" "}
            <motion.span
              initial={{ color: COLORS.ink }}
              animate={{ color: COLORS.coral }}
              transition={{ duration: 0.45, delay: 0.85 }}
              style={{ display: "inline-block" }}
            >
              your brand.
            </motion.span>
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="body-tight text-[17px] md:text-[20px] max-w-2xl mb-10"
          style={{ color: COLORS.muted }}
        >
          Drop your brand. Pick your platforms. Ora ships a full pack —
          LinkedIn, Instagram, TikTok — in one click. No prompt writing.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <Link to={primaryHref}>
            <Button variant="accent" size="lg">
              Pick a plan · Start shipping <ArrowRight size={16} />
            </Button>
          </Link>
          <span
            className="mono-label"
            style={{ color: COLORS.subtle, textTransform: "none", letterSpacing: "0.02em" }}
          >
            From €19/mo · cancel anytime
          </span>
        </motion.div>
      </div>

      {/* Beat 2 — full-bleed media with parallax.
       *  Uses 95vw max-width so there's a thin cream margin on the sides —
       *  avoids the edge-to-edge-tile feeling that reads more "saas demo"
       *  than "editorial magazine". The 16px radius is deliberate: smaller
       *  than the old 28-32px (less artisanal), bigger than 0 (not brutalist). */}
      <motion.div
        ref={mediaRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="relative w-[95vw] max-w-[1400px] mx-auto aspect-[16/9] overflow-hidden rounded-2xl"
        style={{ background: "#FFFFFF" }}
      >
        <motion.div
          style={{ y: mediaY, scale: mediaScale }}
          className="absolute inset-0 will-change-transform"
        >
          <video
            src={videoSrc}
            poster={posterSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
        </motion.div>
        {/* Mono label floating top-left — reads as a technical caption,
         *  not a marketing badge. Matches the eyebrow's typography system. */}
        <div
          className="mono-label absolute top-5 left-5 z-10 rounded-full px-3 py-1"
          style={{ background: "rgba(17,17,17,0.88)", color: "#FFFFFF", backdropFilter: "blur(8px)" }}
        >
          42s · {videoLabel}
        </div>
      </motion.div>
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

  // Resolve hero tiles: 1 big (video if available) + 2 mediums.
  const showcaseVideo = showcase.find((a) => a.videoUrl);
  const showcaseImages = showcase.filter((a) => a.imageUrl);
  const heroBig  = showcaseVideo
    ? { kind: "video" as const, src: showcaseVideo.videoUrl, label: platformLabel(showcaseVideo.platform), poster: showcaseVideo.imageUrl }
    : { kind: "video" as const, src: FALLBACK_HERO_VIDEO,    label: "hero film", poster: undefined };
  const heroTile2 = showcaseImages[0]
    ? { kind: "img" as const, src: showcaseImages[0].imageUrl, label: platformLabel(showcaseImages[0].platform) }
    : FALLBACK_HERO[1];
  const heroTile3 = showcaseImages[1]
    ? { kind: "img" as const, src: showcaseImages[1].imageUrl, label: platformLabel(showcaseImages[1].platform) }
    : FALLBACK_HERO[2];

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

      {/* ═══ Hero — full-bleed editorial ═══
       *   Two beats: statement on top (mono eyebrow + massive Bagel + CTAs),
       *   full-bleed video below with parallax scroll. Cream stays as the
       *   canvas so Bagel reads warm-editorial; the tech signal comes from
       *   the mono eyebrow, the full-bleed ratio, and the parallax motion
       *   (cubic-bezier, not spring). */}
      <HeroFullBleed
        primaryHref={primaryHref}
        videoSrc={heroBig.src}
        posterSrc={heroBig.poster}
        videoLabel={heroBig.label}
      />

      {/* Hairline divider — replaces the old colour-shift transitions.
       *  One line of pure system signal between sections. */}
      <div className="max-w-[1400px] mx-auto px-5 md:px-10">
        <div className="hairline-t" />
      </div>

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

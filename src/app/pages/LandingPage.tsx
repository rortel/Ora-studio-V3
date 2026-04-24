import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Lock, Sparkles, Zap } from "lucide-react";
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

  // Landing canvas — off-white premium. Palette narrowed to 3 colours +
  // coral accent (butter/warm/violet are banned from this page to stop the
  // "craft studio" read). Text colours come from COLORS (ink/muted) so the
  // rest of the app design tokens stay consistent.
  const LANDING_BG = "#FAFAF7";

  return (
    <div style={{ background: LANDING_BG, color: COLORS.ink }}>
      {/* ═══ Navbar — thin sticky, mono links ═══
       *   Off-white blur background, mono nav items for the tech signal,
       *   Ora wordmark in Bagel. Hairline at the bottom instead of a
       *   shadow so the transition into the hero is crisp. */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md hairline-b"
        style={{ background: "rgba(250,250,247,0.85)" }}
      >
        <nav className="px-5 md:px-10 h-14 flex items-center justify-between max-w-[1400px] mx-auto">
          <Link to="/" className="flex items-center" aria-label="Ora">
            <span className="text-[24px] leading-none" style={bagel}>Ora</span>
          </Link>
          <div
            className="hidden md:flex items-center gap-7 mono-label"
            style={{ color: COLORS.muted }}
          >
            <a href="#how" className="hover:text-black transition-colors">How it works</a>
            <a href="#gallery" className="hover:text-black transition-colors">Gallery</a>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Link to="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
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

      {/* ═══ How it works — 3 steps editorial ═══
       *   Remplace les Surface warm/butter/coral (qui lisaient craft) par
       *   une grille 3 colonnes séparées de hairlines, mono eyebrow numéroté,
       *   Bagel left-aligned. Tech signal = mono + hairlines + number-set,
       *   pas couleur. */}
      <section id="how" className="px-5 md:px-10 py-24 md:py-32 max-w-[1400px] mx-auto">
        <div className="mb-16 md:mb-20">
          <div className="mono-label mb-4" style={{ color: COLORS.muted }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: COLORS.coral }} />
            How it works
          </div>
          <h2 className="leading-[0.95] max-w-[14ch]" style={{ ...bagel, fontSize: "clamp(48px, 8vw, 120px)" }}>
            Three moves. <span style={{ color: COLORS.coral }}>No typing.</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {[
            {
              n: "01",
              tag: "Vault",
              title: "Drop your URL.",
              body: "Ora scans your site, locks palette, tone and photo style into your Brand Vault. 30 seconds, once.",
            },
            {
              n: "02",
              tag: "Surprise Me",
              title: "Pick a direction.",
              body: "Three editorial angles waiting — tuned to your month, your sector, your brand. Click one. That's the brief.",
            },
            {
              n: "03",
              tag: "Publish",
              title: "Ship the pack.",
              body: "Six assets, image + paired 5s film, framed for every network. Download the ZIP or publish in one click.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`pt-8 pb-8 md:py-10 ${i > 0 ? "md:pl-8 md:border-l" : ""} ${i < 2 ? "md:pr-8" : ""}`}
              style={{ borderColor: COLORS.line }}
            >
              <div className="mono-label mb-6 flex items-center justify-between" style={{ color: COLORS.subtle }}>
                <span className="tabular-nums">{step.n} / 03</span>
                <span>{step.tag}</span>
              </div>
              <h3 className="leading-[0.98] mb-4" style={{ ...bagel, fontSize: "clamp(28px, 3vw, 40px)" }}>
                {step.title}
              </h3>
              <p className="body-tight text-[15px] leading-relaxed" style={{ color: COLORS.muted }}>
                {step.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══ Before / After — split tech timers ═══
       *   Deux colonnes 50/50 divisées par une hairline verticale. Gauche =
       *   la douleur (4 heures), droite = la promesse (42 seconds). Pas de
       *   Surface coloré, juste de la typo et du coral sur le côté "After". */}
      <section className="border-t" style={{ borderColor: COLORS.line }}>
        <div className="px-5 md:px-10 py-24 md:py-32 max-w-[1400px] mx-auto">
          <div className="mb-16 md:mb-20">
            <div className="mono-label mb-4" style={{ color: COLORS.muted }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: COLORS.coral }} />
              The delta
            </div>
            <h2 className="leading-[0.95] max-w-[18ch]" style={{ ...bagel, fontSize: "clamp(48px, 8vw, 120px)" }}>
              4 hours, or <span style={{ color: COLORS.coral }}>42 seconds.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="pt-8 pb-8 md:py-12 md:pr-12">
              <div className="mono-label mb-4" style={{ color: COLORS.subtle }}>Before Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 12vw, 160px)", color: COLORS.ink, lineHeight: 0.92 }}>
                04:00:00
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: COLORS.muted }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-50">×</span> Design in Figma</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-50">×</span> Resize for 8 formats</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-50">×</span> Export manually</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-50">×</span> Rewrite prompts</li>
              </ul>
            </div>
            <div className="pt-8 pb-8 md:py-12 md:pl-12 md:border-l" style={{ borderColor: COLORS.line }}>
              <div className="mono-label mb-4" style={{ color: COLORS.coral }}>With Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 12vw, 160px)", color: COLORS.coral, lineHeight: 0.92 }}>
                00:00:42
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: COLORS.ink }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: COLORS.coral }}>✓</span> One click</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: COLORS.coral }}>✓</span> 8 platform-ready assets</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: COLORS.coral }}>✓</span> Brand-locked consistency</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: COLORS.coral }}>✓</span> Zero prompting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Gallery — draggable bento of real packs ═══
       *   Each featured campaign contributes its top 4 assets to the bento.
       *   Users drag horizontally through the pack (image OR video, auto-
       *   detected from URL), click a tile to open a full-screen lightbox.
       *   Falls back to the curated showcase Tile set when no starred
       *   campaigns exist yet. */}
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
          <div className="border-t" style={{ borderColor: COLORS.line }}>
            <BentoGallery
              id="gallery"
              eyebrow="Real packs, real brands"
              title="One click. Full pack."
              description="Drag through the latest Ora campaigns. Click any tile to open it full-screen."
              items={bentoItems}
              className="max-w-[1400px] mx-auto"
            />
          </div>
        );
      })()}

      {/* ═══ Pillars — Locked / Bold / Unique ═══
       *   Trois colonnes hairline-divisées. Chacune = icône mono, Bagel titre
       *   court, body tight. Aucun Surface coloré. Les Surface warm/butter/
       *   violet ont été retirés pour casser le feel "studio artisanal". */}
      <section className="border-t" style={{ borderColor: COLORS.line }}>
        <div className="px-5 md:px-10 py-24 md:py-32 max-w-[1400px] mx-auto">
          <div className="mb-16 md:mb-20">
            <div className="mono-label mb-4" style={{ color: COLORS.muted }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: COLORS.coral }} />
              Why it works
            </div>
            <h2 className="leading-[0.95] max-w-[14ch]" style={{ ...bagel, fontSize: "clamp(48px, 8vw, 120px)" }}>
              Locked. Bold. <span style={{ color: COLORS.coral }}>Unique.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3">
            {[
              { n: "01", icon: Lock,     title: "Locked", body: "Your brand DNA never drifts. Palette, style and tone stay exact." },
              { n: "02", icon: Sparkles, title: "Bold",   body: "Every batch carries a fresh creative twist — on-brand, always." },
              { n: "03", icon: Zap,      title: "Unique", body: "Seed + scenes + variation. One-of-one packs every time." },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.n}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className={`py-10 md:py-12 ${i > 0 ? "md:pl-10 md:border-l" : ""} ${i < 2 ? "md:pr-10" : ""}`}
                  style={{ borderColor: COLORS.line }}
                >
                  <div className="mono-label mb-6 flex items-center justify-between" style={{ color: COLORS.subtle }}>
                    <span className="tabular-nums">{p.n} / 03</span>
                    <Icon size={14} style={{ color: COLORS.ink }} strokeWidth={1.75} />
                  </div>
                  <h3 className="leading-[0.98] mb-4" style={{ ...bagel, fontSize: "clamp(44px, 5vw, 72px)" }}>
                    {p.title}
                  </h3>
                  <p className="body-tight text-[15px] leading-relaxed max-w-[28ch]" style={{ color: COLORS.muted }}>
                    {p.body}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ Pricing teaser — open full-bleed ═══
       *   L'ancienne Surface ink centrée lisait "box promo". Ici on ouvre :
       *   section blanche, typo géante aligned-left, CTA pill coral et
       *   pricing indicator en mono. Pareil que Luma/Ideogram. */}
      <section id="pricing" className="border-t" style={{ borderColor: COLORS.line }}>
        <div className="px-5 md:px-10 py-24 md:py-32 max-w-[1400px] mx-auto">
          <div className="mono-label mb-4" style={{ color: COLORS.muted }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: COLORS.coral }} />
            Start creating
          </div>
          <h2 className="leading-[0.92] max-w-[16ch] mb-10" style={{ ...bagel, fontSize: "clamp(56px, 10vw, 160px)" }}>
            Stop designing.<br />
            <span style={{ color: COLORS.coral }}>Start surprising.</span>
          </h2>
          <p className="body-tight text-[17px] md:text-[19px] max-w-xl mb-10" style={{ color: COLORS.muted }}>
            Join the brands who've stopped briefing Figma. Pick a plan, ship your first pack tonight.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Pick a plan <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: COLORS.subtle }}>
              From €19/mo · cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* ═══ Footer — minimal, mono ═══ */}
      <footer className="border-t" style={{ borderColor: COLORS.line }}>
        <div className="px-5 md:px-10 py-10 max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center">
            <span className="text-[22px] leading-none" style={bagel}>Ora</span>
          </div>
          <div className="mono-label flex items-center gap-6" style={{ color: COLORS.muted }}>
            <Link to="/pricing" className="hover:text-black transition-colors">Pricing</Link>
            <a href="#gallery" className="hover:text-black transition-colors">Gallery</a>
            <Link to="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-black transition-colors">Privacy</Link>
          </div>
          <div className="mono-label tabular-nums" style={{ color: COLORS.subtle }}>
            © {new Date().getFullYear()} Ora · v2.4
          </div>
        </div>
      </footer>
    </div>
  );
}

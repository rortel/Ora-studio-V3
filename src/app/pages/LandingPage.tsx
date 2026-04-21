import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Lock, Sparkles, Zap } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ora/Button";
import { Badge } from "../components/ora/Badge";
import { Surface } from "../components/ora/Surface";
import { bagel, COLORS } from "../components/ora/tokens";
import { API_BASE } from "../lib/supabase";
import heroVideo from "../../assets/hero-video.mp4";

interface ShowcaseAsset {
  itemId: string; featuredAt: string;
  campaignName: string; campaignSlug: string;
  platform: string; aspectRatio: string;
  imageUrl: string; videoUrl: string;
  caption: string; twistElement: string;
  fileName: string; videoFileName: string;
}

/** Map a platform id to the aspect-ratio class the tile should render in.
 *  Forcing 9:16 Stories into a square crop loses ~40% of the composition,
 *  and 16:9 videos squeezed into 1:1 look wrong. This keeps every asset
 *  in its native frame. */
function arClass(platform: string, aspectRatio?: string): string {
  const p = (platform || "").toLowerCase();
  if (aspectRatio === "9:16" || p.includes("story") || p.includes("tiktok")) return "aspect-[9/16]";
  if (aspectRatio === "16:9" || p === "linkedin" || p === "facebook")         return "aspect-[16/9]";
  if (aspectRatio === "4:5"  || p.includes("instagram-portrait"))             return "aspect-[4/5]";
  return "aspect-square";
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

export function LandingPage() {
  const { user } = useAuth();
  // No self-serve free plan: anonymous visitors land on /pricing (pick a tier
  // + authenticated checkout). Signed-in users go straight to the Surprise Me
  // screen. There's no "Try free" escape hatch anymore.
  const primaryHref = user ? "/hub/surprise" : "/pricing";

  // Pull admin-curated showcase items. Falls back silently to templates
  // when the endpoint is empty or unreachable.
  const [showcase, setShowcase] = useState<ShowcaseAsset[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/showcase/featured?limit=40`);
        const d = await r.json().catch(() => ({}));
        if (!cancelled && d?.success && Array.isArray(d.items)) setShowcase(d.items);
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

  // Ambient backdrop: up to 14 blurred thumbnails drifting behind the hero
  // headline. Gives the page life without stealing the title. Falls back
  // silently when the showcase is empty.
  const ambientTiles: Tile[] = (showcase.length > 0 ? showcase : [])
    .filter((a) => a.imageUrl)
    .slice(0, 14)
    .map((a) => ({ src: a.imageUrl, label: a.platform, ar: a.aspectRatio }));

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

      {/* ═══ Hero ═══ */}
      <section className="relative px-5 md:px-10 pt-10 pb-20 max-w-[1400px] mx-auto">
        {/* Ambient backdrop — blurred featured thumbs drifting behind the
         *  headline. Hidden on mobile (battery + perf) and when the
         *  showcase is empty. Pointer-events none so it's decorative only. */}
        {ambientTiles.length > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden md:block overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: -80 }}
              transition={{ duration: 80, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
              className="grid grid-cols-7 gap-4 w-[140%] h-full"
            >
              {ambientTiles.concat(ambientTiles).slice(0, 14).map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden self-start"
                  style={{
                    filter: "blur(32px) saturate(1.1)",
                    opacity: 0.22,
                    transform: `translateY(${(i % 3) * 20}px)`,
                    aspectRatio: t.ar === "9:16" ? "9/16" : t.ar === "16:9" ? "16/9" : "1/1",
                  }}
                >
                  <img src={t.src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </motion.div>
          </div>
        )}

        <div className="relative text-center" style={{ zIndex: 1 }}>
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex mb-8"
          >
            <Badge tone="cream">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
              2,847 brands · 127,493 assets generated
            </Badge>
          </motion.div>

          {/* Kinetic headline — each line reveals separately, and "your brand"
           *  snaps from ink to coral after landing so the eye lands on the
           *  product promise, not just reads the sentence. */}
          <h1 className="leading-[0.88] mb-8" style={{ ...bagel, fontSize: "clamp(64px, 12vw, 156px)" }}>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              Stop prompting.
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              Surprise{" "}
              <motion.span
                initial={{ color: COLORS.ink }}
                animate={{ color: COLORS.coral }}
                transition={{ duration: 0.45, delay: 0.9 }}
                style={{ display: "inline-block" }}
              >
                your brand.
              </motion.span>
            </motion.span>
          </h1>

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
                Pick a plan · Start shipping <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="text-[13px]" style={{ color: COLORS.subtle }}>
              From €19/mo · Cancel anytime
            </span>
          </motion.div>
        </div>

        {/* Hero showcase — 1 big video + 2 medium */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4"
        >
          <div className="md:col-span-2 md:row-span-2 rounded-[28px] overflow-hidden aspect-[4/3] md:aspect-auto bg-white relative">
            <video src={heroBig.src} poster={heroBig.poster || undefined} autoPlay muted loop playsInline className="w-full h-full object-cover" />
            <div className="absolute top-4 left-4"><Badge tone="ink">42s · {heroBig.label}</Badge></div>
          </div>
          {[heroTile2, heroTile3].map((t, i) => (
            <div key={i} className="rounded-[28px] overflow-hidden aspect-[4/3] bg-white relative">
              <img src={t.src} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3"><Badge tone="ink">42s · {t.label}</Badge></div>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
          {gallery.slice(0, 6).map((item, i) => {
            // Bento spans — two hero tiles, four side tiles. Columns respect
            // the native aspect ratio so 9:16 Stories render tall and 16:9
            // LinkedIn posts stay wide. No forced square crop.
            const span =
              i === 0 ? "md:col-span-4 md:row-span-2"
            : i === 1 ? "md:col-span-2"
            : i === 2 ? "md:col-span-2"
            : i === 3 ? "md:col-span-3 md:row-span-2"
            : "md:col-span-3";
            const ar = arClass(item.platform || "", item.ar);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className={`relative rounded-[28px] overflow-hidden bg-white group ${span} ${ar}`}
              >
                {item.videoSrc ? (
                  <video
                    src={item.videoSrc}
                    poster={item.src}
                    autoPlay muted loop playsInline preload="metadata"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                ) : (
                  <img
                    src={item.src} alt=""
                    loading="lazy" decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                )}
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

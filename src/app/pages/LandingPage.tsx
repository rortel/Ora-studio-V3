import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";
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
  const textY = useTransform(scrollYProgress, [0, 0.5, 1], [60, 0, -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.18, 0.78, 1], [0, 1, 1, 0]);

  const hasVideo = !!videoSrc;

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden"
      style={{ height: "100vh", minHeight: 640, background: "#0A0A0A" }}
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
          <div className="mono-label mb-5 flex items-center gap-2" style={{ color: "rgba(250,250,250,0.72)" }}>
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
            style={{ color: "rgba(250,250,250,0.8)" }}
          >
            {subtitle}
          </p>
        )}
        {cta && <div className="mt-8 md:mt-10">{cta}</div>}
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

  // Pick the 4 dark-cinematic panel media from admin-featured assets in
  // order: first = hero, then Drop / Pick / Ship. Any slot that isn't
  // populated falls back to the bundled heroVideo so the page never
  // renders a black hole.
  const panelMedia = (idx: number) => {
    const a = showcase[idx];
    if (!a) return { videoSrc: heroVideo, posterSrc: undefined as string | undefined, imageSrc: undefined as string | undefined };
    if (a.videoUrl) return { videoSrc: a.videoUrl, posterSrc: a.imageUrl, imageSrc: undefined };
    return { videoSrc: undefined, posterSrc: undefined, imageSrc: a.imageUrl };
  };
  const mediaHero = panelMedia(0);
  const mediaDrop = panelMedia(1);
  const mediaPick = panelMedia(2);
  const mediaShip = panelMedia(3);

  return (
    <div style={{ background: "#0A0A0A", color: "#FAFAFA" }}>
      {/* ═══ Navbar — fixed, dark, mono ═══
       *   Sits over the hero without pushing it down, blurs the video
       *   underneath. Mono nav links for the tech signal. */}
      <header
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl"
        style={{ background: "rgba(10,10,10,0.55)", borderBottom: "1px solid rgba(250,250,250,0.08)" }}
      >
        <nav className="px-5 md:px-10 h-14 flex items-center justify-between max-w-[1600px] mx-auto">
          <Link to="/" className="flex items-center" aria-label="Ora">
            <span className="text-[24px] leading-none text-white" style={bagel}>Ora</span>
          </Link>
          <div
            className="hidden md:flex items-center gap-7 mono-label"
            style={{ color: "rgba(250,250,250,0.7)" }}
          >
            <a href="#how" className="hover:text-white transition-colors">How it works</a>
            <a href="#gallery" className="hover:text-white transition-colors">Gallery</a>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Link to="/login">
                <button className="mono-label px-3 h-8 rounded-full transition-colors hover:bg-white/10" style={{ color: "rgba(250,250,250,0.8)" }}>
                  Sign in
                </button>
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

      {/* ═══ Panel 1 — HERO ═══ */}
      <CinematicPanel
        tonality="hero"
        videoSrc={mediaHero.videoSrc}
        posterSrc={mediaHero.posterSrc}
        imageSrc={mediaHero.imageSrc}
        eyebrow="v2.4 · 2,847 brands · 127,493 assets shipped"
        title={<>Stop prompting. <span style={{ color: "#FF6B47" }}>Surprise your brand.</span></>}
        subtitle={<>Drop your brand. Pick your platforms. Ora ships a full pack — LinkedIn, Instagram, TikTok — in one click. No prompt writing.</>}
        cta={
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Pick a plan · Start shipping <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: "rgba(250,250,250,0.55)" }}>
              From €19/mo · cancel anytime
            </span>
          </div>
        }
      />

      {/* ═══ Panel 2 — DROP ═══ */}
      <CinematicPanel
        videoSrc={mediaDrop.videoSrc}
        posterSrc={mediaDrop.posterSrc}
        imageSrc={mediaDrop.imageSrc}
        eyebrow="01 / 03 · your brand"
        title={<>Drop.</>}
        subtitle={<>Your URL. 30 seconds. Ora scans, locks your palette, tone, photo style into the Brand Vault. Once. Forever.</>}
      />

      {/* ═══ Panel 3 — PICK ═══ */}
      <CinematicPanel
        videoSrc={mediaPick.videoSrc}
        posterSrc={mediaPick.posterSrc}
        imageSrc={mediaPick.imageSrc}
        eyebrow="02 / 03 · the direction"
        title={<>Pick.</>}
        subtitle={<>Three editorial angles, pre-tuned to your month, your sector, your brand. Click. That's the brief.</>}
      />

      {/* ═══ Panel 4 — SHIP ═══ */}
      <CinematicPanel
        videoSrc={mediaShip.videoSrc}
        posterSrc={mediaShip.posterSrc}
        imageSrc={mediaShip.imageSrc}
        eyebrow="03 / 03 · the pack"
        title={<>Ship.</>}
        subtitle={<>Six assets, image + paired 5s film, framed for every network. Download the ZIP. Or publish, one click.</>}
      />

      {/* ═══ Panel 5 — DELTA (split timers on dark canvas) ═══
       *   Full 100vh like the others but instead of a single media, two
       *   halves side-by-side: the old workflow (pale grey, 4h) vs Ora
       *   (coral, 42s). No media behind — pure typography on black reads
       *   as "the cold hard number" which is exactly the point. */}
      <section className="relative h-screen w-full overflow-hidden flex items-center" style={{ background: "#0A0A0A" }}>
        <div className="px-5 md:px-10 w-full max-w-[1600px] mx-auto">
          <div className="mono-label mb-10" style={{ color: "rgba(250,250,250,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            The delta
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="pb-8 md:py-12 md:pr-12">
              <div className="mono-label mb-4" style={{ color: "rgba(250,250,250,0.5)" }}>Before Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 13vw, 200px)", color: "rgba(250,250,250,0.35)", lineHeight: 0.92 }}>
                04:00:00
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: "rgba(250,250,250,0.5)" }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Design in Figma</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Resize for 8 formats</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Export manually</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1 opacity-60">×</span> Rewrite prompts</li>
              </ul>
            </div>
            <div className="pt-8 pb-8 md:py-12 md:pl-12 md:border-l" style={{ borderColor: "rgba(250,250,250,0.12)" }}>
              <div className="mono-label mb-4" style={{ color: "#FF6B47" }}>With Ora</div>
              <div className="mb-8 tabular-nums" style={{ ...bagel, fontSize: "clamp(72px, 13vw, 200px)", color: "#FF6B47", lineHeight: 0.92 }}>
                00:00:42
              </div>
              <ul className="body-tight space-y-3 text-[15.5px]" style={{ color: "#FAFAFA" }}>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> One click</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> 8 platform-ready assets</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> Brand-locked consistency</li>
                <li className="flex items-start gap-3"><span className="mono-data mt-1" style={{ color: "#FF6B47" }}>✓</span> Zero prompting</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Panel 6 — GALLERY (draggable bento, dark) ═══
       *   The existing BentoGallery component re-skinned by wrapping it in
       *   a dark band. Its tiles keep their rounded borders but now sit on
       *   the deep-black canvas so the imagery pops with the same cinema
       *   feel as the preceding panels. */}
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
          <div
            className="dark-gallery-band"
            style={{
              background: "#0A0A0A",
              color: "#FAFAFA",
              borderTop: "1px solid rgba(250,250,250,0.08)",
              // Override the shadcn tokens the BentoGallery relies on so
              // its tiles render dark without touching the component.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...({
                "--background": "#0A0A0A",
                "--foreground": "#FAFAFA",
                "--muted-foreground": "rgba(250,250,250,0.6)",
                "--card": "#141414",
                "--border": "rgba(250,250,250,0.08)",
                "--ring": "rgba(250,250,250,0.2)",
              } as React.CSSProperties),
            }}
          >
            <BentoGallery
              id="gallery"
              eyebrow="Real packs, real brands"
              title="One click. Full pack."
              description="Drag through the latest Ora campaigns. Click any tile to open it full-screen."
              items={bentoItems}
            />
          </div>
        );
      })()}

      {/* ═══ Panel 7 — PRICING CTA (full-viewport) ═══
       *   One last cinematic beat. No media behind — just a huge Bagel
       *   statement on black with the coral payoff, CTA + mono pricing. */}
      <section id="pricing" className="relative h-screen w-full overflow-hidden flex items-center" style={{ background: "#0A0A0A", borderTop: "1px solid rgba(250,250,250,0.08)" }}>
        <div className="px-5 md:px-10 w-full max-w-[1600px] mx-auto">
          <div className="mono-label mb-6" style={{ color: "rgba(250,250,250,0.6)" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#FF6B47" }} />
            Start creating
          </div>
          <h2 className="leading-[0.9] max-w-[18ch] mb-10 text-white" style={{ ...bagel, fontSize: "clamp(64px, 12vw, 200px)" }}>
            Stop designing.<br />
            <span style={{ color: "#FF6B47" }}>Start surprising.</span>
          </h2>
          <p className="body-tight text-[17px] md:text-[19px] max-w-xl mb-10" style={{ color: "rgba(250,250,250,0.75)" }}>
            Join the brands who've stopped briefing Figma. Pick a plan, ship your first pack tonight.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Link to={primaryHref}>
              <Button variant="accent" size="lg">
                Pick a plan <ArrowRight size={16} />
              </Button>
            </Link>
            <span className="mono-label" style={{ color: "rgba(250,250,250,0.5)" }}>
              From €19/mo · cancel anytime
            </span>
          </div>
        </div>
      </section>

      {/* ═══ Footer — dark minimal, mono ═══ */}
      <footer style={{ background: "#0A0A0A", borderTop: "1px solid rgba(250,250,250,0.08)" }}>
        <div className="px-5 md:px-10 py-10 max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center">
            <span className="text-[22px] leading-none text-white" style={bagel}>Ora</span>
          </div>
          <div className="mono-label flex items-center gap-6" style={{ color: "rgba(250,250,250,0.55)" }}>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <a href="#gallery" className="hover:text-white transition-colors">Gallery</a>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
          <div className="mono-label tabular-nums" style={{ color: "rgba(250,250,250,0.4)" }}>
            © {new Date().getFullYear()} Ora · v2.4
          </div>
        </div>
      </footer>
    </div>
  );
}

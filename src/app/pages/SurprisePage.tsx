import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, Download, Package, Upload, Wand2, ChevronDown, Paperclip, X, ArrowRight, ArrowLeft, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { downloadAsset } from "../lib/asset-persistence";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { Button } from "../components/ora/Button";
import { Badge } from "../components/ora/Badge";
import { bagel, COLORS } from "../components/ora/tokens";
import { PublishModal, type PublishableAsset } from "../components/PublishModal";
import { suggestScheduleForPack, scheduleToCalendarEvent } from "../lib/publish-scheduling";
import { StylePicker } from "../components/StylePicker";
import { parseHex, scorePack, type RGB } from "../lib/brand-fidelity";

/* ═══ Palette — aligned with the shared ora/ tokens ═══ */
const BG       = COLORS.cream;
const TEXT     = COLORS.ink;
const MUTED    = COLORS.muted;
const BORDER   = COLORS.line;
const INK      = COLORS.ink;
const INK_TEXT = "#FFFFFF";
const ACCENT   = COLORS.coral;
const PINK     = COLORS.coral;     // legacy alias kept to avoid touching every chip
const LIME     = COLORS.butter;    // legacy alias — yellow accent for Saved-to-library pill
const ORANGE   = COLORS.coral;
const DISPLAY  = `"Bagel Fat One", "Inter", system-ui, sans-serif`;

/* ═══ Constants ═══ */
const CREATIVITY = [
  { id: 1 as const, emoji: "🏛️", label: "Classic",     hint: "Safe, brand-aligned" },
  { id: 2 as const, emoji: "⚖️", label: "Balanced",    hint: "Pro with a twist" },
  { id: 3 as const, emoji: "🔥", label: "Bold",        hint: "Editorial, original" },
  { id: 4 as const, emoji: "🚀", label: "Disruptive",  hint: "Surreal, fashion-mag" },
];

const PLATFORM_OPTIONS = [
  { id: "instagram-feed",     label: "Instagram Feed",     emoji: "📸" },
  { id: "instagram-story",    label: "Instagram Story",    emoji: "🎬" },
  { id: "instagram-carousel", label: "Instagram Carousel", emoji: "🖼️" },
  { id: "instagram-reel",     label: "Instagram Reel",     emoji: "🎥" },
  { id: "facebook",           label: "Facebook",           emoji: "👥" },
  { id: "facebook-story",     label: "Facebook Story",     emoji: "📖" },
  { id: "facebook-carousel",  label: "Facebook Carousel",  emoji: "🗂️" },
  { id: "tiktok",             label: "TikTok",             emoji: "🎵" },
];

/** Default format suggested per platform — matches the server's PLATFORM_FORMAT.
 *  The user can flip any selected platform's format by tapping the inline icon.
 *  Carousel/reel platforms are locked to one type (no film toggle). */
const DEFAULT_PLATFORM_FORMAT: Record<string, "image" | "film"> = {
  "instagram-feed":     "image",
  "instagram-story":    "image",  // small-commerce stories are mostly static images with overlay
  "instagram-carousel": "image",  // carousels are always image (every slide)
  "instagram-reel":     "film",   // reel = motion-first by definition
  "facebook":           "image",
  "facebook-story":     "image",
  "facebook-carousel":  "image",  // FB carousel = same shape as IG carousel
  "tiktok":             "film",
};

/** Platforms that don't support the image/film toggle — format is intrinsic.
 *  Carousel = always image (multi-slide). Reel = always film (motion-first). */
const FORMAT_LOCKED_PLATFORMS = new Set<string>([
  "instagram-carousel",
  "facebook-carousel",
  "instagram-reel",
]);

const PLATFORM_META: Record<string, { label: string; emoji: string }> = Object.fromEntries(
  PLATFORM_OPTIONS.map((p) => [p.id, { label: p.label, emoji: p.emoji }]),
);

interface PackItem {
  platform: string; aspectRatio: string; label: string; fileName: string;
  videoFileName?: string; motion?: string;
  twistElement?: string; caption?: string;
  status: "ok" | "failed"; imageUrl?: string; videoUrl?: string;
  error?: string; provider?: string; videoProvider?: string;
  // Carousel grouping — set by server when platform is *-carousel.
  // Items sharing the same carouselGroupId belong to one carousel and are
  // rendered as a single swipeable group in the result UI.
  carouselGroupId?: string; carouselSlideIndex?: number;
  // V2: editable text overlay rendered as HTML on top of the slide image.
  // Image is generated CLEAN (no rendered text) so the user can edit
  // inline without regenerating. Local edits live in editedOverlays state.
  overlayText?: string;
  overlayPosition?: "top" | "center" | "bottom";
  overlayStyle?: "headline" | "value-prop" | "cta" | "caption";
}
interface Pack {
  campaignName: string; campaignSlug: string;
  creativeAngle: string; tone: string; keyMessage: string;
  creativityLevel: number; items: PackItem[];
  savedCount: number;
  brandLockScore: number;
}

export function SurprisePage() {
  return (
    <RouteGuard requireAuth>
      <SurpriseContent />
    </RouteGuard>
  );
}

function SurpriseContent() {
  const { getAuthHeader, can, remainingCredits, refreshProfile, accessToken } = useAuth();
  const navigate = useNavigate();

  // Core inputs (minimal — the two blanks)
  const [what, setWhat] = useState("");
  const [who,  setWho]  = useState("");

  // Smart defaults everyone gets
  const [creativity, setCreativity] = useState<1 | 2 | 3 | 4>(2);
  const [assetCount, setAssetCount] = useState<number>(6);
  // Each platform now carries its own format (image | film). Tap the chip to
  // toggle selection, tap the small inline icon to flip image ↔ film.
  type PickedPlatform = { id: string; format: "image" | "film" };
  const [platformPicks, setPlatformPicks] = useState<PickedPlatform[]>(
    ["instagram-feed", "instagram-story", "linkedin", "tiktok"].map((id) => ({
      id, format: DEFAULT_PLATFORM_FORMAT[id] || "image",
    }))
  );
  const platforms = platformPicks.map((p) => p.id);
  const togglePlatform = (id: string) =>
    setPlatformPicks((prev) => prev.some((p) => p.id === id)
      ? prev.filter((p) => p.id !== id)
      : [...prev, { id, format: DEFAULT_PLATFORM_FORMAT[id] || "image" }]);
  const togglePlatformFormat = (id: string) =>
    setPlatformPicks((prev) => prev.map((p) => p.id === id
      ? { ...p, format: p.format === "image" ? "film" : "image" }
      : p));
  const [mediaType, setMediaType] = useState<"image" | "film" | "carousel">("image");
  const [videoDuration, setVideoDuration] = useState<"3s" | "5s" | "8s">("5s");
  const [withCaption, setWithCaption] = useState<boolean>(true);
  const [ctxWhy, setCtxWhy] = useState("");
  const [productPhotos, setProductPhotos] = useState<string[]>([]);
  // First photo is the kontext-pro image_ref; angles 2-5 are read by GPT-4o
  // vision in a one-shot pre-pass that produces enrichedDescription — a rich
  // textual ground truth that downstream prompts inject verbatim. Solves
  // single-photo drift (pink polo → green Lacoste polo).
  const productPhoto = productPhotos[0] ?? null;
  const [enrichedDescription, setEnrichedDescription] = useState<string>("");
  const [analyzingPhotos, setAnalyzingPhotos] = useState(false);
  // Product-first inputs — the new default flow is "upload your product,
  // we propose brand-compliant angles." Photo is required; description and
  // price are optional and get forwarded to the caption generator.
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  // Optional product page URL — when set, /products/scrape-url is called and
  // its result auto-fills productDescription + productPrice. Saves the user
  // from typing for any product/dish/service that already has a website.
  const [productPageUrl, setProductPageUrl] = useState("");
  const [scanningProductUrl, setScanningProductUrl] = useState(false);
  // Rich product attributes scraped from the URL. The 200-char productDescription
  // alone is too thin to drive a fresh-scene generation (UGC / Lifestyle styles
  // come out flat because the model has no concrete attributes to anchor the
  // garment description on). When present, these go into the surprise-me POST
  // and unlock the "lifestyle-t2i-rich" path (text-to-image with full product
  // description, no source-photo constraint, fresh scene).
  const [scrapedProduct, setScrapedProduct] = useState<{
    fullDescription?: string;
    category?: string;
    color?: string;
    material?: string;
    fit?: string;
    sizing?: string;
    styleTags?: string[];
    targetUser?: string;
    features?: string[];
    imageUrls?: string[];
  } | null>(null);
  // Subject archetype — drives label adaptation + server-side pipeline routing.
  //   product = boulanger/fleuriste/pâtissier/caviste/distributeur (Photoroom OK)
  //   place   = restaurant/hôtel/spa/studio yoga (Ideogram Remix high-weight)
  //   person  = coach/photographe/thérapeute/agent immo (Ideogram Remix high-weight)
  //   service = coiffeur/jardinier/garagiste — result/before-after photo (Ideogram Remix high-weight)
  type SubjectKind = "product" | "place" | "person" | "service";
  const [subjectKind, setSubjectKind] = useState<SubjectKind>("product");
  const SUBJECT_KINDS: { id: SubjectKind; label: string; photoLabel: string; descLabel: string; descPlaceholder: string; urlLabel: string }[] = [
    { id: "product", label: "Produit",  photoLabel: "Photo de ton produit",         descLabel: "Quel produit ?",     descPlaceholder: "Polo lin · coupe relax · crème", urlLabel: "Ou colle l'URL de ta fiche produit" },
    { id: "place",   label: "Lieu",     photoLabel: "Photo de ton lieu",            descLabel: "Quel lieu ?",        descPlaceholder: "Resto bistronomique · 30 couverts · terrasse", urlLabel: "Ou colle l'URL de ton site/Google Maps" },
    { id: "person",  label: "Personne", photoLabel: "Photo de toi (ou portrait)",   descLabel: "Tu es qui ?",        descPlaceholder: "Coach business · 10 ans d'expé · Paris", urlLabel: "Ou colle l'URL de ton site/LinkedIn" },
    { id: "service", label: "Service",  photoLabel: "Photo du résultat (avant/après ou réalisation)", descLabel: "Quel service ?", descPlaceholder: "Tonte de pelouse · jardin 200m² · 3h", urlLabel: "Ou colle l'URL de ta page service" },
  ];
  const subjectMeta = SUBJECT_KINDS.find(s => s.id === subjectKind) || SUBJECT_KINDS[0];
  // idle sub-view: "input" = product form, "angles" = the 3 suggestions
  // we show after the user clicks "Propose angles", "style" = the
  // StylePicker gallery (final step before generation — user picks a
  // vibe so all 6 shots respect that aesthetic).
  const [idleView, setIdleView] = useState<"input" | "angles" | "style">("input");
  // Brief carried from the angle pick to the style view. When the user
  // finally clicks Generate from the style view, we fire handleSurprise
  // with the same brief they originally chose on the angle card.
  const [pendingBrief, setPendingBrief] = useState<string>("");
  // Whether the style catalog has been seeded (≥1 image present in the
  // manifest). Until an admin clicks "Seed" once, the gallery is empty —
  // we skip the style step entirely and fire generation directly from
  // the angle card so users never see misleading fallback tiles.
  const [styleCatalogReady, setStyleCatalogReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/style-catalog/get`);
        const d = await r.json();
        if (cancelled) return;
        const ready = !!(d?.success && Array.isArray(d.styles) && d.styles.some((s: any) =>
          Array.isArray(s.examples) && s.examples.some((e: any) => !!e.imageUrl)
        ));
        setStyleCatalogReady(ready);
      } catch { /* leave false — picker stays hidden, no harm */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // UI state
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "concept" | "generating" | "done">("idle");
  const [pack, setPack] = useState<Pack | null>(null);
  // V2 carousel: per-slide overlay text edits (keyed by fileName since each
  // slide has a unique filename). When a user edits the inline overlay, the
  // edit lives here and takes precedence over the LLM-generated text from
  // the server. Survives the lifetime of the result view; reset on new pack.
  const [editedOverlays, setEditedOverlays] = useState<Record<string, string>>({});
  // Request ID for the in-flight generation. Used by GenerationProgress to
  // poll /analyze/surprise-me-progress and replace the time-windowed phase
  // approximation with the real backend phase.
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  // Style picked from the gallery (null = let the planner pick freely).
  // Sent to /analyze/surprise-me as `styleId`; the server injects a hard
  // STYLE_DIRECTIVES entry into the planner so all 6 shots respect the
  // chosen aesthetic instead of mixing styles. Persists for the session.
  const [styleId, setStyleId] = useState<string | null>(null);
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const [publishTarget, setPublishTarget] = useState<PublishableAsset | null>(null);
  const [outOfCredits, setOutOfCredits] = useState<{ remaining: number; required: number } | null>(null);
  // Lightbox — full-screen viewer for the result pack. Null = closed.
  // Navigates across the whole pack in display order (platform-grouped).
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Brand palette resolved from the user's Vault. Loaded once on mount
  // (independent of the nudge logic below — the nudge can be dismissed
  // while we still need the palette for the post-generation fidelity
  // score). Empty array = no vault / no palette / vault load failed,
  // in which case the palette score is simply hidden.
  const [brandPalette, setBrandPalette] = useState<RGB[]>([]);
  // Result of the brand-fidelity scoring pass on the most recent pack.
  // null while the pack is generating or being scored; numeric once the
  // canvas-based palette extraction completes (typically <1s after the
  // result page renders).
  const [paletteScore, setPaletteScore] = useState<number | null>(null);

  // Brand Vault nudge: Studio+ users without a vault get a soft prompt to set
  // one up, since Surprise Me without brand context can't deliver on the
  // "locked DA across every shot" promise. Dismiss persists in localStorage.
  const hasVaultFeature = can("vault");
  const [vaultMissing, setVaultMissing] = useState(false);
  const [vaultNudgeDismissed, setVaultNudgeDismissed] = useState(() => {
    try { return localStorage.getItem("ora:vault-nudge-dismissed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (!hasVaultFeature || vaultNudgeDismissed) return;
    const token = getAuthHeader();
    if (!token) return; // wait for auth to hydrate before firing the call
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/vault/load`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
          body: JSON.stringify({ _token: token }),
        });
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        const v = d?.vault || d?.data || null;
        const looksEmpty = !v || (!v.company_name && !v.brandName && (!v.colors || v.colors.length === 0) && !v.logo_url && !v.logoUrl);
        setVaultMissing(looksEmpty);
      } catch { /* silent — banner just stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, [hasVaultFeature, vaultNudgeDismissed, getAuthHeader]);
  const dismissVaultNudge = useCallback(() => {
    try { localStorage.setItem("ora:vault-nudge-dismissed", "1"); } catch {}
    setVaultNudgeDismissed(true);
  }, []);

  // ── Brand palette load (independent of the nudge dismissal) ──────────
  // Pulls the user's brand colours from the Vault for use by the
  // post-generation fidelity scoring pass. We do this in a separate
  // effect from the nudge load above because the nudge has its own
  // gating (Studio+ feature, dismissal flag) that we don't want to
  // couple to "do we have colours to score against".
  useEffect(() => {
    const token = getAuthHeader();
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/vault/load`, {
          method: "POST",
          headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
          body: JSON.stringify({ _token: token }),
        });
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        const v = d?.vault || d?.data || null;
        // Vault stores colours as either an array of hex strings or as
        // an array of { hex, name? } records — normalise both shapes.
        const raw: Array<unknown> = Array.isArray(v?.colors)
          ? v.colors
          : Array.isArray(v?.colorPalette)
            ? v.colorPalette
            : [];
        const palette: RGB[] = raw
          .map((c) => {
            if (typeof c === "string") return parseHex(c);
            if (c && typeof c === "object" && "hex" in c) return parseHex(String((c as { hex: string }).hex));
            return null;
          })
          .filter((x): x is RGB => !!x);
        setBrandPalette(palette);
      } catch { /* silent — palette score will simply not render */ }
    })();
    return () => { cancelled = true; };
  }, [getAuthHeader]);

  // ── Brand-fidelity scoring pass on the result pack ───────────────────
  // Once a pack lands and we have a brand palette, extract dominant
  // colours from each generated image (canvas-based, ~50ms per shot)
  // and compute the pack's palette-respect score. Async + non-blocking:
  // the result page renders immediately, the badge appears once scoring
  // completes (typically <500ms). Surfaces the brand-promise as a
  // measurable number on every pack — Ora's core differentiator.
  useEffect(() => {
    setPaletteScore(null);
    if (!pack || brandPalette.length === 0) return;
    const urls = pack.items
      .filter((i) => i.status === "ok" && !!i.imageUrl)
      .map((i) => i.imageUrl as string);
    if (urls.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await scorePack(urls, brandPalette);
        if (!cancelled) setPaletteScore(res.packScore);
      } catch { /* silent — badge stays hidden if scoring throws */ }
    })();
    return () => { cancelled = true; };
  }, [pack, brandPalette]);

  // ── Auto-angles ──────────────────────────────────────────────────────
  // The anti-prompt play: on mount, ask /analyze/suggest-angles for 3
  // ready-to-run campaign angles built from the user's Brand Vault + the
  // current month. User clicks a card, campaign runs. Zero typing.
  // If the fetch fails (no vault, no LLM key, network) we silently fall
  // through to the inline-fields brief UI.
  type AngleSuggestion = {
    id: string; emoji: string; title: string; subtitle: string; brief: string;
    platforms: string[]; creativityLevel: number; assetCount: number;
  };
  const [anglesLoading, setAnglesLoading] = useState(false);
  const [suggestedAngles, setSuggestedAngles] = useState<AngleSuggestion[]>([]);
  const [customBriefMode, setCustomBriefMode] = useState(false);
  const [monthLabel, setMonthLabel] = useState<string>("");

  // Fetch angles ON DEMAND when the user clicks "Propose angles" from the
  // input form. Previously this ran on mount and drove the entire landing
  // experience; now the product-first input is the default and angles are
  // the second step. We still cache results so re-entering the angles view
  // doesn't re-spin the LLM.
  const fetchAngles = useCallback(async () => {
    if (anglesLoading) return;
    setAnglesLoading(true);
    try {
      const token = getAuthHeader();
      const r = await fetch(`${API_BASE}/analyze/suggest-angles`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({
          lang: "en",
          _token: token,
          // Forward product context so the angles the LLM proposes are
          // specific to THIS product, not a generic brand-level sweep.
          productImageUrl: productPhotos[0] || undefined,
          productImageUrls: productPhotos.length > 0 ? productPhotos : undefined,
          productDescription: productDescription.trim() || undefined,
          enrichedDescription: enrichedDescription || undefined,
          productPrice: productPrice.trim() || undefined,
          subjectKind,
        }),
        signal: AbortSignal.timeout(35_000),
      });
      const d = await r.json().catch(() => ({}));
      if (d?.success && Array.isArray(d.angles) && d.angles.length > 0) {
        setSuggestedAngles(d.angles);
        setMonthLabel(String(d.month || ""));
      } else {
        toast.error(d?.error || "Couldn't propose angles — try again.");
      }
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setAnglesLoading(false);
    }
  }, [anglesLoading, getAuthHeader, productPhotos, productDescription, enrichedDescription, productPrice, subjectKind]);

  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 90_000) => {
    const token = getAuthHeader();
    const r = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ ...body, _token: token }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await r.text();
    try { return JSON.parse(text); }
    catch { return { success: false, error: `Server error (${r.status})` }; }
  }, [getAuthHeader]);

  // Re-runs vision pre-pass on the current photo set. Triggered after each
  // upload/remove when we have 2+ photos. Cached on the client as
  // enrichedDescription and forwarded to /analyze/suggest-angles + surprise-me.
  const refreshEnrichedDescription = useCallback(async (urls: string[]) => {
    if (urls.length < 2) {
      setEnrichedDescription("");
      return;
    }
    setAnalyzingPhotos(true);
    try {
      const res = await serverPost(
        "/analyze/product-multi",
        { imageUrls: urls, userDescription: productDescription.trim() || undefined },
        60_000,
      );
      if (res?.success && typeof res.description === "string") {
        setEnrichedDescription(res.description);
      } else {
        // Vision-pass failure isn't fatal — pipeline still works with the
        // user-typed description. Just surface a soft warning.
        console.warn("[product-multi]", res?.error || "no description");
      }
    } catch (err) {
      console.warn("[product-multi]", err);
    } finally {
      setAnalyzingPhotos(false);
    }
  }, [serverPost, productDescription]);

  const uploadProductPhoto = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Image required."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image too large (>10MB)."); return; }
    setUploadingProduct(true);
    try {
      const b64 = await new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const du = r.result as string;
          resolve({ base64: du.split(",")[1] || "", mimeType: file.type || "image/png" });
        };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      // 90 s cap — server races OpenAI (30 s) + Gemini (25 s) in
      // parallel, so worst case is ~30 s. The 60 s margin protects
      // against rare double-stalls without making the user wait
      // forever when both providers are down. The server uploads the
      // photo to Storage in parallel with vision, so we ALWAYS get
      // back sourceUrl when the upload succeeded — even when vision
      // is down (response carries visionOk=false in that case).
      const res = await serverPost("/analyze/reverse-prompt", { imageBase64: b64.base64, mimeType: b64.mimeType }, 90_000);
      if (res?.success && res.sourceUrl) {
        let nextUrls: string[] = [];
        setProductPhotos((prev) => {
          nextUrls = prev.length >= 5 ? prev : [...prev, res.sourceUrl];
          return nextUrls;
        });
        if (res.visionOk === false) {
          // Photo is locked in but DA hints couldn't be extracted.
          // The user can still generate — the planner will fall
          // back to the brand vault + brief alone.
          toast.success("Photo ready — DA hints unavailable, you can still generate.");
        } else {
          toast.success(nextUrls.length > 1 ? `${nextUrls.length} angles locked` : "Visual ready");
        }
        if (nextUrls.length >= 2) refreshEnrichedDescription(nextUrls);
      } else {
        toast.error(res?.error || "Upload failed — vision API may be slow, please retry.");
      }
    } catch (err: any) {
      // AbortController-fired errors land here — surface a useful
      // message instead of the raw "AbortError" / "signal aborted".
      const msg = String(err?.message || err);
      if (/abort|timeout|signal/i.test(msg)) {
        toast.error("Upload timed out — vision API is slow, please retry.");
      } else {
        toast.error(msg);
      }
    } finally {
      setUploadingProduct(false);
    }
  }, [serverPost, refreshEnrichedDescription]);

  const removeProductPhoto = useCallback((idx: number) => {
    let nextUrls: string[] = [];
    setProductPhotos((prev) => {
      nextUrls = prev.filter((_, i) => i !== idx);
      return nextUrls;
    });
    if (nextUrls.length < 2) setEnrichedDescription("");
    else refreshEnrichedDescription(nextUrls);
  }, [refreshEnrichedDescription]);

  // ── Six SMB-friendly intents — French label, English directive ──
  // Each chip writes a rich, prescriptive sentence into ctxWhy. The server
  // already passes `why` as text into the planner, so no server change needed:
  // the AI gets clearer guidance ("CTA must include the discount % + end
  // date") instead of a vague "summer launch · winter campaign · awareness".
  const INTENTS: { id: string; label: string; value: string }[] = [
    { id: "promo",     label: "Promo",      value: "Promotion: time-limited offer. CTA must include the discount % or price + end date." },
    { id: "lancement", label: "Lancement",  value: "Product launch: this product/service is brand new. Build excitement, focus on what's new and why it matters." },
    { id: "saison",    label: "Saison",     value: "Seasonal moment: tie to current season/marronnier (Saint-Valentin, Fête des mères, Noël, rentrée, été, Black Friday). Use cultural cues. Warm, traditional tone." },
    { id: "animer",    label: "Animer",     value: "Community engagement: behind-the-scenes, recipe, tip, story. Conversational. No hard sell." },
    { id: "preuve",    label: "Témoignage", value: "Customer testimonial / social proof: lead with a real customer quote or review. Build trust. No corporate tone." },
    { id: "annonce",   label: "Annonce",    value: "Practical announcement: clear factual info (hours, closure, urgent service, address change). Direct, no fluff." },
  ];
  const selectedIntent = INTENTS.find(i => i.value === ctxWhy)?.id || "";

  // ── Pre-validated chip groups: zero typing, profession-aware ──
  // Each (intent → key message) chip = a concrete shot directive. Each
  // (subjectKind → CTA) chip = the right action verb for that profession.
  // Selecting chips writes prescriptive English text into keyMessageChips
  // and ctaChip, both forwarded to the planner via the brief composition.
  type ChipOpt = { label: string; value: string };
  const KEY_MESSAGES: Record<string, ChipOpt[]> = {
    promo: [
      { label: "−10 %",                 value: "10% off" },
      { label: "−20 %",                 value: "20% off" },
      { label: "−30 %",                 value: "30% off" },
      { label: "−50 %",                 value: "50% off" },
      { label: "1 acheté = 1 offert",   value: "Buy one get one free" },
      { label: "Frais de port offerts", value: "Free shipping" },
      { label: "Cette semaine",         value: "This week only" },
      { label: "Ce week-end",           value: "This weekend only" },
    ],
    lancement: [
      { label: "Nouveauté",             value: "Brand new product" },
      { label: "Édition limitée",       value: "Limited edition" },
      { label: "Pré-commande",          value: "Pre-order open" },
      { label: "Best-seller revisité",  value: "Best-seller refreshed" },
      { label: "Made in France",        value: "Made in France emphasis" },
      { label: "Fait main",             value: "Handmade emphasis" },
    ],
    saison: [
      { label: "Saint-Valentin",        value: "Saint-Valentine's Day moment" },
      { label: "Fête des mères",        value: "Mother's Day moment" },
      { label: "Fête des pères",        value: "Father's Day moment" },
      { label: "Pâques",                value: "Easter moment" },
      { label: "Été",                   value: "Summer collection moment" },
      { label: "Rentrée",               value: "Back-to-school moment" },
      { label: "Halloween",             value: "Halloween moment" },
      { label: "Black Friday",          value: "Black Friday moment" },
      { label: "Noël",                  value: "Christmas moment" },
      { label: "Soldes",                value: "End-of-season sales (soldes)" },
    ],
    animer: [
      { label: "Coulisses",             value: "Behind-the-scenes shot" },
      { label: "Conseil",               value: "Quick tip / advice" },
      { label: "Recette",               value: "Recipe / how-to" },
      { label: "Histoire",              value: "Founder / craft story" },
      { label: "Question",              value: "Open question to the audience" },
    ],
    preuve: [
      { label: "Avis client",           value: "Customer review quote" },
      { label: "Avant / après",         value: "Before / after comparison" },
      { label: "Note Google",           value: "Google rating mention" },
      { label: "Cas client",            value: "Customer case study" },
    ],
    annonce: [
      { label: "Nouveaux horaires",     value: "New opening hours" },
      { label: "Fermeture exceptionnelle", value: "Exceptional closure" },
      { label: "Nouvelle adresse",      value: "New address / relocation" },
      { label: "Service urgent",        value: "Urgent service available" },
      { label: "Recrutement",           value: "We're hiring" },
    ],
  };
  // CTA depends on the SUBJECT (you don't 'buy' a place, you 'book' it).
  const CTAS: Record<SubjectKind, ChipOpt[]> = {
    product: [
      { label: "Acheter",               value: "CTA: Buy now" },
      { label: "Commander",             value: "CTA: Order now" },
      { label: "Voir le produit",       value: "CTA: See the product" },
      { label: "Profiter de l'offre",   value: "CTA: Take the offer" },
    ],
    place: [
      { label: "Réserver",              value: "CTA: Book now" },
      { label: "Voir la carte",         value: "CTA: See the menu" },
      { label: "Itinéraire",            value: "CTA: Get directions" },
      { label: "Appeler",               value: "CTA: Call us" },
    ],
    person: [
      { label: "Prendre RDV",           value: "CTA: Book an appointment" },
      { label: "Me contacter",          value: "CTA: Contact me" },
      { label: "Voir mon site",         value: "CTA: Visit my site" },
      { label: "Réserver un appel",     value: "CTA: Book a call" },
    ],
    service: [
      { label: "Demander un devis",     value: "CTA: Get a quote" },
      { label: "Prendre RDV",           value: "CTA: Book an appointment" },
      { label: "Me contacter",          value: "CTA: Contact us" },
      { label: "Découvrir le service",  value: "CTA: Discover the service" },
    ],
  };
  const [keyMessageChips, setKeyMessageChips] = useState<string[]>([]); // store values, multi-select up to 3
  const [ctaChip, setCtaChip] = useState<string>(""); // single-select CTA value
  const toggleKeyMessage = (val: string) => {
    setKeyMessageChips(prev => {
      if (prev.includes(val)) return prev.filter(v => v !== val);
      if (prev.length >= 3) return [...prev.slice(1), val]; // cap at 3
      return [...prev, val];
    });
  };

  // ── Scan a product/service URL (alternative or complement to the photo) ──
  // Hits the existing /products/scrape-url endpoint and auto-fills the two
  // optional fields (description + price). Photo path stays mandatory — URL
  // is a shortcut, not a replacement, since visual ground truth still needs
  // an image.
  const scanProductUrl = useCallback(async () => {
    const u = productPageUrl.trim();
    if (!u) return;
    if (!/^https?:\/\/.+\..+/.test(u)) {
      toast.error("URL invalide (https://...)");
      return;
    }
    setScanningProductUrl(true);
    try {
      // 45s timeout — scrape combine Jina (browser engine peut prendre
      // 20-25s sur SPA Shopify/Wix) + raw HTML fetch parallèle + AI
      // extraction (~10s). Le 25s d'origine était trop serré, beaucoup
      // de pages produit timeoutait avant la fin du Jina browser.
      const res = await serverPost("/products/scrape-url", { url: u }, 45_000);
      if (res?.success && res.product) {
        const p = res.product;
        if (p.name && !productDescription.trim()) {
          // Short label used in the form input — name + 1-line summary
          const desc = [p.name, p.description?.slice(0, 120)].filter(Boolean).join(" — ").slice(0, 200);
          setProductDescription(desc);
        }
        if (p.price && p.currency && !productPrice.trim()) {
          setProductPrice(`${p.price} ${p.currency}`);
        }
        // Stash the rich attributes — surprise-me reads these to unlock
        // text-to-image scene regen on Lifestyle/UGC styles. The full
        // description (~600-1500 chars) plus structured attributes give
        // the planner concrete facts to weave into every shot's promptText
        // instead of paraphrasing a 200-char blob.
        setScrapedProduct({
          fullDescription: typeof p.description === "string" ? p.description : undefined,
          category: typeof p.category === "string" ? p.category : undefined,
          color: typeof p.color === "string" ? p.color : undefined,
          material: typeof p.material === "string" ? p.material : undefined,
          fit: typeof p.fit === "string" ? p.fit : undefined,
          sizing: typeof p.sizing === "string" ? p.sizing : undefined,
          styleTags: Array.isArray(p.style_tags) ? p.style_tags.map(String) : undefined,
          targetUser: typeof p.target_user === "string" ? p.target_user : undefined,
          features: Array.isArray(p.features) ? p.features.map(String) : undefined,
          imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls.map(String) : undefined,
        });
        toast.success(`Page lue : ${p.name || u}`);
      } else {
        toast.error(res?.error || "Impossible de lire cette page — essaie l'URL d'une fiche produit.");
      }
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setScanningProductUrl(false);
    }
  }, [productPageUrl, productDescription, productPrice, serverPost]);

  // Run a full surprise-me campaign. When called without arguments, every
  // parameter comes from the user's brief + picks. An `override` lets the
  // auto-angle cards fire the same pipeline with a pre-composed brief and
  // angle-specific platform/creativity defaults — no typing required.
  const handleSurprise = useCallback(async (override?: {
    brief?: string;
    platforms?: string[];
    platformFormats?: Record<string, "image" | "film">;
    creativity?: 1 | 2 | 3 | 4;
    assetCount?: number;
  }) => {
    if (busy) return;
    setBusy(true);
    setStage("concept");
    setPack(null);
    setEditedOverlays({}); // wipe carousel overlay edits from previous run
    // Generate a per-run request id the backend uses as the progress KV
    // key. Browsers from ~2022 expose crypto.randomUUID; we fall back to a
    // timestamp+random combo for older runtimes (and for SSR safety).
    const reqId = (typeof crypto !== "undefined" && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `srp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setActiveRequestId(reqId);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setStage("generating");
      const effPlatforms = override?.platforms ?? platforms;
      const effFormats = override?.platformFormats
        ?? Object.fromEntries(platformPicks.map((p) => [p.id, p.format]));
      const effCreativity = override?.creativity ?? creativity;
      const effAssetCount = override?.assetCount ?? assetCount;
      // Fall back to the scraped product images when the merchant didn't
      // upload their own. Lets URL-only flows actually have a visual
      // reference instead of pure T2I (which still works but starts blind).
      const effProductImageUrls = productPhotos.length > 0
        ? productPhotos
        : (scrapedProduct?.imageUrls && scrapedProduct.imageUrls.length > 0
            ? scrapedProduct.imageUrls.slice(0, 5)
            : []);
      const res = await serverPost("/analyze/surprise-me", {
        requestId: reqId,
        styleId: styleId || undefined,
        productImageUrl: effProductImageUrls[0] || undefined,
        productImageUrls: effProductImageUrls.length > 0 ? effProductImageUrls : undefined,
        productDescription: productDescription.trim() || undefined,
        enrichedDescription: enrichedDescription || undefined,
        productPrice: productPrice.trim() || undefined,
        // Rich product attributes from URL scrape — when present, the server
        // can route Lifestyle/UGC shots through text-to-image with the full
        // description as anchor instead of constraining Ideogram Remix to
        // 5% creative headroom on a catalog photo.
        productAttributes: scrapedProduct ? {
          fullDescription: scrapedProduct.fullDescription,
          category: scrapedProduct.category,
          color: scrapedProduct.color,
          material: scrapedProduct.material,
          fit: scrapedProduct.fit,
          sizing: scrapedProduct.sizing,
          styleTags: scrapedProduct.styleTags,
          targetUser: scrapedProduct.targetUser,
          features: scrapedProduct.features,
        } : undefined,
        creativityLevel: effCreativity,
        assetCount: effAssetCount,
        platforms: effPlatforms,
        platformFormats: effFormats,
        mediaType,
        videoDuration,
        withCaption,
        // subjectKind drives server-side pipeline routing (place/person skip
        // Photoroom cutout — irrelevant for spaces and faces — and use
        // Ideogram Remix at high image_weight to preserve the subject).
        subjectKind,
        brief: override?.brief || undefined,
        context: override?.brief ? undefined : (() => {
          // Compose ctxWhy from intent + key message chips + CTA chip so the
          // planner gets fully prescriptive guidance with zero free-text input
          // from the user. The intent value (rich English) is the spine; the
          // key messages append concrete facts (price, marronnier, etc.); the
          // CTA appends the final action verb to use.
          const parts: string[] = [];
          if (ctxWhy.trim()) parts.push(ctxWhy.trim());
          if (keyMessageChips.length > 0) parts.push(`Key facts to surface: ${keyMessageChips.join(" · ")}.`);
          if (ctaChip) parts.push(ctaChip);
          return {
            who: who.trim() || undefined,
            what: what.trim() || undefined,
            why: parts.join(" ").slice(0, 800) || undefined,
          };
        })(),
        lang: "en",
      }, 240_000);
      if (!res?.success || !Array.isArray(res.items)) {
        // Out-of-credits is a first-class case with a clear CTA.
        if (res?.code === "out_of_credits") {
          setStage("idle");
          setOutOfCredits({ remaining: Number(res.remaining || 0), required: Number(res.required || effAssetCount) });
          return;
        }
        toast.error(res?.error || "Composition failed.");
        setStage("idle");
        return;
      }
      const savedCount = Number(res.savedCount || 0);
      setPack({
        campaignName: String(res.campaignName || ""),
        campaignSlug: String(res.campaignSlug || "ora-campaign"),
        creativeAngle: String(res.creativeAngle || ""),
        tone: String(res.tone || ""),
        keyMessage: String(res.keyMessage || ""),
        creativityLevel: Number(res.creativityLevel || creativity),
        items: res.items,
        savedCount,
        brandLockScore: Math.max(0, Math.min(100, Number(res.brandLockScore || 0))),
      });
      setStage("done");
      if (savedCount === 0) {
        toast.error("Generated but nothing saved to Library — check server logs.");
      }
      // Refresh auth profile so the credits pill in AppTabs updates immediately.
      refreshProfile().catch(() => {});
    } catch (err: any) {
      toast.error(String(err?.message || err));
      setStage("idle");
    } finally {
      setBusy(false);
      setActiveRequestId(null);
    }
  }, [busy, productPhotos, productDescription, enrichedDescription, productPrice, creativity, assetCount, platformPicks, mediaType, videoDuration, withCaption, what, who, ctxWhy, keyMessageChips, ctaChip, subjectKind, serverPost, refreshProfile, styleId, scrapedProduct]);

  // ── Publish the entire pack to the Calendar ──────────────────────
  // Maps each ok asset → a draft Calendar event with an AI-suggested
  // posting time (one per day starting tomorrow, picked from the
  // platform's optimal hour). The user lands on /hub/calendar with
  // the events already laid out and can edit / drag / deploy from
  // there. We POST events in parallel and toast the count saved.
  const [publishingPack, setPublishingPack] = useState(false);
  const publishPackToCalendar = useCallback(async () => {
    if (!pack || publishingPack) return;
    const okItems = pack.items.filter((it) => it.status === "ok" && (it.imageUrl || it.videoUrl));
    if (okItems.length === 0) {
      toast.error("Nothing to publish — pack is empty.");
      return;
    }
    setPublishingPack(true);
    try {
      const schedule = suggestScheduleForPack(okItems);
      const created = await Promise.allSettled(
        schedule.map((s) =>
          serverPost("/calendar", scheduleToCalendarEvent(s, { campaignName: pack.campaignName })),
        ),
      );
      const okCount = created.filter((r) => r.status === "fulfilled" && (r as any).value?.success).length;
      if (okCount > 0) {
        toast.success(
          `${okCount} post${okCount === 1 ? "" : "s"} added to your calendar. Review & publish from there.`,
        );
        navigate("/hub/calendar");
      } else {
        toast.error("Couldn't seed the calendar. Try again from Library.");
      }
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setPublishingPack(false);
    }
  }, [pack, publishingPack, serverPost, navigate]);

  // Display expansion: when a shot has BOTH an image and a film (the
  // "Images + Films" mode), render them as TWO cards — one for the image,
  // one for the motion version — so the user sees both in the grid. The
  // original pack.items stays intact for the ZIP / library save.
  //
  // 2026-04 UPDATE: the expansion confused users ("asked for 2 assets, saw
  // 3 cards" when one of the two shots was film+firstframe). Now one shot
  // = one card. When a shot has both image and video, we display it as
  // the film card with the first-frame as its thumbnail, the user can
  // still expand in the lightbox. Library save is unchanged — still saves
  // both image and video files for the same shot.
  const groupedByPlatform: Record<string, PackItem[]> = {};
  if (pack) {
    for (const it of pack.items) {
      const bucket = (groupedByPlatform[it.platform] ||= []);
      bucket.push(it);
    }
  }
  // Flat order mirrors the rendered grid so ←/→ in the lightbox navigates
  // the same sequence the user is seeing.
  const flatItems: PackItem[] = Object.values(groupedByPlatform).flat();

  // Lightbox keyboard nav — ESC close, ←/→ browse.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : Math.min(flatItems.length - 1, i + 1)));
      else if (e.key === "ArrowLeft")  setLightboxIndex((i) => (i === null ? null : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, flatItems.length]);

  return (
    <div style={{ background: BG, color: TEXT }} className="min-h-screen flex flex-col">
      <AppTabs active="surprise" />

      {/* Idle / form state — one sentence, one button, fine-tune hidden */}
      {stage === "idle" && !pack && (
        <main className="flex-1 flex items-center">
          <div className="w-full max-w-[900px] mx-auto px-5 md:px-10 py-14 md:py-24">
            {/* Brand Vault nudge — editorial, dismissible, non-blocking */}
            <AnimatePresence>
              {hasVaultFeature && vaultMissing && !vaultNudgeDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-10 flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: COLORS.warm, border: `1px solid ${COLORS.line}` }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] mb-0.5" style={{ ...bagel, fontSize: 18, lineHeight: 1.1 }}>
                      Lock your brand first.
                    </p>
                    <p className="text-[13px] leading-snug" style={{ color: COLORS.muted }}>
                      Drop your URL once — we pin your palette, tone and photo style on every shot. 30 seconds.
                    </p>
                  </div>
                  <Button variant="ink" size="sm" onClick={() => navigate("/hub/vault")}>
                    Set it up <ArrowRight size={13} />
                  </Button>
                  <button
                    onClick={dismissVaultNudge}
                    aria-label="Dismiss"
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 transition"
                    style={{ color: COLORS.muted }}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {customBriefMode ? (<>
            {/* ═══ CUSTOM BRIEF MODE — typing fallback ═══
             *   User opted out of the product-first flow. Matches the old
             *   "I'm launching X for Y" UI + a "Surprise me" CTA that
             *   bypasses angle selection and generates directly. */}
            {/* Loading skeleton while angles fetch */}
            {anglesLoading && !customBriefMode && suggestedAngles.length === 0 && (
              <div className="mb-10 flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
                <Loader2 size={13} className="animate-spin" />
                Composing three directions for you…
              </div>
            )}
            {/* Friendly opener */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="mb-8 md:mb-12"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-4 flex items-center justify-between gap-3" style={{ color: MUTED }}>
                <span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: PINK }} />
                  What are you shipping?
                </span>
                <button
                  onClick={() => { setCustomBriefMode(false); setIdleView("input"); }}
                  className="text-[10.5px] hover:text-black transition"
                  style={{ color: MUTED, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}
                >
                  ← Back to product input
                </button>
              </div>
              <p className="leading-[1.02]"
                 style={{ fontFamily: DISPLAY, fontSize: "clamp(44px, 8vw, 104px)", letterSpacing: "-0.035em" }}>
                I'm launching{" "}
                <InlineField value={what} onChange={setWhat} placeholder="a summer fragrance" widthCh={14} />
                {" "}for{" "}
                <InlineField value={who} onChange={setWho} placeholder="Gen Z in Paris" widthCh={12} />.
              </p>
            </motion.div>

            {/* Optional visual + platforms row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-wrap items-center gap-2 md:gap-3 mb-10 md:mb-12"
            >
              {productPhoto ? (
                <div className="inline-flex items-center gap-2 pl-1 pr-3 h-10 rounded-full" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <img src={productPhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                  <span className="text-[12.5px]" style={{ color: MUTED }}>Visual locked</span>
                  <button onClick={() => { setProductPhotos([]); setEnrichedDescription(""); }} className="ml-1 text-black/40 hover:text-black"><X size={14} /></button>
                </div>
              ) : (
                <label className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full cursor-pointer text-[13px] hover:bg-black/5"
                       style={{ border: `1px solid ${BORDER}`, color: TEXT }}>
                  {uploadingProduct ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                  Drop a visual (optional)
                  <input type="file" accept="image/*" className="hidden"
                         onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProductPhoto(f); e.target.value = ""; }} />
                </label>
              )}

              <span className="text-[12.5px] mx-1" style={{ color: MUTED }}>on</span>

              {PLATFORM_OPTIONS.map((p) => {
                const pick = platformPicks.find((x) => x.id === p.id);
                const on = !!pick;
                const formatIcon = pick?.format === "film" ? "🎬" : "📸";
                return (
                  <div
                    key={p.id}
                    className="inline-flex items-stretch h-10 rounded-full overflow-hidden transition"
                    style={{
                      background: on ? INK : "#fff",
                      color: on ? INK_TEXT : TEXT,
                      border: `1px solid ${on ? INK : BORDER}`,
                      fontWeight: 500,
                    }}
                  >
                    <button
                      onClick={() => togglePlatform(p.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 text-[13px]"
                      title={on ? "Remove platform" : "Add platform"}
                    >
                      <span>{p.emoji}</span> {p.label.replace("Instagram ", "IG ")}
                    </button>
                    {on && !FORMAT_LOCKED_PLATFORMS.has(p.id) && (
                      <button
                        onClick={() => togglePlatformFormat(p.id)}
                        className="inline-flex items-center justify-center w-9 text-[15px] hover:bg-white/10"
                        style={{ borderLeft: `1px solid rgba(255,255,255,0.18)` }}
                        title={`Switch to ${pick?.format === "film" ? "image" : "film"}`}
                      >
                        {formatIcon}
                      </button>
                    )}
                  </div>
                );
              })}
            </motion.div>

            {/* The one big button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col items-center justify-center gap-3"
            >
              {(() => {
                const needsCredits = remainingCredits < assetCount && remainingCredits < 999999;
                return (
                  <>
                    <Button
                      variant="accent" size="lg"
                      onClick={handleSurprise}
                      disabled={busy || uploadingProduct || platforms.length === 0 || needsCredits}
                      style={{ boxShadow: needsCredits ? "none" : "0 20px 44px -14px rgba(255,92,57,0.55)" }}
                    >
                      <Sparkles size={18} /> Surprise me <ArrowRight size={16} />
                    </Button>
                    {needsCredits && (
                      <p className="text-[12.5px]" style={{ color: COLORS.muted }}>
                        {remainingCredits === 0
                          ? <>Out of credits. <button onClick={() => navigate("/pricing")} className="underline" style={{ color: COLORS.ink, fontWeight: 600 }}>Upgrade</button> to keep going.</>
                          : <>You have {remainingCredits} credit{remainingCredits === 1 ? "" : "s"} — drop the count to {remainingCredits} or <button onClick={() => navigate("/pricing")} className="underline" style={{ color: COLORS.ink, fontWeight: 600 }}>upgrade</button>.</>
                        }
                      </p>
                    )}
                  </>
                );
              })()}
            </motion.div>

            {/* Fine-tune drawer toggle */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 text-center"
            >
              <button
                onClick={() => setFineTuneOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-[12.5px] hover:text-black transition"
                style={{ color: MUTED, fontWeight: 500 }}
              >
                <ChevronDown size={13} className={`transition-transform ${fineTuneOpen ? "rotate-180" : ""}`} />
                {fineTuneOpen ? "Hide fine-tune" : "Fine-tune"}
              </button>
            </motion.div>

            {/* Fine-tune drawer */}
            <AnimatePresence>
              {fineTuneOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 flex flex-col gap-6">
                    {/* StylePicker lives in its own dedicated step
                        (idleView === "style") — see below. We don't
                        repeat it here to avoid two paths to the same
                        choice (would split user attention). */}
                    <TuneBlock label="Creative level">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {CREATIVITY.map((c) => {
                          const on = creativity === c.id;
                          return (
                            <button key={c.id} onClick={() => setCreativity(c.id)}
                                    className="py-2.5 px-3 rounded-2xl text-left transition"
                                    style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}` }}>
                              <div className="flex items-center gap-1.5 text-[13px]"><span>{c.emoji}</span><span style={{ fontWeight: 600 }}>{c.label}</span></div>
                              <div className="mt-0.5 text-[11px]" style={{ color: on ? "rgba(255,255,255,0.65)" : MUTED }}>{c.hint}</div>
                            </button>
                          );
                        })}
                      </div>
                    </TuneBlock>

                    <TuneBlock label={`Posts · ${assetCount}`}>
                      <input type="range" min={1} max={16} value={assetCount}
                             onChange={(e) => setAssetCount(parseInt(e.target.value, 10))}
                             className="w-full" style={{ accentColor: INK }} />
                    </TuneBlock>

                    {/* Video length applies to any platform that gets motion (IG Story, TikTok, …) */}
                    <TuneBlock label="Video length">
                      <div className="flex gap-2">
                        {(["3s", "5s", "8s"] as const).map((d) => {
                          const on = videoDuration === d;
                          return (
                            <button key={d} onClick={() => setVideoDuration(d)}
                                    className="inline-flex items-center px-3 h-9 rounded-full text-[13px] transition"
                                    style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}>
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </TuneBlock>

                    <TuneBlock label="Caption with each post">
                      <div className="flex gap-2">
                        {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((opt) => {
                          const on = withCaption === opt.v;
                          return (
                            <button key={String(opt.v)} onClick={() => setWithCaption(opt.v)}
                                    className="inline-flex items-center px-3 h-9 rounded-full text-[13px] transition"
                                    style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}>
                              {opt.l}
                            </button>
                          );
                        })}
                      </div>
                    </TuneBlock>

                    <TuneBlock label="Why (moment, intent)">
                      <input value={ctxWhy} onChange={(e) => setCtxWhy(e.target.value)}
                             placeholder="summer launch · winter campaign · awareness"
                             className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
                             style={{ background: "#fff", border: `1px solid ${BORDER}` }} />
                    </TuneBlock>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </>) : idleView === "angles" ? (
              /* ═══ Angle grid — shown AFTER user submits the product form ═══
               *   Three brand+product-compliant directions the user picks
               *   from. Clicking a card fires the full generation. */
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="mb-10"
              >
                <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-4 flex items-center justify-between gap-3" style={{ color: MUTED }}>
                  <span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: PINK }} />
                    Ora suggests{monthLabel ? ` · ${monthLabel}` : ""}
                  </span>
                  <button
                    onClick={() => setIdleView("input")}
                    className="text-[10.5px] hover:text-black transition"
                    style={{ color: MUTED, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}
                  >
                    ← Change product
                  </button>
                </div>
                <h1 className="leading-[0.98] mb-8" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 92px)" }}>
                  Pick a direction.<br />
                  <span style={{ color: COLORS.coral }}>We handle the rest.</span>
                </h1>
                {anglesLoading && suggestedAngles.length === 0 ? (
                  <div className="flex items-center gap-2 text-[13px]" style={{ color: MUTED }}>
                    <Loader2 size={14} className="animate-spin" />
                    Reading your brand + product…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    {suggestedAngles.map((a, i) => (
                      <motion.button
                        key={a.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * i, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        whileHover={{ y: -4 }}
                        disabled={busy || uploadingProduct}
                        onClick={() => {
                          // Angle card only contributes the creative brief —
                          // platforms / creativity / assetCount stay whatever
                          // the user set in the product input form. When the
                          // style catalog has been seeded by an admin, route
                          // through the StylePicker as a final visual choice;
                          // otherwise fire generation directly so users don't
                          // see misleading fallback tiles.
                          if (styleCatalogReady) {
                            setPendingBrief(a.brief);
                            setIdleView("style");
                          } else {
                            handleSurprise({ brief: a.brief });
                          }
                        }}
                        className="text-left rounded-3xl p-6 md:p-7 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{
                          background: "#FFFFFF",
                          border: `1px solid ${COLORS.line}`,
                          boxShadow: "0 1px 2px rgba(17,17,17,0.03)",
                        }}
                      >
                        <div className="text-[28px] leading-none mb-4">{a.emoji || "✨"}</div>
                        <h3 className="leading-[1.02] mb-2" style={{ ...bagel, fontSize: 28, color: COLORS.ink }}>
                          {a.title}
                        </h3>
                        {a.subtitle && (
                          <p className="text-[13.5px] leading-snug mb-5" style={{ color: COLORS.muted }}>
                            {a.subtitle}
                          </p>
                        )}
                        {/* Show the user's actual settings on the card so
                            they know what the angle will produce. */}
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: COLORS.subtle, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                          <span>{assetCount} post{assetCount === 1 ? "" : "s"}</span>
                          <span>·</span>
                          <span>{platforms.length} platform{platforms.length === 1 ? "" : "s"}</span>
                          <span>·</span>
                          <span>level {creativity}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : idleView === "style" ? (
              /* ═══ Style picker — final step before generation ═══
               *   The user has already picked an angle/brief. Now they
               *   pick a visual vibe from the masonry gallery (or skip).
               *   "Generate" fires handleSurprise with the chosen styleId
               *   and the brief saved in pendingBrief. */
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="mb-10"
              >
                <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-4 flex items-center justify-between gap-3" style={{ color: MUTED }}>
                  <span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: PINK }} />
                    Final touch
                  </span>
                  <button
                    onClick={() => setIdleView("angles")}
                    className="text-[10.5px] hover:text-black transition"
                    style={{ color: MUTED, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}
                  >
                    ← Back to angles
                  </button>
                </div>
                <h1 className="leading-[0.98] mb-3" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 92px)" }}>
                  Pick a vibe.
                </h1>
                <p className="text-[15px] mb-8" style={{ color: MUTED, maxWidth: 640 }}>
                  Tap any image — your 6 posts will all share that aesthetic. Or skip to let Ora mix styles.
                </p>

                <StylePicker selectedStyleId={styleId} onPick={setStyleId} />

                {/* Sticky-ish bottom CTA bar */}
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl" style={{ background: "#FFF", border: `1px solid ${BORDER}` }}>
                  <div className="text-[12.5px]" style={{ color: MUTED }}>
                    {styleId ? (
                      <>Vibe locked: <b style={{ color: COLORS.ink, textTransform: "capitalize" }}>{styleId}</b></>
                    ) : (
                      <>No vibe picked — Ora will mix styles freely.</>
                    )}
                  </div>
                  <Button
                    variant="accent"
                    size="md"
                    onClick={() => handleSurprise({ brief: pendingBrief })}
                    disabled={busy || uploadingProduct}
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {busy ? "Generating…" : "Generate"}
                  </Button>
                </div>
              </motion.div>
            ) : (
              // PRODUCT INPUT — the new default view
              // 1. Upload product photo (required)
              // 2. Description + price (optional)
              // 3. Settings (assets, networks, film, caption, creativity)
              // 4. CTA "Propose angles" → fetches Vault+product angles
              // 5. "Just write what you want" drops to customBriefMode
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              >
                <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-4" style={{ color: MUTED }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: PINK }} />
                  Six posts · every platform · ready to publish
                </div>
                <h1 className="leading-[0.98] mb-8" style={{ ...bagel, fontSize: "clamp(40px, 7vw, 88px)" }}>
                  Drop a photo.<br />
                  <span style={{ color: COLORS.coral }}>We post for you.</span>
                </h1>

                {/* 0. Subject archetype — single chip row, drives every label
                    + the server-side pipeline routing. Default is Produit. */}
                <div className="mb-4">
                  <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>
                    Tu vends quoi ?
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {SUBJECT_KINDS.map((s) => {
                      const on = subjectKind === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSubjectKind(s.id)}
                          className="inline-flex items-center px-3 h-9 rounded-full text-[13px] transition"
                          style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 1. Photo upload — label adapts to subjectKind. First photo
                    mandatory, up to 5 angles for studio-grade fidelity. When
                    2+ uploaded, a vision pre-pass extracts a rich descriptor
                    that feeds every shot. */}
                {productPhotos.length === 0 ? (
                  <label className="mb-3 flex flex-col items-center justify-center gap-2 py-12 rounded-2xl cursor-pointer transition hover:bg-black/[0.02]"
                         style={{ background: "#fff", border: `2px dashed ${BORDER}` }}>
                    {uploadingProduct ? <Loader2 size={22} className="animate-spin" style={{ color: COLORS.coral }} /> : <Paperclip size={22} style={{ color: COLORS.coral }} />}
                    <span className="text-[15px] font-semibold" style={{ color: TEXT }}>
                      {uploadingProduct ? "Uploading…" : subjectMeta.photoLabel}
                    </span>
                    <span className="text-[12px]" style={{ color: MUTED }}>PNG, JPG, WebP · 1 required, up to 5 angles</span>
                    <input type="file" accept="image/*" className="hidden"
                           onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProductPhoto(f); e.target.value = ""; }} />
                  </label>
                ) : (
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {productPhotos.map((url, i) => (
                      <div key={url + i} className="relative w-24 h-24 rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider" style={{ background: INK, color: INK_TEXT }}>
                            Primary
                          </span>
                        )}
                        <button
                          onClick={() => removeProductPhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
                          title="Remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {productPhotos.length < 5 && (
                      <label className="w-24 h-24 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-1 transition hover:bg-black/[0.04]"
                             style={{ background: "#fff", border: `2px dashed ${BORDER}` }}>
                        {uploadingProduct ? <Loader2 size={16} className="animate-spin" style={{ color: COLORS.coral }} /> : <Paperclip size={16} style={{ color: COLORS.coral }} />}
                        <span className="text-[10.5px] font-semibold" style={{ color: TEXT }}>
                          + angle
                        </span>
                        <span className="text-[9px]" style={{ color: MUTED }}>{productPhotos.length}/5</span>
                        <input type="file" accept="image/*" className="hidden"
                               onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProductPhoto(f); e.target.value = ""; }} />
                      </label>
                    )}
                  </div>
                )}
                {productPhotos.length >= 2 && (
                  <div className="mb-6 px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(255,92,57,0.06)", border: `1px solid rgba(255,92,57,0.18)` }}>
                    {analyzingPhotos ? (
                      <>
                        <Loader2 size={12} className="animate-spin" style={{ color: COLORS.coral }} />
                        <span className="text-[11.5px]" style={{ color: TEXT }}>Reading {productPhotos.length} angles…</span>
                      </>
                    ) : enrichedDescription ? (
                      <>
                        <Sparkles size={12} style={{ color: COLORS.coral }} />
                        <span className="text-[11.5px]" style={{ color: TEXT }}>
                          Studio-grade fidelity locked
                          <span className="ml-1.5" style={{ color: MUTED }}>· {enrichedDescription.length} chars of ground truth</span>
                        </span>
                      </>
                    ) : null}
                  </div>
                )}
                {productPhotos.length === 1 && (
                  <p className="mb-6 text-[11.5px]" style={{ color: MUTED }}>
                    Tip: add a 2nd or 3rd angle (back, detail, on model) for noticeably tighter fidelity across the pack.
                  </p>
                )}

                {/* 2. What is it? + price
                    Required single line (not a textarea — textareas read as
                    "write me a prompt"). The photo tells Ora WHAT shape +
                    colour; this line tells us WHICH product specifically
                    ("linen polo, relaxed fit, cream" vs "structured poplin
                    shirt, cream"). Without it the angles default to generic
                    fashion tropes. Price stays optional and feeds the
                    caption only. */}
                {/* 1.5 Optional product page URL — shortcut to fill description + price.
                    For any merchant whose product/dish/service is already on a website
                    (Shopify, Wix, Wordpress, restaurant menu, etc.), pasting the URL
                    saves the typing step. Auto-fills the two fields below. */}
                <div className="mb-3">
                  <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
                    {subjectMeta.urlLabel} <span style={{ textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(raccourci optionnel)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={productPageUrl}
                      onChange={(e) => setProductPageUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !scanningProductUrl) { e.preventDefault(); scanProductUrl(); } }}
                      placeholder="https://..."
                      className="flex-1 rounded-xl px-3 h-10 text-[14px] outline-none"
                      style={{ background: "#fff", border: `1px solid ${BORDER}`, color: TEXT }}
                    />
                    <button
                      onClick={scanProductUrl}
                      disabled={scanningProductUrl || !productPageUrl.trim()}
                      className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl text-[13px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: INK, color: INK_TEXT, border: `1px solid ${INK}` }}
                    >
                      {scanningProductUrl ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                      {scanningProductUrl ? "Lecture…" : "Scanner"}
                    </button>
                  </div>
                  {/* Attributs récupérés du scrape — feedback visible que la
                   * ground-truth est bien arrivée. Donne au merchant la
                   * confiance que le pack généré sera fidèle au produit
                   * réel (sinon il a l'impression que rien n'est passé). */}
                  {scrapedProduct && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2 flex flex-wrap gap-1.5"
                    >
                      {scrapedProduct.category && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ background: "rgba(17,17,17,0.06)", color: TEXT }}>
                          <span style={{ opacity: 0.55 }}>cat.</span> {scrapedProduct.category}
                        </span>
                      )}
                      {scrapedProduct.color && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ background: "rgba(17,17,17,0.06)", color: TEXT }}>
                          <span style={{ opacity: 0.55 }}>couleur</span> {scrapedProduct.color}
                        </span>
                      )}
                      {scrapedProduct.material && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ background: "rgba(17,17,17,0.06)", color: TEXT }}>
                          <span style={{ opacity: 0.55 }}>matière</span> {scrapedProduct.material}
                        </span>
                      )}
                      {scrapedProduct.fit && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ background: "rgba(17,17,17,0.06)", color: TEXT }}>
                          <span style={{ opacity: 0.55 }}>coupe</span> {scrapedProduct.fit}
                        </span>
                      )}
                      {scrapedProduct.styleTags && scrapedProduct.styleTags.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ background: "rgba(17,17,17,0.06)", color: TEXT }}>
                          <span style={{ opacity: 0.55 }}>style</span> {scrapedProduct.styleTags.slice(0, 3).join(", ")}
                        </span>
                      )}
                      {scrapedProduct.imageUrls && scrapedProduct.imageUrls.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px]" style={{ background: "rgba(255,200,100,0.18)", color: TEXT }}>
                          <span style={{ opacity: 0.7 }}>📸</span> {scrapedProduct.imageUrls.length} photo{scrapedProduct.imageUrls.length > 1 ? "s" : ""} récupérée{scrapedProduct.imageUrls.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 mb-6">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
                      {subjectMeta.descLabel}
                    </label>
                    <input
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder={subjectMeta.descPlaceholder}
                      className="w-full rounded-xl px-3 h-10 text-[14px] outline-none"
                      style={{ background: "#fff", border: `1px solid ${BORDER}`, color: TEXT }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
                      Price <span style={{ textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optional)</span>
                    </label>
                    <input
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      placeholder="€89"
                      className="w-full rounded-xl px-3 h-10 text-[14px] outline-none"
                      style={{ background: "#fff", border: `1px solid ${BORDER}`, color: TEXT }}
                    />
                  </div>
                </div>

                {/* 2.5 Intent — six SMB-friendly chips. Single-select. Click toggles.
                    The selected chip writes a rich directive into ctxWhy that the
                    planner uses verbatim. No intent picked = AI infers from brief. */}
                <div className="mb-6">
                  <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>
                    Pourquoi ce post ? <span style={{ textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optionnel — Ora propose si vide)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {INTENTS.map((it) => {
                      const on = selectedIntent === it.id;
                      return (
                        <button
                          key={it.id}
                          onClick={() => {
                            setCtxWhy(on ? "" : it.value);
                            // Reset chip selections when intent changes — they're intent-specific.
                            if (!on) { setKeyMessageChips([]); setCtaChip(""); }
                          }}
                          className="inline-flex items-center px-3 h-9 rounded-full text-[13px] transition"
                          style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2.6 Key message — pre-validated chips (3 max). Adapts to the
                    selected intent. Shown only once an intent is picked, so the
                    user never faces an empty grid. Zero typing. */}
                {selectedIntent && KEY_MESSAGES[selectedIntent] && (
                  <div className="mb-6">
                    <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>
                      Message clé <span style={{ textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optionnel — jusqu'à 3)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {KEY_MESSAGES[selectedIntent].map((opt) => {
                        const on = keyMessageChips.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            onClick={() => toggleKeyMessage(opt.value)}
                            className="inline-flex items-center px-3 h-9 rounded-full text-[13px] transition"
                            style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2.7 CTA — single-select chip row. Adapts to subjectKind so
                    the verb fits the profession ("Réserver" for a place,
                    "Acheter" for a product, "Prendre RDV" for a person). */}
                {selectedIntent && (
                  <div className="mb-6">
                    <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>
                      Action visée <span style={{ textTransform: "none", letterSpacing: 0, opacity: 0.6 }}>(optionnel — 1 max)</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {CTAS[subjectKind].map((opt) => {
                        const on = ctaChip === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setCtaChip(on ? "" : opt.value)}
                            className="inline-flex items-center px-3 h-9 rounded-full text-[13px] transition"
                            style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Networks — chips with image/film toggle (reused from custom brief UI) */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <span className="text-[11px] font-mono uppercase tracking-[0.2em] mr-1" style={{ color: MUTED }}>Networks</span>
                  {PLATFORM_OPTIONS.map((p) => {
                    const pick = platformPicks.find((x) => x.id === p.id);
                    const on = !!pick;
                    const formatIcon = pick?.format === "film" ? "🎬" : "📸";
                    return (
                      <div key={p.id} className="inline-flex items-stretch h-9 rounded-full overflow-hidden transition"
                           style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}>
                        <button onClick={() => togglePlatform(p.id)} className="inline-flex items-center gap-1.5 px-3 text-[12.5px]">
                          <span>{p.emoji}</span> {p.label.replace("Instagram ", "IG ")}
                        </button>
                        {on && !FORMAT_LOCKED_PLATFORMS.has(p.id) && (
                          <button onClick={() => togglePlatformFormat(p.id)} className="inline-flex items-center justify-center w-8 text-[14px] hover:bg-white/10"
                                  style={{ borderLeft: `1px solid rgba(255,255,255,0.18)` }}
                                  title={`Switch to ${pick?.format === "film" ? "image" : "film"}`}>
                            {formatIcon}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 4. Settings row — assets, creativity, caption */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 rounded-2xl" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Posts · {assetCount}</div>
                    <input type="range" min={1} max={16} value={assetCount}
                           onChange={(e) => setAssetCount(parseInt(e.target.value, 10))}
                           className="w-full" style={{ accentColor: INK }} />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Creative level</div>
                    <div className="flex gap-1">
                      {CREATIVITY.map((c) => {
                        const on = creativity === c.id;
                        return (
                          <button key={c.id} onClick={() => setCreativity(c.id)} title={c.hint}
                                  className="flex-1 inline-flex items-center justify-center h-8 rounded-full text-[12px] transition"
                                  style={{ background: on ? INK : "transparent", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 600 }}>
                            {c.emoji}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Caption</div>
                    <div className="flex gap-1">
                      {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((opt) => {
                        const on = withCaption === opt.v;
                        return (
                          <button key={String(opt.v)} onClick={() => setWithCaption(opt.v)}
                                  className="flex-1 inline-flex items-center justify-center h-8 rounded-full text-[12.5px] transition"
                                  style={{ background: on ? INK : "transparent", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 600 }}>
                            {opt.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. CTA "Propose angles" — disabled without a product photo */}
                <div className="flex flex-col items-center justify-center gap-3">
                  {(() => {
                    const noPhoto = !productPhoto;
                    const noDesc = !productDescription.trim();
                    const noPlatform = platforms.length === 0;
                    const disabled = busy || uploadingProduct || anglesLoading || noPhoto || noDesc || noPlatform;
                    return (
                      <>
                        <Button
                          variant="accent" size="lg"
                          onClick={async () => {
                            await fetchAngles();
                            setIdleView("angles");
                          }}
                          disabled={disabled}
                          style={{ boxShadow: disabled ? "none" : "0 20px 44px -14px rgba(255,92,57,0.55)" }}
                        >
                          {anglesLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                          {anglesLoading ? "Reading your brand…" : "Show me ideas"}
                          <ArrowRight size={16} />
                        </Button>
                        {noPhoto && (
                          <p className="text-[12.5px]" style={{ color: MUTED }}>
                            Add a photo to continue.
                          </p>
                        )}
                        {!noPhoto && noDesc && (
                          <p className="text-[12.5px]" style={{ color: MUTED }}>
                            One line — what is it? (e.g. "linen polo, cream"). Keeps Ora on point.
                          </p>
                        )}
                        {!noPhoto && !noDesc && noPlatform && (
                          <p className="text-[12.5px]" style={{ color: MUTED }}>
                            Pick at least one platform.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Fallback to custom brief typing */}
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setCustomBriefMode(true)}
                    className="text-[12.5px] hover:text-black transition inline-flex items-center gap-1"
                    style={{ color: MUTED, fontWeight: 500 }}
                  >
                    Or just write what you want <ArrowRight size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      )}

      {/* Generating — multi-step progress with cycling status + ETA so
          users see the pipeline working (not "is it stuck?" anxiety). */}
      {(stage === "concept" || stage === "generating") && (
        <GenerationProgress
          stage={stage}
          mediaType={mediaType}
          assetCount={assetCount}
          requestId={activeRequestId}
          accessToken={accessToken}
        />
      )}

      {/* Done */}
      {stage === "done" && pack && (
        <main className="flex-1">
          <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-10 md:py-14 flex flex-col gap-10">
            {/* Campaign head — no card, just type */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-3" style={{ color: PINK }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: PINK }} />
                Campaign
              </div>
              <h2 className="leading-[0.95]" style={{ fontFamily: DISPLAY, fontSize: "clamp(42px, 6.5vw, 96px)", letterSpacing: "-0.035em" }}>
                {pack.campaignName}
              </h2>
              {pack.creativeAngle && <p className="mt-3 text-[17px] leading-relaxed" style={{ color: TEXT }}>{pack.creativeAngle}</p>}
              <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                {pack.tone       && <Tag label="Tone"    value={pack.tone} />}
                {pack.keyMessage && <Tag label="Message" value={pack.keyMessage} />}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone={pack.savedCount > 0 ? "butter" : "coral"}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: INK }} />
                  {pack.savedCount > 0
                    ? `${pack.items.length} post${pack.items.length > 1 ? "s" : ""} saved to your library`
                    : "Not saved — open Library to retry"}
                </Badge>
                {pack.brandLockScore > 0 && (
                  <Badge tone={pack.brandLockScore >= 80 ? "butter" : pack.brandLockScore >= 60 ? "warm" : "coral"}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: INK }} />
                    Brand lock · {pack.brandLockScore}%
                  </Badge>
                )}
                {paletteScore !== null && (
                  <Badge tone={paletteScore >= 80 ? "butter" : paletteScore >= 60 ? "warm" : "coral"}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: INK }} />
                    Palette · {paletteScore}%
                  </Badge>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {/* Primary CTA — schedule the whole pack onto the calendar
                    with AI-suggested times, then jump there. The user
                    can review/drag/deploy from /hub/calendar. */}
                <Button variant="accent" size="md" onClick={publishPackToCalendar} disabled={publishingPack}>
                  {publishingPack ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {publishingPack ? "Adding to calendar…" : "Publish your creations"}
                </Button>
                <Button variant="ghost" size="md" onClick={() => { setPack(null); setStage("idle"); setIdleView("input"); setPendingBrief(""); }}
                        style={{ border: `1px solid ${BORDER}` }}>
                  <Sparkles size={14} /> Surprise me again
                </Button>
                <Button variant="ghost" size="md" onClick={() => navigate("/hub/library")}
                        style={{ border: `1px solid ${BORDER}` }}>
                  <Package size={14} /> Open in Library
                </Button>
              </div>
            </motion.div>

            {/* Pack-level failure banner — surfaces silently-failed shots so
                the user knows they paid for N but received M < N, with a
                one-click re-run. The per-shot retry above the placeholder
                tile already exists, but users miss it when they scroll
                past the failed cards. This banner is unmissable. */}
            {(() => {
              const okCount = pack.items.filter((it) => it.status === "ok").length;
              const failedCount = pack.items.length - okCount;
              if (failedCount === 0) return null;
              const reasons = Array.from(new Set(
                pack.items.filter((it) => it.status === "failed" && !!it.error).map((it) => it.error as string)
              )).slice(0, 2);
              return (
                <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3 flex-wrap"
                     style={{ background: "#FFF5F0", border: "1px solid #FCA5A5", color: "#7C2D12" }}>
                  <div className="flex-1 min-w-[200px]">
                    <div className="text-[13px] font-semibold">
                      {okCount} of {pack.items.length} shots delivered — {failedCount} failed
                    </div>
                    {reasons.length > 0 && (
                      <div className="text-[11.5px] mt-1 opacity-80">
                        {reasons.join(" · ")}
                      </div>
                    )}
                  </div>
                  <Button variant="accent" size="sm" disabled={busy} onClick={() => handleSurprise()}>
                    <Sparkles size={12} /> Re-run pack
                  </Button>
                </div>
              );
            })()}

            {/* Per-platform sections */}
            {Object.keys(groupedByPlatform).map((platform) => {
              const items = groupedByPlatform[platform];
              const meta  = PLATFORM_META[platform] || { label: platform, emoji: "🎨" };
              return (
                <section key={platform}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <span className="text-[18px]">{meta.emoji}</span>
                    <h3 className="text-[18px]" style={{ fontWeight: 600 }}>{meta.label}</h3>
                    <span className="text-[12px]" style={{ color: MUTED }}>· {items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {/* Render units: a single item OR a carousel group rendered
                        as ONE swipeable tile. Carousels mirror Instagram's
                        actual UX (one card with horizontal snap scrolling +
                        dots) so the user understands at a glance "this is a
                        single post with 5 slides", not five separate creatives. */}
                    {(() => {
                      const sorted = [...items].sort((a, b) => {
                        const ag = a.carouselGroupId || "";
                        const bg = b.carouselGroupId || "";
                        if (ag !== bg) return ag.localeCompare(bg);
                        return (a.carouselSlideIndex ?? 0) - (b.carouselSlideIndex ?? 0);
                      });
                      const seenGroups = new Set<string>();
                      const units: Array<{ kind: "single"; item: PackItem } | { kind: "carousel"; groupId: string; slides: PackItem[] }> = [];
                      for (const it of sorted) {
                        if (it.carouselGroupId) {
                          if (seenGroups.has(it.carouselGroupId)) continue;
                          seenGroups.add(it.carouselGroupId);
                          units.push({
                            kind: "carousel",
                            groupId: it.carouselGroupId,
                            slides: sorted.filter(x => x.carouselGroupId === it.carouselGroupId),
                          });
                        } else {
                          units.push({ kind: "single", item: it });
                        }
                      }
                      return units.map((unit, unitIdx) => {
                        if (unit.kind === "carousel") {
                          return (
                            <CarouselTile
                              key={unit.groupId}
                              slides={unit.slides}
                              flatItems={flatItems}
                              setLightboxIndex={setLightboxIndex}
                              editedOverlays={editedOverlays}
                              setEditedOverlays={setEditedOverlays}
                              setPublishTarget={setPublishTarget}
                              navigate={navigate}
                            />
                          );
                        }
                        const it = unit.item;
                        const localIdx = unitIdx;
                        const globalIdx = flatItems.indexOf(it);
                        const ok = it.status === "ok";
                        const clickable = ok && (it.imageUrl || it.videoUrl);
                        const carouselTotal = 0;
                        const slideNum = 0;
                      return (
                      <div key={localIdx} className="rounded-2xl overflow-hidden relative group" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                        <div
                          role={clickable ? "button" : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onClick={() => clickable && setLightboxIndex(globalIdx)}
                          onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setLightboxIndex(globalIdx); } }}
                          className={clickable ? "cursor-zoom-in relative" : "relative"}
                          aria-label={clickable ? "Open in fullscreen" : undefined}
                        >
                          {ok && it.videoUrl ? (
                            <video
                              src={it.videoUrl}
                              poster={it.imageUrl}
                              className="w-full h-auto block"
                              style={{ aspectRatio: it.aspectRatio.replace(":", " / ") }}
                              autoPlay muted loop playsInline preload="metadata"
                            />
                          ) : ok && it.imageUrl ? (
                            <img src={it.imageUrl} alt={it.fileName} loading="lazy" decoding="async"
                                 className="w-full h-auto block" style={{ aspectRatio: it.aspectRatio.replace(":", " / ") }} />
                          ) : (
                            // Failed shot — show what went wrong + a clear
                            // retry CTA that re-runs the whole pack with the
                            // same brief. Server already retries each shot
                            // 2x internally; this button is for the user
                            // when budget-eviction or both retries failed.
                            <div className="w-full flex flex-col items-center justify-center gap-3 p-6 text-center"
                                 style={{ aspectRatio: it.aspectRatio.replace(":", " / "), background: "#FFF5F0" }}>
                              <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "#B91C1C" }}>
                                generation incomplete
                              </div>
                              <div className="text-[12px] leading-snug max-w-[260px]" style={{ color: "#7C2D12" }}>
                                {it.error?.slice(0, 140) || "This shot didn't make it. Tap retry to regenerate the pack."}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (busy) return;
                                  // Regenerate with the same brief that produced this pack.
                                  // Brief is in pack.creativeAngle or we just trigger handleSurprise() with no override.
                                  handleSurprise();
                                }}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-semibold transition disabled:opacity-50"
                                style={{ background: COLORS.coral, color: "#FFF" }}
                              >
                                <Sparkles size={12} /> Regenerate pack
                              </button>
                            </div>
                          )}
                          {/* V2 carousel: editable text overlay on top of the
                              clean photo. The user can click the text to edit
                              inline; edits live in editedOverlays state and
                              survive without regenerating the image. */}
                          {ok && it.carouselGroupId && (it.overlayText !== undefined) && (
                            <SlideOverlay
                              imageReady={!!it.imageUrl}
                              fileName={it.fileName}
                              text={editedOverlays[it.fileName] ?? it.overlayText ?? ""}
                              position={it.overlayPosition || "bottom"}
                              styleHint={it.overlayStyle || "value-prop"}
                              onChange={(next) => setEditedOverlays(prev => ({ ...prev, [it.fileName]: next }))}
                            />
                          )}
                          {clickable && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                 style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)" }}>
                              <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[11.5px] font-medium"
                                    style={{ background: "rgba(255,255,255,0.95)", color: TEXT, backdropFilter: "blur(8px)", letterSpacing: "0.02em" }}>
                                <Wand2 size={12} /> Click to enlarge
                              </span>
                            </div>
                          )}
                        </div>
                        {it.videoUrl && (
                          <div className="absolute top-2 right-2 px-2 h-6 rounded-full inline-flex items-center gap-1 text-[10.5px] font-mono"
                               style={{ background: PINK, color: "#fff" }}>
                            🎞 film
                          </div>
                        )}
                        {it.twistElement && (
                          <div className="absolute top-2 left-2 px-2 h-6 rounded-full inline-flex items-center gap-1 text-[10.5px] font-mono"
                               style={{ background: "rgba(255,255,255,0.9)", color: TEXT, backdropFilter: "blur(6px)", border: `1px solid rgba(255,255,255,0.4)` }}
                               title="Creative twist">
                            ✨ {it.twistElement}
                          </div>
                        )}
                        {it.carouselGroupId && carouselTotal > 0 && (
                          <div className="absolute bottom-2 left-2 px-2 h-6 rounded-full inline-flex items-center gap-1 text-[10.5px] font-mono tabular-nums"
                               style={{ background: PINK, color: "#fff" }}
                               title={`Carousel slide ${slideNum} of ${carouselTotal} — these slides ship together as one Instagram post`}>
                            🖼️ slide {slideNum}/{carouselTotal}
                          </div>
                        )}
                        {it.caption && (
                          <div className="px-3 pt-3 pb-1 text-[12.5px] leading-snug" style={{ color: TEXT }}>
                            {it.caption}
                            <button
                              onClick={() => { navigator.clipboard.writeText(it.caption!); toast.success("Caption copied"); }}
                              className="ml-1 text-[11px] hover:underline align-middle"
                              style={{ color: MUTED }}
                              aria-label="Copy caption"
                            >
                              copy
                            </button>
                          </div>
                        )}
                        <div className="px-3 py-2 flex items-center gap-1">
                          <span className="text-[11px] font-mono truncate flex-1 min-w-0" title={it.fileName} style={{ color: MUTED }}>
                            {it.fileName}
                          </span>
                          {it.status === "ok" && it.imageUrl && (
                            <>
                              <button
                                onClick={() => navigate("/hub/editor", { state: { assetUrl: it.imageUrl, assetType: "image", assetId: it.fileName } })}
                                className="shrink-0 w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center"
                                aria-label="Edit" title="Add logo, text…">
                                <Wand2 size={12} />
                              </button>
                              <button
                                onClick={() => downloadAsset(it.imageUrl!, it.fileName, "image")}
                                className="shrink-0 w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center"
                                aria-label="Download image" title="Download .jpg">
                                <Download size={12} />
                              </button>
                              {it.videoUrl && it.videoFileName && (
                                <button
                                  onClick={() => downloadAsset(it.videoUrl!, it.videoFileName!, "video")}
                                  className="shrink-0 h-7 px-2 rounded-full hover:bg-black/5 flex items-center justify-center gap-1 text-[10px] font-mono"
                                  aria-label="Download film" title="Download .mp4">
                                  <Download size={11} /> mp4
                                </button>
                              )}
                              <button
                                onClick={() => setPublishTarget({
                                  imageUrl: it.imageUrl,
                                  videoUrl: it.videoUrl,
                                  defaultCaption: it.caption || "",
                                })}
                                className="shrink-0 h-7 px-2 rounded-full flex items-center justify-center gap-1 text-[11px]"
                                style={{ background: COLORS.coral, color: "#fff", fontWeight: 600 }}
                                aria-label="Publish" title="Publish now or schedule on your networks">
                                <Send size={11} /> Publish
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    });
                    })()}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      )}

      {/* Publish / schedule modal — any asset with a Send button opens it */}
      <PublishModal
        asset={publishTarget || { defaultCaption: "" }}
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onPublished={(outcomes) => {
          const ok = outcomes.filter((o) => o.status === "published").length;
          const sched = outcomes.filter((o) => o.status === "scheduled").length;
          if (ok > 0)    toast.success(`Published to ${ok} network${ok > 1 ? "s" : ""}`);
          if (sched > 0) toast.success(`Scheduled on ${sched} network${sched > 1 ? "s" : ""}`);
        }}
      />

      {/* Out-of-credits modal — editorial, cream, not a red alert */}
      <AnimatePresence>
        {outOfCredits && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(17,17,17,0.4)", backdropFilter: "blur(8px)" }}
            onClick={() => setOutOfCredits(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[460px] w-full rounded-3xl p-8 md:p-10"
              style={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, boxShadow: "0 30px 80px -20px rgba(17,17,17,0.3)" }}
            >
              <Badge tone="coral">
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#FFFFFF" }} />
                You're out of posts
              </Badge>
              <h3 className="mt-5 leading-[0.95]" style={{ ...bagel, fontSize: "clamp(32px, 5vw, 48px)" }}>
                {outOfCredits.remaining === 0
                  ? <>That's it for this month.</>
                  : <>Almost.</>}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: COLORS.muted }}>
                {outOfCredits.remaining === 0
                  ? <>You've used all your posts. Bump your plan or wait — fresh posts come in next month.</>
                  : <>You've got {outOfCredits.remaining} left and this run needs {outOfCredits.required}. Drop the count below, or grab more.</>}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <Button variant="accent" size="md" onClick={() => { setOutOfCredits(null); navigate("/pricing"); }}>
                  See plans <ArrowRight size={14} />
                </Button>
                <Button variant="ghost" size="md" onClick={() => setOutOfCredits(null)}>
                  Not now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Lightbox — full-screen viewer for a single asset ═══
       *   Opens on click of any grid tile. ←/→ navigate, ESC closes
       *   (wired via keydown listener in the component). Ink backdrop +
       *   cream frame so the asset reads at max contrast. */}
      <AnimatePresence>
        {lightboxIndex !== null && flatItems[lightboxIndex] && (() => {
          const it = flatItems[lightboxIndex];
          const hasPrev = lightboxIndex > 0;
          const hasNext = lightboxIndex < flatItems.length - 1;
          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: "rgba(17,17,17,0.92)" }}
              onClick={() => setLightboxIndex(null)}
            >
              {/* Close */}
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
                className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center transition"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", backdropFilter: "blur(8px)" }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
              {/* Prev */}
              {hasPrev && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                  className="absolute left-5 md:left-10 w-12 h-12 rounded-full flex items-center justify-center transition hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.12)", color: "#fff", backdropFilter: "blur(8px)" }}
                  aria-label="Previous"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              {/* Next */}
              {hasNext && (
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                  className="absolute right-5 md:right-10 w-12 h-12 rounded-full flex items-center justify-center transition hover:scale-105"
                  style={{ background: "rgba(255,255,255,0.12)", color: "#fff", backdropFilter: "blur(8px)" }}
                  aria-label="Next"
                >
                  <ArrowRight size={18} />
                </button>
              )}
              {/* Asset frame */}
              <motion.div
                key={lightboxIndex}
                initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="flex flex-col items-center max-w-[90vw]"
                style={{ maxHeight: "90vh" }}
              >
                <div className="rounded-2xl overflow-hidden flex items-center justify-center" style={{ maxHeight: "76vh", background: "#000" }}>
                  {it.videoUrl ? (
                    <video
                      key={it.videoUrl}
                      src={it.videoUrl}
                      poster={it.imageUrl}
                      autoPlay muted loop playsInline controls
                      className="block"
                      style={{ maxHeight: "76vh", maxWidth: "90vw", objectFit: "contain" }}
                    />
                  ) : it.imageUrl ? (
                    <img
                      src={it.imageUrl} alt={it.fileName}
                      className="block"
                      style={{ maxHeight: "76vh", maxWidth: "90vw", objectFit: "contain" }}
                    />
                  ) : null}
                </div>
                {/* Meta + actions */}
                <div className="mt-4 flex items-center gap-2 text-[12px] flex-wrap justify-center" style={{ color: "rgba(255,255,255,0.7)" }}>
                  <span className="font-mono">{it.fileName}</span>
                  <span>·</span>
                  <span>{PLATFORM_META[it.platform]?.label || it.platform}</span>
                  <span>·</span>
                  <span>{it.aspectRatio}</span>
                  <span className="mx-2 opacity-40">|</span>
                  {it.imageUrl && (
                    <button
                      onClick={() => downloadAsset(it.imageUrl!, it.fileName, "image")}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full transition"
                      style={{ background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12 }}
                    >
                      <Download size={12} /> Image
                    </button>
                  )}
                  {it.videoUrl && it.videoFileName && (
                    <button
                      onClick={() => downloadAsset(it.videoUrl!, it.videoFileName!, "video")}
                      className="inline-flex items-center gap-1 h-8 px-3 rounded-full transition"
                      style={{ background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 12 }}
                    >
                      <Download size={12} /> Film
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setPublishTarget({
                        imageUrl: it.imageUrl,
                        videoUrl: it.videoUrl,
                        defaultCaption: it.caption || "",
                      });
                      setLightboxIndex(null);
                    }}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-full transition"
                    style={{ background: COLORS.coral, color: "#fff", fontSize: 12, fontWeight: 600 }}
                  >
                    <Send size={11} /> Publish
                  </button>
                </div>
                {it.caption && (
                  <p className="mt-3 text-center text-[13px] max-w-[640px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {it.caption}
                  </p>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

/* ─── GenerationProgress — multi-step status while the pack is being
 *   generated. When a `requestId` is provided we poll the backend's
 *   progress KV (/analyze/surprise-me-progress) every 2 s and drive the
 *   UI from the real phase + fraction the server writes at each major
 *   step. When no requestId is available (or the first poll hasn't
 *   landed yet) we fall back to the time-windowed approximation below
 *   so the bar still moves. */
function GenerationProgress({ stage, mediaType, assetCount, requestId, accessToken }: {
  stage: "concept" | "generating";
  mediaType: string;
  assetCount: number;
  requestId?: string | null;
  accessToken?: string | null;
}) {
  // Total expected runtime in seconds. Films add ~45s per asset since
  // they queue after the still. Image-only is much faster.
  const estTotal = mediaType === "film"
    ? 30 + assetCount * 45
    : 30 + assetCount * 8;

  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const tick = () => setElapsedSec(Math.floor((Date.now() - t0) / 1000));
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  // ── Real backend progress (KV-polled) ────────────────────────────
  // Polls /analyze/surprise-me-progress every 2 s while the request is
  // live. The backend writes a row at every major phase boundary
  // (starting / concept / concept_done / stills_started / stills /
  // stills_done / films_started / films_done / persisting / done) and
  // we use phase + fraction to drive the bar honestly.
  const [serverProgress, setServerProgress] = useState<
    | { phase: string; fraction: number; detail: string }
    | null
  >(null);
  useEffect(() => {
    if (!requestId || !accessToken) { setServerProgress(null); return; }
    let cancelled = false;
    const poll = async () => {
      try {
        // POST variant — JWT goes in the body, not the URL. The GET
        // variant put the token in the query string, which crossed
        // browser / proxy URL-length limits (~2-4 KB) once Supabase
        // started issuing ES256 tokens with bloated user_metadata, and
        // every poll fired ERR_FAILED for the duration of the run.
        // Content-Type: text/plain keeps the request CORS-safe.
        const r = await fetch(`${API_BASE}/analyze/surprise-me-progress`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "text/plain",
          },
          body: JSON.stringify({ _token: accessToken, id: requestId }),
        });
        if (!r.ok) return;
        const j = await r.json().catch(() => null);
        if (!cancelled && j?.success && j.progress) {
          setServerProgress({
            phase: String(j.progress.phase || ""),
            fraction: Number(j.progress.fraction || 0),
            detail: String(j.progress.detail || ""),
          });
        }
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 2_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [requestId, accessToken]);

  // Calibrated phases — each maps to a window of elapsed time and a
  // visible status line. The percentages are calibrated against actual
  // observed runtimes (concept ~30s, stills ~30s, captions ~5s, films
  // ~45s/clip). Not exact but feels right. Used as a fallback when
  // serverProgress hasn't arrived yet.
  type Phase = { upTo: number; emoji: string; label: string };
  const phases: Phase[] = mediaType === "film" ? [
    { upTo: 0.10, emoji: "🧠", label: "Reading your brand & product…" },
    { upTo: 0.25, emoji: "✏️", label: "Writing the campaign concept…" },
    { upTo: 0.55, emoji: "📷", label: `Shooting ${assetCount} stills (different scenes, locked product)…` },
    { upTo: 0.65, emoji: "✍️", label: "Writing platform-tuned captions…" },
    { upTo: 0.95, emoji: "🎬", label: "Animating films (Kling 2.5 Pro)…" },
    { upTo: 1.00, emoji: "📦", label: "Packing for Library…" },
  ] : [
    { upTo: 0.20, emoji: "🧠", label: "Reading your brand & product…" },
    { upTo: 0.40, emoji: "✏️", label: "Writing the campaign concept…" },
    { upTo: 0.85, emoji: "📷", label: `Shooting ${assetCount} stills (different scenes, locked product)…` },
    { upTo: 0.95, emoji: "✍️", label: "Writing platform-tuned captions…" },
    { upTo: 1.00, emoji: "📦", label: "Packing for Library…" },
  ];

  // Map a backend phase to a human-readable label + emoji. Falls back
  // to the time-windowed phase when serverProgress is null.
  const phaseLabel = (phase: string, detail: string): { emoji: string; label: string } => {
    switch (phase) {
      case "starting":       return { emoji: "🧠", label: detail || "Reading your brand & product…" };
      case "concept":        return { emoji: "✏️", label: detail || "Writing the campaign concept…" };
      case "concept_done":   return { emoji: "✏️", label: detail || "Concept ready" };
      case "stills_started": return { emoji: "📷", label: detail || `Shooting ${assetCount} stills (different scenes, locked product)…` };
      case "stills":         return { emoji: "📷", label: detail || `Shooting ${assetCount} stills…` };
      case "stills_done":    return { emoji: "📷", label: detail || "Stills ready" };
      case "films_started":  return { emoji: "🎬", label: detail || "Animating films (Kling 2.5 Pro)…" };
      case "films_done":     return { emoji: "🎬", label: detail || "Films ready" };
      case "persisting":     return { emoji: "📦", label: detail || "Packing for Library…" };
      case "done":           return { emoji: "✅", label: detail || "Pack ready" };
      default:               return { emoji: "🧠", label: detail || "Working…" };
    }
  };

  // Prefer real server progress when available; otherwise use the
  // time-windowed approximation. The UI never goes backwards: if the
  // local approximation has already passed the server fraction (e.g.
  // a stale poll result), we keep the higher of the two.
  const fallbackFraction = Math.min(0.97, elapsedSec / Math.max(1, estTotal));
  const fallbackPhase = phases.find((p) => fallbackFraction <= p.upTo) || phases[phases.length - 1];
  const progressFraction = serverProgress
    ? Math.max(serverProgress.fraction, fallbackFraction * 0.85)
    : fallbackFraction;
  const currentPhase = serverProgress
    ? phaseLabel(serverProgress.phase, serverProgress.detail)
    : { emoji: fallbackPhase.emoji, label: fallbackPhase.label };
  const remainingSec = Math.max(0, estTotal - elapsedSec);

  return (
    <main className="flex-1 flex items-center justify-center px-5 md:px-10 py-12">
      <div className="w-full max-w-[760px]">
        {/* Status line — animated emoji + cycling label */}
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            key={currentPhase.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 text-[15px] md:text-[17px] font-semibold"
            style={{ color: TEXT }}
          >
            <span className="text-[20px]">{currentPhase.emoji}</span>
            <span>{currentPhase.label}</span>
          </motion.div>
          <div className="mt-2 text-[12px] font-mono tabular-nums" style={{ color: MUTED }}>
            {elapsedSec}s / ~{estTotal}s · {remainingSec}s remaining
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden mb-8" style={{ background: "rgba(17,17,17,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: COLORS.coral }}
            initial={{ width: 0 }}
            animate={{ width: `${progressFraction * 100}%` }}
            transition={{ duration: 0.5, ease: "linear" }}
          />
        </div>

        {/* Polaroid placeholders with shimmer effect */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: Math.min(9, Math.max(6, assetCount)) }).map((_, i) => (
            <motion.div
              key={i}
              className="rounded-2xl overflow-hidden relative"
              style={{ aspectRatio: "1 / 1", background: "linear-gradient(135deg, #EFEFF1, #F7F7F9)" }}
              initial={{ opacity: 0.35, scale: 0.96 }}
              animate={{ opacity: [0.35, 0.85, 0.35] }}
              transition={{ duration: 1.6 + (i % 3) * 0.3, repeat: Infinity, delay: i * 0.15 }}
            >
              {/* Shimmer pass */}
              <motion.div
                className="absolute inset-0"
                style={{ background: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.9) 50%, transparent 70%)" }}
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.18, ease: "linear" }}
              />
            </motion.div>
          ))}
        </div>

        {/* Footer note — what's locked */}
        <div className="mt-8 text-center text-[12px]" style={{ color: MUTED }}>
          Brand DA locked · Product fidelity guaranteed · {mediaType === "film" ? `${assetCount} images + ${Math.ceil(assetCount / 2)} films` : `${assetCount} platform-tuned posts`}
        </div>
      </div>
    </main>
  );
}

/* ─── Inline fill-in-the-blank field that blends with the sentence ─── */
function InlineField({ value, onChange, placeholder, widthCh }: {
  value: string; onChange: (v: string) => void; placeholder: string; widthCh: number;
}) {
  const display = value || placeholder;
  const highlight = value ? PINK : "rgba(10,10,10,0.25)";
  return (
    <span className="relative inline-block align-baseline">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent outline-none transition"
        style={{
          borderBottom: `6px solid ${highlight}`,
          color: value ? INK : "rgba(10,10,10,0.45)",
          fontFamily: DISPLAY,
          fontSize: "inherit",
          lineHeight: "inherit",
          letterSpacing: "inherit",
          width: `${Math.max(widthCh, display.length + 1)}ch`,
          minWidth: "6ch",
          padding: "0 4px",
        }}
      />
    </span>
  );
}

/* ─── Fine-tune block label ─── */
function TuneBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11.5px] uppercase tracking-[0.15em] mb-2" style={{ color: MUTED, fontWeight: 600 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

/* ─── Small tag for tone/message ─── */
function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="px-2.5 h-7 rounded-full inline-flex items-center" style={{ background: "#F3F4F6", color: MUTED }}>
      {label}: <b className="ml-1" style={{ color: TEXT }}>{value}</b>
    </span>
  );
}

/**
 * CarouselTile — render a carousel group as ONE Instagram-style swipeable card.
 *
 * Mirrors how Instagram actually shows carousels: one card with horizontal
 * scroll-snap + dots indicator + a single caption + one set of actions for
 * the whole post. Replaces the prior approach of rendering each slide as
 * a separate adjacent tile, which made carousels read as "five separate
 * creatives" instead of one multi-slide post.
 *
 * Each slide inside the carousel still carries its editable text overlay
 * (from V2). The Publish button currently publishes slide 1 only — full
 * multi-asset publish to Post for Me is the next phase (PublishModal
 * needs to accept asset arrays).
 */
function CarouselTile({
  slides, flatItems, setLightboxIndex, editedOverlays, setEditedOverlays, setPublishTarget, navigate,
}: {
  slides: PackItem[];
  flatItems: PackItem[];
  setLightboxIndex: (idx: number) => void;
  editedOverlays: Record<string, string>;
  setEditedOverlays: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPublishTarget: (t: any) => void;
  navigate: (path: string, opts?: any) => void;
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Track which slide is centered in the scroll-snap container. Updates
  // the dots indicator + the active slide pointer for the action buttons.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      if (idx !== activeSlide && idx >= 0 && idx < slides.length) setActiveSlide(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [activeSlide, slides.length]);

  const goToSlide = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };

  const total = slides.length;
  const ratio = slides[0]?.aspectRatio || "1:1";
  const captionItem = slides[0]; // caption only on slide 0
  const currentSlide = slides[activeSlide];
  const allReady = slides.every(s => s.status === "ok" && s.imageUrl);

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
      {/* Slides scroller — horizontal scroll-snap, mobile-native swipe */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
          style={{ scrollBehavior: "smooth", scrollSnapType: "x mandatory" }}
        >
          {slides.map((s, idx) => {
            const ok = s.status === "ok";
            const globalIdx = flatItems.indexOf(s);
            return (
              <div key={s.fileName} className="shrink-0 w-full snap-center relative" style={{ scrollSnapAlign: "center" }}>
                {ok && s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt={s.fileName}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto block cursor-zoom-in"
                    style={{ aspectRatio: ratio.replace(":", " / ") }}
                    onClick={() => setLightboxIndex(globalIdx)}
                  />
                ) : (
                  <div className="w-full flex items-center justify-center"
                    style={{ aspectRatio: ratio.replace(":", " / "), background: "#FFF5F0" }}>
                    <div className="text-[11px] font-mono uppercase tracking-wider px-3 text-center" style={{ color: "#B91C1C" }}>
                      slide {idx + 1} failed — {(s.error || "no image").slice(0, 60)}
                    </div>
                  </div>
                )}
                {/* Editable overlay text per slide */}
                {ok && s.overlayText !== undefined && (
                  <SlideOverlay
                    imageReady={!!s.imageUrl}
                    fileName={s.fileName}
                    text={editedOverlays[s.fileName] ?? s.overlayText ?? ""}
                    position={s.overlayPosition || "bottom"}
                    styleHint={s.overlayStyle || "value-prop"}
                    onChange={(next) => setEditedOverlays(prev => ({ ...prev, [s.fileName]: next }))}
                  />
                )}
                {/* Slide counter top-right */}
                <div className="absolute top-2 right-2 px-2 h-6 rounded-full inline-flex items-center text-[10.5px] font-mono tabular-nums"
                  style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(6px)" }}>
                  {idx + 1}/{total}
                </div>
              </div>
            );
          })}
        </div>

        {/* Nav arrows (desktop) — hidden on mobile where swipe is native */}
        {activeSlide > 0 && (
          <button
            onClick={() => goToSlide(activeSlide - 1)}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.92)", color: TEXT, backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {activeSlide < total - 1 && (
          <button
            onClick={() => goToSlide(activeSlide + 1)}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full items-center justify-center cursor-pointer"
            style={{ background: "rgba(255,255,255,0.92)", color: TEXT, backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            aria-label="Next slide"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Dots indicator — Instagram-native pattern */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: idx === activeSlide ? "#fff" : "rgba(255,255,255,0.45)",
                width: idx === activeSlide ? 14 : 6,
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Caption (single, from slide 0) */}
      {captionItem?.caption && (
        <div className="px-3 pt-3 pb-1 text-[12.5px] leading-snug" style={{ color: TEXT }}>
          {captionItem.caption}
          <button
            onClick={() => { navigator.clipboard.writeText(captionItem.caption!); toast.success("Caption copied"); }}
            className="ml-1 text-[11px] hover:underline align-middle"
            style={{ color: MUTED }}
            aria-label="Copy caption"
          >
            copy
          </button>
        </div>
      )}

      {/* Actions row — applies to the carousel as a whole */}
      <div className="px-3 py-2 flex items-center gap-1 flex-wrap">
        <span className="text-[11px] font-mono flex-1 min-w-0" style={{ color: MUTED }}>
          🖼️ Carousel · {total} slides
        </span>
        {allReady && (
          <>
            <button
              onClick={() => {
                // Download every slide as a separate file (sequenced so the
                // browser's download manager doesn't block batch downloads).
                slides.forEach((s, idx) => {
                  if (s.imageUrl) setTimeout(() => downloadAsset(s.imageUrl!, s.fileName, "image"), idx * 250);
                });
                toast.success(`Downloading ${total} slides...`);
              }}
              className="shrink-0 h-7 px-2.5 rounded-full hover:bg-black/5 flex items-center justify-center gap-1 text-[11px]"
              aria-label="Download all slides" title="Download all slides as separate JPGs">
              <Download size={11} /> All
            </button>
            <button
              onClick={() => {
                if (!currentSlide?.imageUrl) return;
                // Currently publishes the active slide only — full carousel
                // publish to Post for Me requires PublishModal to accept
                // asset arrays. Tracked separately.
                setPublishTarget({
                  imageUrl: currentSlide.imageUrl,
                  videoUrl: currentSlide.videoUrl,
                  defaultCaption: captionItem?.caption || "",
                });
                toast.info(`Publishing slide ${activeSlide + 1} only — multi-slide publish coming soon`);
              }}
              className="shrink-0 h-7 px-2.5 rounded-full flex items-center justify-center gap-1 text-[11px]"
              style={{ background: COLORS.coral, color: "#fff", fontWeight: 600 }}
              aria-label="Publish active slide" title="Publish the active slide (multi-slide publish coming soon)">
              <Send size={11} /> Publish
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * SlideOverlay — V2 inline-editable text overlay for carousel slides.
 *
 * Renders the LLM-generated overlayText (or the user's edit) on top of
 * the clean slide image. Click the text to edit inline; blur saves to
 * parent state. Typography is driven by `styleHint`:
 *   headline  → big bold display font (slide 1 hook)
 *   value-prop → medium weight (slides 2..N-1)
 *   cta        → bold uppercase, accent color (last slide)
 *   caption    → smaller muted text
 *
 * Position comes from `position`: top|center|bottom (with flex anchors).
 * The overlay sits OVER the image with a soft gradient backdrop for
 * legibility regardless of the photo's contrast.
 */
function SlideOverlay({
  imageReady, fileName, text, position, styleHint, onChange,
}: {
  imageReady: boolean;
  fileName: string;
  text: string;
  position: "top" | "center" | "bottom";
  styleHint: "headline" | "value-prop" | "cta" | "caption";
  onChange: (next: string) => void;
}) {
  if (!imageReady) return null;
  const positionClass =
    position === "top"    ? "items-start pt-[8%]"
    : position === "center" ? "items-center"
    : "items-end pb-[8%]";
  const gradient =
    position === "top"    ? "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 60%)"
    : position === "center" ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)"
    : "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 60%)";
  const styleProps =
    styleHint === "headline"
      ? { fontSize: "clamp(20px, 4vw, 36px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.01em", textTransform: "none" as const }
    : styleHint === "cta"
      ? { fontSize: "clamp(15px, 2.6vw, 22px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "0.04em", textTransform: "uppercase" as const }
    : styleHint === "caption"
      ? { fontSize: "clamp(11px, 1.6vw, 14px)", fontWeight: 500, lineHeight: 1.3, letterSpacing: "0", textTransform: "none" as const }
    /* value-prop */
      : { fontSize: "clamp(15px, 2.4vw, 22px)", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.005em", textTransform: "none" as const };
  return (
    <div
      className={`absolute inset-0 flex justify-center px-[6%] pointer-events-none ${positionClass}`}
      style={{ background: text ? gradient : "transparent" }}
    >
      <div
        contentEditable
        suppressContentEditableWarning
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => onChange(e.currentTarget.textContent || "")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
        }}
        className="pointer-events-auto cursor-text outline-none rounded-md px-3 py-1.5 text-center transition-colors hover:bg-white/5 focus:bg-white/10 max-w-[88%]"
        style={{
          color: "#FFFFFF",
          textShadow: "0 2px 12px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)",
          fontFamily: styleHint === "headline" ? `"Bagel Fat One", "Inter", sans-serif` : `"Inter", sans-serif`,
          ...styleProps,
        }}
        title="Click to edit text"
        data-slide={fileName}
      >
        {text || "Tap to add text"}
      </div>
    </div>
  );
}

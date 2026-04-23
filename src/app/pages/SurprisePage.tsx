import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, Download, Package, Upload, Wand2, ChevronDown, Paperclip, X, ArrowRight, ArrowLeft, Send } from "lucide-react";
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
  { id: "instagram-feed",  label: "Instagram Feed",  emoji: "📸" },
  { id: "instagram-story", label: "Instagram Story", emoji: "🎬" },
  { id: "linkedin",        label: "LinkedIn",        emoji: "💼" },
  { id: "facebook",        label: "Facebook",        emoji: "👥" },
  { id: "tiktok",          label: "TikTok",          emoji: "🎵" },
];

/** Default format suggested per platform — matches the server's PLATFORM_FORMAT.
 *  The user can flip any selected platform's format by tapping the inline icon. */
const DEFAULT_PLATFORM_FORMAT: Record<string, "image" | "film"> = {
  "instagram-feed":  "image",
  "instagram-story": "film",
  "linkedin":        "image",
  "facebook":        "image",
  "tiktok":          "film",
};

const PLATFORM_META: Record<string, { label: string; emoji: string }> = Object.fromEntries(
  PLATFORM_OPTIONS.map((p) => [p.id, { label: p.label, emoji: p.emoji }]),
);

interface PackItem {
  platform: string; aspectRatio: string; label: string; fileName: string;
  videoFileName?: string; motion?: string;
  twistElement?: string; caption?: string;
  status: "ok" | "failed"; imageUrl?: string; videoUrl?: string;
  error?: string; provider?: string; videoProvider?: string;
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
  const { getAuthHeader, can, remainingCredits, refreshProfile } = useAuth();
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
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
  // Product-first inputs — the new default flow is "upload your product,
  // we propose brand-compliant angles." Photo is required; description and
  // price are optional and get forwarded to the caption generator.
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  // idle sub-view: "input" = product form, "angles" = the 3 suggestions
  // we show after the user clicks "Propose angles". Custom-brief mode is
  // a separate flag below that short-circuits straight to generation.
  const [idleView, setIdleView] = useState<"input" | "angles">("input");

  // UI state
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "concept" | "generating" | "done">("idle");
  const [pack, setPack] = useState<Pack | null>(null);
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const [publishTarget, setPublishTarget] = useState<PublishableAsset | null>(null);
  const [outOfCredits, setOutOfCredits] = useState<{ remaining: number; required: number } | null>(null);
  // Lightbox — full-screen viewer for the result pack. Null = closed.
  // Navigates across the whole pack in display order (platform-grouped).
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
    let cancelled = false;
    (async () => {
      try {
        const token = getAuthHeader();
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
          productImageUrl: productPhoto || undefined,
          productDescription: productDescription.trim() || undefined,
          productPrice: productPrice.trim() || undefined,
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
  }, [anglesLoading, getAuthHeader, productPhoto, productDescription, productPrice]);

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
      const res = await serverPost("/analyze/reverse-prompt", { imageBase64: b64.base64, mimeType: b64.mimeType }, 60_000);
      if (res?.success && res.sourceUrl) {
        setProductPhoto(res.sourceUrl);
        toast.success("Visual ready");
      } else {
        toast.error(res?.error || "Upload failed");
      }
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setUploadingProduct(false);
    }
  }, [serverPost]);

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
    try {
      await new Promise((r) => setTimeout(r, 500));
      setStage("generating");
      const effPlatforms = override?.platforms ?? platforms;
      const effFormats = override?.platformFormats
        ?? Object.fromEntries(platformPicks.map((p) => [p.id, p.format]));
      const effCreativity = override?.creativity ?? creativity;
      const effAssetCount = override?.assetCount ?? assetCount;
      const res = await serverPost("/analyze/surprise-me", {
        productImageUrl: productPhoto || undefined,
        productDescription: productDescription.trim() || undefined,
        productPrice: productPrice.trim() || undefined,
        creativityLevel: effCreativity,
        assetCount: effAssetCount,
        platforms: effPlatforms,
        platformFormats: effFormats,
        mediaType,
        videoDuration,
        withCaption,
        brief: override?.brief || undefined,
        context: override?.brief ? undefined : {
          who: who.trim() || undefined,
          what: what.trim() || undefined,
          why: ctxWhy.trim() || undefined,
        },
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
    }
  }, [busy, productPhoto, productDescription, productPrice, creativity, assetCount, platformPicks, mediaType, videoDuration, withCaption, what, who, ctxWhy, serverPost, refreshProfile]);

  // Display expansion: when a shot has BOTH an image and a film (the
  // "Images + Films" mode), render them as TWO cards — one for the image,
  // one for the motion version — so the user sees both in the grid. The
  // original pack.items stays intact for the ZIP / library save.
  const groupedByPlatform: Record<string, PackItem[]> = {};
  if (pack) {
    for (const it of pack.items) {
      const hasImage = it.status === "ok" && !!it.imageUrl;
      const hasVideo = it.status === "ok" && !!it.videoUrl;
      const bucket = (groupedByPlatform[it.platform] ||= []);
      if (hasImage && hasVideo) {
        bucket.push({ ...it, videoUrl: undefined, videoFileName: undefined });
        bucket.push({ ...it, imageUrl: undefined });
      } else {
        bucket.push(it);
      }
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
                  <button onClick={() => setProductPhoto(null)} className="ml-1 text-black/40 hover:text-black"><X size={14} /></button>
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
                    {on && (
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

                    <TuneBlock label={`Assets · ${assetCount}`}>
                      <input type="range" min={1} max={16} value={assetCount}
                             onChange={(e) => setAssetCount(parseInt(e.target.value, 10))}
                             className="w-full" style={{ accentColor: INK }} />
                    </TuneBlock>

                    {/* Film duration applies to any platform that gets motion (IG Story, TikTok, …) */}
                    <TuneBlock label="Film duration">
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

                    <TuneBlock label="Caption with each asset">
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
                        onClick={() => handleSurprise({
                          // Angle card only contributes the creative brief —
                          // platforms / creativity / assetCount stay whatever
                          // the user set in the product input form. (Prior
                          // version passed all four from the angle, which
                          // silently overrode the slider: asking for 2 assets
                          // would surface 6-8 because that's what the LLM
                          // returned per angle.)
                          brief: a.brief,
                        })}
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
                          <span>{assetCount} asset{assetCount === 1 ? "" : "s"}</span>
                          <span>·</span>
                          <span>{platforms.length} network{platforms.length === 1 ? "" : "s"}</span>
                          <span>·</span>
                          <span>level {creativity}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
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
                  Your product · your moment
                </div>
                <h1 className="leading-[0.98] mb-8" style={{ ...bagel, fontSize: "clamp(40px, 7vw, 88px)" }}>
                  Drop the photo.<br />
                  <span style={{ color: COLORS.coral }}>We compose the rest.</span>
                </h1>

                {/* 1. Product photo — mandatory */}
                {productPhoto ? (
                  <div className="mb-6 flex items-start gap-4 p-4 rounded-2xl" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                    <img src={productPhoto} alt="" className="w-24 h-24 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: TEXT }}>Product photo locked</div>
                        <p className="text-[12px]" style={{ color: MUTED }}>Ora will build every asset on top of this shot.</p>
                      </div>
                      <button onClick={() => setProductPhoto(null)} className="text-[12.5px] hover:text-black transition inline-flex items-center gap-1" style={{ color: MUTED }}>
                        <X size={14} /> Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="mb-6 flex flex-col items-center justify-center gap-2 py-12 rounded-2xl cursor-pointer transition hover:bg-black/[0.02]"
                         style={{ background: "#fff", border: `2px dashed ${BORDER}` }}>
                    {uploadingProduct ? <Loader2 size={22} className="animate-spin" style={{ color: COLORS.coral }} /> : <Paperclip size={22} style={{ color: COLORS.coral }} />}
                    <span className="text-[15px] font-semibold" style={{ color: TEXT }}>
                      {uploadingProduct ? "Uploading…" : "Drop your product photo"}
                    </span>
                    <span className="text-[12px]" style={{ color: MUTED }}>PNG, JPG, WebP · required</span>
                    <input type="file" accept="image/*" className="hidden"
                           onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProductPhoto(f); e.target.value = ""; }} />
                  </label>
                )}

                {/* 2. What is it? + price
                    Required single line (not a textarea — textareas read as
                    "write me a prompt"). The photo tells Ora WHAT shape +
                    colour; this line tells us WHICH product specifically
                    ("linen polo, relaxed fit, cream" vs "structured poplin
                    shirt, cream"). Without it the angles default to generic
                    fashion tropes. Price stays optional and feeds the
                    caption only. */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 mb-6">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.2em] mb-1.5" style={{ color: MUTED }}>
                      What is it?
                    </label>
                    <input
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="Linen polo · relaxed fit · cream"
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
                        {on && (
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
                    <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: MUTED }}>Assets · {assetCount}</div>
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
                          {anglesLoading ? "Reading brand + product…" : "Propose me angles"}
                          <ArrowRight size={16} />
                        </Button>
                        {noPhoto && (
                          <p className="text-[12.5px]" style={{ color: MUTED }}>
                            Upload a product photo to continue.
                          </p>
                        )}
                        {!noPhoto && noDesc && (
                          <p className="text-[12.5px]" style={{ color: MUTED }}>
                            One line of "what is it?" — helps Ora stay specific.
                          </p>
                        )}
                        {!noPhoto && !noDesc && noPlatform && (
                          <p className="text-[12.5px]" style={{ color: MUTED }}>
                            Pick at least one network.
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

      {/* Generating — polaroid-style placeholders filling in */}
      {(stage === "concept" || stage === "generating") && (
        <main className="flex-1 flex items-center justify-center px-5 md:px-10 py-12">
          <div className="w-full max-w-[760px] text-center">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
              className="mb-10"
            >
              <div className="inline-flex items-center gap-2 text-[13px]" style={{ color: ACCENT, fontWeight: 600 }}>
                <Loader2 size={14} className="animate-spin" />
                {stage === "concept" ? "Writing the concept…" : "Shooting the pack…"}
              </div>
            </motion.div>

            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: Math.min(9, Math.max(6, assetCount)) }).map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-2xl overflow-hidden"
                  style={{ aspectRatio: "1 / 1", background: "linear-gradient(135deg, #EFEFF1, #F7F7F9)" }}
                  initial={{ opacity: 0.35, scale: 0.96 }}
                  animate={{ opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: 1.6 + (i % 3) * 0.3, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
            </div>

            <div className="mt-10 text-[12.5px]" style={{ color: MUTED }}>
              {mediaType === "film"
                ? `~${Math.ceil(30 + assetCount * 45)}s total · ${assetCount} images + ${assetCount} films in parallel · brand DA locked`
                : `30 to 90 seconds · ${assetCount} assets in parallel · brand DA locked`}
            </div>
          </div>
        </main>
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
                    ? `${pack.savedCount} item${pack.savedCount > 1 ? "s" : ""} saved to your library`
                    : "Not saved — open Library to retry"}
                </Badge>
                {pack.brandLockScore > 0 && (
                  <Badge tone={pack.brandLockScore >= 80 ? "butter" : pack.brandLockScore >= 60 ? "warm" : "coral"}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: INK }} />
                    Brand lock · {pack.brandLockScore}%
                  </Badge>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="ink" size="md" onClick={() => navigate("/hub/library")}>
                  <Package size={14} /> Open in Library
                </Button>
                <Button variant="ghost" size="md" onClick={() => { setPack(null); setStage("idle"); }}
                        style={{ border: `1px solid ${BORDER}` }}>
                  <Sparkles size={14} /> Surprise me again
                </Button>
              </div>
            </motion.div>

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
                    {items.map((it, localIdx) => {
                      const globalIdx = flatItems.indexOf(it);
                      const ok = it.status === "ok";
                      const clickable = ok && (it.imageUrl || it.videoUrl);
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
                            <div className="w-full flex items-center justify-center p-6 text-[12px] text-center"
                                 style={{ aspectRatio: it.aspectRatio.replace(":", " / "), color: "#B91C1C" }}>
                              {it.error?.slice(0, 100) || "failed"}
                            </div>
                          )}
                          {clickable && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                    })}
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
                Out of credits
              </Badge>
              <h3 className="mt-5 leading-[0.95]" style={{ ...bagel, fontSize: "clamp(32px, 5vw, 48px)" }}>
                {outOfCredits.remaining === 0
                  ? <>That's the last shot for this month.</>
                  : <>Almost.</>}
              </h3>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: COLORS.muted }}>
                {outOfCredits.remaining === 0
                  ? <>You're at zero. Upgrade your plan or wait until next month — your credits refresh automatically.</>
                  : <>You've got {outOfCredits.remaining} left and this run needs {outOfCredits.required}. Drop the asset count, or unlock more below.</>}
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

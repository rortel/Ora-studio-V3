import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import {
  X, Send, Clock, Loader2, CheckCircle2, AlertCircle,
  Instagram, Linkedin, Facebook, Twitter, Youtube, Plus, ExternalLink,
  Sparkles, PenLine, Crop,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";

/**
 * PublishModal — shared publish flow for ComparePage, LibraryPage, EditorPage.
 *
 * Flow:
 *   1. Select networks (multi-select)
 *   2. Choose caption mode: "write myself" (shared caption) OR "AI per platform"
 *      → if AI: call /publish/generate-captions to get a calibrated caption per network
 *   3. Choose "Auto-format per network" (images only) → before deploy, call /editor/reframe
 *      for each selected platform using the network's native ratio
 *   4. Publish or schedule via /campaign/deploy
 */

export interface PublishableAsset {
  imageUrl?: string;
  videoUrl?: string;
  defaultCaption?: string;
  libraryItemId?: string;
}

interface PublishModalProps {
  asset: PublishableAsset;
  open: boolean;
  onClose: () => void;
  onPublished?: (result: { platform: string; status: string; url?: string }[]) => void;
}

// ORA platform labels → backend /campaign/deploy expects these exact strings
const PLATFORMS = [
  { id: "Instagram", label: "Instagram", icon: Instagram },
  { id: "LinkedIn",  label: "LinkedIn",  icon: Linkedin  },
  { id: "Facebook",  label: "Facebook",  icon: Facebook  },
  { id: "Twitter/X", label: "X / Twitter", icon: Twitter },
  { id: "TikTok",    label: "TikTok",    icon: Youtube   },
  { id: "YouTube",   label: "YouTube",   icon: Youtube   },
] as const;

const PLATFORM_BY_SLUG: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  twitter: "Twitter/X",
  tiktok: "TikTok",
  youtube: "YouTube",
};

// Native ratio per platform — used by /editor/reframe
const PLATFORM_RATIO: Record<string, string> = {
  Instagram: "4:5",   // feed portrait
  LinkedIn:  "16:9",
  Facebook:  "16:9",
  "Twitter/X": "16:9",
  TikTok:    "9:16",
  YouTube:   "16:9",
};

interface SocialAccount {
  _id: string;
  platform: string;
  status: string;
  name?: string;
  username?: string;
  profileImageUrl?: string;
}

type CaptionMode = "self" | "ai";

interface PerPlatformState {
  caption: string;
  hashtags: string;
  reframedUrl?: string; // filled by auto-reframe
}

export function PublishModal({ asset, open, onClose, onPublished }: PublishModalProps) {
  // Auth context exposes accessToken directly (not a `session` wrapper) —
  // the previous `const { session } = useAuth()` was a long-standing bug
  // that always returned undefined, so getAuthHeader returned null,
  // the social-accounts list call got a null _token, requireAuth threw
  // Unauthorized, and every publish attempt failed silently. Same fix
  // landed in LibraryPicker + StudioPage in the same PR.
  const { accessToken } = useAuth();
  const { locale } = useI18n();
  const isFr = locale === "fr";

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [captionMode, setCaptionMode] = useState<CaptionMode>("self");
  const [sharedCaption, setSharedCaption] = useState(asset.defaultCaption || "");
  const [sharedHashtags, setSharedHashtags] = useState("");
  const [perPlatform, setPerPlatform] = useState<Record<string, PerPlatformState>>({});
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [autoReframe, setAutoReframe] = useState<boolean>(!!asset.imageUrl);
  const [reframing, setReframing] = useState<string | null>(null); // current platform being reframed
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<{ platform: string; status: string; url?: string; error?: string }[]>([]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const getAuthHeader = useCallback(() => accessToken || null, [accessToken]);

  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 30_000) => {
    const token = getAuthHeader();
    try {
      const r = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ ...body, _token: token }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { success: false, error: `Server error (${r.status})` }; }
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error" };
    }
  }, [getAuthHeader]);

  const refreshAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    // /pfm/accounts/list — Post for Me backend (PR #111). Filters
    // server-side by external_id=user.id, so no cross-tenant leak
    // possible by construction.
    const res = await serverPost("/pfm/accounts/list", {});
    if (res?.success && Array.isArray(res.accounts)) {
      setAccounts(res.accounts);
    }
    setLoadingAccounts(false);
  }, [serverPost]);

  // Reset state when modal opens
  useEffect(() => {
    if (!open) return;
    setSharedCaption(asset.defaultCaption || "");
    setSharedHashtags("");
    setPerPlatform({});
    setCaptionMode("self");
    setSelectedPlatforms([]);
    setResults([]);
    setScheduleMode("now");
    setAutoReframe(!!asset.imageUrl);
    refreshAccounts();
  }, [open, asset.defaultCaption, asset.imageUrl, refreshAccounts]);

  // Map connected account IDs per ORA platform label
  const connectedByPlatform = useMemo(() => {
    const map: Record<string, SocialAccount[]> = {};
    for (const a of accounts) {
      if (a.status !== "connected" && a.status !== "active") continue;
      const oraLabel = PLATFORM_BY_SLUG[a.platform];
      if (!oraLabel) continue;
      (map[oraLabel] ||= []).push(a);
    }
    return map;
  }, [accounts]);

  const connectPlatform = useCallback(async (oraLabel: string) => {
    const platformSlug = Object.entries(PLATFORM_BY_SLUG).find(([, v]) => v === oraLabel)?.[0];
    if (!platformSlug) return;
    setConnectingPlatform(oraLabel);
    // /pfm/connect/:platform — Post for Me backend (PR #111).
    // redirect_url_override sends the user back to OUR domain after
    // OAuth, so they never see postforme.dev's UI in the address bar.
    // The same /zernio-callback.html static page is reused (it just
    // postMessages back to the opener and self-closes — provider-
    // agnostic, no Zernio-specific logic in there).
    const redirectUrl = `${window.location.origin}/zernio-callback.html`;
    const res = await serverPost(`/pfm/connect/${platformSlug}`, { redirectUrl });
    if (!(res?.success && res.authUrl)) {
      setConnectingPlatform(null);
      alert(res?.error || (isFr ? "Erreur de connexion" : "Connection error"));
      return;
    }

    const popup = window.open(res.authUrl, "social_oauth", "width=600,height=700");

    // Connection-completion detection that survives COOP. OAuth provider
    // pages set Cross-Origin-Opener-Policy → popup.closed always returns
    // false → the previous polling-only loop never resolved. Three
    // signals in priority order:
    //   1. postMessage from /zernio-callback.html (instant)
    //   2. Backend poll on /pfm/accounts/list every 3s — finishes when
    //      the connected account appears on the user's profile
    //   3. Best-effort popup.closed inside try/catch (tertiary hint)
    //   4. Hard 5-min cap so abandoned flows don't loop forever
    const startedAt = Date.now();
    const HARD_TIMEOUT_MS = 5 * 60 * 1000;
    const POLL_MS = 3000;
    let timer: ReturnType<typeof setInterval> | null = null;
    const onMessage = (e: MessageEvent) => {
      const data = e.data as any;
      const ok = (typeof data === "string" && data.startsWith("zernio:connected"))
        || (data && typeof data === "object" && (
              data.type === "zernio:connected"
              || data.type === "zernio-oauth-complete"
           ));
      if (ok) finish();
    };
    const finish = () => {
      if (timer) { clearInterval(timer); timer = null; }
      window.removeEventListener("message", onMessage);
      setConnectingPlatform(null);
      refreshAccounts();
    };
    window.addEventListener("message", onMessage);
    timer = setInterval(async () => {
      if (Date.now() - startedAt > HARD_TIMEOUT_MS) { finish(); return; }
      let popupClosed = false;
      try { popupClosed = !!popup?.closed; } catch { /* COOP-blocked, ignore */ }
      try {
        const fresh = await serverPost("/pfm/accounts/list", {});
        if (fresh?.success && Array.isArray(fresh.accounts)) {
          const hit = fresh.accounts.find((a: SocialAccount) =>
            (a.status === "connected" || a.status === "active")
            && PLATFORM_BY_SLUG[a.platform] === oraLabel,
          );
          if (hit) { setAccounts(fresh.accounts); finish(); return; }
        }
      } catch { /* transient network blip — keep polling */ }
      if (popupClosed) finish();
    }, POLL_MS);
  }, [serverPost, refreshAccounts, isFr]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  // AI-generate captions for each currently selected platform
  const generateAICaptions = useCallback(async () => {
    if (selectedPlatforms.length === 0) return;
    setGeneratingCaptions(true);
    const res = await serverPost("/publish/generate-captions", {
      prompt: asset.defaultCaption || sharedCaption || "",
      platforms: selectedPlatforms,
      locale: isFr ? "fr" : "en",
      imageUrl: asset.imageUrl,
      videoUrl: asset.videoUrl,
    }, 60_000);
    if (res?.success && res.captions) {
      setPerPlatform(prev => {
        const next = { ...prev };
        for (const p of selectedPlatforms) {
          const gen = res.captions[p];
          if (gen) next[p] = { caption: gen.caption || "", hashtags: gen.hashtags || "", reframedUrl: next[p]?.reframedUrl };
        }
        return next;
      });
    } else {
      alert(res?.error || (isFr ? "Échec de la création. On retente ?" : "Couldn't make that. Try again?"));
    }
    setGeneratingCaptions(false);
  }, [selectedPlatforms, asset, sharedCaption, isFr, serverPost]);

  const updatePerPlatform = (platform: string, patch: Partial<PerPlatformState>) => {
    setPerPlatform(prev => ({ ...prev, [platform]: { caption: "", hashtags: "", ...prev[platform], ...patch } }));
  };

  // Switching to AI mode: auto-generate if selection already picked and nothing generated yet
  useEffect(() => {
    if (captionMode === "ai" && selectedPlatforms.length > 0) {
      const needGen = selectedPlatforms.some(p => !perPlatform[p]);
      if (needGen && !generatingCaptions) generateAICaptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionMode]);

  const canPublish = !publishing
    && !generatingCaptions
    && selectedPlatforms.length > 0
    && (asset.imageUrl || asset.videoUrl)
    && (captionMode === "self"
        ? sharedCaption.trim().length > 0
        : selectedPlatforms.every(p => (perPlatform[p]?.caption || "").trim().length > 0))
    && (scheduleMode === "now" || !!scheduledAt);

  const handlePublish = useCallback(async () => {
    if (!canPublish) return;
    setPublishing(true);
    setResults([]);

    const scheduledAtISO = scheduleMode === "later" ? new Date(scheduledAt).toISOString() : undefined;
    const outcomes: { platform: string; status: string; url?: string; error?: string }[] = [];

    for (const platform of selectedPlatforms) {
      const accountMatches = connectedByPlatform[platform] || [];
      const accountId = accountMatches[0]?._id;

      // Resolve caption + hashtags (per-platform if AI mode, else shared)
      const captionText = captionMode === "ai"
        ? (perPlatform[platform]?.caption || "").trim()
        : sharedCaption.trim();
      const hashtagsText = captionMode === "ai"
        ? (perPlatform[platform]?.hashtags || "").trim()
        : sharedHashtags.trim();

      // Auto-reframe image for this platform if enabled
      let platformImageUrl = asset.imageUrl;
      if (autoReframe && asset.imageUrl && !asset.videoUrl) {
        const ratio = PLATFORM_RATIO[platform];
        if (ratio && ratio !== "1:1") {
          // Use cached reframed URL if already done
          const cached = perPlatform[platform]?.reframedUrl;
          if (cached) {
            platformImageUrl = cached;
          } else {
            setReframing(platform);
            const reframeRes = await serverPost("/editor/reframe", {
              imageUrl: asset.imageUrl,
              format: ratio,
            }, 60_000);
            if (reframeRes?.success && reframeRes.imageUrl) {
              platformImageUrl = reframeRes.imageUrl;
              updatePerPlatform(platform, { reframedUrl: reframeRes.imageUrl });
            }
            // Silent fallback: use original if reframe fails
            setReframing(null);
          }
        }
      }

      // /pfm/publish — Post for Me backend (PR #111). Per-account call
      // keeps the existing per-platform UI loop and outcome tiles
      // unchanged. Each iteration cross-checks the accountId against
      // the user's profile-scoped list server-side (PR #111 hard-guard,
      // parity with Zernio PR #108) so a stale or hand-crafted body
      // can never reach a tenant other than the requester.
      const res = await serverPost("/pfm/publish", {
        caption: captionText,
        hashtags: hashtagsText,
        imageUrl: platformImageUrl,
        videoUrl: asset.videoUrl,
        scheduledAt: scheduledAtISO,
        accountIds: [accountId],
      }, 60_000);

      // Map PfM status (`processed | scheduled | processing | draft`)
      // to the user-facing status the modal already shows. PfM creates
      // posts asynchronously — actual platform results land via webhook
      // (PR #111 /pfm/webhook), so the immediate response just confirms
      // the post was accepted into the queue.
      const ok = !!res?.success;
      let displayStatus: string;
      if (!ok) displayStatus = "failed";
      else if (scheduledAtISO) displayStatus = "scheduled";
      else displayStatus = "published";

      outcomes.push({
        platform,
        status: displayStatus,
        url: undefined, // platform URL only known after webhook fires
        error: ok ? undefined : (res?.error || "Unknown error"),
      });
      setResults([...outcomes]);
    }

    if (asset.libraryItemId) {
      const successfulDeployments = outcomes
        .filter(o => o.status === "published" || o.status === "scheduled")
        .map(o => ({ platform: o.platform, status: o.status, publishedAt: new Date().toISOString(), url: o.url }));
      if (successfulDeployments.length > 0) {
        serverPost("/library/items-update", {
          itemId: asset.libraryItemId,
          updates: { deployments: successfulDeployments },
        }).catch(() => { /* non-blocking */ });
      }
    }

    setPublishing(false);

    // Top-level toast — the per-platform tiles inside the modal are
    // easy to miss when scrolled away or hidden behind the keyboard
    // on mobile. The toast is unmissable and surfaces the first
    // upstream error verbatim so the user knows what to do.
    const okCount = outcomes.filter(o => o.status === "published" || o.status === "scheduled").length;
    const failCount = outcomes.length - okCount;
    if (failCount === 0 && okCount > 0) {
      toast.success(isFr ? `${okCount} publication${okCount > 1 ? "s" : ""} envoyée${okCount > 1 ? "s" : ""}` : `${okCount} post${okCount > 1 ? "s" : ""} sent`);
    } else if (okCount === 0 && failCount > 0) {
      const firstError = outcomes.find(o => o.error)?.error || "Unknown error";
      toast.error(isFr ? `Aucune publication envoyée — ${firstError}` : `No posts sent — ${firstError}`);
    } else if (okCount > 0 && failCount > 0) {
      const firstError = outcomes.find(o => o.error)?.error || "Unknown error";
      toast.warning(isFr ? `${okCount}/${outcomes.length} envoyée${okCount > 1 ? "s" : ""} — ${failCount} échec${failCount > 1 ? "s" : ""} (${firstError})` : `${okCount}/${outcomes.length} sent — ${failCount} failed (${firstError})`);
    }

    onPublished?.(outcomes.map(o => ({ platform: o.platform, status: o.status, url: o.url })));
  }, [canPublish, scheduleMode, scheduledAt, selectedPlatforms, connectedByPlatform, serverPost, captionMode, perPlatform, sharedCaption, sharedHashtags, autoReframe, asset, onPublished, isFr]);

  if (!open) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
          style={{ background: "var(--background)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                {isFr ? "Publier" : "Publish"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                {isFr ? "Diffusez sur vos réseaux en un clic" : "Distribute to your networks in one click"}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary">
              <X size={16} />
            </button>
          </div>

          <div className="px-6 py-5 flex flex-col gap-5">
            {/* Preview */}
            <div className="flex items-start gap-3">
              {asset.imageUrl && (
                <img src={asset.imageUrl} alt="preview" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
              )}
              {asset.videoUrl && !asset.imageUrl && (
                <video src={asset.videoUrl} className="w-24 h-24 rounded-lg object-cover flex-shrink-0" muted />
              )}
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 4 }}>
                  {isFr ? "Aperçu" : "Preview"}
                </div>
                <div style={{ fontSize: 12, color: "var(--foreground)", lineHeight: 1.5 }}>
                  {asset.imageUrl ? (isFr ? "Image prête à diffuser" : "Image ready to publish") : (isFr ? "Vidéo prête à diffuser" : "Video ready to publish")}
                </div>
              </div>
            </div>

            {/* Platforms */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {isFr ? "Réseaux" : "Networks"}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {PLATFORMS.map(p => {
                  const Icon = p.icon;
                  const connected = (connectedByPlatform[p.id] || []).length > 0;
                  const selected = selectedPlatforms.includes(p.id);
                  const isConnecting = connectingPlatform === p.id;

                  return (
                    <button
                      key={p.id}
                      disabled={isConnecting}
                      onClick={() => connected ? togglePlatform(p.id) : connectPlatform(p.id)}
                      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      style={{
                        background: selected ? "var(--foreground)" : "var(--secondary)",
                        color: selected ? "var(--background)" : "var(--foreground)",
                        border: `1px solid ${selected ? "var(--foreground)" : "var(--border)"}`,
                      }}
                    >
                      {isConnecting ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                      <span style={{ fontSize: 10, fontWeight: 600 }}>{p.label}</span>
                      {!connected && !isConnecting && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1 rounded" style={{ background: "var(--muted)", fontSize: 7, fontWeight: 700, color: "var(--muted-foreground)" }}>
                          <Plus size={7} />
                        </div>
                      )}
                      {connected && !selected && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                      )}
                      {selected && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle2 size={10} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 9, color: "var(--muted-foreground)", marginTop: 6 }}>
                {isFr
                  ? "Vert = connecté · Cliquez + pour connecter un compte"
                  : "Green = connected · Click + to connect an account"}
              </div>
            </div>

            {/* Auto-reframe toggle (images only) */}
            {asset.imageUrl && !asset.videoUrl && (
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <input
                  type="checkbox"
                  checked={autoReframe}
                  onChange={e => setAutoReframe(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <Crop size={14} style={{ color: "#7C3AED" }} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>
                    {isFr ? "Adapter au format de chaque réseau" : "Auto-format per network"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                    {isFr
                      ? "IG 4:5 · LinkedIn 16:9 · TikTok 9:16 · (via éditeur IA)"
                      : "IG 4:5 · LinkedIn 16:9 · TikTok 9:16 · (via AI editor)"}
                  </div>
                </div>
              </label>
            )}

            {/* Caption mode toggle */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {isFr ? "Légendes" : "Captions"}
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setCaptionMode("self")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: captionMode === "self" ? "var(--foreground)" : "var(--secondary)",
                    color: captionMode === "self" ? "var(--background)" : "var(--muted-foreground)",
                    border: "1px solid var(--border)", fontSize: 12, fontWeight: 600,
                  }}
                >
                  <PenLine size={12} /> {isFr ? "J'écris moi-même" : "Write myself"}
                </button>
                <button
                  onClick={() => setCaptionMode("ai")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: captionMode === "ai"
                      ? "linear-gradient(135deg, #7C3AED, #EC4899)"
                      : "var(--secondary)",
                    color: captionMode === "ai" ? "#FFFFFF" : "var(--muted-foreground)",
                    border: "1px solid var(--border)", fontSize: 12, fontWeight: 600,
                  }}
                >
                  <Sparkles size={12} /> {isFr ? "L'IA écrit par réseau" : "AI writes per network"}
                </button>
              </div>

              {captionMode === "self" ? (
                <>
                  <textarea
                    value={sharedCaption}
                    onChange={e => setSharedCaption(e.target.value)}
                    rows={4}
                    placeholder={isFr ? "Écrivez votre légende..." : "Write your caption..."}
                    className="w-full resize-none outline-none px-3 py-2 rounded-lg"
                    style={{ fontSize: 13, background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                  <input
                    value={sharedHashtags}
                    onChange={e => setSharedHashtags(e.target.value)}
                    placeholder="#brand #marketing #ai"
                    className="w-full mt-2 outline-none px-3 py-2 rounded-lg"
                    style={{ fontSize: 13, background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                </>
              ) : (
                <>
                  {selectedPlatforms.length === 0 ? (
                    <div className="p-3 rounded-lg text-center" style={{ background: "var(--secondary)", border: "1px dashed var(--border)", fontSize: 11, color: "var(--muted-foreground)" }}>
                      {isFr ? "Sélectionnez d'abord les réseaux pour générer les légendes" : "Select networks first to generate captions"}
                    </div>
                  ) : generatingCaptions ? (
                    <div className="p-4 rounded-lg flex items-center justify-center gap-2" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: "#7C3AED" }} />
                      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                        {isFr ? "L'IA écrit les posts..." : "AI is writing the posts..."}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-end">
                        <button
                          onClick={generateAICaptions}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded cursor-pointer"
                          style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: 10, fontWeight: 600, color: "var(--foreground)" }}
                        >
                          <Sparkles size={10} /> {isFr ? "Régénérer tout" : "Regenerate all"}
                        </button>
                      </div>
                      {selectedPlatforms.map(p => {
                        const state = perPlatform[p] || { caption: "", hashtags: "" };
                        const platformDef = PLATFORMS.find(x => x.id === p);
                        const Icon = platformDef?.icon;
                        return (
                          <div key={p} className="rounded-lg p-3" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-2 mb-2">
                              {Icon && <Icon size={12} style={{ color: "#7C3AED" }} />}
                              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)" }}>{platformDef?.label || p}</span>
                              <span style={{ fontSize: 9, color: "var(--muted-foreground)" }}>
                                {state.caption.length} {isFr ? "car." : "chars"}
                              </span>
                            </div>
                            <textarea
                              value={state.caption}
                              onChange={e => updatePerPlatform(p, { caption: e.target.value })}
                              rows={3}
                              className="w-full resize-none outline-none px-2 py-1.5 rounded"
                              style={{ fontSize: 12, background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                            />
                            <input
                              value={state.hashtags}
                              onChange={e => updatePerPlatform(p, { hashtags: e.target.value })}
                              placeholder="#hashtags"
                              className="w-full mt-1.5 outline-none px-2 py-1 rounded"
                              style={{ fontSize: 11, background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Schedule mode */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {isFr ? "Quand" : "When"}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setScheduleMode("now")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: scheduleMode === "now" ? "var(--foreground)" : "var(--secondary)",
                    color: scheduleMode === "now" ? "var(--background)" : "var(--muted-foreground)",
                    border: "1px solid var(--border)", fontSize: 12, fontWeight: 600,
                  }}
                >
                  <Send size={12} /> {isFr ? "Maintenant" : "Now"}
                </button>
                <button
                  onClick={() => setScheduleMode("later")}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: scheduleMode === "later" ? "var(--foreground)" : "var(--secondary)",
                    color: scheduleMode === "later" ? "var(--background)" : "var(--muted-foreground)",
                    border: "1px solid var(--border)", fontSize: 12, fontWeight: 600,
                  }}
                >
                  <Clock size={12} /> {isFr ? "Planifier" : "Schedule"}
                </button>
              </div>
              {scheduleMode === "later" && (
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
                  className="w-full mt-2 outline-none px-3 py-2 rounded-lg"
                  style={{ fontSize: 13, background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                />
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="flex flex-col gap-2">
                {results.map(r => (
                  <div key={r.platform}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{
                      background: r.status === "failed" ? "rgba(220, 38, 38, 0.08)" : "rgba(34, 197, 94, 0.08)",
                      border: `1px solid ${r.status === "failed" ? "rgba(220, 38, 38, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                    }}>
                    <div className="flex items-center gap-2">
                      {r.status === "failed" ? <AlertCircle size={14} style={{ color: "#dc2626" }} /> : <CheckCircle2 size={14} style={{ color: "#22c55e" }} />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)" }}>{r.platform}</span>
                      <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {r.status === "published" ? (isFr ? "Publié" : "Published")
                          : r.status === "scheduled" ? (isFr ? "Planifié" : "Scheduled")
                          : r.error || "Failed"}
                      </span>
                    </div>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-1" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                        {isFr ? "Voir" : "View"} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex items-center justify-between gap-3 px-6 py-4 border-t"
            style={{ borderColor: "var(--border)", background: "var(--background)" }}>
            <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
              {reframing
                ? (isFr ? `Reformatage pour ${reframing}...` : `Reframing for ${reframing}...`)
                : `${selectedPlatforms.length} ${isFr ? "réseau(x) sélectionné(s)" : "network(s) selected"}`}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-3 py-2 rounded-lg cursor-pointer"
                style={{ fontSize: 12, fontWeight: 600, background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                {isFr ? "Annuler" : "Cancel"}
              </button>
              <button
                onClick={handlePublish}
                disabled={!canPublish}
                className="px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontSize: 12, fontWeight: 700, background: "var(--foreground)", color: "var(--background)" }}>
                {publishing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {publishing
                  ? (isFr ? "Diffusion..." : "Publishing...")
                  : scheduleMode === "now"
                    ? (isFr ? "Publier" : "Publish")
                    : (isFr ? "Planifier" : "Schedule")}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

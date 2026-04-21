import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Loader2, Download, Package, Upload, Wand2, ChevronDown, Paperclip, X, ArrowRight } from "lucide-react";
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
}

export function SurprisePage() {
  return (
    <RouteGuard requireAuth>
      <SurpriseContent />
    </RouteGuard>
  );
}

function SurpriseContent() {
  const { getAuthHeader } = useAuth();
  const navigate = useNavigate();

  // Core inputs (minimal — the two blanks)
  const [what, setWhat] = useState("");
  const [who,  setWho]  = useState("");

  // Smart defaults everyone gets
  const [creativity, setCreativity] = useState<1 | 2 | 3 | 4>(2);
  const [assetCount, setAssetCount] = useState<number>(6);
  const [platforms, setPlatforms] = useState<string[]>(["instagram-feed", "instagram-story", "linkedin", "tiktok"]);
  const [mediaType, setMediaType] = useState<"image" | "film" | "carousel">("image");
  const [videoDuration, setVideoDuration] = useState<"3s" | "5s" | "8s">("5s");
  const [withCaption, setWithCaption] = useState<boolean>(true);
  const [ctxWhy, setCtxWhy] = useState("");
  const [productPhoto, setProductPhoto] = useState<string | null>(null);

  // UI state
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"idle" | "concept" | "generating" | "done">("idle");
  const [pack, setPack] = useState<Pack | null>(null);
  const [uploadingProduct, setUploadingProduct] = useState(false);

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

  const handleSurprise = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStage("concept");
    setPack(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setStage("generating");
      const res = await serverPost("/analyze/surprise-me", {
        productImageUrl: productPhoto || undefined,
        creativityLevel: creativity,
        assetCount,
        platforms,
        mediaType,
        videoDuration,
        withCaption,
        context: {
          who: who.trim() || undefined,
          what: what.trim() || undefined,
          why: ctxWhy.trim() || undefined,
        },
        lang: "en",
      }, 240_000);
      if (!res?.success || !Array.isArray(res.items)) {
        toast.error(res?.error || "Composition failed.");
        setStage("idle");
        return;
      }
      setPack({
        campaignName: String(res.campaignName || ""),
        campaignSlug: String(res.campaignSlug || "ora-campaign"),
        creativeAngle: String(res.creativeAngle || ""),
        tone: String(res.tone || ""),
        keyMessage: String(res.keyMessage || ""),
        creativityLevel: Number(res.creativityLevel || creativity),
        items: res.items,
      });
      setStage("done");
    } catch (err: any) {
      toast.error(String(err?.message || err));
      setStage("idle");
    } finally {
      setBusy(false);
    }
  }, [busy, productPhoto, creativity, assetCount, platforms, mediaType, videoDuration, withCaption, what, who, ctxWhy, serverPost]);

  const groupedByPlatform: Record<string, PackItem[]> = {};
  if (pack) for (const it of pack.items) (groupedByPlatform[it.platform] ||= []).push(it);

  return (
    <div style={{ background: BG, color: TEXT }} className="min-h-screen flex flex-col">
      <AppTabs active="surprise" />

      {/* Idle / form state — one sentence, one button, fine-tune hidden */}
      {stage === "idle" && !pack && (
        <main className="flex-1 flex items-center">
          <div className="w-full max-w-[900px] mx-auto px-5 md:px-10 py-14 md:py-24">
            {/* Friendly opener */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="mb-8 md:mb-12"
            >
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-4" style={{ color: MUTED }}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: PINK }} />
                What are you shipping?
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
                const on = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlatforms((xs) => on ? xs.filter((x) => x !== p.id) : [...xs, p.id])}
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[13px] transition"
                    style={{
                      background: on ? INK : "#fff",
                      color: on ? INK_TEXT : TEXT,
                      border: `1px solid ${on ? INK : BORDER}`,
                      fontWeight: 500,
                    }}
                  >
                    <span>{p.emoji}</span> {p.label.replace("Instagram ", "IG ")}
                  </button>
                );
              })}
            </motion.div>

            {/* The one big button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center justify-center"
            >
              <Button
                variant="accent" size="lg"
                onClick={handleSurprise}
                disabled={busy || uploadingProduct || platforms.length === 0}
                style={{ boxShadow: "0 20px 44px -14px rgba(255,92,57,0.55)" }}
              >
                <Sparkles size={18} /> Surprise me <ArrowRight size={16} />
              </Button>
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

                    <TuneBlock label="Asset type">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: "image"    as const, label: "Images",        emoji: "🖼️" },
                          { id: "film"     as const, label: "Images + Films", emoji: "🎞️", hint: "each image gets a 5s motion version" },
                          { id: "carousel" as const, label: "Carousel",       emoji: "🗂️", disabled: true, hint: "soon" },
                        ].map((m) => {
                          const on = mediaType === m.id;
                          return (
                            <button key={m.id} disabled={m.disabled} onClick={() => setMediaType(m.id)}
                                    title={m.hint}
                                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] transition disabled:opacity-40"
                                    style={{ background: on ? INK : "#fff", color: on ? INK_TEXT : TEXT, border: `1px solid ${on ? INK : BORDER}`, fontWeight: 500 }}>
                              <span>{m.emoji}</span> {m.label}{m.hint ? <span className="opacity-60"> · {m.hint}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    </TuneBlock>

                    {mediaType === "film" && (
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
                    )}

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
              <div className="mt-4">
                <Badge tone="butter">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: INK }} />
                  Saved to your library
                </Badge>
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {items.map((it, i) => (
                      <div key={i} className="rounded-2xl overflow-hidden relative group" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                        {it.status === "ok" && it.videoUrl ? (
                          <video
                            src={it.videoUrl}
                            poster={it.imageUrl}
                            className="w-full h-auto block"
                            style={{ aspectRatio: it.aspectRatio.replace(":", " / ") }}
                            autoPlay muted loop playsInline
                            controls
                          />
                        ) : it.status === "ok" && it.imageUrl ? (
                          <img src={it.imageUrl} alt={it.fileName} className="w-full h-auto" style={{ aspectRatio: it.aspectRatio.replace(":", " / ") }} />
                        ) : (
                          <div className="w-full flex items-center justify-center p-6 text-[12px] text-center"
                               style={{ aspectRatio: it.aspectRatio.replace(":", " / "), color: "#B91C1C" }}>
                            {it.error?.slice(0, 100) || "failed"}
                          </div>
                        )}
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
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </main>
      )}
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

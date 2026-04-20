import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { Sparkles, Loader2, Download, Package, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { downloadAsset } from "../lib/asset-persistence";
import { API_BASE, publicAnonKey } from "../lib/supabase";

/* ═══ Palette ═══ */
const BG = "#FAFAF7";
const TEXT = "#0A0A0A";
const MUTED = "#6B7280";
const BORDER = "rgba(10,10,10,0.08)";
const INK = "#0A0A0A";
const INK_TEXT = "#FFFFFF";
const ACCENT = "#3B82F6";

/* ═══ Creativity levels ═══ */
interface CreativityChip { id: 1 | 2 | 3 | 4; emoji: string; labelFr: string; labelEn: string; hintFr: string; hintEn: string }
const CREATIVITY: CreativityChip[] = [
  { id: 1, emoji: "🏛️", labelFr: "Classique",  labelEn: "Classic",    hintFr: "Sûr, brand-safe",            hintEn: "Safe, brand-aligned" },
  { id: 2, emoji: "⚖️", labelFr: "Équilibré",  labelEn: "Balanced",   hintFr: "Pro avec un twist",           hintEn: "Pro with a twist" },
  { id: 3, emoji: "🔥", labelFr: "Audacieux",  labelEn: "Bold",       hintFr: "Éditorial, original",         hintEn: "Editorial, original" },
  { id: 4, emoji: "🚀", labelFr: "Disruptif",  labelEn: "Disruptive", hintFr: "Surréaliste, mag de mode",    hintEn: "Surreal, fashion-mag" },
];

/* ═══ Platforms ═══ */
const PLATFORM_META: Record<string, { label: string; emoji: string }> = {
  "instagram-feed":  { label: "Instagram Feed",  emoji: "📸" },
  "instagram-story": { label: "Instagram Story", emoji: "🎬" },
  "linkedin":        { label: "LinkedIn",        emoji: "💼" },
  "facebook":        { label: "Facebook",        emoji: "👥" },
  "tiktok":          { label: "TikTok",          emoji: "🎵" },
};

interface PackItem {
  platform: string; aspectRatio: string; label: string; fileName: string;
  twistElement?: string;
  status: "ok" | "failed"; imageUrl?: string; error?: string; provider?: string;
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
  // English-only copy.
  const isFr = false;

  const [creativity, setCreativity] = useState<1 | 2 | 3 | 4>(2);
  const [brief, setBrief] = useState("");
  const [season, setSeason] = useState("");
  const [productPhoto, setProductPhoto] = useState<string | null>(null);
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
    if (!file.type.startsWith("image/")) { toast.error(isFr ? "Image requise." : "Image required."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(isFr ? "Image trop lourde (>10 Mo)." : "Image too large (>10MB)."); return; }
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
      // Reuse /analyze/reverse-prompt just for its upload side-effect (returns sourceUrl).
      const res = await serverPost("/analyze/reverse-prompt", { imageBase64: b64.base64, mimeType: b64.mimeType }, 60_000);
      if (res?.success && res.sourceUrl) {
        setProductPhoto(res.sourceUrl);
        toast.success(isFr ? "Photo produit prête" : "Product photo ready");
      } else {
        toast.error(res?.error || "Upload failed");
      }
    } catch (err: any) {
      toast.error(String(err?.message || err));
    } finally {
      setUploadingProduct(false);
    }
  }, [isFr, serverPost]);

  const handleSurprise = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStage("concept");
    setPack(null);
    try {
      // Small delay so the user perceives the concept stage before generation.
      await new Promise((r) => setTimeout(r, 600));
      setStage("generating");
      const res = await serverPost("/analyze/surprise-me", {
        brief: brief.trim() || undefined,
        season: season.trim() || undefined,
        productImageUrl: productPhoto || undefined,
        creativityLevel: creativity,
        lang: isFr ? "fr" : "en",
      }, 240_000);
      if (!res?.success || !Array.isArray(res.items)) {
        toast.error(res?.error || (isFr ? "Échec de la composition." : "Composition failed."));
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
  }, [busy, brief, season, productPhoto, creativity, isFr, serverPost]);

  const downloadZip = useCallback(async () => {
    if (!pack) return;
    const ok = pack.items.filter((it) => it.status === "ok" && it.imageUrl);
    if (ok.length === 0) { toast.error(isFr ? "Rien à télécharger." : "Nothing to download."); return; }
    toast.info(isFr ? "Préparation du ZIP…" : "Preparing the ZIP…");
    try {
      const zip = new JSZip();
      await Promise.all(ok.map(async (it) => {
        try {
          const r = await fetch(it.imageUrl!);
          if (!r.ok) return;
          const blob = await r.blob();
          zip.folder(it.platform)!.file(it.fileName, blob);
        } catch {}
      }));
      const out = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      a.download = `${pack.campaignSlug}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toast.error(String(err?.message || err));
    }
  }, [pack, isFr]);

  const groupedByPlatform: Record<string, PackItem[]> = {};
  if (pack) {
    for (const it of pack.items) {
      (groupedByPlatform[it.platform] ||= []).push(it);
    }
  }

  return (
    <div style={{ background: BG, color: TEXT }} className="min-h-screen flex flex-col">
      <AppTabs active="surprise" />

      <main className="flex-1">
        <div className="max-w-[920px] mx-auto px-5 md:px-8 py-10 md:py-16">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] mb-5"
                 style={{ background: "rgba(59,130,246,0.08)", color: ACCENT, border: `1px solid rgba(59,130,246,0.2)` }}>
              <Sparkles size={12} /> {isFr ? "Un clic. Une campagne complète." : "One click. A full campaign."}
            </div>
            <h1 className="tracking-tight mx-auto" style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.03em", maxWidth: 720 }}>
              {isFr ? <>Surprends-moi.</> : <>Surprise me.</>}
            </h1>
            <p className="mt-5 text-[16px] md:text-[18px] leading-relaxed" style={{ color: MUTED, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
              {isFr
                ? "Ora lit ta marque, invente le concept, et te livre 8 visuels prêts à poster — calibrés pour Instagram, LinkedIn, Facebook et TikTok."
                : "Ora reads your brand, writes the concept, and delivers 8 ready-to-post visuals — calibrated for Instagram, LinkedIn, Facebook and TikTok."}
            </p>
          </motion.div>

          {/* Idle / input form */}
          {stage === "idle" && !pack && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-[28px] p-6 md:p-8"
              style={{ background: "#FFFFFF", border: `1px solid ${BORDER}`, boxShadow: "0 20px 60px -20px rgba(10,10,10,0.1)" }}
            >
              {/* Creativity slider */}
              <div>
                <div className="text-[12px] uppercase tracking-wide mb-2.5" style={{ color: MUTED }}>
                  {isFr ? "Niveau créatif" : "Creative level"}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CREATIVITY.map((c) => {
                    const on = creativity === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCreativity(c.id)}
                        className="h-auto py-3 px-3 rounded-2xl text-left transition"
                        style={{
                          background: on ? INK : "#fff",
                          color: on ? INK_TEXT : TEXT,
                          border: `1px solid ${on ? INK : BORDER}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[18px]">{c.emoji}</span>
                          <span style={{ fontWeight: 600 }}>{isFr ? c.labelFr : c.labelEn}</span>
                        </div>
                        <div className="mt-1 text-[11.5px]" style={{ color: on ? "rgba(255,255,255,0.7)" : MUTED }}>
                          {isFr ? c.hintFr : c.hintEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brief + season */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
                <div>
                  <label className="text-[12px] uppercase tracking-wide block mb-1.5" style={{ color: MUTED }}>
                    {isFr ? "Brief (optionnel)" : "Brief (optional)"}
                  </label>
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    placeholder={isFr ? "Ex: lancement d'un parfum estival boisé pour la Gen Z…" : "e.g. launching a woody summer fragrance for Gen Z…"}
                    rows={3}
                    className="w-full resize-none rounded-xl px-3 py-2.5 text-[14px] outline-none"
                    style={{ background: "#FAFAF7", border: `1px solid ${BORDER}` }}
                  />
                </div>
                <div>
                  <label className="text-[12px] uppercase tracking-wide block mb-1.5" style={{ color: MUTED }}>
                    {isFr ? "Saison / moment" : "Season / moment"}
                  </label>
                  <input
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder={isFr ? "été, lancement, Noël…" : "summer, launch, holidays…"}
                    className="w-full rounded-xl px-3 py-2.5 text-[14px] outline-none"
                    style={{ background: "#FAFAF7", border: `1px solid ${BORDER}` }}
                  />
                </div>
              </div>

              {/* Product photo (optional) */}
              <div className="mt-4">
                <label className="text-[12px] uppercase tracking-wide block mb-1.5" style={{ color: MUTED }}>
                  {isFr ? "Photo produit (optionnelle, pour préserver le produit)" : "Product photo (optional — locks the product)"}
                </label>
                {productPhoto ? (
                  <div className="flex items-center gap-3">
                    <img src={productPhoto} alt="" className="w-16 h-16 object-cover rounded-xl" style={{ border: `1px solid ${BORDER}` }} />
                    <button onClick={() => setProductPhoto(null)} className="text-[13px] hover:underline" style={{ color: MUTED }}>
                      {isFr ? "Retirer" : "Remove"}
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 h-10 px-4 rounded-full cursor-pointer text-[13px] hover:bg-black/5"
                         style={{ border: `1px solid ${BORDER}`, color: TEXT }}>
                    {uploadingProduct ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {isFr ? "Ajouter une photo" : "Add a photo"}
                    <input type="file" accept="image/*" className="hidden"
                           onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadProductPhoto(f); e.target.value = ""; }} />
                  </label>
                )}
              </div>

              {/* CTA */}
              <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[12.5px]" style={{ color: MUTED }}>
                  {isFr
                    ? "8 visuels · Instagram, LinkedIn, Facebook, TikTok · DA marque verrouillée"
                    : "8 visuals · Instagram, LinkedIn, Facebook, TikTok · brand DA locked"}
                </div>
                <button
                  onClick={handleSurprise}
                  disabled={busy || uploadingProduct}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full text-[15px] disabled:opacity-40"
                  style={{ background: INK, color: INK_TEXT, fontWeight: 500, boxShadow: "0 10px 24px -10px rgba(10,10,10,0.35)" }}
                >
                  <Sparkles size={16} /> {isFr ? "Surprends-moi" : "Surprise me"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Running */}
          {(stage === "concept" || stage === "generating") && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-[28px] p-10 text-center"
              style={{ background: "#FFFFFF", border: `1px solid ${BORDER}` }}
            >
              <Loader2 size={32} className="mx-auto animate-spin" style={{ color: ACCENT }} />
              <div className="mt-5 text-[18px]" style={{ fontWeight: 600 }}>
                {stage === "concept"
                  ? (isFr ? "Ora écrit le concept…" : "Ora is writing the concept…")
                  : (isFr ? "Ora tourne les visuels…" : "Ora is shooting the pack…")}
              </div>
              <div className="mt-2 text-[13.5px]" style={{ color: MUTED }}>
                {isFr ? "Peut prendre 30 à 90 secondes — 8 visuels en parallèle." : "Takes 30 to 90 seconds — 8 visuals in parallel."}
              </div>
            </motion.div>
          )}

          {/* Pack result */}
          {stage === "done" && pack && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="flex flex-col gap-8"
            >
              {/* Header */}
              <div className="rounded-[24px] p-6" style={{ background: "#FFFFFF", border: `1px solid ${BORDER}` }}>
                <div className="text-[12px] uppercase tracking-[0.15em] mb-2" style={{ color: ACCENT, fontWeight: 600 }}>
                  {isFr ? "Campagne" : "Campaign"}
                </div>
                <h2 className="tracking-tight" style={{ fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 600, letterSpacing: "-0.02em" }}>
                  {pack.campaignName}
                </h2>
                {pack.creativeAngle && (
                  <p className="mt-3 text-[16px] leading-relaxed" style={{ color: TEXT }}>{pack.creativeAngle}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
                  {pack.tone && (
                    <span className="px-2.5 h-7 rounded-full inline-flex items-center" style={{ background: "#F3F4F6", color: MUTED }}>
                      {isFr ? "Ton" : "Tone"}: <b className="ml-1" style={{ color: TEXT }}>{pack.tone}</b>
                    </span>
                  )}
                  {pack.keyMessage && (
                    <span className="px-2.5 h-7 rounded-full inline-flex items-center" style={{ background: "#F3F4F6", color: MUTED }}>
                      {isFr ? "Message" : "Message"}: <b className="ml-1" style={{ color: TEXT }}>{pack.keyMessage}</b>
                    </span>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={downloadZip}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13.5px] text-white"
                    style={{ background: INK }}
                  >
                    <Package size={14} /> {isFr ? "Télécharger la campagne (ZIP)" : "Download campaign (ZIP)"}
                  </button>
                  <button
                    onClick={() => { setPack(null); setStage("idle"); }}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[13.5px] hover:bg-black/5"
                    style={{ border: `1px solid ${BORDER}` }}
                  >
                    <Sparkles size={14} /> {isFr ? "Refaire une campagne" : "New campaign"}
                  </button>
                </div>
              </div>

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
                          {it.status === "ok" && it.imageUrl ? (
                            <img src={it.imageUrl} alt={it.fileName} className="w-full h-auto" style={{ aspectRatio: it.aspectRatio.replace(":", " / ") }} />
                          ) : (
                            <div className="w-full flex items-center justify-center p-6 text-[12px] text-center" style={{ aspectRatio: it.aspectRatio.replace(":", " / "), color: "#B91C1C" }}>
                              {it.error?.slice(0, 100) || "failed"}
                            </div>
                          )}
                          {it.twistElement && (
                            <div className="absolute top-2 left-2 px-2 h-6 rounded-full inline-flex items-center gap-1 text-[10.5px] font-mono"
                                 style={{ background: "rgba(255,255,255,0.9)", color: TEXT, backdropFilter: "blur(6px)", border: `1px solid rgba(255,255,255,0.4)` }}
                                 title={isFr ? "Twist créatif" : "Creative twist"}>
                              ✨ {it.twistElement}
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
                                  aria-label={isFr ? "Éditer" : "Edit"}
                                  title={isFr ? "Ajouter logo, texte…" : "Add logo, text…"}
                                >
                                  <Wand2 size={12} />
                                </button>
                                <button
                                  onClick={() => downloadAsset(it.imageUrl!, it.fileName, "image")}
                                  className="shrink-0 w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center"
                                  aria-label={isFr ? "Télécharger" : "Download"}
                                >
                                  <Download size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

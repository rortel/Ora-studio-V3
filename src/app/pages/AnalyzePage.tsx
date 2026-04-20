import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Paperclip, Send, Loader2, Download, Copy, RotateCcw,
  Check, Plus, Sparkles, Image as ImageIcon, Pencil, X, Layers, Package,
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";
import { OraLogo } from "../components/OraLogo";
import { persistAsset, downloadAsset } from "../lib/asset-persistence";
import { API_BASE, publicAnonKey } from "../lib/supabase";

/* ═══ Palette claire ═══ */
const BG = "#FAFAF7";
const TEXT = "#0A0A0A";
const MUTED = "#6B7280";
const BORDER = "rgba(10,10,10,0.08)";
const USER_BG = "#0A0A0A";
const USER_TEXT = "#FFFFFF";
const ORA_BG = "#F3F4F6";

/* ═══ Types ═══ */
interface PromptSchema {
  subject: string;
  composition: string;
  lighting: string;
  palette: string;
  style: string;
  mood: string;
  camera: string;
  finish: string;
}

type ModelId = "photon-flash-1" | "photon-1" | "flux-pro" | "ideogram-3-leo" | "dall-e";

interface ModelChip {
  id: ModelId;
  label: string;
  emoji: string;
  hint: string;
}

const MODELS: ModelChip[] = [
  { id: "photon-flash-1",  label: "Rapide",     emoji: "⚡", hint: "Photon Flash · ~10s" },
  { id: "photon-1",        label: "Photo",      emoji: "📸", hint: "Photon · réalisme premium" },
  { id: "flux-pro",        label: "Créatif",    emoji: "🎨", hint: "Flux Pro · stylisation" },
  { id: "ideogram-3-leo",  label: "Typo/Brand", emoji: "🔤", hint: "Ideogram · texte net" },
  { id: "dall-e",          label: "Polyvalent", emoji: "🧠", hint: "DALL-E 3 HD" },
];

/* ═══ Series presets ═══ */
interface ScenePreset {
  label: string;
  emoji: string;
  description?: string;
  framing: string;
  angle: string;
  placement: string;
  lightingDirection: string;
  moment: string;
}
const SCENE_PRESETS: ScenePreset[] = [
  { label: "hero",     emoji: "🌅", framing: "wide cinematic shot",       angle: "eye-level",   placement: "centered",        lightingDirection: "front-side three-quarter", moment: "action" },
  { label: "closeup",  emoji: "🔍", framing: "extreme close-up detail",   angle: "eye-level",   placement: "off-center left", lightingDirection: "side soft",                moment: "intimate rest" },
  { label: "aerial",   emoji: "🛸", framing: "wide top-down perspective", angle: "aerial high", placement: "centered",        lightingDirection: "overhead",                 moment: "approach" },
  { label: "portrait", emoji: "👤", framing: "medium portrait framing",   angle: "low angle",   placement: "right-third",     lightingDirection: "back-rim",                 moment: "reveal" },
];

interface RatioPreset { id: string; label: string; emoji: string; hint: string }
const RATIO_PRESETS: RatioPreset[] = [
  { id: "1:1",  label: "1:1",  emoji: "⬛", hint: "Feed Insta, multipurpose" },
  { id: "9:16", label: "9:16", emoji: "📱", hint: "Stories, Reels, TikTok" },
  { id: "16:9", label: "16:9", emoji: "🖥️", hint: "YouTube, web hero" },
  { id: "4:5",  label: "4:5",  emoji: "🖼️", hint: "Portrait Insta" },
];

interface DALock {
  palette: string; visualStyle: string; lightingQuality: string; mood: string;
  cameraProfile: string; postGrade: string; renderingTexture: string;
}
interface SceneVary {
  framing: string; angle: string; placement: string;
  lightingDirection: string; moment: string;
}
interface SeriesItem {
  sceneLabel: string; ratio: string; fileName: string;
  status: "ok" | "failed"; imageUrl?: string; error?: string; provider?: string;
}

interface BrainstormScene {
  label: string; description: string;
  framing: string; angle: string; placement: string;
  lightingDirection: string; moment: string;
}

type Msg =
  | { id: string; role: "ora";  kind: "text";          text: string }
  | { id: string; role: "user"; kind: "text";          text: string }
  | { id: string; role: "user"; kind: "image";         imageUrl: string; mimeType: string; base64?: string }
  | { id: string; role: "ora";  kind: "loading";       label: string }
  | { id: string; role: "ora";  kind: "analysis";      schema: PromptSchema; promptText: string; imageUrl: string }
  | { id: string; role: "ora";  kind: "models" }
  | { id: string; role: "user"; kind: "modelPick";     model: ModelId; label: string }
  | { id: string; role: "ora";  kind: "generating";    model: ModelId }
  | { id: string; role: "ora";  kind: "generated";     model: ModelId; imageUrl: string; prompt: string }
  | { id: string; role: "ora";  kind: "brainstormReply"; text: string; proposals: BrainstormScene[] }
  | { id: string; role: "ora";  kind: "brainstormReady"; text: string; scenes: BrainstormScene[]; defaultCampaign: string }
  | { id: string; role: "user"; kind: "seriesPick";    campaignName: string; sceneCount: number; ratioCount: number }
  | { id: string; role: "ora";  kind: "seriesGenerating"; total: number }
  | { id: string; role: "ora";  kind: "seriesResult";  campaignName: string; campaignSlug: string; items: SeriesItem[] };

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

/* ═══ Page ═══ */
export function AnalyzePage() {
  return (
    <RouteGuard requireAuth>
      <AnalyzeChat />
    </RouteGuard>
  );
}

function AnalyzeChat() {
  const { getAuthHeader } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const isFr = locale === "fr";

  const greeting = isFr
    ? "Hey 👋 — envoie-moi une image et je te donne le prompt pour la reproduire."
    : "Hey 👋 — send me an image and I'll give you the prompt to recreate it.";

  const [messages, setMessages] = useState<Msg[]>([{ id: uid(), role: "ora", kind: "text", text: greeting }]);
  const [inputText, setInputText] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [daLock, setDALock] = useState<DALock | null>(null);
  const [subject, setSubject] = useState<string>("");
  const [heroObject, setHeroObject] = useState<string>("");
  const [currentScene, setCurrentScene] = useState<string>("");
  const [narrativeTheme, setNarrativeTheme] = useState<string>("");
  const [brainstormMode, setBrainstormMode] = useState(false);
  const [brainstormHistory, setBrainstormHistory] = useState<Array<{ role: "ora" | "user"; text: string }>>([]);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const push = useCallback((m: Msg) => setMessages((xs) => [...xs, m]), []);
  const replaceLast = useCallback((match: (m: Msg) => boolean, next: Msg) => {
    setMessages((xs) => {
      const idx = [...xs].reverse().findIndex(match);
      if (idx < 0) return xs;
      const real = xs.length - 1 - idx;
      const copy = [...xs];
      copy[real] = next;
      return copy;
    });
  }, []);
  const removeWhere = useCallback((match: (m: Msg) => boolean) => {
    setMessages((xs) => xs.filter((m) => !match(m)));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

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

  const readFileAsBase64 = (file: File): Promise<{ base64: string; dataUrl: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] || "";
        resolve({ base64, dataUrl, mimeType: file.type || "image/png" });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImage = useCallback(async (file: File) => {
    if (busy) { toast.info(isFr ? "Attends la fin de l'étape en cours…" : "Wait for the current step…"); return; }
    if (!file.type.startsWith("image/")) { toast.error(isFr ? "Fichier image requis." : "Image file required."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(isFr ? "Image trop lourde (>10 Mo)." : "Image too large (>10MB)."); return; }

    setBusy(true);
    try {
      const { base64, dataUrl, mimeType } = await readFileAsBase64(file);
      push({ id: uid(), role: "user", kind: "image", imageUrl: dataUrl, mimeType, base64 });
      const loadingId = uid();
      push({ id: loadingId, role: "ora", kind: "loading", label: isFr ? "Je lis ton image…" : "Reading your image…" });

      const res = await serverPost("/analyze/reverse-prompt", { imageBase64: base64, mimeType }, 45_000);

      if (!res.success) {
        removeWhere((m) => m.id === loadingId);
        push({ id: uid(), role: "ora", kind: "text", text: (isFr ? "Pépin côté vision : " : "Vision error: ") + (res.error || "?") });
        return;
      }

      setCurrentPrompt(res.promptText);
      setSourceUrl(res.sourceUrl || null);
      setAvoid(Array.isArray(res.avoid) ? res.avoid : []);
      setDALock(res.daLock || null);
      const extractedSubject = String(res.subject || "").trim();
      setSubject(extractedSubject);
      setHeroObject(String(res.heroObject || "").trim());
      setCurrentScene(String(res.currentScene || "").trim());
      setNarrativeTheme(String(res.narrativeTheme || "").trim());
      replaceLast(
        (m) => m.id === loadingId,
        { id: loadingId, role: "ora", kind: "analysis", schema: res.schema, promptText: res.promptText, imageUrl: dataUrl },
      );
      push({ id: uid(), role: "ora", kind: "models" });

      // Enter conversational brainstorm mode and trigger Ora's first creative turn
      // (only when we have a usable source URL + structured DA — anonymous landing skips this).
      if (res.daLock && res.sourceUrl && res.heroObject) {
        setBrainstormMode(true);
        setBrainstormHistory([]);
        // Fire-and-forget the opening turn from Ora
        const openingLoaderId = uid();
        push({ id: openingLoaderId, role: "ora", kind: "loading", label: isFr ? "Je réfléchis aux pistes…" : "Thinking up directions…" });
        serverPost("/analyze/brainstorm", {
          daLock: res.daLock,
          heroObject: res.heroObject,
          currentScene: res.currentScene,
          narrativeTheme: res.narrativeTheme,
          subject: extractedSubject,
          history: [],
          userMessage: "",
          lang: isFr ? "fr" : "en",
        }, 45_000).then((br) => {
          if (!br?.success) {
            removeWhere((m) => m.id === openingLoaderId);
            return;
          }
          const reply = String(br.reply || "").trim();
          const proposals: BrainstormScene[] = Array.isArray(br.sceneProposals) ? br.sceneProposals : [];
          const finalScenes: BrainstormScene[] = Array.isArray(br.finalScenes) ? br.finalScenes : [];
          const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "ora";
          setBrainstormHistory((h) => [...h, { role: "ora", text: reply }]);
          if (br.readyToGenerate && finalScenes.length > 0) {
            replaceLast(
              (m) => m.id === openingLoaderId,
              { id: openingLoaderId, role: "ora", kind: "brainstormReady", text: reply, scenes: finalScenes, defaultCampaign: slug(extractedSubject) },
            );
          } else {
            replaceLast(
              (m) => m.id === openingLoaderId,
              { id: openingLoaderId, role: "ora", kind: "brainstormReply", text: reply, proposals },
            );
          }
        }).catch(() => removeWhere((m) => m.id === openingLoaderId));
      }
    } catch (err: any) {
      push({ id: uid(), role: "ora", kind: "text", text: String(err?.message || err) });
    } finally {
      setBusy(false);
    }
  }, [busy, isFr, push, replaceLast, removeWhere, serverPost]);

  const handleGenerate = useCallback(async (model: ModelId, promptOverride?: string) => {
    if (busy) return;
    const promptToUse = (promptOverride ?? currentPrompt).trim();
    if (!promptToUse) { toast.error(isFr ? "Pas de prompt à utiliser." : "No prompt available."); return; }
    const chip = MODELS.find((m) => m.id === model);
    const label = chip ? `${chip.emoji} ${chip.label}` : model;

    setBusy(true);
    push({ id: uid(), role: "user", kind: "modelPick", model, label });
    const genId = uid();
    push({ id: genId, role: "ora", kind: "generating", model });

    try {
      // Prefer /analyze/remix when we have a source URL → image-as-reference generation.
      // Fall back to /generate/image-via-get (text-only) when no source is available.
      const useRemix = !!sourceUrl;
      const res = useRemix
        ? await serverPost("/analyze/remix", {
            prompt: promptToUse, imageUrl: sourceUrl, model, aspectRatio: "1:1",
            avoid: avoid.length > 0 ? avoid : undefined,
          }, 180_000)
        : await serverPost("/generate/image-via-get", {
            prompt: promptToUse, models: model, aspectRatio: "1:1",
          }, 180_000);

      const generatedUrl = useRemix
        ? res?.imageUrl
        : res?.results?.[0]?.result?.imageUrl;
      const entryErr = useRemix ? res?.error : res?.results?.[0]?.error;

      if (!res?.success || !generatedUrl) {
        removeWhere((m) => m.id === genId);
        const reason = entryErr || res?.error || "?";
        push({ id: uid(), role: "ora", kind: "text", text: (isFr ? "La génération a échoué : " : "Generation failed: ") + reason });
        return;
      }

      replaceLast(
        (m) => m.id === genId,
        { id: genId, role: "ora", kind: "generated", model, imageUrl: generatedUrl, prompt: promptToUse },
      );

      const token = getAuthHeader();
      if (token) {
        persistAsset(generatedUrl, "image", genId, token).then((p) => {
          if (p.success && p.signedUrl) {
            replaceLast(
              (m) => m.id === genId && m.kind === "generated",
              { id: genId, role: "ora", kind: "generated", model, imageUrl: p.signedUrl!, prompt: promptToUse },
            );
          }
        }).catch(() => {});
      }
    } catch (err: any) {
      removeWhere((m) => m.id === genId);
      push({ id: uid(), role: "ora", kind: "text", text: String(err?.message || err) });
    } finally {
      setBusy(false);
    }
  }, [busy, currentPrompt, sourceUrl, avoid, isFr, push, replaceLast, removeWhere, serverPost, getAuthHeader]);

  /* ── Brainstorm turn (conversational creative director) ── */
  const handleBrainstormTurn = useCallback(async (userText: string) => {
    if (!daLock || !heroObject || !sourceUrl) return;
    const nextHistory = [...brainstormHistory, { role: "user" as const, text: userText }];
    setBrainstormHistory(nextHistory);
    const loaderId = uid();
    push({ id: loaderId, role: "ora", kind: "loading", label: isFr ? "Ora réfléchit…" : "Ora is thinking…" });
    try {
      const br = await serverPost("/analyze/brainstorm", {
        daLock, heroObject, currentScene, narrativeTheme, subject,
        history: nextHistory,
        userMessage: userText,
        lang: isFr ? "fr" : "en",
      }, 45_000);
      if (!br?.success) {
        replaceLast((m) => m.id === loaderId, { id: loaderId, role: "ora", kind: "text", text: br?.error || "brainstorm failed" });
        return;
      }
      const reply = String(br.reply || "").trim();
      const proposals: BrainstormScene[] = Array.isArray(br.sceneProposals) ? br.sceneProposals : [];
      const finalScenes: BrainstormScene[] = Array.isArray(br.finalScenes) ? br.finalScenes : [];
      const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "ora";
      setBrainstormHistory((h) => [...h, { role: "ora", text: reply }]);
      if (br.readyToGenerate && finalScenes.length > 0) {
        replaceLast(
          (m) => m.id === loaderId,
          { id: loaderId, role: "ora", kind: "brainstormReady", text: reply, scenes: finalScenes, defaultCampaign: slug(subject) },
        );
      } else {
        replaceLast(
          (m) => m.id === loaderId,
          { id: loaderId, role: "ora", kind: "brainstormReply", text: reply, proposals },
        );
      }
    } catch (err: any) {
      replaceLast((m) => m.id === loaderId, { id: loaderId, role: "ora", kind: "text", text: String(err?.message || err) });
    }
  }, [brainstormHistory, daLock, heroObject, currentScene, narrativeTheme, subject, sourceUrl, isFr, push, replaceLast, serverPost]);

  /* ── Coherent series ── */
  const handleSeriesGenerate = useCallback(async (campaignName: string, scenes: ScenePreset[], ratios: string[]) => {
    if (busy) return;
    if (!sourceUrl || !daLock || !subject) {
      toast.error(isFr ? "Lance une analyse d'image avant la série." : "Run an image analysis first.");
      return;
    }
    if (scenes.length === 0 || ratios.length === 0) {
      toast.error(isFr ? "Choisis au moins une scène et un format." : "Pick at least one scene and one format.");
      return;
    }

    setBusy(true);
    push({ id: uid(), role: "user", kind: "seriesPick", campaignName, sceneCount: scenes.length, ratioCount: ratios.length });
    const genId = uid();
    push({ id: genId, role: "ora", kind: "seriesGenerating", total: scenes.length * ratios.length });

    try {
      // heroObject + per-scene description are the two pieces that make Kontext
      // actually preserve the hero and move the environment. Pass both through.
      const res = await serverPost("/analyze/series", {
        daLock, subject, heroObject, avoid, scenes, ratios,
        campaignName, imageUrl: sourceUrl,
        model: "kontext-pro",
      }, 240_000);

      if (!res?.success || !Array.isArray(res.items)) {
        removeWhere((m) => m.id === genId);
        push({ id: uid(), role: "ora", kind: "text", text: (isFr ? "La série a échoué : " : "Series failed: ") + (res?.error || "?") });
        return;
      }

      replaceLast(
        (m) => m.id === genId,
        { id: genId, role: "ora", kind: "seriesResult", campaignName: res.campaignName, campaignSlug: res.campaignSlug, items: res.items },
      );
    } catch (err: any) {
      removeWhere((m) => m.id === genId);
      push({ id: uid(), role: "ora", kind: "text", text: String(err?.message || err) });
    } finally {
      setBusy(false);
    }
  }, [busy, sourceUrl, daLock, subject, heroObject, avoid, isFr, push, replaceLast, removeWhere, serverPost]);

  const handleDownloadZip = useCallback(async (campaignSlug: string, items: SeriesItem[]) => {
    const okItems = items.filter((it) => it.status === "ok" && it.imageUrl);
    if (okItems.length === 0) { toast.error(isFr ? "Aucun visuel à télécharger." : "Nothing to download."); return; }
    toast.info(isFr ? "Préparation du ZIP…" : "Preparing the ZIP…");
    try {
      const zip = new JSZip();
      await Promise.all(okItems.map(async (it) => {
        try {
          const r = await fetch(it.imageUrl!);
          if (!r.ok) return;
          const blob = await r.blob();
          zip.file(it.fileName, blob);
        } catch {}
      }));
      const out = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(out);
      a.download = `${campaignSlug || "series"}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toast.error(String(err?.message || err));
    }
  }, [isFr]);

  /* ── Run the series from brainstorm-agreed scenes ── */
  // We pass the scenes as a lightly shaped array (ScenePreset with an extra
  // `description` field, which handleSeriesGenerate forwards to /analyze/series).
  const handleLaunchFromBrainstorm = useCallback((campaignName: string, scenes: BrainstormScene[], ratios: string[]) => {
    const asPresets: ScenePreset[] = scenes.map((sc) => ({
      label: sc.label,
      emoji: "🎬",
      description: sc.description,
      framing: sc.framing,
      angle: sc.angle,
      placement: sc.placement,
      lightingDirection: sc.lightingDirection,
      moment: sc.moment,
    } as ScenePreset));
    handleSeriesGenerate(campaignName, asPresets, ratios);
  }, [handleSeriesGenerate]);

  const handleSend = useCallback(() => {
    const t = inputText.trim();
    if (!t) return;
    setInputText("");
    push({ id: uid(), role: "user", kind: "text", text: t });

    // When in brainstorm mode, route the message to Ora's creative-director turn.
    if (brainstormMode && daLock && heroObject && sourceUrl) {
      handleBrainstormTurn(t);
      return;
    }

    if (!currentPrompt) {
      push({ id: uid(), role: "ora", kind: "text", text: isFr ? "Envoie une image pour démarrer — je décode puis on génère." : "Drop an image to start — I decode then we generate." });
    } else {
      setCurrentPrompt(t);
      push({ id: uid(), role: "ora", kind: "text", text: isFr ? "Noté. Choisis un modèle pour relancer." : "Got it. Pick a model to run again." });
      push({ id: uid(), role: "ora", kind: "models" });
    }
  }, [inputText, currentPrompt, isFr, push, brainstormMode, daLock, heroObject, sourceUrl, handleBrainstormTurn]);

  const startEditPrompt = () => { setPromptDraft(currentPrompt); setEditingPrompt(true); };
  const saveEditPrompt = () => {
    const v = promptDraft.trim();
    if (v) setCurrentPrompt(v);
    setEditingPrompt(false);
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImage(file);
  };

  const resetChat = () => {
    setMessages([{ id: uid(), role: "ora", kind: "text", text: greeting }]);
    setCurrentPrompt("");
    setSourceUrl(null);
    setAvoid([]);
    setDALock(null);
    setSubject("");
    setHeroObject("");
    setCurrentScene("");
    setNarrativeTheme("");
    setBrainstormMode(false);
    setBrainstormHistory([]);
    setEditingPrompt(false);
    setInputText("");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: BG, color: TEXT }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-5 md:px-8 h-14"
        style={{ background: `${BG}F2`, backdropFilter: "blur(14px)", borderBottom: `1px solid ${BORDER}` }}
      >
        <button onClick={() => navigate("/")} className="flex items-center gap-2" aria-label="Ora">
          <OraLogo size={22} />
          <span className="text-[15px] tracking-tight" style={{ fontWeight: 600 }}>Ora</span>
        </button>
        <button
          onClick={resetChat}
          className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[13px] transition hover:bg-black/5"
          style={{ color: MUTED, border: `1px solid ${BORDER}` }}
        >
          <Plus size={14} />
          {isFr ? "Nouveau" : "New"}
        </button>
      </header>

      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(10,10,10,0.4)" }}
          >
            <div className="px-8 py-6 rounded-3xl text-white text-lg font-medium flex items-center gap-3"
                 style={{ background: USER_BG }}>
              <ImageIcon size={22} /> {isFr ? "Dépose ton image" : "Drop your image"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-5 md:px-6 py-8 flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <MessageBubble
                  msg={m}
                  isFr={isFr}
                  busy={busy}
                  editingPrompt={editingPrompt && m.kind === "analysis"}
                  promptDraft={promptDraft}
                  setPromptDraft={setPromptDraft}
                  onStartEdit={startEditPrompt}
                  onSaveEdit={saveEditPrompt}
                  onCancelEdit={() => setEditingPrompt(false)}
                  onPickModel={handleGenerate}
                  onCopyPrompt={(p) => { navigator.clipboard.writeText(p); toast.success(isFr ? "Prompt copié" : "Prompt copied"); }}
                  onDownload={(url) => downloadAsset(url, `ora-${Date.now()}.png`, "image")}
                  onRegenerate={(model, prompt) => handleGenerate(model, prompt)}
                  onSeriesSubmit={handleSeriesGenerate}
                  onDownloadZip={handleDownloadZip}
                  onLaunchFromBrainstorm={handleLaunchFromBrainstorm}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </main>

      <footer
        className="sticky bottom-0 z-10"
        style={{ background: `${BG}F2`, backdropFilter: "blur(14px)", borderTop: `1px solid ${BORDER}` }}
      >
        <div className="max-w-[720px] mx-auto px-5 md:px-6 py-3 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImage(f); e.target.value = ""; }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition hover:bg-black/5 disabled:opacity-40"
            style={{ border: `1px solid ${BORDER}` }}
            aria-label={isFr ? "Joindre une image" : "Attach image"}
          >
            <Paperclip size={18} />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isFr ? "Écris, ou dépose une image…" : "Type, or drop an image…"}
              rows={1}
              className="w-full resize-none rounded-2xl px-4 py-2.5 text-[15px] leading-snug outline-none"
              style={{ background: "#fff", border: `1px solid ${BORDER}`, minHeight: 40, maxHeight: 160 }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={busy || !inputText.trim()}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition disabled:opacity-40"
            style={{ background: USER_BG, color: USER_TEXT }}
            aria-label={isFr ? "Envoyer" : "Send"}
          >
            <Send size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}

function MessageBubble(props: {
  msg: Msg;
  isFr: boolean;
  busy: boolean;
  editingPrompt: boolean;
  promptDraft: string;
  setPromptDraft: (v: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onPickModel: (model: ModelId) => void;
  onCopyPrompt: (p: string) => void;
  onDownload: (url: string) => void;
  onRegenerate: (model: ModelId, prompt: string) => void;
  onSeriesSubmit: (campaignName: string, scenes: ScenePreset[], ratios: string[]) => void;
  onDownloadZip: (campaignSlug: string, items: SeriesItem[]) => void;
  onLaunchFromBrainstorm: (campaignName: string, scenes: BrainstormScene[], ratios: string[]) => void;
}) {
  const { msg, isFr } = props;
  const isUser = msg.role === "user";

  const baseBubble = "max-w-[88%] px-4 py-2.5 text-[15px] leading-relaxed";
  const userStyle: React.CSSProperties = { background: USER_BG, color: USER_TEXT, borderRadius: "22px 22px 6px 22px" };
  const oraStyle:  React.CSSProperties = { background: ORA_BG, color: TEXT, borderRadius: "22px 22px 22px 6px" };

  if (msg.kind === "text") {
    return <div className={baseBubble} style={isUser ? userStyle : oraStyle}>{msg.text}</div>;
  }

  if (msg.kind === "image") {
    return (
      <div className="max-w-[85%]" style={{ borderRadius: "22px 22px 6px 22px", overflow: "hidden" }}>
        <img src={msg.imageUrl} alt="upload" className="block w-full h-auto" style={{ maxHeight: 420, objectFit: "cover" }} />
      </div>
    );
  }

  if (msg.kind === "loading") {
    return (
      <div className={baseBubble} style={oraStyle}>
        <span className="inline-flex items-center gap-2">
          <Loader2 size={15} className="animate-spin" /> {msg.label}
        </span>
      </div>
    );
  }

  if (msg.kind === "generating") {
    const chip = MODELS.find((m) => m.id === msg.model);
    return (
      <div className="max-w-[85%]" style={{ ...oraStyle, padding: 0, overflow: "hidden" }}>
        <div className="aspect-square w-full flex items-center justify-center" style={{ background: "#EAEAEA" }}>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-sm" style={{ color: MUTED }}
          >
            <Sparkles size={20} />
            {chip?.emoji} {isFr ? "Génération en cours…" : "Generating…"}
          </motion.div>
        </div>
      </div>
    );
  }

  if (msg.kind === "modelPick") {
    return <div className={baseBubble} style={userStyle}>→ {msg.label}</div>;
  }

  if (msg.kind === "analysis") {
    const { schema, promptText } = msg;
    const tagEntries: [keyof PromptSchema, string][] = [
      ["subject", isFr ? "sujet" : "subject"],
      ["composition", "composition"],
      ["lighting", isFr ? "lumière" : "lighting"],
      ["palette", "palette"],
      ["style", "style"],
      ["mood", isFr ? "ambiance" : "mood"],
      ["camera", isFr ? "caméra" : "camera"],
      ["finish", isFr ? "finition" : "finish"],
    ];

    return (
      <div className="max-w-[88%] flex flex-col gap-3" style={oraStyle}>
        <div className="px-4 pt-2.5 pb-1 text-[15px]">
          {isFr ? "Voilà ce que je lis :" : "Here's what I see:"}
        </div>

        <div className="mx-2 rounded-2xl p-3" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          {props.editingPrompt ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={props.promptDraft}
                onChange={(e) => props.setPromptDraft(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-lg p-2 text-[14px] outline-none"
                style={{ border: `1px solid ${BORDER}` }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={props.onCancelEdit} className="px-3 h-8 rounded-full text-[13px] hover:bg-black/5" style={{ border: `1px solid ${BORDER}` }}>
                  <X size={13} className="inline mr-1" /> {isFr ? "Annuler" : "Cancel"}
                </button>
                <button onClick={props.onSaveEdit} className="px-3 h-8 rounded-full text-[13px] text-white" style={{ background: USER_BG }}>
                  <Check size={13} className="inline mr-1" /> {isFr ? "Enregistrer" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-[14px] leading-relaxed" style={{ color: TEXT }}>{promptText}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => props.onCopyPrompt(promptText)} className="px-3 h-8 rounded-full text-[13px] hover:bg-black/5 flex items-center gap-1.5" style={{ border: `1px solid ${BORDER}` }}>
                  <Copy size={13} /> {isFr ? "Copier" : "Copy"}
                </button>
                <button onClick={props.onStartEdit} className="px-3 h-8 rounded-full text-[13px] hover:bg-black/5 flex items-center gap-1.5" style={{ border: `1px solid ${BORDER}` }}>
                  <Pencil size={13} /> {isFr ? "Modifier" : "Edit"}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {tagEntries.map(([k, label]) => {
            const v = (schema[k] || "").toString();
            if (!v) return null;
            return (
              <span key={k} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[12px]"
                    style={{ background: "#fff", border: `1px solid ${BORDER}`, color: MUTED }} title={v}>
                <b style={{ color: TEXT, fontWeight: 600 }}>{label}</b>
                <span className="truncate" style={{ maxWidth: 160 }}>{v}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  if (msg.kind === "models") {
    return (
      <div className="max-w-[88%] flex flex-col gap-2" style={oraStyle}>
        <div className="px-4 pt-2.5 text-[15px]">
          {isFr ? "On teste avec quel modèle ?" : "Which model should we try?"}
        </div>
        <div className="px-3 pb-3 flex flex-wrap gap-1.5">
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => props.onPickModel(m.id)} disabled={props.busy}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[13px] bg-white hover:bg-black hover:text-white transition disabled:opacity-40"
                    style={{ border: `1px solid ${BORDER}` }} title={m.hint}>
              <span>{m.emoji}</span>
              <span style={{ fontWeight: 600 }}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (msg.kind === "generated") {
    const chip = MODELS.find((m) => m.id === msg.model);
    return (
      <div className="max-w-[88%] flex flex-col gap-2" style={{ ...oraStyle, padding: 0, overflow: "hidden" }}>
        <img src={msg.imageUrl} alt="generated" className="block w-full h-auto" />
        <div className="px-3 pt-1 pb-3 flex flex-wrap gap-1.5 items-center">
          <span className="text-[12px]" style={{ color: MUTED }}>{chip?.emoji} {chip?.label}</span>
          <span className="flex-1" />
          <button onClick={() => props.onRegenerate(msg.model, msg.prompt)} className="px-3 h-8 rounded-full text-[13px] hover:bg-black/5 flex items-center gap-1.5 bg-white" style={{ border: `1px solid ${BORDER}` }}>
            <RotateCcw size={13} /> {isFr ? "Rejouer" : "Regen"}
          </button>
          <button onClick={() => props.onDownload(msg.imageUrl)} className="px-3 h-8 rounded-full text-[13px] text-white flex items-center gap-1.5" style={{ background: USER_BG }}>
            <Download size={13} /> {isFr ? "Télécharger" : "Download"}
          </button>
        </div>
      </div>
    );
  }

  if (msg.kind === "brainstormReply") {
    return (
      <div className="max-w-[88%] flex flex-col gap-2" style={oraStyle}>
        <div className="px-4 pt-2.5 pb-0.5 text-[15px] whitespace-pre-wrap">{msg.text}</div>
        {msg.proposals.length > 0 && (
          <div className="px-3 pb-3 flex flex-col gap-1.5">
            {msg.proposals.map((p, i) => (
              <div key={i} className="px-3 py-2 rounded-xl text-[13px]" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                <div className="font-mono text-[11.5px]" style={{ color: MUTED }}>{p.label}</div>
                <div className="mt-0.5">{p.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (msg.kind === "brainstormReady") {
    return <BrainstormReadyBubble msg={msg} isFr={isFr} busy={props.busy} onLaunch={props.onLaunchFromBrainstorm} oraStyle={oraStyle} />;
  }

  if (msg.kind === "seriesPick") {
    return (
      <div className={baseBubble} style={userStyle}>
        → {isFr ? "Série" : "Series"} <b>{msg.campaignName}</b> · {msg.sceneCount} {isFr ? "scènes" : "scenes"} × {msg.ratioCount} {isFr ? "formats" : "formats"}
      </div>
    );
  }

  if (msg.kind === "seriesGenerating") {
    return (
      <div className={baseBubble} style={oraStyle}>
        <span className="inline-flex items-center gap-2">
          <Loader2 size={15} className="animate-spin" />
          {isFr ? `Génération de ${msg.total} visuels…` : `Generating ${msg.total} visuals…`}
        </span>
        <div className="text-[12px] mt-1" style={{ color: MUTED }}>
          {isFr ? "DA verrouillée + seed partagée — peut prendre 30-90 s." : "DA locked + shared seed — may take 30-90 s."}
        </div>
      </div>
    );
  }

  if (msg.kind === "seriesResult") {
    const okItems = msg.items.filter((it) => it.status === "ok");
    const failed = msg.items.length - okItems.length;
    return (
      <div className="max-w-[88%] flex flex-col gap-2" style={oraStyle}>
        <div className="px-4 pt-2.5 text-[15px]">
          {isFr ? "Voilà ta série" : "Here is your series"} <b>{msg.campaignName}</b>
          {failed > 0 && (
            <span className="ml-2 text-[12px]" style={{ color: "#B91C1C" }}>· {failed} {isFr ? "échouée(s)" : "failed"}</span>
          )}
        </div>
        <div className="px-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {msg.items.map((it, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
              {it.status === "ok" && it.imageUrl ? (
                <img src={it.imageUrl} alt={it.fileName} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center text-[11px] text-center px-2" style={{ color: "#B91C1C" }}>
                  {it.error?.slice(0, 80) || "failed"}
                </div>
              )}
              <div className="px-2 py-1.5 flex items-center justify-between gap-1">
                <span className="text-[10.5px] font-mono truncate" style={{ color: MUTED }} title={it.fileName}>
                  {it.fileName}
                </span>
                {it.status === "ok" && it.imageUrl && (
                  <button
                    onClick={() => props.onDownload(it.imageUrl!)}
                    className="shrink-0 w-6 h-6 rounded-full hover:bg-black/5 flex items-center justify-center"
                    aria-label="download"
                  >
                    <Download size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="px-3 pb-3 flex flex-wrap gap-2 items-center">
          <span className="text-[12px]" style={{ color: MUTED }}>{okItems.length} / {msg.items.length}</span>
          <span className="flex-1" />
          <button
            onClick={() => props.onDownloadZip(msg.campaignSlug, msg.items)}
            disabled={okItems.length === 0}
            className="px-3 h-8 rounded-full text-[13px] text-white flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: USER_BG }}
          >
            <Package size={13} /> {isFr ? "Télécharger ZIP" : "Download ZIP"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

/* ═══ Brainstorm-agreed bubble: ready to launch the series ═══ */
function BrainstormReadyBubble({ msg, isFr, busy, onLaunch, oraStyle }: {
  msg: { text: string; scenes: BrainstormScene[]; defaultCampaign: string };
  isFr: boolean;
  busy: boolean;
  onLaunch: (campaignName: string, scenes: BrainstormScene[], ratios: string[]) => void;
  oraStyle: React.CSSProperties;
}) {
  const [campaign, setCampaign] = useState(msg.defaultCampaign || "ora");
  const [pickedLabels, setPickedLabels] = useState<string[]>(msg.scenes.map((s) => s.label));
  const [pickedRatios, setPickedRatios] = useState<string[]>(["1:1", "9:16"]);

  const toggleScene = (label: string) =>
    setPickedLabels((xs) => xs.includes(label) ? xs.filter((x) => x !== label) : [...xs, label]);
  const toggleRatio = (id: string) =>
    setPickedRatios((xs) => xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);

  const scenesToRun = msg.scenes.filter((s) => pickedLabels.includes(s.label));
  const total = scenesToRun.length * pickedRatios.length;
  const tooMany = total > 18;

  return (
    <div className="max-w-[88%] flex flex-col gap-2" style={oraStyle}>
      <div className="px-4 pt-2.5 pb-0.5 text-[15px] whitespace-pre-wrap">{msg.text}</div>

      <div className="mx-3 flex flex-col gap-2 py-1">
        {msg.scenes.map((sc) => {
          const on = pickedLabels.includes(sc.label);
          return (
            <button
              key={sc.label}
              onClick={() => toggleScene(sc.label)}
              className="text-left px-3 py-2 rounded-xl text-[13px] transition"
              style={{
                background: on ? USER_BG : "#fff",
                color: on ? USER_TEXT : TEXT,
                border: `1px solid ${on ? USER_BG : BORDER}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                     style={{ background: on ? "#fff" : "transparent", border: `1.5px solid ${on ? "#fff" : BORDER}` }}>
                  {on && <Check size={9} color={USER_BG} />}
                </div>
                <span className="font-mono text-[11.5px]" style={{ opacity: 0.7 }}>{sc.label}</span>
              </div>
              <div className="mt-1 leading-snug">{sc.description}</div>
            </button>
          );
        })}
      </div>

      <div className="mx-3 mt-1 mb-2">
        <label className="text-[12px] uppercase tracking-wide block mb-1" style={{ color: MUTED }}>
          {isFr ? "Nom de campagne" : "Campaign name"}
        </label>
        <input
          value={campaign}
          onChange={(e) => setCampaign(e.target.value)}
          placeholder="ora-campaign"
          className="w-full rounded-lg px-3 py-2 text-[14px] outline-none font-mono"
          style={{ background: "#fff", border: `1px solid ${BORDER}` }}
        />
      </div>

      <div className="mx-3 mb-2">
        <div className="text-[12px] uppercase tracking-wide mb-1.5" style={{ color: MUTED }}>
          {isFr ? "Formats" : "Formats"}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RATIO_PRESETS.map((r) => {
            const on = pickedRatios.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggleRatio(r.id)}
                title={r.hint}
                className="px-2.5 h-8 rounded-full text-[12.5px] inline-flex items-center gap-1.5 transition"
                style={{
                  background: on ? USER_BG : "#fff",
                  color: on ? USER_TEXT : TEXT,
                  border: `1px solid ${on ? USER_BG : BORDER}`,
                  fontWeight: 600,
                }}
              >
                <span>{r.emoji}</span> {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 pb-3 flex items-center gap-2">
        <span className="text-[12px]" style={{ color: tooMany ? "#B91C1C" : MUTED }}>
          {total} {isFr ? "visuels" : "visuals"}{tooMany ? " — max 18" : ""}
        </span>
        <span className="flex-1" />
        <button
          disabled={busy || total === 0 || tooMany || !campaign.trim()}
          onClick={() => onLaunch(campaign.trim(), scenesToRun, pickedRatios)}
          className="px-3 h-9 rounded-full text-[13px] text-white flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: USER_BG }}
        >
          <Sparkles size={13} /> {isFr ? "Lancer la série" : "Launch the series"}
        </button>
      </div>
    </div>
  );
}

/* ═══ Series picker (campaign + scenes + ratios) — kept for manual flow fallback ═══ */
function SeriesPickerBubble({ defaultCampaign, isFr, busy, onSubmit, oraStyle }: {
  defaultCampaign: string;
  isFr: boolean;
  busy: boolean;
  onSubmit: (campaignName: string, scenes: ScenePreset[], ratios: string[]) => void;
  oraStyle: React.CSSProperties;
}) {
  const [campaign, setCampaign] = useState(defaultCampaign || "ora");
  const [pickedScenes, setPickedScenes] = useState<string[]>(SCENE_PRESETS.map((s) => s.label));
  const [pickedRatios, setPickedRatios] = useState<string[]>(["1:1", "9:16"]);

  const toggleScene = (label: string) =>
    setPickedScenes((xs) => xs.includes(label) ? xs.filter((x) => x !== label) : [...xs, label]);
  const toggleRatio = (id: string) =>
    setPickedRatios((xs) => xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]);

  const total = pickedScenes.length * pickedRatios.length;
  const tooMany = total > 18;

  return (
    <div className="max-w-[88%] flex flex-col gap-3" style={oraStyle}>
      <div className="px-4 pt-2.5 text-[15px]">
        <span className="inline-flex items-center gap-1.5">
          <Layers size={14} /> {isFr ? "Décliner en série cohérente" : "Decline as a coherent series"}
        </span>
      </div>

      <div className="mx-3 flex flex-col gap-3">
        <div>
          <label className="text-[12px] uppercase tracking-wide block mb-1" style={{ color: MUTED }}>
            {isFr ? "Nom de campagne" : "Campaign name"}
          </label>
          <input
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="ora-campaign"
            className="w-full rounded-lg px-3 py-2 text-[14px] outline-none font-mono"
            style={{ background: "#fff", border: `1px solid ${BORDER}` }}
          />
        </div>

        <div>
          <div className="text-[12px] uppercase tracking-wide mb-1.5" style={{ color: MUTED }}>
            {isFr ? "Scènes (DA verrouillée)" : "Scenes (DA locked)"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SCENE_PRESETS.map((s) => {
              const on = pickedScenes.includes(s.label);
              return (
                <button
                  key={s.label}
                  onClick={() => toggleScene(s.label)}
                  className="px-2.5 h-8 rounded-full text-[12.5px] inline-flex items-center gap-1.5 transition"
                  style={{
                    background: on ? USER_BG : "#fff",
                    color: on ? USER_TEXT : TEXT,
                    border: `1px solid ${on ? USER_BG : BORDER}`,
                    fontWeight: 600,
                  }}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[12px] uppercase tracking-wide mb-1.5" style={{ color: MUTED }}>
            {isFr ? "Formats" : "Formats"}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RATIO_PRESETS.map((r) => {
              const on = pickedRatios.includes(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleRatio(r.id)}
                  title={r.hint}
                  className="px-2.5 h-8 rounded-full text-[12.5px] inline-flex items-center gap-1.5 transition"
                  style={{
                    background: on ? USER_BG : "#fff",
                    color: on ? USER_TEXT : TEXT,
                    border: `1px solid ${on ? USER_BG : BORDER}`,
                    fontWeight: 600,
                  }}
                >
                  <span>{r.emoji}</span> {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 flex items-center gap-2">
        <span className="text-[12px]" style={{ color: tooMany ? "#B91C1C" : MUTED }}>
          {total} {isFr ? "visuels" : "visuals"} {tooMany ? (isFr ? " — max 18" : " — max 18") : ""}
        </span>
        <span className="flex-1" />
        <button
          disabled={busy || total === 0 || tooMany || !campaign.trim()}
          onClick={() => {
            const scenes = SCENE_PRESETS.filter((s) => pickedScenes.includes(s.label));
            onSubmit(campaign.trim(), scenes, pickedRatios);
          }}
          className="px-3 h-9 rounded-full text-[13px] text-white flex items-center gap-1.5 disabled:opacity-40"
          style={{ background: USER_BG }}
        >
          <Sparkles size={13} /> {isFr ? "Générer la série" : "Generate the series"}
        </button>
      </div>
    </div>
  );
}

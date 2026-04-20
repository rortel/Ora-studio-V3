import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Paperclip, Send, Loader2, Download, Copy, RotateCcw,
  Check, Plus, Sparkles, Image as ImageIcon, Pencil, X,
} from "lucide-react";
import { toast } from "sonner";
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

type Msg =
  | { id: string; role: "ora";  kind: "text";       text: string }
  | { id: string; role: "user"; kind: "text";       text: string }
  | { id: string; role: "user"; kind: "image";      imageUrl: string; mimeType: string; base64?: string }
  | { id: string; role: "ora";  kind: "loading";    label: string }
  | { id: string; role: "ora";  kind: "analysis";   schema: PromptSchema; promptText: string; imageUrl: string }
  | { id: string; role: "ora";  kind: "models" }
  | { id: string; role: "user"; kind: "modelPick";  model: ModelId; label: string }
  | { id: string; role: "ora";  kind: "generating"; model: ModelId }
  | { id: string; role: "ora";  kind: "generated";  model: ModelId; imageUrl: string; prompt: string };

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
      replaceLast(
        (m) => m.id === loadingId,
        { id: loadingId, role: "ora", kind: "analysis", schema: res.schema, promptText: res.promptText, imageUrl: dataUrl },
      );
      push({ id: uid(), role: "ora", kind: "models" });
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
      const res = await serverPost("/generate/image-via-get", {
        prompt: promptToUse, models: model, aspectRatio: "1:1",
      }, 180_000);

      const entry = res?.results?.[0];
      const generatedUrl = entry?.result?.imageUrl;
      if (!res?.success || !entry?.success || !generatedUrl) {
        removeWhere((m) => m.id === genId);
        const reason = entry?.error || res?.error || "?";
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
  }, [busy, currentPrompt, isFr, push, replaceLast, removeWhere, serverPost, getAuthHeader]);

  const handleSend = useCallback(() => {
    const t = inputText.trim();
    if (!t) return;
    setInputText("");
    push({ id: uid(), role: "user", kind: "text", text: t });
    if (!currentPrompt) {
      push({ id: uid(), role: "ora", kind: "text", text: isFr ? "Envoie une image pour démarrer — je décode puis on génère." : "Drop an image to start — I decode then we generate." });
    } else {
      setCurrentPrompt(t);
      push({ id: uid(), role: "ora", kind: "text", text: isFr ? "Noté. Choisis un modèle pour relancer." : "Got it. Pick a model to run again." });
      push({ id: uid(), role: "ora", kind: "models" });
    }
  }, [inputText, currentPrompt, isFr, push]);

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

  return null;
}

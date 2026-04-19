import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, Send, Search, Image as ImageIcon, FileText, Film, Music,
  Paperclip, ArrowUp, Copy, Download, Bookmark, RefreshCw, Check,
  MessageSquare, Loader2, Wand2, Palette, Camera, Zap, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

interface Asset {
  id: string;
  type: string;
  prompt: string;
  timestamp: string;
  preview: any;
  customName?: string;
  classification?: { category: string; tags: string[]; description: string; dominant_colors: string[] };
}

type BubbleRole = "assistant" | "user";
interface Bubble {
  id: string;
  role: BubbleRole;
  kind: "asset" | "text" | "thinking" | "regen-image" | "regen-text";
  text?: string;
  imageUrl?: string;
  assetId?: string;
  model?: string;
  timestamp: number;
}

/* ═══════════════════════════════════
   SUGGESTION CHIPS
   ═══════════════════════════════════ */

const IMAGE_SUGGESTIONS = [
  { icon: Palette, label: "Plus vibrant", prompt: "Make it more vibrant with richer colors" },
  { icon: Camera, label: "Autre angle", prompt: "Try a different camera angle" },
  { icon: Wand2, label: "Cinématique", prompt: "Make it look cinematic, dramatic lighting" },
  { icon: Sparkles, label: "Minimaliste", prompt: "Simpler, cleaner, more minimalist" },
  { icon: Zap, label: "Plus premium", prompt: "Make it feel more premium and luxurious" },
];
const TEXT_SUGGESTIONS = [
  { icon: Wand2, label: "Plus court", prompt: "Make it shorter and punchier" },
  { icon: Sparkles, label: "Plus pro", prompt: "Make the tone more professional" },
  { icon: Palette, label: "Plus créatif", prompt: "Make it bolder, more creative" },
  { icon: Zap, label: "Pour LinkedIn", prompt: "Rewrite it for LinkedIn" },
];

/* ═══════════════════════════════════
   HELPERS
   ═══════════════════════════════════ */

function getAssetImageUrl(a: Asset): string | null {
  if (!a.preview) return null;
  if (a.preview.kind === "image") return a.preview.imageUrl || null;
  if (a.preview.imageUrl) return a.preview.imageUrl;
  if (a.preview.thumbnailUrl) return a.preview.thumbnailUrl;
  if (a.preview.assets?.[0]?.imageUrl) return a.preview.assets[0].imageUrl;
  return null;
}
function getAssetText(a: Asset): string | null {
  if (!a.preview) return null;
  if (a.preview.kind === "text") return a.preview.text || null;
  if (a.preview.text) return a.preview.text;
  if (a.preview.copy?.headline) return `${a.preview.copy.headline}\n\n${a.preview.copy.body || ""}`.trim();
  return null;
}
function getAssetVideoUrl(a: Asset): string | null {
  return a.preview?.videoUrl || null;
}
function getAssetAudioUrl(a: Asset): string | null {
  return a.preview?.audioUrl || null;
}
function getAssetName(a: Asset): string {
  return a.customName || a.prompt || "Untitled";
}
function getAssetKind(a: Asset): "image" | "text" | "video" | "audio" | "other" {
  if (getAssetImageUrl(a)) return "image";
  if (getAssetVideoUrl(a)) return "video";
  if (getAssetAudioUrl(a)) return "audio";
  if (getAssetText(a)) return "text";
  return "other";
}
function typeIcon(kind: string) {
  switch (kind) {
    case "image": return ImageIcon;
    case "text": return FileText;
    case "video": return Film;
    case "audio": return Music;
    default: return Sparkles;
  }
}
function formatTimeAgo(ts: number | string): string {
  const d = typeof ts === "number" ? ts : new Date(ts).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* ═══════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════ */

export function AssetsChatPage() {
  return (
    <RouteGuard requireAuth requireFeature="hub">
      <AssetsChatContent />
    </RouteGuard>
  );
}

function AssetsChatContent() {
  const { getAuthHeader } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "text" | "video" | "audio">("all");
  const [bubbles, setBubbles] = useState<Record<string, Bubble[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── API helpers ───────────────────────── */
  const serverPost = useCallback(
    (path: string, body: any, timeout = 60_000) => {
      const token = getAuthHeader();
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      return fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, _token: token }),
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .finally(() => clearTimeout(t));
    },
    [getAuthHeader]
  );
  const serverGet = useCallback(
    (path: string, timeout = 60_000) => {
      const token = getAuthHeader();
      const sep = path.includes("?") ? "&" : "?";
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      return fetch(`${API_BASE}${path}${sep}_token=${encodeURIComponent(token)}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        signal: ctrl.signal,
      })
        .then((r) => r.json())
        .finally(() => clearTimeout(t));
    },
    [getAuthHeader]
  );

  /* ── Fetch assets ──────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await serverPost("/library/list", {});
        const items: Asset[] = res?.items || [];
        setAssets(items);
        if (items.length && !activeId) setActiveId(items[0].id);
      } catch (err) {
        console.error("[AssetsChat] list error:", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Filter + search ───────────────────── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (filter !== "all" && getAssetKind(a) !== filter) return false;
      if (!q) return true;
      return (
        getAssetName(a).toLowerCase().includes(q) ||
        (a.classification?.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [assets, search, filter]);

  const active = useMemo(() => assets.find((a) => a.id === activeId) || null, [assets, activeId]);

  /* ── Seed first bubble when asset picked ── */
  useEffect(() => {
    if (!active) return;
    setBubbles((prev) => {
      if (prev[active.id]?.length) return prev;
      const kind = getAssetKind(active);
      const first: Bubble = {
        id: `seed-${active.id}`,
        role: "assistant",
        kind: "asset",
        assetId: active.id,
        text: getAssetText(active) || undefined,
        imageUrl: getAssetImageUrl(active) || undefined,
        model: (active as any)?.model?.name || undefined,
        timestamp: Date.now() - 1000,
      };
      const greet: Bubble = {
        id: `greet-${active.id}`,
        role: "assistant",
        kind: "text",
        text:
          kind === "image"
            ? "Voici ton asset. Dis-moi ce que tu veux changer et je le régénère."
            : kind === "text"
            ? "Voici ton texte. Demande-moi de le reformuler comme tu veux."
            : "Voici ton asset. Envoie-moi un message pour le régénérer.",
        timestamp: Date.now(),
      };
      return { ...prev, [active.id]: [first, greet] };
    });
  }, [active]);

  /* ── Auto-scroll chat ──────────────────── */
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [bubbles, activeId, sending]);

  /* ── Send handler ──────────────────────── */
  const handleSend = useCallback(
    async (overridePrompt?: string) => {
      if (!active) return;
      const prompt = (overridePrompt ?? input).trim();
      if (!prompt || sending) return;
      const kind = getAssetKind(active);
      const aid = active.id;

      const userB: Bubble = {
        id: `u-${Date.now()}`,
        role: "user",
        kind: "text",
        text: prompt,
        timestamp: Date.now(),
      };
      const thinkB: Bubble = {
        id: `t-${Date.now()}`,
        role: "assistant",
        kind: "thinking",
        timestamp: Date.now(),
      };
      setBubbles((p) => ({ ...p, [aid]: [...(p[aid] || []), userB, thinkB] }));
      setInput("");
      setSending(true);

      try {
        if (kind === "image") {
          const basePrompt = getAssetName(active);
          const fullPrompt = `${basePrompt}. ${prompt}`;
          const res = await serverPost(
            "/generate/image-start",
            { prompt: fullPrompt, model: "flux-pro", aspectRatio: "1:1" },
            90_000
          );
          const url = res?.imageUrl || res?.result?.imageUrl;
          const replyB: Bubble = url
            ? {
                id: `a-${Date.now()}`,
                role: "assistant",
                kind: "regen-image",
                imageUrl: url,
                text: prompt,
                model: "flux-pro",
                timestamp: Date.now(),
              }
            : {
                id: `a-${Date.now()}`,
                role: "assistant",
                kind: "text",
                text: "Je n'ai pas pu régénérer cette image. Essaie une autre formulation.",
                timestamp: Date.now(),
              };
          setBubbles((p) => ({
            ...p,
            [aid]: [...(p[aid] || []).filter((b) => b.id !== thinkB.id), replyB],
          }));
        } else if (kind === "text") {
          const base = getAssetText(active) || getAssetName(active);
          const sys = "You are a world-class creative writer. Rewrite the given text following the user's instruction. Keep it concise, bold and on-brand. Return ONLY the rewritten text.";
          const composed = `Original:\n${base}\n\nInstruction:\n${prompt}`;
          const res = await serverGet(
            `/generate/text-multi-get?prompt=${encodeURIComponent(composed)}&models=gpt-5&systemPrompt=${encodeURIComponent(sys)}&maxTokens=1200`,
            90_000
          );
          const text = res?.results?.find((r: any) => r?.result?.text)?.result?.text;
          const replyB: Bubble = text
            ? {
                id: `a-${Date.now()}`,
                role: "assistant",
                kind: "regen-text",
                text,
                model: "gpt-5",
                timestamp: Date.now(),
              }
            : {
                id: `a-${Date.now()}`,
                role: "assistant",
                kind: "text",
                text: "Je n'ai pas pu générer une nouvelle version. Réessaie avec une consigne différente.",
                timestamp: Date.now(),
              };
          setBubbles((p) => ({
            ...p,
            [aid]: [...(p[aid] || []).filter((b) => b.id !== thinkB.id), replyB],
          }));
        } else {
          const replyB: Bubble = {
            id: `a-${Date.now()}`,
            role: "assistant",
            kind: "text",
            text: "La régénération pour ce type d'asset arrive bientôt.",
            timestamp: Date.now(),
          };
          setBubbles((p) => ({
            ...p,
            [aid]: [...(p[aid] || []).filter((b) => b.id !== thinkB.id), replyB],
          }));
        }
      } catch (err) {
        console.error("[AssetsChat] send error:", err);
        setBubbles((p) => ({
          ...p,
          [aid]: [
            ...(p[aid] || []).filter((b) => b.id !== thinkB.id),
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              kind: "text",
              text: "Oups, la génération a échoué. Réessaie dans un instant.",
              timestamp: Date.now(),
            },
          ],
        }));
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [active, input, sending, serverPost, serverGet]
  );

  /* ── Save regen to library ─────────────── */
  const handleSave = useCallback(
    async (b: Bubble) => {
      if (!active) return;
      const id = `regen-${Date.now()}`;
      try {
        const type = b.kind === "regen-image" ? "image" : "text";
        const preview =
          type === "image"
            ? { kind: "image", imageUrl: b.imageUrl }
            : { kind: "text", text: b.text };
        await serverPost("/library/items", {
          item: {
            id,
            type,
            model: { id: b.model, name: b.model, provider: "ora", speed: "fast", quality: 5 },
            prompt: b.text || getAssetName(active),
            timestamp: new Date().toISOString(),
            preview,
          },
        });
        setSavedIds((p) => new Set(p).add(b.id));
        toast.success("Ajouté à ta bibliothèque");
      } catch (err) {
        console.error("[AssetsChat] save error:", err);
        toast.error("Impossible de sauvegarder");
      }
    },
    [active, serverPost]
  );

  const handleCopy = useCallback(async (b: Bubble) => {
    try {
      if (b.imageUrl) await navigator.clipboard.writeText(b.imageUrl);
      else if (b.text) await navigator.clipboard.writeText(b.text);
      setCopiedId(b.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      /* noop */
    }
  }, []);

  /* ═══════════════════════════════════════ */
  const kind = active ? getAssetKind(active) : "image";
  const suggestions = kind === "text" ? TEXT_SUGGESTIONS : IMAGE_SUGGESTIONS;
  const currentBubbles = activeId ? bubbles[activeId] || [] : [];

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(1200px 600px at 15% -5%, rgba(124,58,237,0.08), transparent 60%), radial-gradient(900px 500px at 95% 5%, rgba(236,72,153,0.06), transparent 60%), var(--surface-0)",
      }}
    >
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(500px 400px at 85% 90%, rgba(91,91,255,0.05), transparent 70%)",
        }}
      />

      <div className="relative flex flex-col md:flex-row h-screen">
        {/* ───────── Left rail ───────── */}
        <aside
          className="flex md:flex-col md:w-[320px] md:h-screen md:border-r overflow-hidden"
          style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)" }}
        >
          <div className="hidden md:block p-5 pb-3">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
              >
                <MessageSquare size={15} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Ora Chat</div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{assets.length} assets</div>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--text-tertiary)" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none transition-all"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid transparent",
                  fontSize: 13,
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 overflow-x-auto">
              {(["all", "image", "text", "video", "audio"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-full whitespace-nowrap transition-all"
                  style={{
                    fontSize: 11,
                    fontWeight: filter === f ? 600 : 500,
                    background: filter === f ? "var(--text-primary)" : "transparent",
                    color: filter === f ? "#fff" : "var(--text-secondary)",
                    border: filter === f ? "1px solid transparent" : "1px solid var(--border)",
                  }}
                >
                  {f === "all" ? "Tous" : f[0].toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Asset list */}
          <div className="flex-1 overflow-y-auto overflow-x-auto md:overflow-x-hidden md:px-3 md:pb-4 px-3 py-3 flex md:flex-col gap-2">
            {loading && (
              <div className="flex items-center justify-center w-full py-12" style={{ color: "var(--text-tertiary)" }}>
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-12 px-4" style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
                Aucun asset trouvé.
              </div>
            )}
            {filtered.map((a) => {
              const isActive = a.id === activeId;
              const k = getAssetKind(a);
              const Icon = typeIcon(k);
              const img = getAssetImageUrl(a);
              return (
                <motion.button
                  key={a.id}
                  onClick={() => setActiveId(a.id)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative flex-shrink-0 md:w-full flex md:flex-row flex-col items-start gap-3 p-3 rounded-2xl text-left transition-all"
                  style={{
                    background: isActive ? "#fff" : "transparent",
                    border: `1px solid ${isActive ? "var(--accent-warm-ring)" : "transparent"}`,
                    boxShadow: isActive ? "0 8px 24px rgba(124,58,237,0.12)" : "none",
                    minWidth: 180,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{
                      background: img
                        ? "#000"
                        : "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))",
                    }}
                  >
                    {img ? (
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon size={16} style={{ color: "var(--accent)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="truncate"
                      style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}
                    >
                      {getAssetName(a)}
                    </div>
                    <div
                      className="flex items-center gap-1.5 mt-0.5"
                      style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      <Icon size={10} />
                      <span>{k}</span>
                      <span>·</span>
                      <span>{formatTimeAgo(a.timestamp)}</span>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="asset-active-dot"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* ───────── Main chat ───────── */}
        <main className="flex-1 flex flex-col min-h-0 relative">
          {/* Topbar */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              {active ? (
                <>
                  <div
                    className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ background: "#000" }}
                  >
                    {getAssetImageUrl(active) ? (
                      <img src={getAssetImageUrl(active)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles size={14} color="#fff" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="truncate"
                      style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}
                    >
                      {getAssetName(active)}
                    </div>
                    <div
                      className="flex items-center gap-1.5"
                      style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: "#22c55e" }}
                      />
                      <span>Ora est prêt — {kind}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600 }}>Ora Chat</div>
              )}
            </div>
          </div>

          {/* Chat stream */}
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto px-4 md:px-10 py-8"
            style={{ scrollBehavior: "smooth" }}
          >
            {!active && !loading && (
              <EmptyHero />
            )}

            <div className="max-w-[720px] mx-auto flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {currentBubbles.map((b) => (
                  <ChatBubble
                    key={b.id}
                    bubble={b}
                    onSave={() => handleSave(b)}
                    onCopy={() => handleCopy(b)}
                    saved={savedIds.has(b.id)}
                    copied={copiedId === b.id}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Composer */}
          <div
            className="px-4 md:px-10 pt-3 pb-5 border-t"
            style={{ borderColor: "var(--border)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(14px)" }}
          >
            <div className="max-w-[720px] mx-auto">
              {/* Suggestions */}
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                {suggestions.map((s) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      key={s.label}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleSend(s.prompt)}
                      disabled={sending || !active}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 transition-all disabled:opacity-40"
                      style={{
                        background: "#fff",
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <Icon size={12} style={{ color: "var(--accent)" }} />
                      {s.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* Input pill */}
              <div
                className="relative flex items-end gap-2 p-2 rounded-3xl transition-all"
                style={{
                  background: "#fff",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                }}
              >
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  title="Attach"
                >
                  <Paperclip size={15} />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    active
                      ? kind === "text"
                        ? "Demande-moi de reformuler…"
                        : "Décris ce que tu veux changer…"
                      : "Sélectionne un asset pour commencer"
                  }
                  disabled={!active}
                  rows={1}
                  className="flex-1 resize-none outline-none bg-transparent px-2 py-2"
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    maxHeight: 160,
                    color: "var(--text-primary)",
                  }}
                />
                <motion.button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sending || !active}
                  whileHover={{ scale: input.trim() && !sending ? 1.05 : 1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
                  style={{
                    background:
                      input.trim() && !sending && active
                        ? "linear-gradient(135deg, #7C3AED, #EC4899)"
                        : "var(--surface-3)",
                    color: "#fff",
                    boxShadow:
                      input.trim() && !sending && active
                        ? "0 6px 20px rgba(124,58,237,0.35)"
                        : "none",
                  }}
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} strokeWidth={2.5} />}
                </motion.button>
              </div>
              <div
                className="mt-2 text-center"
                style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}
              >
                Enter pour envoyer · Shift + Enter pour un saut de ligne
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   CHAT BUBBLE
   ═══════════════════════════════════ */

function ChatBubble({
  bubble,
  onSave,
  onCopy,
  saved,
  copied,
}: {
  bubble: Bubble;
  onSave: () => void;
  onCopy: () => void;
  saved: boolean;
  copied: boolean;
}) {
  const isUser = bubble.role === "user";

  if (bubble.kind === "thinking") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="flex items-center gap-3"
      >
        <Avatar />
        <div
          className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-md"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 6 }}>
            Ora regénère…
          </span>
        </div>
      </motion.div>
    );
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex justify-end"
      >
        <div
          className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md"
          style={{
            background: "linear-gradient(135deg, #111, #333)",
            color: "#fff",
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {bubble.text}
        </div>
      </motion.div>
    );
  }

  // Assistant bubbles
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <Avatar />
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl rounded-tl-md overflow-hidden"
          style={{ background: "#fff", border: "1px solid var(--border)" }}
        >
          {bubble.imageUrl && (
            <div className="relative bg-black">
              <img
                src={bubble.imageUrl}
                alt=""
                className="w-full block"
                style={{ maxHeight: 520, objectFit: "cover" }}
              />
              {bubble.model && (
                <div
                  className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(8px)",
                    fontSize: 10,
                    fontWeight: 500,
                    color: "#fff",
                    letterSpacing: "0.02em",
                  }}
                >
                  {bubble.model}
                </div>
              )}
            </div>
          )}
          {bubble.text && bubble.kind !== "asset" && (
            <div
              className="px-4 py-3 whitespace-pre-wrap"
              style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-primary)" }}
            >
              {bubble.text}
            </div>
          )}
          {bubble.kind === "asset" && bubble.text && (
            <div
              className="px-4 py-3 whitespace-pre-wrap"
              style={{ fontSize: 14, lineHeight: 1.55, color: "var(--text-primary)" }}
            >
              {bubble.text}
            </div>
          )}
        </div>

        {/* Actions */}
        {(bubble.kind === "regen-image" || bubble.kind === "regen-text") && (
          <div className="flex items-center gap-1 mt-1.5 ml-1">
            <ActionBtn icon={copied ? Check : Copy} label={copied ? "Copied" : "Copy"} onClick={onCopy} />
            <ActionBtn
              icon={saved ? Check : Bookmark}
              label={saved ? "Saved" : "Save"}
              onClick={onSave}
              highlight={saved}
            />
            {bubble.imageUrl && (
              <a
                href={bubble.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                style={{ fontSize: 11, color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Download size={11} /> Download
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  highlight,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
      style={{ fontSize: 11, color: highlight ? "var(--accent)" : "var(--text-tertiary)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

function Avatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}
    >
      <Sparkles size={13} color="#fff" strokeWidth={2} />
    </div>
  );
}

/* ═══════════════════════════════════
   EMPTY HERO
   ═══════════════════════════════════ */

function EmptyHero() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-6"
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #EC4899)",
            boxShadow: "0 16px 40px rgba(124,58,237,0.25)",
          }}
        >
          <Sparkles size={30} color="#fff" strokeWidth={1.75} />
        </div>
        <motion.div
          className="absolute inset-0 rounded-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ border: "2px solid #7C3AED" }}
        />
      </motion.div>
      <h1 style={{ fontSize: 28, fontWeight: 300, letterSpacing: "-0.03em", marginBottom: 10 }}>
        Check your AI asset.
      </h1>
      <p
        className="max-w-[420px]"
        style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55 }}
      >
        Sélectionne un asset, tape un message, et Ora le régénère. Aussi simple qu'un iMessage.
      </p>
    </div>
  );
}

export default AssetsChatPage;

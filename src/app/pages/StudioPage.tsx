import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Send, Sparkles, ImageIcon, FileText, Music, Film,
  Loader2, Download, Columns2, RefreshCw, Rocket,
  Play, ArrowRight, Wand2, Palette,
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ORA STUDIO — Unified conversational creation
   "Aussi simple qu'un SMS"
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type ActionType =
  | "generate-image"
  | "generate-text"
  | "generate-music"
  | "generate-video"
  | "generate-campaign"
  | "start-campaign"
  | "start-video-montage"
  | "ask-clarification";

interface StudioAction {
  type: ActionType;
  params: Record<string, any>;
  compare?: boolean;
}

interface GeneratedResult {
  type: "image" | "text" | "music" | "video" | "campaign";
  items: { url?: string; text?: string; model: string; latencyMs?: number }[];
  prompt: string;
  campaignPosts?: CampaignPost[];
}

interface CampaignPost {
  format: string;
  platform: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  hashtags?: string;
  headline?: string;
  cta?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: StudioAction | null;
  suggestions?: string[];
  result?: GeneratedResult;
  isGenerating?: boolean;
}

export function StudioPage() {
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [context, setContext] = useState<Record<string, any>>({});
  const [vault, setVault] = useState<any>(null);
  const [vaultLoading, setVaultLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, isGenerating]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const serverPost = useCallback((path: string, body: any) => {
    const token = getAuthHeader();
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ ...body, _token: token }),
      signal: AbortSignal.timeout(60_000),
    }).then(r => r.json());
  }, [getAuthHeader]);

  const serverGet = useCallback((path: string) => {
    return fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${publicAnonKey}` },
      signal: AbortSignal.timeout(180_000),
    }).then(r => r.json());
  }, []);

  // Load vault for brand context
  const loadVault = useCallback(async () => {
    if (vault || vaultLoading) return vault;
    setVaultLoading(true);
    try {
      const res = await serverPost("/vault/load", {});
      if (res.success && res.vault) {
        setVault(res.vault);
        setVaultLoading(false);
        return res.vault;
      }
    } catch (e) { console.warn("[studio] vault load failed:", e); }
    setVaultLoading(false);
    return null;
  }, [vault, vaultLoading, serverPost]);

  // ── Execute generation action ──
  const executeAction = useCallback(async (action: StudioAction, msgId: string) => {
    setIsGenerating(true);
    try {
      let result: GeneratedResult | null = null;

      switch (action.type) {
        case "generate-image": {
          const { prompt, aspectRatio = "1:1", models = ["ora-vision"] } = action.params;
          const allModels = action.compare
            ? ["ora-vision", "flux-pro", "midjourney", "dall-e"]
            : models;
          const res = await serverGet(
            `/generate/image-via-get?prompt=${encodeURIComponent(prompt)}&models=${allModels.join(",")}&aspectRatio=${aspectRatio}`
          );
          if (res.success && res.results) {
            result = {
              type: "image",
              prompt,
              items: res.results
                .filter((r: any) => r.success && r.result?.imageUrl)
                .map((r: any, i: number) => ({
                  url: r.result.imageUrl,
                  model: allModels[i] || "unknown",
                  latencyMs: r.result.latencyMs,
                })),
            };
          }
          break;
        }
        case "generate-text": {
          const { prompt, style = "creative" } = action.params;
          const systemPrompt = style === "professional"
            ? "You are a professional business writer. Write clear, concise, polished content."
            : "You are a creative professional writer. Write high-quality, engaging content.";
          const allModels = action.compare
            ? "ora-writer,gpt-4o,claude-sonnet,gemini-pro"
            : "ora-writer";
          const res = await serverGet(
            `/generate/text-multi-get?prompt=${encodeURIComponent(prompt)}&models=${allModels}&systemPrompt=${encodeURIComponent(systemPrompt)}&maxTokens=2048`
          );
          if (res.success && res.results) {
            result = {
              type: "text",
              prompt,
              items: res.results
                .filter((r: any) => r.success && r.result?.text)
                .map((r: any, i: number) => ({
                  text: r.result.text,
                  model: allModels.split(",")[i] || "unknown",
                  latencyMs: r.result.latencyMs,
                })),
            };
          }
          break;
        }
        case "generate-music": {
          const { prompt, instrumental = true } = action.params;
          const allModels = action.compare ? ["suno", "udio"] : ["suno"];
          const startRes = await serverPost("/suno/start", {
            prompt, models: allModels, instrumental,
          });
          if (startRes.success && startRes.results) {
            // Poll each task
            const tracks: any[] = [];
            for (const r of startRes.results) {
              if (!r.success || !r.taskId) continue;
              const track = await pollAudio(r.taskId);
              if (track) tracks.push({ ...track, model: r.model || "suno" });
            }
            result = {
              type: "music",
              prompt,
              items: tracks.map(t => ({
                url: t.audioUrl,
                model: t.model,
              })),
            };
          }
          break;
        }
        case "generate-video": {
          const { prompt, model = "ora-motion" } = action.params;
          const allModels = action.compare
            ? ["ora-motion", "runway-gen3"]
            : [model];
          const items: any[] = [];
          for (const m of allModels) {
            const startRes = await serverGet(
              `/generate/video-start?prompt=${encodeURIComponent(prompt)}&model=${m}`
            );
            if (startRes.success && startRes.generationId) {
              const videoUrl = await pollVideo(startRes.generationId);
              if (videoUrl) items.push({ url: videoUrl, model: m });
            }
          }
          result = { type: "video", prompt, items };
          break;
        }
        case "generate-campaign": {
          const { brief, formats = ["linkedin-post"], targetAudience, objective, toneOfVoice, contentAngle, keyMessages, callToAction, language = "auto" } = action.params;

          // 1. Generate texts for all formats
          const textRes = await serverPost("/campaign/generate-texts", {
            brief: brief || "",
            targetAudience: targetAudience || "",
            formats: formats.join(","),
            campaignObjective: objective || "",
            toneOfVoice: toneOfVoice || "",
            contentAngle: contentAngle || "",
            keyMessages: keyMessages || "",
            callToAction: callToAction || "",
            language,
            model: "gpt-4o",
          });

          const posts: CampaignPost[] = [];
          if (textRes.success && textRes.copyMap) {
            for (const [formatId, copy] of Object.entries(textRes.copyMap) as [string, any][]) {
              const platform = formatId.split("-")[0];
              const text = copy.caption || copy.text || copy.copy || copy.body || copy.content || copy.message || "";
              posts.push({
                format: formatId,
                platform,
                text,
                hashtags: Array.isArray(copy.hashtags) ? copy.hashtags.join(" ") : copy.hashtags || "",
                headline: copy.headline || copy.subject || "",
                cta: copy.ctaText || copy.cta || "",
              });
            }
          }

          // 2. Generate images for visual formats
          const visualFormats = posts.filter(p =>
            !p.format.includes("text") && !p.format.includes("article") && !p.format.includes("thread")
          );
          const imagePrompts = visualFormats.map(p => {
            const copyEntry = (textRes.copyMap as any)?.[p.format];
            return copyEntry?.imagePrompt || `${brief}, ${p.platform} ${p.format}, professional`;
          });

          for (let i = 0; i < Math.min(visualFormats.length, 4); i++) {
            try {
              const aspectRatio = visualFormats[i].format.includes("story") || visualFormats[i].format.includes("reel")
                ? "9:16"
                : visualFormats[i].format.includes("post") && visualFormats[i].platform === "instagram"
                  ? "1:1"
                  : "16:9";
              const imgRes = await serverGet(
                `/generate/image-via-get?prompt=${encodeURIComponent(imagePrompts[i])}&models=ora-vision&aspectRatio=${aspectRatio}`
              );
              if (imgRes.success && imgRes.results?.[0]?.result?.imageUrl) {
                visualFormats[i].imageUrl = imgRes.results[0].result.imageUrl;
              }
            } catch { /* continue */ }
          }

          if (posts.length > 0) {
            result = {
              type: "campaign",
              prompt: brief || "",
              items: [],
              campaignPosts: posts,
            };
          }
          break;
        }
        case "start-campaign": {
          setContext(prev => ({ ...prev, mode: "campaign", campaignBrief: action.params }));
          break;
        }
        case "start-video-montage": {
          navigate(`/hub/video-editor`);
          break;
        }
      }

      if (result && result.items.length > 0) {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, result, isGenerating: false } : m
        ));
      } else if (action.type !== "start-campaign" && action.type !== "start-video-montage") {
        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, isGenerating: false } : m
        ));
      }
    } catch (err) {
      console.error("[studio] generation error:", err);
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, isGenerating: false } : m
      ));
      toast.error("Erreur de génération. Réessaie.");
    }
    setIsGenerating(false);
  }, [serverGet, serverPost, navigate]);

  // Polling helpers
  async function pollVideo(genId: string): Promise<string | null> {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`${API_BASE}/generate/video-status?id=${genId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }).then(r => r.json());
        if (res.state === "completed" && res.videoUrl) return res.videoUrl;
        if (res.state === "failed") return null;
      } catch { /* continue */ }
    }
    return null;
  }

  async function pollAudio(taskId: string): Promise<any | null> {
    for (let i = 0; i < 72; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await fetch(`${API_BASE}/suno/poll?taskId=${taskId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }).then(r => r.json());
        if (res.status === "DONE" && res.track) return res.track;
        if (res.status === "FAILED") return null;
      } catch { /* continue */ }
    }
    return null;
  }

  // ── Send message ──
  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isThinking) return;
    if (!text) setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Load vault for campaign mode or when "campagne" is mentioned
      let vaultData = vault;
      const isCampaignRelated = context.mode === "campaign" || /campagne|campaign|marque|brand/i.test(msg);
      if (isCampaignRelated && !vaultData) {
        vaultData = await loadVault();
      }

      const res = await serverPost("/studio/chat", {
        message: msg,
        history: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
        context: {
          ...context,
          ...(vaultData?.brand_platform ? { brand_platform: vaultData.brand_platform } : {}),
          ...(vaultData?.gammes ? { gammes: vaultData.gammes } : {}),
          ...(vaultData?.tone ? { tone: vaultData.tone } : {}),
        },
      });

      if (res.success) {
        const assistMsg: ChatMessage = {
          id: `assist-${Date.now()}`,
          role: "assistant",
          content: res.reply || "",
          action: res.action || null,
          suggestions: res.suggestions || [],
          isGenerating: !!res.action && ["generate-image", "generate-text", "generate-music", "generate-video", "generate-campaign"].includes(res.action?.type),
        };
        setMessages(prev => [...prev, assistMsg]);

        // Auto-execute generation actions
        if (res.action && ["generate-image", "generate-text", "generate-music", "generate-video", "generate-campaign"].includes(res.action.type)) {
          executeAction(res.action, assistMsg.id);
        } else if (res.action?.type === "start-campaign") {
          setContext(prev => ({ ...prev, mode: "campaign", campaignBrief: res.action.params }));
        } else if (res.action?.type === "start-video-montage") {
          navigate("/hub/video-editor");
        }
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Oups, j'ai eu un souci. Réessaie !",
          suggestions: ["Créer une image", "Lancer une campagne", "Surprise me"],
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Connexion perdue. Réessaie.",
        suggestions: [],
      }]);
    }
    setIsThinking(false);
  }, [input, isThinking, messages, context, serverPost, executeAction, navigate]);

  // ── Compare handler ──
  const handleCompare = useCallback((result: GeneratedResult) => {
    handleSend(`Compare : ${result.prompt}`);
  }, [handleSend]);

  const showWelcome = messages.length === 0;

  return (
    <RouteGuard requiredPlan="free">
      <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
        {/* ── Main chat area ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            {showWelcome ? (
              <WelcomeScreen onSend={handleSend} />
            ) : (
              <div className="max-w-2xl mx-auto px-5 py-6 space-y-4">
                {messages.map(msg => (
                  <div key={msg.id}>
                    {msg.role === "user" ? (
                      <UserBubble content={msg.content} />
                    ) : (
                      <AssistantMessage
                        msg={msg}
                        onSuggestion={handleSend}
                        onCompare={handleCompare}
                      />
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
                      className="flex items-center gap-2">
                      <Sparkles size={14} className="text-muted-foreground" />
                      <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Je réfléchis...</span>
                    </motion.div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* ── Input bar ── */}
          <div className="flex-shrink-0 px-5 pb-5 pt-2">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <Sparkles size={14} className="text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Dis-moi ce que tu veux créer..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: "14px" }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isThinking || isGenerating}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 transition-all"
                  style={{
                    background: input.trim() ? "var(--foreground)" : "transparent",
                    color: input.trim() ? "var(--background)" : "var(--muted-foreground)",
                  }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

/* ── Welcome Screen ── */
function WelcomeScreen({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--foreground)" }}>
          <Sparkles size={20} style={{ color: "var(--background)" }} />
        </div>
        <h1 style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1.2 }}>
          Qu'est-ce que tu veux créer ?
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: 8 }}>
          Image, vidéo, musique, texte — ou une campagne complète. Dis-le moi.
        </p>
      </motion.div>

      {/* Two main paths */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-lg"
      >
        <button
          onClick={() => onSend("Je veux créer quelque chose")}
          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all cursor-pointer group"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--secondary)" }}>
            <Wand2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>Créer</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.4 }}>
              Image, vidéo, musique, texte. Libre et fun.
            </div>
          </div>
        </button>

        <button
          onClick={() => onSend("Je veux lancer une campagne")}
          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all cursor-pointer group"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--secondary)" }}>
            <Rocket size={16} />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>Campagne</div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2, lineHeight: 1.4 }}>
              Brief guidé, ta marque, multi-plateforme.
            </div>
          </div>
        </button>
      </motion.div>

      {/* Quick suggestions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap gap-2 mt-6 justify-center max-w-lg"
      >
        {[
          "Génère un visuel abstrait",
          "Compose une musique chill",
          "Surprise me",
          "Monte une vidéo courte",
        ].map(s => (
          <button key={s} onClick={() => onSend(s)}
            className="px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--muted-foreground)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--foreground)"; e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
            {s}
          </button>
        ))}
      </motion.div>
    </div>
  );
}

/* ── User bubble ── */
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%]"
        style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "14px" }}>
        {content}
      </div>
    </div>
  );
}

/* ── Assistant message ── */
function AssistantMessage({ msg, onSuggestion, onCompare }: {
  msg: ChatMessage;
  onSuggestion: (text: string) => void;
  onCompare: (result: GeneratedResult) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Text reply */}
      {msg.content && (
        <div className="px-4 py-2.5 rounded-2xl rounded-bl-md max-w-[85%]"
          style={{ background: "var(--secondary)", fontSize: "14px", lineHeight: 1.6 }}>
          {msg.content}
        </div>
      )}

      {/* Loading state */}
      {msg.isGenerating && (
        <div className="flex items-center gap-2 px-4 py-3">
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
          <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {msg.action?.type === "generate-image" ? "Je crée tes visuels..."
              : msg.action?.type === "generate-text" ? "J'écris..."
              : msg.action?.type === "generate-music" ? "Je compose..."
              : msg.action?.type === "generate-video" ? "Je produis la vidéo..."
              : msg.action?.type === "generate-campaign" ? "Je prépare ta campagne (textes + visuels)..."
              : "En cours..."}
          </span>
        </div>
      )}

      {/* Generated results */}
      {msg.result && (
        <ResultCard result={msg.result} onCompare={onCompare} />
      )}

      {/* Suggestions */}
      {msg.suggestions && msg.suggestions.length > 0 && !msg.isGenerating && (
        <div className="flex flex-wrap gap-2">
          {msg.suggestions.map((s, i) => (
            <button key={i} onClick={() => onSuggestion(s)}
              className="px-3 py-1.5 rounded-full transition-all cursor-pointer"
              style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "12px" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Result card ── */
function ResultCard({ result, onCompare }: {
  result: GeneratedResult;
  onCompare: (result: GeneratedResult) => void;
}) {
  if (result.type === "image") {
    return (
      <div className="space-y-2">
        <div className={`grid gap-2 ${result.items.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {result.items.map((item, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden group"
              style={{ background: "#111", aspectRatio: "1" }}>
              <img src={item.url} className="w-full h-full object-cover" alt="" />
              <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "10px", color: "#fff", fontWeight: 500 }}>{item.model}</span>
                  <div className="flex gap-1">
                    <a href={item.url} download target="_blank" rel="noreferrer"
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: "rgba(255,255,255,0.2)" }}>
                      <Download size={10} style={{ color: "#fff" }} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {result.items.length === 1 && (
          <button onClick={() => onCompare(result)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "12px" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            <Columns2 size={12} /> Comparer avec d'autres modèles
          </button>
        )}
      </div>
    );
  }

  if (result.type === "text") {
    return (
      <div className="space-y-2">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-xl p-4"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {result.items.length > 1 && (
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" }}>
                  {item.model}
                </span>
              </div>
            )}
            <div style={{ fontSize: "13px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {item.text}
            </div>
          </div>
        ))}
        {result.items.length === 1 && (
          <button onClick={() => onCompare(result)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
            style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "12px" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}>
            <Columns2 size={12} /> Comparer avec d'autres modèles
          </button>
        )}
      </div>
    );
  }

  if (result.type === "music") {
    return (
      <div className="space-y-2">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "var(--secondary)" }}>
              <Music size={16} />
            </div>
            <div className="flex-1">
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{item.model}</div>
              <audio controls src={item.url} className="w-full mt-1" style={{ height: 28 }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "campaign" && result.campaignPosts) {
    return (
      <div className="space-y-3">
        {result.campaignPosts.map((post, i) => (
          <div key={i} className="rounded-xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {/* Image if available */}
            {post.imageUrl && (
              <div className="relative" style={{ maxHeight: 200 }}>
                <img src={post.imageUrl} className="w-full object-cover" style={{ maxHeight: 200 }} alt="" />
                <a href={post.imageUrl} download target="_blank" rel="noreferrer"
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.5)" }}>
                  <Download size={12} style={{ color: "#fff" }} />
                </a>
              </div>
            )}
            {/* Content */}
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md"
                  style={{ background: "var(--secondary)", fontSize: "10px", fontWeight: 600, textTransform: "uppercase" }}>
                  {post.platform}
                </span>
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {post.format.replace(post.platform + "-", "")}
                </span>
              </div>
              {post.headline && (
                <div style={{ fontSize: "14px", fontWeight: 600 }}>{post.headline}</div>
              )}
              <div style={{ fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {post.text}
              </div>
              {post.hashtags && (
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{post.hashtags}</div>
              )}
              {post.cta && (
                <div className="flex items-center gap-1 mt-1">
                  <ArrowRight size={10} />
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{post.cta}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (result.type === "video") {
    return (
      <div className="space-y-2">
        {result.items.map((item, i) => (
          <div key={i} className="rounded-xl overflow-hidden"
            style={{ background: "#111", border: "1px solid var(--border)" }}>
            <video controls src={item.url} className="w-full" style={{ maxHeight: 400 }} />
            <div className="px-3 py-2 flex items-center justify-between">
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{item.model}</span>
              <a href={item.url} download target="_blank" rel="noreferrer"
                className="flex items-center gap-1"
                style={{ fontSize: "11px", color: "var(--foreground)" }}>
                <Download size={10} /> Télécharger
              </a>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

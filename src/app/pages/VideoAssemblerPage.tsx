import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Send, Film, Play, Download, RefreshCw,
  Sparkles, GripVertical, Trash2, Wand2, Music, Type,
  Loader2, ChevronRight, Image as ImageIcon, Video,
} from "lucide-react";
import { toast } from "sonner";
import { Player } from "@remotion/player";
import { VideoComposition } from "../components/video-editor/VideoComposition";
import { useLibraryAssets, type VideoLibraryAsset } from "../lib/video-editor/useLibraryAssets";
import { useAuth } from "../lib/auth-context";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import type { VideoProject, TrackItem } from "../lib/video-editor/types";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Video Assembler — Conversational AI video creation
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

type VideoFormat = "reel" | "story" | "linkedin" | "youtube-short" | "feed";

interface Scene {
  id: string;
  order: number;
  clipIndex: number | null;
  duration: number;
  description: string;
  purpose: string;
  textOverlay: string | null;
  textPosition: string;
  transition: string;
  suggestGenerate: string | null;
}

interface StoryboardPlan {
  title: string;
  format: VideoFormat;
  dimensions: { width: number; height: number };
  totalDuration: number;
  musicMood: string;
  scenes: Scene[];
  narration: string | null;
  suggestion: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  plan?: StoryboardPlan;
  type?: "format-picker" | "storyboard" | "preview-ready" | "text";
}

const FORMAT_OPTIONS: { id: VideoFormat; label: string; icon: string; dimensions: string; duration: string }[] = [
  { id: "reel", label: "Reel / TikTok", icon: "📱", dimensions: "9:16", duration: "15-30s" },
  { id: "story", label: "Story", icon: "⏱", dimensions: "9:16", duration: "15s" },
  { id: "linkedin", label: "LinkedIn", icon: "💼", dimensions: "16:9", duration: "30-60s" },
  { id: "youtube-short", label: "YouTube Short", icon: "▶", dimensions: "9:16", duration: "60s" },
  { id: "feed", label: "Feed Post", icon: "📐", dimensions: "1:1", duration: "15-30s" },
];

export function VideoAssemblerPage() {
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  const { assets: libraryAssets, loading: libraryLoading } = useLibraryAssets(30);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Quel type de vidéo tu veux créer ?",
      type: "format-picker",
    },
  ]);
  const [input, setInput] = useState("");
  const [format, setFormat] = useState<VideoFormat | null>(null);
  const [plan, setPlan] = useState<StoryboardPlan | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedClips, setSelectedClips] = useState<VideoLibraryAsset[]>([]);
  const [showClipPicker, setShowClipPicker] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const serverPost = useCallback((path: string, body: any) => {
    const token = getAuthHeader();
    return fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ ...body, _token: token }),
      signal: AbortSignal.timeout(60_000),
    }).then(r => r.json());
  }, [getAuthHeader]);

  // Handle format selection
  const handleFormatSelect = useCallback((f: VideoFormat) => {
    setFormat(f);
    const label = FORMAT_OPTIONS.find(o => o.id === f)?.label || f;
    setMessages(prev => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: label, type: "text" },
      { id: `assist-${Date.now()}`, role: "assistant", content: `${label} — parfait. Décris ta vidéo : quel message, quelle ambiance, quel objectif ?`, type: "text" },
    ]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Send message and get AI plan
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: text, type: "text" };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      // Build clips list from library + selected
      const allClips = (selectedClips.length > 0 ? selectedClips : libraryAssets)
        .filter(a => a.type === "video" || a.type === "image")
        .slice(0, 20)
        .map(a => ({
          name: a.name,
          type: a.type,
          duration: a.durationInFrames ? (a.durationInFrames / 30).toFixed(1) : a.type === "image" ? "5" : "?",
          description: a.prompt || a.name,
          url: a.url,
        }));

      const isAdjustment = !!plan;
      const res = await serverPost("/video-assembler/plan", {
        message: isAdjustment ? undefined : text,
        adjustment: isAdjustment ? text : undefined,
        previousPlan: isAdjustment ? plan : undefined,
        clips: allClips,
        format: format || "reel",
      });

      if (res.success && res.plan) {
        setPlan(res.plan);
        const assistMsg: ChatMessage = {
          id: `plan-${Date.now()}`,
          role: "assistant",
          content: res.plan.suggestion || "Voici le storyboard.",
          plan: res.plan,
          type: "storyboard",
        };
        setMessages(prev => [...prev, assistMsg]);
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`, role: "assistant",
          content: `Désolé, je n'ai pas pu créer le storyboard. ${res.error || "Réessaie avec plus de détails."}`,
          type: "text",
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: "assistant",
        content: `Erreur de connexion. Réessaie.`,
        type: "text",
      }]);
    }
    setIsThinking(false);
  }, [input, isThinking, format, plan, selectedClips, libraryAssets, serverPost]);

  // Reorder scenes
  const moveScene = useCallback((fromIdx: number, toIdx: number) => {
    if (!plan) return;
    const scenes = [...plan.scenes];
    const [moved] = scenes.splice(fromIdx, 1);
    scenes.splice(toIdx, 0, moved);
    scenes.forEach((s, i) => s.order = i);
    setPlan({ ...plan, scenes });
  }, [plan]);

  // Remove scene
  const removeScene = useCallback((sceneId: string) => {
    if (!plan) return;
    const scenes = plan.scenes.filter(s => s.id !== sceneId);
    scenes.forEach((s, i) => s.order = i);
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    setPlan({ ...plan, scenes, totalDuration });
  }, [plan]);

  // Build Remotion project from plan
  const buildProject = useCallback((): VideoProject | null => {
    if (!plan || plan.scenes.length === 0) return null;

    const fps = 30;
    const clips = selectedClips.length > 0 ? selectedClips : libraryAssets;
    const items: TrackItem[] = [];
    const textItems: TrackItem[] = [];
    let currentFrame = 0;

    for (const scene of plan.scenes) {
      const durFrames = Math.round(scene.duration * fps);
      const clip = scene.clipIndex !== null ? clips[scene.clipIndex] : null;

      if (clip?.url) {
        items.push({
          id: `item-${scene.id}`,
          trackId: "video-track",
          from: currentFrame,
          durationInFrames: durFrames,
          sourceUrl: clip.url,
          data: { kind: clip.type === "video" ? "video" : "image", volume: 1, x: 0, y: 0, width: 100, height: 100, opacity: 1 } as any,
          transition: scene.transition === "crossfade"
            ? { type: "crossfade", durationInFrames: Math.round(fps * 0.5) }
            : scene.transition === "fade-black"
              ? { type: "fade-black", durationInFrames: Math.round(fps * 0.5) }
              : undefined,
        });
      } else {
        // Placeholder black scene for missing clips
        items.push({
          id: `item-${scene.id}`,
          trackId: "video-track",
          from: currentFrame,
          durationInFrames: durFrames,
          data: { kind: "background", color: "#111111" } as any,
        });
      }

      // Text overlay
      if (scene.textOverlay) {
        const yPos = scene.textPosition === "top" ? 10 : scene.textPosition === "center" ? 40 : 75;
        textItems.push({
          id: `text-${scene.id}`,
          trackId: "text-track",
          from: currentFrame,
          durationInFrames: durFrames,
          data: {
            kind: "text",
            text: scene.textOverlay,
            x: 5, y: yPos, width: 90,
            fontSize: 48, fontWeight: 700, fontFamily: "'Inter', sans-serif",
            color: "#FFFFFF", backgroundColor: "rgba(0,0,0,0.5)",
            align: "center" as const,
          },
        });
      }

      currentFrame += durFrames;
    }

    return {
      id: `assembled-${Date.now()}`,
      name: plan.title,
      fps,
      width: plan.dimensions?.width || 1080,
      height: plan.dimensions?.height || 1920,
      durationInFrames: currentFrame || fps * 10,
      tracks: [
        { id: "video-track", type: "video", label: "Video", locked: false, muted: false, visible: true, items },
        { id: "text-track", type: "text", label: "Text", locked: false, muted: false, visible: true, items: textItems },
        { id: "audio-track", type: "audio", label: "Audio", locked: false, muted: false, visible: true, items: [] },
      ],
    };
  }, [plan, selectedClips, libraryAssets]);

  const project = showPreview ? buildProject() : null;

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/hub")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft size={16} />
            <span style={{ fontSize: "13px" }}>Back</span>
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-2">
            <Film size={16} className="text-foreground" />
            <span style={{ fontSize: "15px", fontWeight: 600 }}>{plan?.title || "Video Studio"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan && !showPreview && (
            <button onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer"
              style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "13px", fontWeight: 600 }}>
              <Play size={14} /> Preview
            </button>
          )}
          {showPreview && (
            <>
              <button onClick={() => setShowPreview(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "13px", fontWeight: 500 }}>
                Edit
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer"
                style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "13px", fontWeight: 600 }}>
                <Download size={14} /> Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex min-h-0">
        {/* Chat + Storyboard side */}
        <div className={`flex flex-col ${showPreview ? "w-[420px] border-r border-border" : "flex-1 max-w-3xl mx-auto"}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%]"
                      style={{ background: "var(--foreground)", color: "var(--background)", fontSize: "14px" }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Text content */}
                    {msg.content && (
                      <div className="px-4 py-2.5 rounded-2xl rounded-bl-md max-w-[85%]"
                        style={{ background: "var(--secondary)", fontSize: "14px", lineHeight: 1.6 }}>
                        {msg.content}
                      </div>
                    )}

                    {/* Format picker */}
                    {msg.type === "format-picker" && !format && (
                      <div className="grid grid-cols-2 gap-2 max-w-sm">
                        {FORMAT_OPTIONS.map(f => (
                          <button key={f.id} onClick={() => handleFormatSelect(f.id)}
                            className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-left"
                            style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "13px" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--foreground)"; e.currentTarget.style.background = "var(--secondary)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--card)"; }}>
                            <span style={{ fontSize: "20px" }}>{f.icon}</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{f.label}</div>
                              <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{f.dimensions} · {f.duration}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Storyboard */}
                    {msg.type === "storyboard" && msg.plan && (
                      <StoryboardView
                        plan={msg.plan}
                        clips={selectedClips.length > 0 ? selectedClips : libraryAssets}
                        onMoveScene={moveScene}
                        onRemoveScene={removeScene}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex items-center gap-2 px-4 py-2.5">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
                  className="flex items-center gap-2">
                  <Sparkles size={14} className="text-muted-foreground" />
                  <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Je prépare ton storyboard...</span>
                </motion.div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Clip picker toggle */}
          {format && libraryAssets.length > 0 && !showPreview && (
            <div className="px-5 pb-2">
              <button onClick={() => setShowClipPicker(!showClipPicker)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                style={{ fontSize: "12px" }}>
                <Video size={12} />
                {selectedClips.length > 0 ? `${selectedClips.length} clips sélectionnés` : `${libraryAssets.filter(a => a.type === "video" || a.type === "image").length} clips disponibles`}
                <ChevronRight size={11} className={`transition-transform ${showClipPicker ? "rotate-90" : ""}`} />
              </button>
            </div>
          )}

          {/* Clip picker */}
          <AnimatePresence>
            {showClipPicker && (
              <motion.div initial={{ height: 0 }} animate={{ height: 120 }} exit={{ height: 0 }}
                className="overflow-hidden border-t border-border">
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {libraryAssets.filter(a => a.type === "video" || a.type === "image").map(asset => {
                    const isSelected = selectedClips.some(c => c.id === asset.id);
                    return (
                      <button key={asset.id}
                        onClick={() => setSelectedClips(prev => isSelected ? prev.filter(c => c.id !== asset.id) : [...prev, asset])}
                        className="flex-shrink-0 relative rounded-lg overflow-hidden transition-all cursor-pointer"
                        style={{
                          width: 80, height: 80,
                          border: isSelected ? "2px solid var(--foreground)" : "2px solid transparent",
                          opacity: isSelected ? 1 : 0.6,
                        }}>
                        {asset.thumbnail || asset.url ? (
                          <img src={asset.thumbnail || asset.url} className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-secondary">
                            {asset.type === "video" ? <Video size={16} /> : <ImageIcon size={16} />}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-foreground flex items-center justify-center">
                            <span style={{ color: "var(--background)", fontSize: "10px", fontWeight: 700 }}>✓</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 px-1 py-0.5" style={{ background: "rgba(0,0,0,0.6)" }}>
                          <span style={{ fontSize: "8px", color: "#fff", fontWeight: 500 }}>{asset.name?.slice(0, 12)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          {format && (
            <div className="px-5 pb-5 pt-2">
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                <Sparkles size={14} className="text-muted-foreground flex-shrink-0" />
                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={plan ? "Ajuste le montage..." : "Décris ta vidéo..."}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: "14px" }} />
                <button onClick={handleSend} disabled={!input.trim() || isThinking}
                  className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 transition-all"
                  style={{ background: input.trim() ? "var(--foreground)" : "transparent", color: input.trim() ? "var(--background)" : "var(--muted-foreground)" }}>
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview side */}
        {showPreview && project && (
          <div className="flex-1 flex items-center justify-center bg-black/95 p-8">
            <div className="rounded-xl overflow-hidden" style={{
              maxWidth: "100%", maxHeight: "100%",
              width: project.width > project.height ? "100%" : "auto",
              height: project.height >= project.width ? "100%" : "auto",
              aspectRatio: `${project.width}/${project.height}`,
            }}>
              <Player
                component={VideoComposition}
                inputProps={{ project }}
                compositionWidth={project.width}
                compositionHeight={project.height}
                durationInFrames={project.durationInFrames}
                fps={project.fps}
                style={{ width: "100%", height: "100%" }}
                controls
                autoPlay={false}
                loop
                clickToPlay
                acknowledgeRemotionLicense
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Storyboard View ── */
function StoryboardView({ plan, clips, onMoveScene, onRemoveScene }: {
  plan: StoryboardPlan;
  clips: VideoLibraryAsset[];
  onMoveScene: (from: number, to: number) => void;
  onRemoveScene: (id: string) => void;
}) {
  const purposeColors: Record<string, string> = {
    hook: "#ef4444", tension: "#f59e0b", proof: "#3b82f6", emotion: "#8b5cf6", cta: "#10b981",
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Film size={13} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {plan.title} · {plan.totalDuration}s
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Music size={10} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{plan.musicMood}</span>
        </div>
      </div>

      {/* Scene cards — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {plan.scenes.map((scene, idx) => {
          const clip = scene.clipIndex !== null ? clips[scene.clipIndex] : null;
          const pColor = purposeColors[scene.purpose] || "#888";

          return (
            <div key={scene.id} className="flex-shrink-0 rounded-xl overflow-hidden"
              style={{ width: 140, background: "var(--card)", border: "1px solid var(--border)" }}>
              {/* Thumbnail */}
              <div className="relative" style={{ height: 80, background: "#111" }}>
                {clip?.thumbnail || clip?.url ? (
                  <img src={clip.thumbnail || clip.url} className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {scene.suggestGenerate ? (
                      <Wand2 size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                    ) : (
                      <Film size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
                    )}
                  </div>
                )}
                {/* Duration badge */}
                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(0,0,0,0.7)", fontSize: "9px", color: "#fff", fontWeight: 600 }}>
                  {scene.duration}s
                </div>
                {/* Purpose badge */}
                <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded"
                  style={{ background: pColor, fontSize: "8px", color: "#fff", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {scene.purpose}
                </div>
                {/* Delete */}
                <button onClick={() => onRemoveScene(scene.id)}
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.7)" }}>
                  <Trash2 size={9} style={{ color: "#fff" }} />
                </button>
                {/* Transition indicator */}
                {idx > 0 && scene.transition !== "cut" && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                    style={{ background: "var(--foreground)" }} />
                )}
              </div>

              {/* Info */}
              <div className="px-2 py-1.5">
                <p style={{ fontSize: "10px", color: "var(--foreground)", fontWeight: 500, lineHeight: 1.3 }}
                  className="line-clamp-2">{scene.description}</p>
                {scene.textOverlay && (
                  <div className="flex items-center gap-1 mt-1">
                    <Type size={8} style={{ color: "var(--muted-foreground)" }} />
                    <p style={{ fontSize: "9px", color: "var(--muted-foreground)" }} className="truncate">
                      {scene.textOverlay}
                    </p>
                  </div>
                )}
                {scene.suggestGenerate && (
                  <div className="flex items-center gap-1 mt-1">
                    <Wand2 size={8} style={{ color: "var(--muted-foreground)" }} />
                    <p style={{ fontSize: "9px", color: "var(--muted-foreground)", fontStyle: "italic" }} className="truncate">
                      Generate: {scene.suggestGenerate.slice(0, 40)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI suggestion */}
      {plan.suggestion && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
          <Sparkles size={11} style={{ color: "#8b5cf6", marginTop: 2 }} />
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", lineHeight: 1.4 }}>{plan.suggestion}</p>
        </div>
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, Clock, DollarSign, FileText, Image as ImageIcon, Video,
  Play, CheckCircle2, Circle, Loader2, Trophy, AlertTriangle,
  ChevronDown, ChevronRight, X, BarChart3, ArrowRight, Download,
  Type, Hash, MessageSquare, Sparkles, Shield, Eye, Save, Heart,
  Maximize2, Minimize2, Mic, Square, Paperclip, Send,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";

/* ═══════════════════════════════════════════════════════════
   CREATIVE LAB — Free creation playground with Yuka scoring
   Generate · Compare · Save · Download
   Layout: results scroll up, input bar fixed at bottom
   ═══════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA77OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

// ── Types ──
type ModelTier = "economy" | "standard" | "premium";
type CreativeMode = "text" | "image" | "video";
type StepStatus = "pending" | "running" | "done" | "error";

interface ModelDef {
  id: string; label: string; badge: string; credits: number;
  costEur: number; providerCostEur: number;
  strengths: string[]; bestFor: string; tier: ModelTier;
}

// ── Model catalogs ──
const TEXT_MODELS: ModelDef[] = [
  { id: "gpt-4o", label: "GPT-4o", badge: "Fast", credits: 2, costEur: 0.20, providerCostEur: 0.008, strengths: ["speed", "multilingual"], bestFor: "Contenu rapide multilingue", tier: "standard" },
  { id: "gpt-5", label: "GPT-5", badge: "Smart", credits: 3, costEur: 0.30, providerCostEur: 0.015, strengths: ["reasoning", "nuance"], bestFor: "Briefs complexes", tier: "premium" },
  { id: "claude-sonnet", label: "Claude Sonnet", badge: "Creative", credits: 2, costEur: 0.20, providerCostEur: 0.012, strengths: ["creativity", "storytelling"], bestFor: "Storytelling créatif", tier: "standard" },
  { id: "claude-opus", label: "Claude Opus", badge: "Best", credits: 5, costEur: 0.50, providerCostEur: 0.060, strengths: ["depth", "strategy"], bestFor: "Contenu stratégique", tier: "premium" },
  { id: "gemini-pro", label: "Gemini 2.5 Pro", badge: "Google", credits: 2, costEur: 0.20, providerCostEur: 0.010, strengths: ["multimodal", "factual"], bestFor: "Contenu data-driven", tier: "standard" },
  { id: "deepseek", label: "DeepSeek v3", badge: "Open", credits: 1, costEur: 0.10, providerCostEur: 0.003, strengths: ["affordable", "technical"], bestFor: "Budget-friendly", tier: "economy" },
];

const IMAGE_MODELS: ModelDef[] = [
  { id: "ideogram-3-leo", label: "Ideogram V3", badge: "Brand + Text", credits: 5, costEur: 0.50, providerCostEur: 0.074, strengths: ["text-rendering", "branding"], bestFor: "Logos, texte sur images", tier: "premium" },
  { id: "photon-1", label: "Luma Photon", badge: "Quality", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["realism", "lighting"], bestFor: "Portraits réalistes", tier: "standard" },
  { id: "photon-flash-1", label: "Photon Flash", badge: "Fast", credits: 3, costEur: 0.30, providerCostEur: 0.014, strengths: ["speed", "iteration"], bestFor: "Itérations rapides", tier: "economy" },
  { id: "gpt-image-leo", label: "GPT Image", badge: "GPT-4o", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["creative", "detail"], bestFor: "Prompts complexes", tier: "premium" },
  { id: "dall-e", label: "DALL-E 3", badge: "Precise", credits: 8, costEur: 0.80, providerCostEur: 0.037, strengths: ["precision", "compositions"], bestFor: "Compositions précises", tier: "premium" },
  { id: "flux-pro", label: "Flux Pro", badge: "Creative", credits: 8, costEur: 0.80, providerCostEur: 0.046, strengths: ["artistic", "detail"], bestFor: "Visuels artistiques", tier: "premium" },
  { id: "flux-pro-2-leo", label: "Flux Pro 2", badge: "Premium", credits: 5, costEur: 0.50, providerCostEur: 0.023, strengths: ["quality"], bestFor: "Campagnes premium", tier: "premium" },
  { id: "flux-schnell-leo", label: "Flux Schnell", badge: "Ultra Fast", credits: 3, costEur: 0.30, providerCostEur: 0.003, strengths: ["ultra-fast"], bestFor: "Brouillons rapides", tier: "economy" },
  { id: "kontext-pro-leo", label: "Kontext Pro", badge: "Edit", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["editing", "consistency"], bestFor: "Édition, cohérence", tier: "standard" },
  { id: "lucid-realism", label: "Leonardo Realism", badge: "Photo", credits: 5, costEur: 0.50, providerCostEur: 0.012, strengths: ["photo-realism"], bestFor: "Photo produit", tier: "standard" },
  { id: "seedream-v4", label: "SeedDream v4", badge: "Detailed", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["detail", "textures"], bestFor: "Environnements détaillés", tier: "standard" },
  { id: "soul", label: "Soul", badge: "Artistic", credits: 5, costEur: 0.50, providerCostEur: 0.018, strengths: ["artistic", "stylized"], bestFor: "Style artistique", tier: "standard" },
  { id: "ora-vision", label: "ORA Vision", badge: "Agence", credits: 5, costEur: 0.50, providerCostEur: 0.028, strengths: ["balanced", "agency"], bestFor: "Qualité agence", tier: "standard" },
];

const VIDEO_MODELS: ModelDef[] = [
  { id: "ray-2", label: "Luma Ray 2", badge: "Quality", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["quality", "cinematic"], bestFor: "Cinématique", tier: "premium" },
  { id: "ray-flash-2", label: "Ray Flash 2", badge: "Fast", credits: 20, costEur: 2.00, providerCostEur: 0.14, strengths: ["speed"], bestFor: "Itération vidéo rapide", tier: "economy" },
  { id: "veo-3.1", label: "Veo 3.1", badge: "Google", credits: 30, costEur: 3.00, providerCostEur: 0.50, strengths: ["google", "quality"], bestFor: "Qualité Google", tier: "premium" },
  { id: "sora-2", label: "Sora 2", badge: "OpenAI", credits: 30, costEur: 3.00, providerCostEur: 0.30, strengths: ["creative", "narrative"], bestFor: "Narrations créatives", tier: "premium" },
  { id: "kling-v2.1", label: "Kling v2.1", badge: "Cinematic", credits: 40, costEur: 4.00, providerCostEur: 0.35, strengths: ["cinematic", "character"], bestFor: "Scènes à personnages", tier: "premium" },
  { id: "seedance-2.0", label: "Seedance 2.0", badge: "Latest", credits: 30, costEur: 3.00, providerCostEur: 0.25, strengths: ["versatile"], bestFor: "Contenu vidéo polyvalent", tier: "standard" },
  { id: "pika", label: "Pika", badge: "Fun", credits: 20, costEur: 2.00, providerCostEur: 0.10, strengths: ["fun", "quick"], bestFor: "Animations fun", tier: "economy" },
  { id: "ora-motion", label: "ORA Motion", badge: "Agence", credits: 30, costEur: 3.00, providerCostEur: 0.28, strengths: ["agency", "campaign"], bestFor: "Vidéo campagne", tier: "standard" },
];

// ── Result types ──
interface CreativeResult {
  id: string;
  modelId: string;
  label: string;
  type: CreativeMode;
  imageUrl?: string;
  videoUrl?: string;
  text?: string;
  timeMs: number;
  success: boolean;
  error?: string;
  scores: { speed: number; value: number; quality: number; reliability: number; overall: number };
  saved?: boolean;
}

// ── Scoring ──
function getGradeLabel(score: number, isFr: boolean): { label: string; color: string } {
  if (score >= 80) return { label: isFr ? "Excellent" : "Excellent", color: "#22c55e" };
  if (score >= 60) return { label: isFr ? "Bon" : "Good", color: "#84cc16" };
  if (score >= 40) return { label: isFr ? "Médiocre" : "Mediocre", color: "#f59e0b" };
  return { label: isFr ? "Insuffisant" : "Poor", color: "#ef4444" };
}

function computeScores(results: { modelId: string; timeMs: number; success: boolean }[], mode: CreativeMode): Map<string, CreativeResult["scores"]> {
  const map = new Map<string, CreativeResult["scores"]>();
  const ok = results.filter(r => r.success);
  if (!ok.length) return map;

  const maxT = Math.max(...ok.map(r => r.timeMs));
  const minT = Math.min(...ok.map(r => r.timeMs));
  const catalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;

  for (const r of results) {
    if (!r.success) { map.set(r.modelId, { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 }); continue; }
    const m = catalog.find(c => c.id === r.modelId);
    const speed = maxT > minT ? Math.round(((maxT - r.timeMs) / (maxT - minT)) * 100) : 100;
    const maxC = Math.max(...ok.map(s => catalog.find(c => c.id === s.modelId)?.costEur || 1));
    const minC = Math.min(...ok.map(s => catalog.find(c => c.id === s.modelId)?.costEur || 0));
    const value = maxC > minC ? Math.round(((maxC - (m?.costEur || 0.5)) / (maxC - minC)) * 100) : 100;
    const quality = m?.tier === "premium" ? 90 : m?.tier === "standard" ? 75 : 60;
    const overall = Math.round(Math.max(0, Math.min(100, speed * 0.25 + value * 0.20 + 100 * 0.20 + quality * 0.35)));
    map.set(r.modelId, { speed, value, quality, reliability: 100, overall });
  }
  return map;
}

// ── Score Gauge ──
function ScoreGauge({ score, size = 80, isFr = false }: { score: number; size?: number; isFr?: boolean }) {
  const radius = (size - 8) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const { label, color } = getGradeLabel(score, isFr);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill={`${color}12`} stroke="var(--border)" strokeWidth={1.5} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size >= 80 ? 24 : 18} fontWeight={700}>{score}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" dominantBaseline="central" fill="var(--muted-foreground)" fontSize={9}>/100</text>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: "0.02em" }}>{label}</span>
    </div>
  );
}

function CategoryBar({ label, value }: { label: string; value: number }) {
  const c = value >= 70 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 11 }}>
      <span style={{ width: 56, color: "var(--muted-foreground)", flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--secondary)" }}>
        <div style={{ width: `${Math.max(2, value)}%`, height: "100%", borderRadius: 3, background: c, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ width: 24, textAlign: "right", color: "var(--foreground)", fontWeight: 600, fontSize: 10 }}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN: Creative Lab
   ═══════════════════════════════════════════════════════════ */

export function ComparePage() {
  const { t, locale } = useI18n();
  const { getAuthHeader } = useAuth();
  const isFr = locale === "fr";

  const [mode, setMode] = useState<CreativeMode>("image");
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<{ label: string; status: StepStatus; timeMs?: number }[]>([]);
  const [results, setResults] = useState<CreativeResult[]>([]);
  const [lightbox, setLightbox] = useState<CreativeResult | null>(null);
  const [showScores, setShowScores] = useState(true);
  const [showModelPicker, setShowModelPicker] = useState(false);

  // ── Voice recording (Whisper) ──
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Attached product photo ──
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string; signedUrl?: string; uploading: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const catalog = mode === "text" ? TEXT_MODELS : mode === "image" ? IMAGE_MODELS : VIDEO_MODELS;
  const maxModels = mode === "text" ? 4 : mode === "image" ? 6 : 4;

  useEffect(() => { setSelectedModels([]); setResults([]); setSteps([]); }, [mode]);

  // Scroll to bottom when new results appear
  useEffect(() => {
    if (results.length > 0) resultsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results]);

  const toggleModel = (id: string) => {
    setSelectedModels(prev => prev.includes(id) ? prev.filter(m => m !== id) : prev.length >= maxModels ? prev : [...prev, id]);
  };

  // ── Voice recording ──
  const startRecording = useCallback(async () => {
    if (window.self !== window.top) {
      toast.error(isFr ? "Micro bloqué" : "Mic blocked", { description: isFr ? "Ouvrez dans un nouvel onglet" : "Open in new tab" });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(isFr ? "Micro indisponible" : "Mic unavailable");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        setRecordingDuration(0);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 100) { setIsRecording(false); return; }
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "mp4" : "ogg";
          formData.append("audio", audioBlob, `recording.${ext}`);
          const res = await fetch(`${API_BASE}/transcribe`, {
            method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}` }, body: formData, signal: AbortSignal.timeout(30_000),
          });
          const data = await res.json();
          if (data.success && data.text) {
            setPrompt(prev => (prev ? prev + " " + data.text : data.text));
            toast.success(isFr ? "Transcription OK" : "Voice transcribed", { description: data.text.slice(0, 60) + (data.text.length > 60 ? "..." : "") });
            setTimeout(() => textareaRef.current?.focus(), 100);
          } else {
            toast.error(isFr ? "Transcription échouée" : "Transcription failed");
          }
        } catch {
          toast.error(isFr ? "Erreur transcription" : "Transcription error");
        }
        setIsTranscribing(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error(isFr ? "Accès micro refusé" : "Mic access denied");
      } else if (err?.name === "NotFoundError") {
        toast.error(isFr ? "Aucun micro détecté" : "No mic detected");
      } else {
        toast.error(isFr ? "Erreur micro" : "Mic error");
      }
    }
  }, [isFr]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // ── Attached product photo ──
  const handleAttachImage = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error(isFr ? "Format non supporté" : "Unsupported format"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error(isFr ? "Image trop lourde (max 10 MB)" : "Image too large (max 10 MB)"); return; }
    const preview = URL.createObjectURL(file);
    setAttachedImage({ file, preview, uploading: true });
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/hub/upload-ref`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.signedUrl) {
        setAttachedImage(prev => prev ? { ...prev, signedUrl: data.signedUrl, uploading: false } : null);
        toast.success(isFr ? "Photo produit ajoutée" : "Product photo added");
      } else {
        toast.error(isFr ? "Échec upload" : "Upload failed");
        setAttachedImage(null);
        URL.revokeObjectURL(preview);
      }
    } catch {
      toast.error(isFr ? "Erreur réseau" : "Network error");
      setAttachedImage(null);
      URL.revokeObjectURL(preview);
    }
  }, [isFr]);

  const removeAttachedImage = useCallback(() => {
    if (attachedImage?.preview) URL.revokeObjectURL(attachedImage.preview);
    setAttachedImage(null);
  }, [attachedImage]);

  // ── Server calls ──
  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 90_000) => {
    const token = getAuthHeader();
    const r = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" }, body: JSON.stringify({ ...body, _token: token }), signal: AbortSignal.timeout(timeoutMs) });
    const text = await r.text();
    try { return JSON.parse(text); } catch { return { success: false, error: `Server error (${r.status})` }; }
  }, [getAuthHeader]);

  const serverGet = useCallback(async (path: string) => {
    const r = await fetch(`${API_BASE}${path}`, { method: "GET", headers: { Authorization: `Bearer ${publicAnonKey}` }, signal: AbortSignal.timeout(180_000) });
    return r.json();
  }, []);

  const pollVideo = useCallback(async (genId: string): Promise<string | null> => {
    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 5000));
      try {
        const res = await serverGet(`/generate/video-status?id=${genId}`);
        if (res.state === "completed" && res.videoUrl) return res.videoUrl;
        if (res.state === "failed") return null;
      } catch { /* continue */ }
    }
    return null;
  }, [serverGet]);

  // ── Generate ──
  const runGeneration = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length < 1 || isRunning) return;
    setIsRunning(true);
    setResults([]);

    const modelSteps = selectedModels.map(id => ({ label: catalog.find(m => m.id === id)?.label || id, status: "pending" as StepStatus }));
    setSteps(modelSteps);

    const rawResults: { modelId: string; timeMs: number; success: boolean; imageUrl?: string; videoUrl?: string; text?: string; error?: string }[] = [];

    // If product photo attached (image mode only), use Photoroom for each model slot
    const hasProductRef = mode === "image" && attachedImage?.signedUrl;

    if (mode === "image") {
      const BATCH = 3;
      for (let b = 0; b < selectedModels.length; b += BATCH) {
        const batch = selectedModels.slice(b, b + BATCH);
        const batchRes = await Promise.all(batch.map(async (modelId) => {
          const idx = selectedModels.indexOf(modelId);
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
          const t0 = Date.now();
          try {
            let url = "";
            if (hasProductRef) {
              // Product mode → Photoroom with the model's style direction
              const r = await serverPost("/generate/image-start", {
                prompt: prompt.slice(0, 500),
                model: "photon-1",
                aspectRatio: "1:1",
                imageRefUrl: attachedImage!.signedUrl,
                refSource: "upload",
              }, 60_000);
              url = r.success && (r.imageUrl || r.results?.[0]?.result?.imageUrl) ? (r.imageUrl || r.results[0].result.imageUrl) : "";
            } else {
              const res = await serverGet(`/generate/image-via-get?prompt=${encodeURIComponent(prompt)}&models=${modelId}&aspectRatio=1:1`);
              url = res.success && res.results?.[0]?.result?.imageUrl ? res.results[0].result.imageUrl : "";
            }
            const timeMs = Date.now() - t0;
            setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: url ? "done" : "error", timeMs } : s));
            return { modelId, timeMs, success: !!url, imageUrl: url || undefined };
          } catch (err: any) {
            const timeMs = Date.now() - t0;
            setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
            return { modelId, timeMs, success: false, error: err?.message };
          }
        }));
        rawResults.push(...batchRes);
      }
    } else if (mode === "text") {
      const batchRes = await Promise.all(selectedModels.map(async (modelId, idx) => {
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
        const t0 = Date.now();
        try {
          const res = await serverPost("/campaign/generate-texts", { brief: prompt, formats: "instagram-post", model: modelId, language: locale }, 60_000);
          const timeMs = Date.now() - t0;
          const copyMap = res.copyMap || {};
          const first = Object.values(copyMap)[0] as any;
          const text = first?.caption || first?.text || first?.copy || first?.body || "";
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: text ? "done" : "error", timeMs } : s));
          return { modelId, timeMs, success: !!text, text: text || undefined };
        } catch (err: any) {
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
          return { modelId, timeMs, success: false, error: err?.message };
        }
      }));
      rawResults.push(...batchRes);
    } else {
      // Video — sequential to avoid overload
      for (const modelId of selectedModels) {
        const idx = selectedModels.indexOf(modelId);
        setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "running" } : s));
        const t0 = Date.now();
        try {
          const startRes = await serverGet(`/generate/video-start?prompt=${encodeURIComponent(prompt)}&model=${modelId}&aspectRatio=16:9&duration=5`);
          if (!startRes.success || !startRes.generationId) throw new Error(startRes.error || "No generationId");
          const videoUrl = await pollVideo(startRes.generationId);
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: videoUrl ? "done" : "error", timeMs } : s));
          rawResults.push({ modelId, timeMs, success: !!videoUrl, videoUrl: videoUrl || undefined });
        } catch (err: any) {
          const timeMs = Date.now() - t0;
          setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status: "error", timeMs } : s));
          rawResults.push({ modelId, timeMs, success: false, error: err?.message });
        }
      }
    }

    // Compute scores
    const scoreMap = computeScores(rawResults, mode);
    const creativeResults: CreativeResult[] = rawResults.map(r => {
      const m = catalog.find(c => c.id === r.modelId);
      return {
        id: `${r.modelId}-${Date.now()}`,
        modelId: r.modelId,
        label: m?.label || r.modelId,
        type: mode,
        imageUrl: r.imageUrl,
        videoUrl: r.videoUrl,
        text: r.text,
        timeMs: r.timeMs,
        success: r.success,
        error: r.error,
        scores: scoreMap.get(r.modelId) || { speed: 0, value: 0, quality: 0, reliability: 0, overall: 0 },
      };
    });

    setResults(creativeResults);
    setIsRunning(false);
  }, [prompt, selectedModels, mode, isRunning, catalog, locale, serverGet, serverPost, pollVideo, attachedImage]);

  const bestResult = results.filter(r => r.success).sort((a, b) => b.scores.overall - a.scores.overall)[0];

  const totalCredits = selectedModels.reduce((s, id) => s + (catalog.find(c => c.id === id)?.credits || 0), 0);

  // Bottom bar height (for scroll padding)
  const BOTTOM_BAR_H = attachedImage ? 180 : 140;

  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>

        {/* ═══ HEADER — compact ═══ */}
        <div className="flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "#FFFFFF" }}>
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                  <Sparkles size={16} style={{ color: "#fff" }} />
                </div>
                <div>
                  <h1 style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Creative Lab</h1>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {isFr ? "Créez librement · Comparez les IA · Sauvegardez" : "Create freely · Compare AI · Save favorites"}
                  </p>
                </div>
              </div>

              {/* Mode tabs */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--secondary)" }}>
                {([
                  { id: "image" as CreativeMode, icon: ImageIcon, label: "Image" },
                  { id: "text" as CreativeMode, icon: Type, label: isFr ? "Texte" : "Text" },
                  { id: "video" as CreativeMode, icon: Video, label: "Vidéo" },
                ] as const).map(tab => (
                  <button key={tab.id} onClick={() => setMode(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    style={{
                      background: mode === tab.id ? "#FFFFFF" : "transparent",
                      color: mode === tab.id ? "var(--foreground)" : "var(--muted-foreground)",
                      fontWeight: mode === tab.id ? 600 : 400, fontSize: 12,
                      boxShadow: mode === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}>
                    <tab.icon size={13} /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Score toggle */}
              {results.length > 0 && (
                <button onClick={() => setShowScores(!showScores)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{ background: showScores ? "var(--foreground)" : "var(--secondary)", color: showScores ? "var(--background)" : "var(--foreground)", fontSize: 11, fontWeight: 600, border: "1px solid var(--border)" }}>
                  <BarChart3 size={12} /> Scores
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SCROLLABLE RESULTS AREA ═══ */}
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: BOTTOM_BAR_H + 24 }}>
          <div className="max-w-7xl mx-auto px-6 py-6">

            {/* ── EMPTY STATE ── */}
            {results.length === 0 && !isRunning && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, #7C3AED15, #EC489915)" }}>
                  <Sparkles size={28} style={{ color: "#7C3AED" }} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                  {isFr ? "Votre atelier créatif" : "Your creative workshop"}
                </h2>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 420, lineHeight: 1.6 }}>
                  {isFr
                    ? "Décrivez votre idée ci-dessous, choisissez vos modèles IA, et comparez les résultats. Vous pouvez dicter votre brief ou joindre une photo produit."
                    : "Describe your idea below, pick your AI models, and compare results. You can dictate your brief or attach a product photo."}
                </p>
              </div>
            )}

            {/* ── PROGRESS ── */}
            <AnimatePresence>
              {isRunning && steps.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-6 rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap"
                  style={{ background: "#FFFFFF", border: "1px solid var(--border)" }}>
                  {steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {s.status === "done" ? <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                        : s.status === "running" ? <Loader2 size={14} className="animate-spin" style={{ color: "var(--accent)" }} />
                          : s.status === "error" ? <AlertTriangle size={14} style={{ color: "#ef4444" }} />
                            : <Circle size={14} style={{ color: "var(--border)" }} />}
                      <span style={{ fontSize: 12, fontWeight: s.status === "running" ? 600 : 400, color: s.status === "pending" ? "var(--muted-foreground)" : "var(--foreground)" }}>
                        {s.label}
                      </span>
                      {s.timeMs && <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{(s.timeMs / 1000).toFixed(1)}s</span>}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── RESULTS GRID ── */}
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

                {/* Results header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 15, fontWeight: 700 }}>
                      {results.filter(r => r.success).length} {isFr ? "créations" : "creations"}
                    </span>
                    {bestResult && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: "#22c55e15", fontSize: 11, fontWeight: 600, color: "#22c55e" }}>
                        <Trophy size={11} /> {isFr ? "Meilleur :" : "Best:"} {bestResult.label} ({bestResult.scores.overall}/100)
                      </span>
                    )}
                  </div>
                </div>

                {/* ── IMAGE GRID ── */}
                {mode === "image" && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: results.length <= 2 ? `repeat(${results.length}, 1fr)` : results.length <= 4 ? "repeat(2, 1fr)" : "repeat(3, 1fr)" }}>
                    {results.map(r => {
                      const isBest = r.modelId === bestResult?.modelId;
                      const { label: grade, color: gradeColor } = getGradeLabel(r.scores.overall, isFr);
                      const mInfo = catalog.find(c => c.id === r.modelId);
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          className="rounded-2xl overflow-hidden group relative cursor-pointer"
                          style={{ background: "#FFFFFF", border: isBest ? `2px solid ${gradeColor}` : "1px solid var(--border)" }}
                          onClick={() => r.success && setLightbox(r)}>

                          {r.success && r.imageUrl ? (
                            <div className="relative" style={{ aspectRatio: "1" }}>
                              <img src={r.imageUrl} className="w-full h-full object-cover" alt={r.label} />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                  <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.95)" }}
                                    onClick={e => { e.stopPropagation(); setLightbox(r); }}>
                                    <Maximize2 size={16} />
                                  </button>
                                  <a href={r.imageUrl} download target="_blank" rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: "rgba(255,255,255,0.95)" }}>
                                    <Download size={16} />
                                  </a>
                                </div>
                              </div>
                              {isBest && (
                                <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg"
                                  style={{ background: gradeColor, color: "#fff", fontSize: 10, fontWeight: 700 }}>
                                  <Trophy size={10} /> {isFr ? "Recommandé" : "Best"}
                                </div>
                              )}
                              {showScores && (
                                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                                  style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
                                  <span style={{ fontSize: 16, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>
                                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>/100</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center" style={{ aspectRatio: "1", background: "var(--secondary)" }}>
                              <div className="text-center">
                                <AlertTriangle size={24} style={{ color: "#ef4444", margin: "0 auto 8px" }} />
                                <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{r.error || "Failed"}</span>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                                {mInfo && (
                                  <span style={{
                                    fontSize: 9, padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                                    background: mInfo.tier === "premium" ? "#7C3AED15" : mInfo.tier === "economy" ? "#22c55e15" : "var(--secondary)",
                                    color: mInfo.tier === "premium" ? "#7C3AED" : mInfo.tier === "economy" ? "#22c55e" : "var(--muted-foreground)",
                                  }}>{mInfo.tier}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {r.success && (
                                  <button onClick={e => { e.stopPropagation(); setResults(prev => prev.map(x => x.id === r.id ? { ...x, saved: !x.saved } : x)); toast.success(r.saved ? (isFr ? "Retiré des favoris" : "Removed") : (isFr ? "Sauvegardé !" : "Saved!")); }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-all"
                                    style={{ background: r.saved ? "#ef444415" : "var(--secondary)" }}>
                                    <Heart size={13} fill={r.saved ? "#ef4444" : "none"} style={{ color: r.saved ? "#ef4444" : "var(--muted-foreground)" }} />
                                  </button>
                                )}
                              </div>
                            </div>
                            {showScores && r.success && (
                              <div className="space-y-0.5 mt-2">
                                <CategoryBar label={isFr ? "Vitesse" : "Speed"} value={r.scores.speed} />
                                <CategoryBar label={isFr ? "Valeur" : "Value"} value={r.scores.value} />
                                <CategoryBar label={isFr ? "Qualité" : "Quality"} value={r.scores.quality} />
                              </div>
                            )}
                            {mInfo && r.success && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {mInfo.strengths.slice(0, 3).map(s => (
                                  <span key={s} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, background: "var(--secondary)", color: "var(--muted-foreground)", fontWeight: 500 }}>{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ── TEXT RESULTS ── */}
                {mode === "text" && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: results.length <= 2 ? `repeat(${results.length}, 1fr)` : "repeat(2, 1fr)" }}>
                    {results.map(r => {
                      const isBest = r.modelId === bestResult?.modelId;
                      const { color: gradeColor } = getGradeLabel(r.scores.overall, isFr);
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: isBest ? `2px solid ${gradeColor}` : "1px solid var(--border)" }}>
                          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                              {isBest && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: gradeColor, color: "#fff" }}>{isFr ? "MEILLEUR" : "BEST"}</span>}
                            </div>
                            {showScores && <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>}
                          </div>
                          <div className="px-4 py-3" style={{ fontSize: 13, lineHeight: 1.7, maxHeight: 300, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                            {r.success ? r.text : <span style={{ color: "#ef4444" }}>{r.error || "Failed"}</span>}
                          </div>
                          {r.success && (
                            <div className="px-4 py-2 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                              <button onClick={() => { navigator.clipboard.writeText(r.text || ""); toast.success(isFr ? "Copié !" : "Copied!"); }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                                style={{ background: "var(--secondary)", fontSize: 11, fontWeight: 500 }}>
                                <FileText size={10} /> {isFr ? "Copier" : "Copy"}
                              </button>
                              <button onClick={() => setResults(prev => prev.map(x => x.id === r.id ? { ...x, saved: !x.saved } : x))}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                                style={{ background: r.saved ? "#ef444415" : "var(--secondary)", fontSize: 11, fontWeight: 500 }}>
                                <Heart size={10} fill={r.saved ? "#ef4444" : "none"} style={{ color: r.saved ? "#ef4444" : "var(--muted-foreground)" }} /> {r.saved ? (isFr ? "Favori" : "Saved") : (isFr ? "Sauvegarder" : "Save")}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ── VIDEO RESULTS ── */}
                {mode === "video" && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: results.length <= 2 ? `repeat(${results.length}, 1fr)` : "repeat(2, 1fr)" }}>
                    {results.map(r => {
                      const isBest = r.modelId === bestResult?.modelId;
                      const { color: gradeColor } = getGradeLabel(r.scores.overall, isFr);
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: isBest ? `2px solid ${gradeColor}` : "1px solid var(--border)" }}>
                          {r.success && r.videoUrl ? (
                            <video src={r.videoUrl} controls className="w-full" style={{ aspectRatio: "16/9" }} />
                          ) : (
                            <div className="flex items-center justify-center" style={{ aspectRatio: "16/9", background: "var(--secondary)" }}>
                              <AlertTriangle size={24} style={{ color: "#ef4444" }} />
                            </div>
                          )}
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                              {isBest && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: gradeColor, color: "#fff" }}>BEST</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {showScores && <span style={{ fontSize: 14, fontWeight: 800, color: gradeColor }}>{r.scores.overall}</span>}
                              {r.success && (
                                <a href={r.videoUrl} download target="_blank" rel="noreferrer"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ background: "var(--secondary)" }}>
                                  <Download size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            <div ref={resultsEndRef} />
          </div>
        </div>

        {/* ═══ BOTTOM INPUT BAR — fixed at bottom ═══ */}
        <div className="flex-shrink-0 fixed bottom-0 right-0 z-40" style={{ left: 52 }}>
          <div className="max-w-7xl mx-auto px-6 pb-5 pt-3">
            <div className="rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid var(--border)", boxShadow: "0 -4px 24px rgba(0,0,0,0.06)" }}>

              {/* Attached product photo preview */}
              <AnimatePresence>
                {attachedImage && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="px-4 pt-3">
                    <div className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                      <img src={attachedImage.preview} className="w-10 h-10 rounded-lg object-cover" alt="product" />
                      <div className="flex flex-col">
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>
                          {isFr ? "Photo produit" : "Product photo"}
                        </span>
                        {attachedImage.uploading ? (
                          <span className="flex items-center gap-1" style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                            <Loader2 size={9} className="animate-spin" /> {isFr ? "Upload..." : "Uploading..."}
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 500 }}>{isFr ? "Prêt" : "Ready"}</span>
                        )}
                      </div>
                      <button onClick={removeAttachedImage} className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer"
                        style={{ background: "var(--secondary)" }}>
                        <X size={10} style={{ color: "var(--muted-foreground)" }} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Model pills row */}
              <div className="px-4 pt-3 pb-1 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                <button onClick={() => setShowModelPicker(!showModelPicker)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex-shrink-0"
                  style={{ background: showModelPicker ? "var(--foreground)" : "var(--secondary)", color: showModelPicker ? "var(--background)" : "var(--muted-foreground)", fontSize: 11, fontWeight: 600, border: "1px solid var(--border)" }}>
                  <Zap size={10} />
                  {selectedModels.length > 0 ? `${selectedModels.length} ${isFr ? "modèle(s)" : "model(s)"}` : (isFr ? "Modèles" : "Models")}
                  <ChevronDown size={10} style={{ transform: showModelPicker ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                </button>
                {selectedModels.map(id => {
                  const m = catalog.find(c => c.id === id);
                  return m ? (
                    <span key={id} className="flex items-center gap-1 px-2 py-0.5 rounded-lg flex-shrink-0"
                      style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 10, fontWeight: 600 }}>
                      {m.label}
                      <button onClick={() => toggleModel(id)} className="cursor-pointer opacity-60 hover:opacity-100"><X size={8} /></button>
                    </span>
                  ) : null;
                })}
                {selectedModels.length > 0 && (
                  <span style={{ fontSize: 10, color: "var(--muted-foreground)", flexShrink: 0 }}>{totalCredits} cr</span>
                )}
              </div>

              {/* Model picker dropdown */}
              <AnimatePresence>
                {showModelPicker && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="px-4 pb-2 overflow-hidden">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {catalog.map(m => {
                        const on = selectedModels.includes(m.id);
                        const dis = !on && selectedModels.length >= maxModels;
                        const tierC = m.tier === "premium" ? "#7C3AED" : m.tier === "economy" ? "#22c55e" : "var(--muted-foreground)";
                        return (
                          <button key={m.id} onClick={() => !dis && toggleModel(m.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 cursor-pointer transition-all"
                            style={{
                              fontSize: 10, fontWeight: on ? 700 : 500,
                              background: on ? "var(--foreground)" : "var(--secondary)",
                              color: on ? "var(--background)" : "var(--foreground)",
                              border: `1px solid ${on ? "var(--foreground)" : "var(--border)"}`,
                              opacity: dis ? 0.3 : 1, cursor: dis ? "not-allowed" : "pointer",
                            }}>
                            {on && <CheckCircle2 size={9} />}
                            {m.label}
                            <span style={{ fontSize: 7, color: on ? "var(--background)" : tierC, opacity: on ? 0.7 : 1, fontWeight: 700 }}>{m.credits}cr</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input row */}
              <div className="px-4 pb-3 flex items-end gap-2">
                {/* Attach button (image mode only) */}
                {mode === "image" && (
                  <>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachImage(f); e.target.value = ""; }} />
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                      style={{ background: attachedImage ? "var(--accent-warm-light)" : "var(--secondary)", color: attachedImage ? "var(--accent)" : "var(--muted-foreground)", border: "1px solid var(--border)" }}
                      title={isFr ? "Joindre une photo produit" : "Attach product photo"}>
                      <Paperclip size={14} />
                    </button>
                  </>
                )}

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runGeneration(); } }}
                    placeholder={mode === "image"
                      ? (isFr ? "Décrivez votre visuel... (ou dictez avec le micro)" : "Describe your visual... (or dictate)")
                      : mode === "text"
                        ? (isFr ? "Décrivez votre contenu..." : "Describe your content...")
                        : (isFr ? "Décrivez votre vidéo..." : "Describe your video...")}
                    className="w-full resize-none outline-none"
                    rows={2}
                    style={{ fontSize: 14, color: "var(--foreground)", background: "transparent", lineHeight: 1.5 }}
                  />
                </div>

                {/* Voice button */}
                {isTranscribing ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1.5">
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--foreground)" }} />
                    <span style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 500 }}>{isFr ? "Transcription..." : "Transcribing..."}</span>
                  </div>
                ) : isRecording ? (
                  <button onClick={stopRecording}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer transition-all flex-shrink-0"
                    style={{ background: "rgba(212, 24, 61, 0.1)" }}>
                    <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                      <Square size={11} style={{ color: "#d4183d", fill: "#d4183d" }} />
                    </motion.div>
                    <span style={{ fontSize: 11, color: "#d4183d", fontWeight: 600 }}>
                      {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, "0")}
                    </span>
                  </button>
                ) : (
                  <button onClick={startRecording} disabled={isRunning}
                    className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0 disabled:opacity-30"
                    style={{ background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}
                    title={isFr ? "Dicter votre brief" : "Dictate your brief"}>
                    <Mic size={14} />
                  </button>
                )}

                {/* Send button */}
                <button onClick={runGeneration}
                  disabled={!prompt.trim() || selectedModels.length < 1 || isRunning}
                  className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all flex-shrink-0 disabled:opacity-20 disabled:cursor-not-allowed"
                  style={{
                    background: (prompt.trim() && selectedModels.length > 0) ? "var(--foreground)" : "var(--secondary)",
                    color: (prompt.trim() && selectedModels.length > 0) ? "var(--background)" : "var(--muted-foreground)",
                  }}>
                  {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LIGHTBOX — Full-screen image with KPI panel ═══ */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setLightbox(null)}
          >
            {/* Image */}
            <div className="flex-1 flex items-center justify-center p-8" onClick={e => e.stopPropagation()}>
              {lightbox.imageUrl && (
                <motion.img
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={lightbox.imageUrl}
                  className="max-w-full max-h-full object-contain rounded-2xl"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
                  alt={lightbox.label}
                />
              )}
              {lightbox.videoUrl && (
                <video src={lightbox.videoUrl} controls autoPlay className="max-w-full max-h-full rounded-2xl" />
              )}
            </div>

            {/* KPI Panel */}
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 flex-shrink-0 overflow-y-auto"
              style={{ background: "#FFFFFF", borderLeft: "1px solid var(--border)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{lightbox.label}</span>
                <button onClick={() => setLightbox(null)} className="cursor-pointer" style={{ color: "var(--muted-foreground)" }}>
                  <X size={18} />
                </button>
              </div>

              <div className="px-5 py-5 space-y-6">
                <div className="flex justify-center">
                  <ScoreGauge score={lightbox.scores.overall} size={120} isFr={isFr} />
                </div>

                <div className="space-y-2">
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                    {isFr ? "Détail des scores" : "Score breakdown"}
                  </span>
                  <CategoryBar label={isFr ? "Vitesse" : "Speed"} value={lightbox.scores.speed} />
                  <CategoryBar label={isFr ? "Valeur" : "Value"} value={lightbox.scores.value} />
                  <CategoryBar label={isFr ? "Qualité" : "Quality"} value={lightbox.scores.quality} />
                  <CategoryBar label={isFr ? "Fiabilité" : "Rely."} value={lightbox.scores.reliability} />
                </div>

                {(() => {
                  const mInfo = catalog.find(c => c.id === lightbox.modelId);
                  if (!mInfo) return null;
                  return (
                    <div className="space-y-3">
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)" }}>
                          {isFr ? "À propos de ce modèle" : "About this model"}
                        </span>
                        <div style={{ fontSize: 12, color: "var(--foreground)", marginTop: 4, lineHeight: 1.5 }}>
                          {mInfo.bestFor}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {mInfo.strengths.map(s => (
                          <span key={s} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "var(--secondary)", color: "var(--foreground)", fontWeight: 500 }}>{s}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3" style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                        <span>{mInfo.credits} {isFr ? "crédits" : "credits"}</span>
                        <span>·</span>
                        <span>{(lightbox.timeMs / 1000).toFixed(1)}s</span>
                        <span>·</span>
                        <span style={{
                          padding: "1px 6px", borderRadius: 4, fontWeight: 600,
                          background: mInfo.tier === "premium" ? "#7C3AED15" : mInfo.tier === "economy" ? "#22c55e15" : "var(--secondary)",
                          color: mInfo.tier === "premium" ? "#7C3AED" : mInfo.tier === "economy" ? "#22c55e" : "var(--muted-foreground)",
                        }}>{mInfo.tier}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  {lightbox.imageUrl && (
                    <a href={lightbox.imageUrl} download target="_blank" rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl transition-all"
                      style={{ background: "var(--foreground)", color: "var(--background)", fontSize: 13, fontWeight: 600 }}>
                      <Download size={14} /> {isFr ? "Télécharger" : "Download"}
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setResults(prev => prev.map(x => x.id === lightbox.id ? { ...x, saved: !x.saved } : x));
                      setLightbox(prev => prev ? { ...prev, saved: !prev.saved } : null);
                      toast.success(lightbox.saved ? (isFr ? "Retiré des favoris" : "Removed") : (isFr ? "Sauvegardé !" : "Saved!"));
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl transition-all cursor-pointer"
                    style={{ background: lightbox.saved ? "#ef444415" : "var(--secondary)", color: lightbox.saved ? "#ef4444" : "var(--foreground)", fontSize: 13, fontWeight: 600, border: "1px solid var(--border)" }}>
                    <Heart size={14} fill={lightbox.saved ? "#ef4444" : "none"} /> {lightbox.saved ? (isFr ? "Favori" : "Saved") : (isFr ? "Sauvegarder" : "Save to Library")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </RouteGuard>
  );
}

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, Loader2, AlertTriangle, CheckCircle2, Info,
  Sparkles, Shield, Palette, Eye, Download, RotateCcw,
  ChevronDown, ChevronRight, Lightbulb, Zap, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";

/* ═══════════════════════════════════════════════════════════
   ANALYZE PAGE — "Yuka for AI Content"
   Upload a visual → get scored → get recommendations
   ═══════════════════════════════════════════════════════════ */

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA47OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

// ── Types ──

interface AxisScore {
  score: number;
  issues: string[];
  positives: string[];
}

interface AnalysisResult {
  success: true;
  overall: number;
  technical: AxisScore;
  creative: AxisScore;
  brandFit: AxisScore;
  compliance: AxisScore;
  recommendations: string[];
  promptTips: string[];
  bestModelFor: string;
  summary: string;
  tookMs: number;
}

// ── Score helpers ──

function getGradeLabel(score: number): { label: string; labelFr: string; color: string } {
  if (score >= 80) return { label: "Excellent", labelFr: "Excellent", color: "#22c55e" };
  if (score >= 60) return { label: "Good", labelFr: "Bon", color: "#84cc16" };
  if (score >= 40) return { label: "Mediocre", labelFr: "Médiocre", color: "#f59e0b" };
  return { label: "Poor", labelFr: "Insuffisant", color: "#ef4444" };
}

// ── Score Gauge (SVG ring) ──

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const { color, labelFr } = getGradeLabel(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill={`${color}12`} stroke="var(--border)" strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4.5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={size >= 100 ? 32 : 22} fontWeight={800}>{score}</text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" dominantBaseline="central"
          fill="var(--muted-foreground)" fontSize={11}>/100</text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color, letterSpacing: "0.02em" }}>{labelFr}</span>
    </div>
  );
}

// ── Axis Bar ──

function AxisBar({ label, icon, score, items, defaultOpen = false }: {
  label: string; icon: React.ReactNode; score: number;
  items: { issues: string[]; positives: string[] };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { color } = getGradeLabel(score);
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--muted)]/30 transition-colors"
      >
        <span style={{ color }}>{icon}</span>
        <span className="flex-1 font-semibold text-sm">{label}</span>
        <div className="flex items-center gap-3">
          <div style={{ width: 100, height: 6, background: "var(--muted)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ height: "100%", background: color, borderRadius: 3 }}
            />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color, minWidth: 28, textAlign: "right" }}>{score}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2">
              {items.positives.length > 0 && (
                <div className="space-y-1">
                  {items.positives.map((p, i) => (
                    <div key={`p-${i}`} className="flex gap-2 text-xs" style={{ color: "#22c55e" }}>
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                      <span style={{ color: "var(--foreground)" }}>{p}</span>
                    </div>
                  ))}
                </div>
              )}
              {items.issues.length > 0 && (
                <div className="space-y-1">
                  {items.issues.map((issue, i) => (
                    <div key={`i-${i}`} className="flex gap-2 text-xs" style={{ color: "#f59e0b" }}>
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      <span style={{ color: "var(--foreground)" }}>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════ */

export function AnalyzePage() {
  const { getAuthHeader } = useAuth();
  const { locale } = useI18n();
  const isFr = locale === "fr";

  // State
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Server post ──
  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 90_000) => {
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

  // ── Upload to Supabase Storage ──
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const token = getAuthHeader();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `analyze/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    try {
      const res = await serverPost("/storage/upload-url", { fileName, contentType: file.type });
      if (res?.signedUrl) {
        await fetch(res.signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        return res.publicUrl || res.signedUrl.split("?")[0];
      }
      // Fallback: try direct upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("_token", token || "");
      const r = await fetch(`${API_BASE}/storage/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}` },
        body: formData,
        signal: AbortSignal.timeout(30_000),
      });
      const data = await r.json();
      return data?.url || data?.publicUrl || null;
    } catch (err) {
      console.warn("[analyze] upload failed:", err);
      return null;
    }
  }, [getAuthHeader, serverPost]);

  // ── Handle file selection ──
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error(isFr ? "Format non supporté. Utilisez une image ou vidéo." : "Unsupported format. Use an image or video.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(isFr ? "Fichier trop lourd (max 20 MB)" : "File too large (max 20 MB)");
      return;
    }
    setImageFile(file);
    setResult(null);
    setError(null);
    // Create local preview
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, [isFr]);

  // ── Drag & drop handlers ──
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Analyze ──
  const analyze = useCallback(async () => {
    if (!imageFile && !imageUrl) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let url = imageUrl;

      // If we have a local file, upload it first
      if (imageFile && imageUrl?.startsWith("blob:")) {
        toast.info(isFr ? "Upload en cours..." : "Uploading...");
        const uploaded = await uploadImage(imageFile);
        if (!uploaded) {
          // Fallback: use object URL directly won't work for server.
          // Try converting to data URL
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(imageFile);
          });
          url = dataUrl;
        } else {
          url = uploaded;
        }
      }

      toast.info(isFr ? "Analyse en cours..." : "Analyzing...");
      const res = await serverPost("/analyze/score", {
        imageUrl: url,
        prompt: prompt || undefined,
      }, 120_000);

      if (res?.success) {
        setResult(res as AnalysisResult);
        toast.success(isFr ? `Score : ${res.overall}/100` : `Score: ${res.overall}/100`);

        // Save to localStorage for Dashboard
        try {
          const entry = {
            id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            imageUrl: url || "",
            overall: res.overall,
            technical: res.technical.score,
            creative: res.creative.score,
            brandFit: res.brandFit.score,
            compliance: res.compliance.score,
            summary: res.summary || "",
            topIssue: res.technical.issues[0] || res.creative.issues[0] || res.compliance.issues[0] || "",
            date: new Date().toISOString(),
          };
          const existing = JSON.parse(localStorage.getItem("ora-analyses") || "[]");
          existing.unshift(entry);
          localStorage.setItem("ora-analyses", JSON.stringify(existing.slice(0, 100)));
        } catch {}
      } else {
        setError(res?.error || (isFr ? "Erreur d'analyse" : "Analysis error"));
        toast.error(res?.error || "Analysis failed");
      }
    } catch (err: any) {
      setError(err?.message || "Error");
      toast.error(err?.message || "Error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile, imageUrl, prompt, isFr, serverPost, uploadImage]);

  // ── Reset ──
  const reset = useCallback(() => {
    setImageUrl(null);
    setImageFile(null);
    setPrompt("");
    setResult(null);
    setError(null);
  }, []);

  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">

            {/* ── Header ── */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
                {isFr ? "Analyse ton visuel IA" : "Analyze your AI visual"}
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {isFr
                  ? "Upload un visuel généré par IA. Ora l'audite et te dit comment l'améliorer."
                  : "Upload an AI-generated visual. Ora audits it and tells you how to improve it."}
              </p>
            </div>

            {/* ── Upload zone ── */}
            {!result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Drop zone */}
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => !imageUrl && fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "var(--accent)" : imageUrl ? "var(--border)" : "var(--muted-foreground)"}`,
                    borderRadius: 16,
                    background: dragOver ? "var(--accent)/8" : imageUrl ? "var(--card)" : "var(--muted)/30",
                    cursor: imageUrl ? "default" : "pointer",
                    transition: "all 0.2s",
                    minHeight: imageUrl ? "auto" : 240,
                  }}
                  className="flex flex-col items-center justify-center p-6 relative"
                >
                  {imageUrl ? (
                    <div className="relative w-full">
                      <img
                        src={imageUrl}
                        alt="Visual to analyze"
                        style={{ maxHeight: 400, borderRadius: 12, objectFit: "contain", margin: "0 auto", display: "block" }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="absolute top-2 right-2 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                        style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                      >
                        <RotateCcw size={12} /> {isFr ? "Changer" : "Change"}
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={40} style={{ color: "var(--muted-foreground)", marginBottom: 12 }} />
                      <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
                        {isFr ? "Glisse ton visuel ici" : "Drop your visual here"}
                      </p>
                      <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                        {isFr ? "ou clique pour sélectionner — JPG, PNG, WebP (max 20 MB)" : "or click to select — JPG, PNG, WebP (max 20 MB)"}
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>

                {/* Prompt field (optional) */}
                {imageUrl && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                        {isFr ? "Prompt utilisé (optionnel)" : "Prompt used (optional)"}
                      </label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={isFr
                          ? "Colle ici le prompt que tu as utilisé pour générer ce visuel..."
                          : "Paste the prompt you used to generate this visual..."}
                        rows={3}
                        className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                        style={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                          outline: "none",
                        }}
                      />
                    </div>

                    {/* Analyze button */}
                    <button
                      onClick={analyze}
                      disabled={isAnalyzing}
                      className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: isAnalyzing ? "var(--muted)" : "var(--foreground)",
                        color: isAnalyzing ? "var(--muted-foreground)" : "var(--background)",
                        cursor: isAnalyzing ? "not-allowed" : "pointer",
                      }}
                    >
                      {isAnalyzing ? (
                        <><Loader2 size={16} className="animate-spin" /> {isFr ? "Analyse en cours..." : "Analyzing..."}</>
                      ) : (
                        <><Sparkles size={16} /> {isFr ? "Analyser" : "Analyze"}</>
                      )}
                    </button>
                  </motion.div>
                )}

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "#ef444420", color: "#ef4444" }}>
                    <AlertTriangle size={16} /> {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ RESULTS ═══ */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* Top: Image + Score */}
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Image preview */}
                  <div style={{ flex: "0 0 auto" }}>
                    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img
                        src={imageUrl!}
                        alt="Analyzed visual"
                        style={{ maxHeight: 280, maxWidth: 320, objectFit: "contain", display: "block" }}
                      />
                    </div>
                    <button
                      onClick={reset}
                      className="mt-3 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-80 transition-opacity"
                      style={{ background: "var(--muted)", color: "var(--foreground)" }}
                    >
                      <RotateCcw size={12} /> {isFr ? "Analyser un autre" : "Analyze another"}
                    </button>
                  </div>

                  {/* Score + Summary */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start gap-5">
                      <ScoreGauge score={result.overall} size={130} />
                      <div className="flex-1 pt-2">
                        <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                          {isFr ? "Résultat de l'analyse" : "Analysis Result"}
                        </h2>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                          {result.summary}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
                          <Zap size={11} /> {(result.tookMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                    {isFr ? "Détail des scores" : "Score breakdown"}
                  </h3>
                  <AxisBar
                    label={isFr ? "Technique (40%)" : "Technical (40%)"}
                    icon={<Eye size={16} />}
                    score={result.technical.score}
                    items={result.technical}
                    defaultOpen
                  />
                  <AxisBar
                    label={isFr ? "Créatif (35%)" : "Creative (35%)"}
                    icon={<Sparkles size={16} />}
                    score={result.creative.score}
                    items={result.creative}
                    defaultOpen
                  />
                  <AxisBar
                    label={isFr ? "Brand Fit (15%)" : "Brand Fit (15%)"}
                    icon={<Palette size={16} />}
                    score={result.brandFit.score}
                    items={result.brandFit}
                  />
                  <AxisBar
                    label={isFr ? "Conformité (10%)" : "Compliance (10%)"}
                    icon={<Shield size={16} />}
                    score={result.compliance.score}
                    items={result.compliance}
                  />
                </div>

                {/* Recommendations */}
                {result.recommendations.length > 0 && (
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                      <Lightbulb size={15} style={{ color: "#f59e0b" }} />
                      {isFr ? "Recommandations" : "Recommendations"}
                    </h3>
                    <div className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: "var(--accent)" }} />
                          <span style={{ color: "var(--foreground)" }}>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt tips */}
                {result.promptTips.length > 0 && (
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                      <Info size={15} style={{ color: "#3b82f6" }} />
                      {isFr ? "Améliore ton prompt" : "Improve your prompt"}
                    </h3>
                    <div className="space-y-2">
                      {result.promptTips.map((tip, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: "#3b82f6" }} />
                          <span style={{ color: "var(--foreground)" }}>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Best model suggestion */}
                {result.bestModelFor && (
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4">
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                      <Sparkles size={15} style={{ color: "var(--accent)" }} />
                      {isFr ? "Modèle recommandé" : "Recommended model"}
                    </h3>
                    <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {result.bestModelFor}
                    </p>
                  </div>
                )}

              </motion.div>
            )}

          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

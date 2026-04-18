import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload, Loader2, AlertTriangle, CheckCircle2,
  Sparkles, Shield, Palette, Eye,
  Download, RotateCcw, ChevronDown, ChevronRight, Lightbulb, Zap, ArrowRight,
  Check, Ban, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";
import { downloadReport } from "../lib/analyze-report";

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA47OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

// ── Types ──

interface AxisScore {
  score: number;
  issues: string[];
  positives: string[];
}

interface TaggedReco {
  kpi: "legal" | "brand" | "creative";
  text: string;
  impact: "high" | "medium" | "low";
}

interface AnalysisResult {
  success: true;
  id?: string;
  overall: number;
  legal: AxisScore;
  brandFit: AxisScore;
  creative: AxisScore;
  recommendations: TaggedReco[];
  optimizedPrompt: string;
  publishVerdict: "safe" | "revise" | "block";
  summary: string;
  tookMs: number;
}

// ── Score helpers ──

function getGradeLabel(score: number): { labelFr: string; color: string } {
  if (score >= 80) return { labelFr: "Excellent", color: "#22c55e" };
  if (score >= 60) return { labelFr: "Bon", color: "#84cc16" };
  if (score >= 40) return { labelFr: "Médiocre", color: "#f59e0b" };
  return { labelFr: "Insuffisant", color: "#ef4444" };
}

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const { color, labelFr } = getGradeLabel(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill={`${color}12`} stroke="var(--border)" strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4.5}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={size >= 100 ? 34 : 22} fontWeight={800} letterSpacing="-0.02em">{score}</text>
        <text x={size / 2} y={size / 2 + 20} textAnchor="middle" dominantBaseline="central"
          fill="var(--muted-foreground)" fontSize={11}>/100</text>
      </svg>
      <span className="uppercase tracking-wide" style={{ fontSize: 11, fontWeight: 700, color }}>{labelFr}</span>
    </div>
  );
}

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
          <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color, minWidth: 28, textAlign: "right" }}>{score}</span>
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

/* ═══ MAIN ═══ */

export function AnalyzePage() {
  const { getAuthHeader } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const isFr = locale === "fr";

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [briefContext, setBriefContext] = useState("");
  const [objective, setObjective] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [brandVault, setBrandVault] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load brand vault on mount
  useEffect(() => {
    serverPost("/vault/load", {}).then(res => {
      if (res?.success && res.vault) setBrandVault(res.vault);
    }).catch(() => {});
  }, [serverPost]);

  const fileToDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error(isFr ? "Format non supporté. Utilisez une image ou vidéo." : "Unsupported format.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(isFr ? "Fichier trop lourd (max 20 MB)" : "File too large (max 20 MB)");
      return;
    }
    setImageFile(file);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, [isFr]);

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const analyze = useCallback(async () => {
    if (!imageFile && !imageUrl) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      let url = imageUrl;
      if (imageFile && imageUrl?.startsWith("blob:")) {
        toast.info(isFr ? "Préparation de l'image..." : "Preparing image...");
        url = await fileToDataUrl(imageFile);
      }

      toast.info(isFr ? "Analyse en cours..." : "Analyzing...");
      const res = await serverPost("/analyze/score", {
        imageUrl: url,
        prompt: prompt || undefined,
        briefContext: briefContext || undefined,
        objective: objective || undefined,
        brandVault: brandVault || undefined,
      }, 120_000);

      if (res?.success) {
        setResult(res as AnalysisResult);
        toast.success(isFr ? `Score : ${res.overall}/100` : `Score: ${res.overall}/100`);
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
  }, [imageFile, imageUrl, prompt, briefContext, objective, brandVault, isFr, serverPost, fileToDataUrl]);

  const reset = useCallback(() => {
    setImageUrl(null);
    setImageFile(null);
    setPrompt("");
    setBriefContext("");
    setObjective("");
    setResult(null);
    setError(null);
  }, []);

  const handleOptimize = useCallback(() => {
    if (result?.id) {
      navigate(`/hub/compare?id=${result.id}`);
    } else {
      toast.error(isFr ? "Analyse non sauvegardée" : "Analysis not saved");
    }
  }, [result, navigate, isFr]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    downloadReport({
      id: result.id || "",
      imageUrl: imageUrl || "",
      prompt,
      briefContext,
      objective,
      overall: result.overall,
      legal: result.legal,
      brandFit: result.brandFit,
      creative: result.creative,
      recommendations: result.recommendations,
      optimizedPrompt: result.optimizedPrompt,
      publishVerdict: result.publishVerdict,
      summary: result.summary,
      date: new Date().toISOString(),
    }, isFr);
  }, [result, imageUrl, prompt, briefContext, objective, isFr]);

  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">

            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
                {isFr ? "Analyse ton visuel IA" : "Analyze your AI visual"}
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {isFr
                  ? "Upload un visuel généré par IA. Ora le score sur 3 KPIs (Legal, Brand, Creative) et te dit comment l'améliorer."
                  : "Upload an AI-generated visual. Ora scores it on 3 KPIs (Legal, Brand, Creative) and tells you how to improve it."}
              </p>
              {brandVault && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: "var(--accent-warm-light)", color: "var(--accent)" }}>
                  <CheckCircle2 size={12} /> {isFr ? `Brand vault chargé : ${brandVault.company_name || brandVault.brandName || ""}` : `Brand vault loaded: ${brandVault.company_name || brandVault.brandName || ""}`}
                </div>
              )}
            </div>

            {!result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
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
                      <img src={imageUrl} alt="" style={{ maxHeight: 400, borderRadius: 12, objectFit: "contain", margin: "0 auto", display: "block" }} />
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

                {imageUrl && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                        {isFr ? "Prompt utilisé (optionnel)" : "Prompt used (optional)"}
                      </label>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={isFr ? "Colle ici le prompt que tu as utilisé..." : "Paste the prompt you used..."}
                        rows={2}
                        className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                        {isFr ? "Brief / contexte (optionnel mais recommandé)" : "Brief / context (optional but recommended)"}
                      </label>
                      <textarea
                        value={briefContext}
                        onChange={(e) => setBriefContext(e.target.value)}
                        placeholder={isFr ? "Décris le brief initial : sujet, ambiance, éléments clés à faire apparaître..." : "Describe the brief: subject, mood, key elements..."}
                        rows={2}
                        className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                        {isFr ? "Objectif de la campagne (optionnel)" : "Campaign objective (optional)"}
                      </label>
                      <textarea
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder={isFr ? "Quel est le but ? Awareness, conversion, engagement, recrutement..." : "What's the goal? Awareness, conversion, engagement..."}
                        rows={2}
                        className="w-full rounded-xl px-4 py-3 text-sm resize-none"
                        style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", outline: "none" }}
                      />
                    </div>

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

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div style={{ flex: "0 0 auto" }}>
                    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <img src={imageUrl!} alt="" style={{ maxHeight: 280, maxWidth: 320, objectFit: "contain", display: "block" }} />
                    </div>
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-5">
                      <ScoreGauge score={result.overall} size={140} />
                      <div className="flex-1">
                        <VerdictBadge verdict={result.publishVerdict} isFr={isFr} />
                        <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--foreground)" }}>
                          {result.summary}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                          <Zap size={10} /> {(result.tookMs / 1000).toFixed(1)}s
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                    {isFr ? "Détail des 3 KPIs" : "3 KPIs breakdown"}
                  </h3>
                  <AxisBar label={isFr ? "Legal (30%)" : "Legal (30%)"} icon={<Shield size={16} />} score={result.legal.score} items={result.legal} defaultOpen />
                  <AxisBar label={isFr ? "Brand Fit (35%)" : "Brand Fit (35%)"} icon={<Palette size={16} />} score={result.brandFit.score} items={result.brandFit} defaultOpen />
                  <AxisBar label={isFr ? "Créatif (35%)" : "Creative (35%)"} icon={<Eye size={16} />} score={result.creative.score} items={result.creative} defaultOpen />
                </div>

                {result.recommendations.length > 0 && (
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} className="p-4">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
                      <Lightbulb size={15} style={{ color: "#F59E0B" }} />
                      {isFr ? "Recommandations" : "Recommendations"}
                    </h3>
                    <div className="space-y-2">
                      {result.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: "var(--muted)", borderLeft: `3px solid ${rec.kpi === "legal" ? "#B91C1C" : rec.kpi === "brand" ? "#1D4ED8" : "#15803D"}` }}>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase"
                            style={{
                              background: rec.kpi === "legal" ? "#fef2f2" : rec.kpi === "brand" ? "#eff6ff" : "#f0fdf4",
                              color: rec.kpi === "legal" ? "#B91C1C" : rec.kpi === "brand" ? "#1D4ED8" : "#15803D",
                            }}
                          >
                            {rec.kpi}
                          </span>
                          <span className="flex-1" style={{ color: "var(--foreground)" }}>{rec.text}</span>
                          {rec.impact === "high" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "#fef2f2", color: "#B91C1C" }}>!</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <button
                    onClick={handleOptimize}
                    disabled={!result.id}
                    className="py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ background: "#1D4ED8", color: "#fff", outlineColor: "#1D4ED8" }}
                  >
                    <Sparkles size={15} /> {isFr ? "Optimiser" : "Optimize"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors hover:bg-[var(--muted)]/60"
                    style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <Download size={15} /> {isFr ? "Rapport" : "Report"}
                  </button>
                  <button
                    onClick={reset}
                    className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors hover:bg-[var(--muted)]/60"
                    style={{ background: "var(--card)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                  >
                    <RotateCcw size={15} /> {isFr ? "Autre visuel" : "New visual"}
                  </button>
                </div>

              </motion.div>
            )}

          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

function VerdictBadge({ verdict, isFr }: { verdict: "safe" | "revise" | "block"; isFr: boolean }) {
  const config = {
    safe:   { icon: <Check size={13} />,          bg: "#dcfce7", color: "#15803d", label: isFr ? "Publier"     : "Publish" },
    revise: { icon: <RefreshCw size={13} />,      bg: "#fef3c7", color: "#b45309", label: isFr ? "À retoucher" : "Revise" },
    block:  { icon: <Ban size={13} />,            bg: "#fef2f2", color: "#b91c1c", label: isFr ? "Bloquer"     : "Block" },
  }[verdict];
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: config.bg, color: config.color }}>
      {config.icon} {config.label}
    </span>
  );
}

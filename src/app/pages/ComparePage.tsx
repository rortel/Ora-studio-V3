import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Shield, Palette, Eye,
  Sparkles, Download, Copy, RotateCw, ArrowRight, Loader2, AlertTriangle,
  CheckCircle2, TrendingUp, BarChart3, Trash2, RefreshCw, Check, Ban,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";
import { downloadReport } from "../lib/analyze-report";

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA47OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

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

interface Analysis {
  id: string;
  imageUrl: string;
  prompt?: string;
  briefContext?: string;
  objective?: string;
  overall: number;
  legal: AxisScore;
  brandFit: AxisScore;
  creative: AxisScore;
  recommendations: TaggedReco[];
  optimizedPrompt?: string;
  publishVerdict: "safe" | "revise" | "block";
  summary: string;
  date: string;
}

function getGradeLabel(score: number): { labelFr: string; color: string } {
  if (score >= 80) return { labelFr: "Excellent", color: "#22c55e" };
  if (score >= 60) return { labelFr: "Bon", color: "#84cc16" };
  if (score >= 40) return { labelFr: "Médiocre", color: "#f59e0b" };
  return { labelFr: "Insuffisant", color: "#ef4444" };
}

function ScoreGauge({ score, size = 100, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, score)) / 100);
  const { color } = getGradeLabel(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill={`${color}12`} stroke="var(--border)" strokeWidth={2} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={size >= 90 ? 24 : 18} fontWeight={800}>{score}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" dominantBaseline="central"
          fill="var(--muted-foreground)" fontSize={10}>/100</text>
      </svg>
      {label && <span className="text-xs font-semibold" style={{ color }}>{label}</span>}
    </div>
  );
}

function KpiRow({ label, icon, current, predicted }: {
  label: string;
  icon: React.ReactNode;
  current: number;
  predicted?: number;
}) {
  const curColor = getGradeLabel(current).color;
  const predColor = predicted !== undefined ? getGradeLabel(predicted).color : undefined;
  const delta = predicted !== undefined ? predicted - current : 0;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <span style={{ color: curColor }}>{icon}</span>
      <span className="flex-1 text-sm font-semibold" style={{ color: "var(--foreground)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-sm" style={{ color: curColor, minWidth: 28, textAlign: "right" }}>{current}</span>
        {predicted !== undefined && (
          <>
            <ArrowRight size={12} style={{ color: "var(--muted-foreground)" }} />
            <span className="font-bold text-sm" style={{ color: predColor, minWidth: 28, textAlign: "right" }}>{predicted}</span>
            {delta !== 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{
                background: delta > 0 ? "#22c55e20" : "#ef444420",
                color: delta > 0 ? "#22c55e" : "#ef4444",
              }}>
                {delta > 0 ? "+" : ""}{delta}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══ MAIN ═══ */

export function ComparePage() {
  const { getAuthHeader } = useAuth();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFr = locale === "fr";
  const id = searchParams.get("id");

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [list, setList] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serverPost = useCallback(async (path: string, body: any, timeoutMs = 30_000) => {
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

  // Load either a single analysis by id, or the full list
  useEffect(() => {
    setLoading(true);
    setError(null);
    if (id) {
      serverPost("/analyze/detail", { id }).then(res => {
        if (res?.success && res.analysis) setAnalysis(res.analysis);
        else setError(res?.error || (isFr ? "Analyse introuvable" : "Analysis not found"));
      }).finally(() => setLoading(false));
    } else {
      serverPost("/analyze/history", {}).then(res => {
        if (res?.success) setList(Array.isArray(res.analyses) ? res.analyses : []);
        else setError(res?.error || "Failed to load");
      }).finally(() => setLoading(false));
    }
  }, [id, serverPost, isFr]);

  const handleCopyPrompt = useCallback(() => {
    if (!analysis?.optimizedPrompt) return;
    navigator.clipboard.writeText(analysis.optimizedPrompt).then(() => {
      toast.success(isFr ? "Prompt copié" : "Prompt copied");
    }).catch(() => toast.error(isFr ? "Échec de la copie" : "Copy failed"));
  }, [analysis, isFr]);

  const handleRetest = useCallback(() => {
    if (!analysis?.optimizedPrompt) return;
    try {
      sessionStorage.setItem("ora-retest-prompt", analysis.optimizedPrompt);
    } catch {}
    navigator.clipboard.writeText(analysis.optimizedPrompt).catch(() => {});
    toast.success(isFr ? "Prompt copié — colle-le dans Analyze" : "Prompt copied — paste in Analyze");
    navigate("/hub/analyze");
  }, [analysis, navigate, isFr]);

  const handleDownload = useCallback(() => {
    if (!analysis) return;
    downloadReport(analysis, isFr);
  }, [analysis, isFr]);

  const handleDelete = useCallback(async () => {
    if (!analysis) return;
    const ok = window.confirm(isFr ? "Supprimer cette analyse ?" : "Delete this analysis?");
    if (!ok) return;
    const res = await serverPost("/analyze/delete", { id: analysis.id });
    if (res?.success) {
      toast.success(isFr ? "Analyse supprimée" : "Analysis deleted");
      navigate("/hub/dashboard");
    } else {
      toast.error(res?.error || "Delete failed");
    }
  }, [analysis, navigate, serverPost, isFr]);

  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = useCallback(async () => {
    if (!analysis) return;
    setRegenerating(true);
    toast.info(isFr ? "Régénération en cours…" : "Regenerating…");
    const res = await serverPost("/analyze/regenerate", { id: analysis.id }, 120_000);
    if (res?.success && res.newImageUrl) {
      toast.success(isFr ? "Nouveau visuel généré — rescoring…" : "New visual generated — rescoring…");
      const rescore = await serverPost("/analyze/score", {
        imageUrl: res.newImageUrl,
        prompt: analysis.optimizedPrompt || analysis.prompt,
        briefContext: analysis.briefContext,
        objective: analysis.objective,
      }, 120_000);
      if (rescore?.success) {
        toast.success(isFr ? `Nouveau score : ${rescore.overall}/100` : `New score: ${rescore.overall}/100`);
        if (rescore.id) navigate(`/hub/compare?id=${rescore.id}`);
      } else {
        toast.error(rescore?.error || "Rescore failed");
      }
    } else {
      toast.error(res?.error || "Regeneration failed");
    }
    setRegenerating(false);
  }, [analysis, serverPost, navigate, isFr]);

  const kpiIcons = useMemo(() => ({
    legal: <Shield size={14} />,
    brandFit: <Palette size={14} />,
    creative: <Eye size={14} />,
  }), []);

  // ── List view (no id) ──
  if (!id) {
    return (
      <RouteGuard>
        <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-8">

              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
                  {isFr ? "Comparer / Optimiser" : "Compare / Optimize"}
                </h1>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {isFr ? "Sélectionne une analyse pour voir la version optimisée." : "Select an analysis to see the optimized version."}
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "#ef444420", color: "#ef4444" }}>
                  <AlertTriangle size={16} /> {error}
                </div>
              ) : list.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                  <BarChart3 size={48} style={{ color: "var(--muted-foreground)", margin: "0 auto 16px" }} />
                  <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                    {isFr ? "Aucune analyse à optimiser" : "No analyses to optimize"}
                  </h2>
                  <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)", maxWidth: 400, margin: "0 auto 24px" }}>
                    {isFr ? "Commence par analyser un visuel pour obtenir des recommandations d'optimisation." : "Start by analyzing a visual to get optimization recommendations."}
                  </p>
                  <Link
                    to="/hub/analyze"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
                    style={{ background: "var(--foreground)", color: "var(--background)" }}
                  >
                    <Sparkles size={15} /> {isFr ? "Analyser un visuel" : "Analyze a visual"}
                  </Link>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {list.map(a => (
                    <Link
                      key={a.id}
                      to={`/hub/compare?id=${a.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--muted)]/30 transition-colors"
                      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    >
                      {a.imageUrl ? (
                        <img src={a.imageUrl} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <BarChart3 size={18} style={{ color: "var(--muted-foreground)" }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                          {a.summary || "—"}
                        </div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {new Date(a.date).toLocaleDateString(isFr ? "fr-FR" : "en-US")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg" style={{ color: getGradeLabel(a.overall).color }}>{a.overall}</span>
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>/100</span>
                      </div>
                      <ArrowRight size={16} style={{ color: "var(--muted-foreground)" }} />
                    </Link>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // ── Detail view (with id) ──
  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">

            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <Link to="/hub/compare" className="text-xs font-medium hover:underline" style={{ color: "var(--muted-foreground)" }}>
                  ← {isFr ? "Toutes les analyses" : "All analyses"}
                </Link>
                <h1 className="text-2xl font-bold mt-1" style={{ color: "var(--foreground)" }}>
                  {isFr ? "Analyse & optimisation" : "Analysis & optimization"}
                </h1>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--muted-foreground)" }} />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "#ef444420", color: "#ef4444" }}>
                <AlertTriangle size={16} /> {error}
              </div>
            ) : analysis ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                {/* Action bar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: "#1d4ed8", color: "#fff" }}
                  >
                    {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {isFr ? "Régénérer" : "Regenerate"}
                  </button>
                  <button
                    onClick={handleRetest}
                    disabled={!analysis.optimizedPrompt}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: "var(--foreground)", color: "var(--background)" }}
                  >
                    <RotateCw size={13} /> {isFr ? "Retester avec le prompt optimisé" : "Retest with optimized prompt"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
                    style={{ background: "var(--muted)", color: "var(--foreground)" }}
                  >
                    <Download size={13} /> {isFr ? "Télécharger le rapport" : "Download report"}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 ml-auto"
                    style={{ background: "transparent", color: "#ef4444", border: "1px solid #ef444440" }}
                  >
                    <Trash2 size={13} /> {isFr ? "Supprimer" : "Delete"}
                  </button>
                </div>

                {/* 2-column layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* LEFT — Original */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                        {isFr ? "Visuel original" : "Original visual"}
                      </div>
                      {analysis.imageUrl ? (
                        <img
                          src={analysis.imageUrl}
                          alt=""
                          style={{ width: "100%", maxHeight: 320, borderRadius: 12, objectFit: "contain", border: "1px solid var(--border)" }}
                        />
                      ) : (
                        <div style={{ height: 200, borderRadius: 12, border: "1px solid var(--border)", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{isFr ? "Image non disponible" : "Image not available"}</span>
                        </div>
                      )}
                    </div>

                    {analysis.summary && (
                      <div className="p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <p className="text-sm" style={{ color: "var(--foreground)" }}>{analysis.summary}</p>
                      </div>
                    )}

                    <div className="flex justify-center">
                      <ScoreGauge score={analysis.overall} size={110} label={isFr ? "Score actuel" : "Current score"} />
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                        {isFr ? "Scores actuels — 3 KPIs" : "Current scores — 3 KPIs"}
                      </div>
                      <div className="space-y-1.5">
                        <KpiRow label="Legal (30%)" icon={kpiIcons.legal} current={analysis.legal.score} />
                        <KpiRow label="Brand Fit (35%)" icon={kpiIcons.brandFit} current={analysis.brandFit.score} />
                        <KpiRow label={isFr ? "Créatif (35%)" : "Creative (35%)"} icon={kpiIcons.creative} current={analysis.creative.score} />
                      </div>
                      <VerdictBadge verdict={analysis.publishVerdict} isFr={isFr} />
                    </div>

                    {analysis.prompt && (
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                          {isFr ? "Prompt original" : "Original prompt"}
                        </div>
                        <div className="p-3 rounded-lg text-xs font-mono whitespace-pre-wrap" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                          {analysis.prompt}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT — Optimized proposal */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
                        <TrendingUp size={12} /> {isFr ? "Proposition optimisée" : "Optimized proposal"}
                      </div>
                    </div>

                    {analysis.recommendations.length > 0 && (
                      <div className="p-4 rounded-xl" style={{ background: "#fff8eb", border: "1px solid #fbbf24" }}>
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#92400e" }}>
                          {isFr ? "Recommandations prioritaires" : "Priority recommendations"}
                        </h3>
                        <div className="space-y-2">
                          {analysis.recommendations.map((r, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 uppercase"
                                style={{
                                  background: r.kpi === "legal" ? "#fef2f2" : r.kpi === "brand" ? "#eff6ff" : "#f0fdf4",
                                  color: r.kpi === "legal" ? "#b91c1c" : r.kpi === "brand" ? "#1d4ed8" : "#15803d",
                                }}
                              >
                                {r.kpi}
                              </span>
                              <span style={{ color: "#333" }}>{r.text}</span>
                              {r.impact === "high" && <span className="text-[10px] font-bold px-1 py-0.5 rounded shrink-0" style={{ background: "#fef2f2", color: "#b91c1c" }}>!</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.optimizedPrompt && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                            {isFr ? "Prompt optimisé" : "Optimized prompt"}
                          </div>
                          <button
                            onClick={handleCopyPrompt}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-opacity hover:opacity-80"
                            style={{ background: "var(--accent)", color: "#fff" }}
                          >
                            <Copy size={11} /> {isFr ? "Copier" : "Copy"}
                          </button>
                        </div>
                        <div className="p-3 rounded-lg text-xs font-mono whitespace-pre-wrap" style={{ background: "#eef9ff", color: "#1e3a8a", border: "1px solid #bfdbfe" }}>
                          {analysis.optimizedPrompt}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Context blocks */}
                {(analysis.briefContext || analysis.objective) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.briefContext && (
                      <div className="p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>
                          {isFr ? "Brief" : "Brief"}
                        </div>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{analysis.briefContext}</p>
                      </div>
                    )}
                    {analysis.objective && (
                      <div className="p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>
                          {isFr ? "Objectif" : "Objective"}
                        </div>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>{analysis.objective}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer save hint */}
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "var(--accent)/10", color: "var(--accent)" }}>
                  <CheckCircle2 size={15} />
                  <span>{isFr ? "Analyse enregistrée automatiquement sur ton compte." : "Analysis saved automatically on your account."}</span>
                </div>
              </motion.div>
            ) : null}

          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

function VerdictBadge({ verdict, isFr }: { verdict: "safe" | "revise" | "block"; isFr: boolean }) {
  const config = {
    safe:   { icon: <Check size={13} />,     bg: "#dcfce7", color: "#15803d", label: isFr ? "Publier"     : "Publish" },
    revise: { icon: <RefreshCw size={13} />,  bg: "#fef3c7", color: "#b45309", label: isFr ? "À retoucher" : "Revise" },
    block:  { icon: <Ban size={13} />,        bg: "#fef2f2", color: "#b91c1c", label: isFr ? "Bloquer"     : "Block" },
  }[verdict];
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mt-2" style={{ background: config.bg, color: config.color }}>
      {config.icon} {config.label}
    </span>
  );
}

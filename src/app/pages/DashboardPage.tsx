import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  BarChart3, TrendingUp, TrendingDown, Minus,
  Shield, Scale, Target, MessageCircle, Users, Palette, FileText,
  Sparkles, AlertTriangle, Loader2,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";

const API_BASE = import.meta.env.VITE_API_BASE || "https://kbvkjafkztbsewtaijuh.supabase.co/functions/v1/make-server-cad57f79";
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtidmtqYWZrenRic2V3dGFpanVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NDEzNjMsImV4cCI6MjA1MTIxNzM2M30.lGpbCMbfaFA47OdAkVMfIEJiKlhNOb9_el4MfW5hMsc";

interface AnalysisEntry {
  id: string;
  userId?: string;
  imageUrl: string;
  prompt?: string;
  briefContext?: string;
  objective?: string;
  overall: number;
  ethique: { score: number; issues: string[]; positives: string[] };
  legal: { score: number; issues: string[]; positives: string[] };
  brief: { score: number; issues: string[]; positives: string[] };
  objectif: { score: number; issues: string[]; positives: string[] };
  coherence: { score: number; issues: string[]; positives: string[] };
  cible: { score: number; issues: string[]; positives: string[] };
  creatif: { score: number; issues: string[]; positives: string[] };
  recommendations: string[];
  summary: string;
  date: string;
}

function getGradeLabel(score: number): { labelFr: string; color: string } {
  if (score >= 80) return { labelFr: "Excellent", color: "#22c55e" };
  if (score >= 60) return { labelFr: "Bon", color: "#84cc16" };
  if (score >= 40) return { labelFr: "Médiocre", color: "#f59e0b" };
  return { labelFr: "Insuffisant", color: "#ef4444" };
}

function MiniGauge({ value, size = 44 }: { value: number; size?: number }) {
  const radius = (size - 5) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
  const { color } = getGradeLabel(value);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size >= 48 ? 14 : 12} fontWeight={800}>{value}</text>
    </svg>
  );
}

function ScoreCard({ label, icon, score, trend }: {
  label: string; icon: React.ReactNode; score: number; trend?: "up" | "down" | "flat";
}) {
  const { color } = getGradeLabel(score);
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <span style={{ color }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{label}</div>
        <div className="text-lg font-bold" style={{ color }}>{score}<span className="text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>/100</span></div>
      </div>
      {trend === "up" && <TrendingUp size={16} style={{ color: "#22c55e" }} />}
      {trend === "down" && <TrendingDown size={16} style={{ color: "#ef4444" }} />}
      {trend === "flat" && <Minus size={16} style={{ color: "var(--muted-foreground)" }} />}
    </div>
  );
}

function computeTrend(recent: number[], previous: number[]): "up" | "down" | "flat" {
  if (recent.length < 2 || previous.length < 2) return "flat";
  const r = recent.reduce((s, v) => s + v, 0) / recent.length;
  const p = previous.reduce((s, v) => s + v, 0) / previous.length;
  const diff = r - p;
  if (diff > 3) return "up";
  if (diff < -3) return "down";
  return "flat";
}

/* ═══ MAIN ═══ */

export function DashboardPage() {
  const { getAuthHeader } = useAuth();
  const { locale } = useI18n();
  const isFr = locale === "fr";

  const [analyses, setAnalyses] = useState<AnalysisEntry[]>([]);
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

  useEffect(() => {
    setLoading(true);
    serverPost("/analyze/history", {}).then(res => {
      if (res?.success) {
        setAnalyses(Array.isArray(res.analyses) ? res.analyses : []);
      } else {
        setError(res?.error || "Failed to load analyses");
      }
    }).finally(() => setLoading(false));
  }, [serverPost]);

  // ── Computed stats ──
  const stats = useMemo(() => {
    const total = analyses.length;
    if (total === 0) return null;

    const avg = (key: keyof AnalysisEntry) => {
      const vals = analyses.map(a => {
        const v = a[key];
        if (typeof v === "number") return v;
        if (v && typeof v === "object" && "score" in (v as any)) return (v as any).score as number;
        return 0;
      });
      return Math.round(vals.reduce((s, v) => s + v, 0) / total);
    };

    // Trends: last 5 vs previous 5
    const last5 = analyses.slice(0, 5);
    const prev5 = analyses.slice(5, 10);
    const trendKey = (k: keyof AnalysisEntry) => {
      const recent = last5.map(a => {
        const v = a[k];
        if (typeof v === "number") return v;
        if (v && typeof v === "object" && "score" in (v as any)) return (v as any).score as number;
        return 0;
      });
      const previous = prev5.map(a => {
        const v = a[k];
        if (typeof v === "number") return v;
        if (v && typeof v === "object" && "score" in (v as any)) return (v as any).score as number;
        return 0;
      });
      return computeTrend(recent, previous);
    };

    return {
      total,
      avgOverall: avg("overall"),
      avgEthique: avg("ethique"),
      avgLegal: avg("legal"),
      avgBrief: avg("brief"),
      avgObjectif: avg("objectif"),
      avgCoherence: avg("coherence"),
      avgCible: avg("cible"),
      avgCreatif: avg("creatif"),
      trendOverall: trendKey("overall"),
      trendEthique: trendKey("ethique"),
      trendLegal: trendKey("legal"),
      trendBrief: trendKey("brief"),
      trendObjectif: trendKey("objectif"),
      trendCoherence: trendKey("coherence"),
      trendCible: trendKey("cible"),
      trendCreatif: trendKey("creatif"),
    };
  }, [analyses]);

  // Top recurring issues aggregated from all KPIs
  const topIssues = useMemo(() => {
    const counts = new Map<string, number>();
    analyses.forEach(a => {
      const allIssues = [
        ...(a.ethique?.issues || []),
        ...(a.legal?.issues || []),
        ...(a.brief?.issues || []),
        ...(a.objectif?.issues || []),
        ...(a.coherence?.issues || []),
        ...(a.cible?.issues || []),
        ...(a.creatif?.issues || []),
      ];
      allIssues.forEach(issue => {
        if (issue) counts.set(issue, (counts.get(issue) || 0) + 1);
      });
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [analyses]);

  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">

            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
                {isFr ? "Dashboard" : "Dashboard"}
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {isFr ? "Ta santé créative IA en un coup d'œil." : "Your AI creative health at a glance."}
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
            ) : !stats ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                <BarChart3 size={48} style={{ color: "var(--muted-foreground)", margin: "0 auto 16px" }} />
                <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                  {isFr ? "Aucune analyse encore" : "No analyses yet"}
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)", maxWidth: 400, margin: "0 auto 24px" }}>
                  {isFr ? "Analyse ton premier visuel IA pour commencer à suivre ta santé créative." : "Analyze your first AI visual to start tracking your creative health."}
                </p>
                <Link
                  to="/hub/analyze"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
                  style={{ background: "var(--foreground)", color: "var(--background)" }}
                >
                  <Sparkles size={15} />
                  {isFr ? "Analyser un visuel" : "Analyze a visual"}
                </Link>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

                {/* Overall health */}
                <div className="flex items-center gap-6 p-5 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <MiniGauge value={stats.avgOverall} size={72} />
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {isFr ? "Score moyen global" : "Average overall score"}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: getGradeLabel(stats.avgOverall).color }}>
                      {stats.avgOverall}/100 — {getGradeLabel(stats.avgOverall).labelFr}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      {isFr ? `${stats.total} visuel(s) analysé(s)` : `${stats.total} visual(s) analyzed`}
                    </div>
                  </div>
                  {stats.trendOverall === "up" && <TrendingUp size={20} style={{ color: "#22c55e" }} />}
                  {stats.trendOverall === "down" && <TrendingDown size={20} style={{ color: "#ef4444" }} />}
                  {stats.trendOverall === "flat" && <Minus size={20} style={{ color: "var(--muted-foreground)" }} />}
                </div>

                {/* 7 KPIs */}
                <div>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "var(--foreground)" }}>
                    {isFr ? "Moyennes par KPI" : "Averages per KPI"}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ScoreCard label={isFr ? "Éthique" : "Ethics"} icon={<Shield size={18} />} score={stats.avgEthique} trend={stats.trendEthique} />
                    <ScoreCard label={isFr ? "Légal" : "Legal"} icon={<Scale size={18} />} score={stats.avgLegal} trend={stats.trendLegal} />
                    <ScoreCard label="Brief" icon={<FileText size={18} />} score={stats.avgBrief} trend={stats.trendBrief} />
                    <ScoreCard label={isFr ? "Objectif" : "Objective"} icon={<Target size={18} />} score={stats.avgObjectif} trend={stats.trendObjectif} />
                    <ScoreCard label={isFr ? "Cohérence" : "Coherence"} icon={<MessageCircle size={18} />} score={stats.avgCoherence} trend={stats.trendCoherence} />
                    <ScoreCard label={isFr ? "Cible" : "Target"} icon={<Users size={18} />} score={stats.avgCible} trend={stats.trendCible} />
                    <ScoreCard label={isFr ? "Créatif" : "Creative"} icon={<Palette size={18} />} score={stats.avgCreatif} trend={stats.trendCreatif} />
                  </div>
                </div>

                {/* Top issues */}
                {topIssues.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                      <AlertTriangle size={15} style={{ color: "#f59e0b" }} />
                      {isFr ? "Problèmes récurrents" : "Recurring issues"}
                    </h3>
                    <div className="space-y-2">
                      {topIssues.map(([issue, count], i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold shrink-0" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                            {count}x
                          </span>
                          <span style={{ color: "var(--foreground)" }}>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent analyses — click through to compare */}
                <div>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "var(--foreground)" }}>
                    {isFr ? "Analyses récentes" : "Recent analyses"}
                  </h3>
                  <div className="space-y-2">
                    {analyses.slice(0, 10).map((a) => (
                      <Link
                        key={a.id}
                        to={`/hub/compare?id=${a.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--muted)]/30 transition-colors"
                        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                      >
                        {a.imageUrl ? (
                          <img src={a.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                        <MiniGauge value={a.overall} size={40} />
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  to="/hub/analyze"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
                  style={{ background: "var(--foreground)", color: "var(--background)" }}
                >
                  <Sparkles size={15} />
                  {isFr ? "Analyser un nouveau visuel" : "Analyze a new visual"}
                </Link>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

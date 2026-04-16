import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  BarChart3, TrendingUp, TrendingDown, Minus,
  Eye, Sparkles, Palette, Shield, ArrowRight,
  AlertTriangle, CheckCircle2, Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { RouteGuard } from "../components/RouteGuard";

/* ═══════════════════════════════════════════════════════════
   DASHBOARD — Yuka-style overview
   Health score, trends, top issues, recent analyses
   ═══════════════════════════════════════════════════════════ */

// ── Types ──

interface AnalysisEntry {
  id: string;
  imageUrl: string;
  overall: number;
  technical: number;
  creative: number;
  brandFit: number;
  compliance: number;
  summary: string;
  topIssue: string;
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
        fill={color} fontSize={12} fontWeight={800}>{value}</text>
    </svg>
  );
}

// ── Score card ──

function ScoreCard({ label, icon, score, trend }: {
  label: string; icon: React.ReactNode; score: number; trend?: "up" | "down" | "flat";
}) {
  const { color } = getGradeLabel(score);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}
    >
      <span style={{ color }}>{icon}</span>
      <div className="flex-1">
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</div>
        <div className="text-lg font-bold" style={{ color }}>{score}<span className="text-xs font-normal" style={{ color: "var(--muted-foreground)" }}>/100</span></div>
      </div>
      {trend === "up" && <TrendingUp size={16} style={{ color: "#22c55e" }} />}
      {trend === "down" && <TrendingDown size={16} style={{ color: "#ef4444" }} />}
      {trend === "flat" && <Minus size={16} style={{ color: "var(--muted-foreground)" }} />}
    </div>
  );
}

/* ═══ MAIN ═══ */

export function DashboardPage() {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  // For now, use localStorage to store analysis history
  // Later this will be backed by Supabase
  const [analyses, setAnalyses] = useState<AnalysisEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ora-analyses");
      if (stored) setAnalyses(JSON.parse(stored));
    } catch {}
  }, []);

  // ── Computed stats ──
  const total = analyses.length;
  const avgOverall = total > 0 ? Math.round(analyses.reduce((s, a) => s + a.overall, 0) / total) : 0;
  const avgTechnical = total > 0 ? Math.round(analyses.reduce((s, a) => s + a.technical, 0) / total) : 0;
  const avgCreative = total > 0 ? Math.round(analyses.reduce((s, a) => s + a.creative, 0) / total) : 0;
  const avgBrandFit = total > 0 ? Math.round(analyses.reduce((s, a) => s + a.brandFit, 0) / total) : 0;
  const avgCompliance = total > 0 ? Math.round(analyses.reduce((s, a) => s + a.compliance, 0) / total) : 0;

  // Top recurring issues
  const allIssues = analyses.map(a => a.topIssue).filter(Boolean);
  const issueCounts = new Map<string, number>();
  allIssues.forEach(issue => issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1));
  const topIssues = [...issueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <RouteGuard>
      <div className="h-screen flex flex-col" style={{ background: "var(--background)", paddingLeft: 52 }}>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
                {isFr ? "Dashboard" : "Dashboard"}
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {isFr
                  ? "Ta santé créative IA en un coup d'œil."
                  : "Your AI creative health at a glance."}
              </p>
            </div>

            {total === 0 ? (
              /* ── Empty state ── */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <BarChart3 size={48} style={{ color: "var(--muted-foreground)", margin: "0 auto 16px" }} />
                <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                  {isFr ? "Aucune analyse encore" : "No analyses yet"}
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)", maxWidth: 400, margin: "0 auto" }}>
                  {isFr
                    ? "Analyse ton premier visuel IA pour commencer à suivre ta santé créative."
                    : "Analyze your first AI visual to start tracking your creative health."}
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
              /* ── Dashboard content ── */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Overall health */}
                <div
                  className="flex items-center gap-6 p-5 rounded-2xl"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <MiniGauge value={avgOverall} size={64} />
                  <div>
                    <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                      {isFr ? "Score moyen global" : "Average overall score"}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: getGradeLabel(avgOverall).color }}>
                      {avgOverall}/100 — {getGradeLabel(avgOverall).labelFr}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      {isFr ? `${total} visuel(s) analysé(s)` : `${total} visual(s) analyzed`}
                    </div>
                  </div>
                </div>

                {/* Axis cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ScoreCard label={isFr ? "Technique" : "Technical"} icon={<Eye size={18} />} score={avgTechnical} trend="flat" />
                  <ScoreCard label={isFr ? "Créatif" : "Creative"} icon={<Sparkles size={18} />} score={avgCreative} trend="flat" />
                  <ScoreCard label="Brand Fit" icon={<Palette size={18} />} score={avgBrandFit} trend="flat" />
                  <ScoreCard label={isFr ? "Conformité" : "Compliance"} icon={<Shield size={18} />} score={avgCompliance} trend="flat" />
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
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                            {count}x
                          </span>
                          <span style={{ color: "var(--foreground)" }}>{issue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent analyses */}
                <div>
                  <h3 className="text-sm font-bold mb-3" style={{ color: "var(--foreground)" }}>
                    {isFr ? "Analyses récentes" : "Recent analyses"}
                  </h3>
                  <div className="space-y-2">
                    {analyses.slice(0, 10).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--muted)]/30 transition-colors"
                        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                      >
                        <img
                          src={a.imageUrl}
                          alt=""
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                            {a.summary || "—"}
                          </div>
                          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {new Date(a.date).toLocaleDateString(isFr ? "fr-FR" : "en-US")}
                          </div>
                        </div>
                        <MiniGauge value={a.overall} size={36} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
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

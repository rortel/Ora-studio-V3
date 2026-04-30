import { API_BASE, apiUrl, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { useI18n } from "../lib/i18n";
import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw,
  Send, Eye, MousePointer, MessageSquare, ExternalLink, CheckCircle2, Clock, AlertCircle,
  Heart, Share2, Bookmark, ThumbsUp, Sparkles,
} from "lucide-react";

const defaultKpis = [
  { label: "Brand Health Score", value: "0", suffix: "/100", trend: "--", dir: "flat" },
  { label: "Content Produced", value: "0", suffix: " pieces", trend: "--", dir: "flat" },
  { label: "Campaigns", value: "0", suffix: "", trend: "--", dir: "flat" },
  { label: "Calendar Events", value: "0", suffix: "", trend: "--", dir: "flat" },
  { label: "Brand Scans", value: "0", suffix: "", trend: "--", dir: "flat" },
  { label: "Brand Vault", value: "--", suffix: "", trend: "--", dir: "flat" },
];

const defaultWeeklyData = [
  { week: "Week 1", pieces: 0, compliance: 0, score: 0 },
  { week: "Week 2", pieces: 0, compliance: 0, score: 0 },
  { week: "Week 3", pieces: 0, compliance: 0, score: 0 },
  { week: "Week 4", pieces: 0, compliance: 0, score: 0 },
];

const defaultFormatPerformance = [
  { format: "LinkedIn", pieces: 0, avgScore: 0 },
  { format: "Email", pieces: 0, avgScore: 0 },
  { format: "SMS", pieces: 0, avgScore: 0 },
  { format: "Newsletter", pieces: 0, avgScore: 0 },
  { format: "Landing Page", pieces: 0, avgScore: 0 },
  { format: "Ad Copy", pieces: 0, avgScore: 0 },
  { format: "Stories", pieces: 0, avgScore: 0 },
];

interface AnalyticsData {
  totalCampaigns: number;
  totalPieces: number;
  totalEvents: number;
  avgBrandScore: number;
  hasVault: boolean;
  brandScans: number;
  campaigns: any[];
  events: any[];
  scores: any[];
}

export function AnalyticsPage() {
  return (
    <RouteGuard requireAuth requireFeature="analytics">
      <AnalyticsPageContent />
    </RouteGuard>
  );
}

function AnalyticsPageContent() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(defaultKpis);
  const [weeklyData, setWeeklyData] = useState(defaultWeeklyData);
  const [formatPerformance, setFormatPerformance] = useState(defaultFormatPerformance);
  const [campaignList, setCampaignList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [socialData, setSocialData] = useState<any>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [postMetrics, setPostMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { getAuthHeader } = useAuth();

  const loadAnalytics = useCallback(async () => {
    try {
      const token = getAuthHeader();
      const res = await fetch(apiUrl("/analytics"), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ _token: token }),
      });
      const data = await res.json();
      if (data.success) {
        const a: AnalyticsData = data.analytics;

        // Build KPIs from real data
        setKpis([
          { label: t("analytics.brandHealthScore"), value: a.avgBrandScore > 0 ? String(a.avgBrandScore) : "--", suffix: a.avgBrandScore > 0 ? "/100" : "", trend: a.avgBrandScore > 90 ? "+strong" : a.avgBrandScore > 0 ? "active" : "--", dir: a.avgBrandScore > 80 ? "up" : "flat" },
          { label: t("analytics.contentProduced"), value: String(a.totalPieces), suffix: ` ${t("analytics.pieces")}`, trend: a.totalPieces > 0 ? "active" : "--", dir: a.totalPieces > 0 ? "up" : "flat" },
          { label: t("analytics.campaignsLabel"), value: String(a.totalCampaigns), suffix: "", trend: a.totalCampaigns > 0 ? `${a.totalCampaigns} total` : "--", dir: a.totalCampaigns > 0 ? "up" : "flat" },
          { label: t("analytics.calendarEvents"), value: String(a.totalEvents), suffix: "", trend: a.totalEvents > 0 ? t("analytics.scheduledLabel").toLowerCase() : "--", dir: a.totalEvents > 0 ? "up" : "flat" },
          { label: t("analytics.brandScans"), value: String(a.brandScans), suffix: "", trend: a.brandScans > 0 ? "analyzed" : "--", dir: a.brandScans > 0 ? "up" : "flat" },
          { label: t("analytics.brandVault"), value: a.hasVault ? t("analytics.active") : t("analytics.notSet"), suffix: "", trend: a.hasVault ? t("analytics.configured") : t("analytics.setupNeeded"), dir: a.hasVault ? "up" : "flat" },
        ]);

        // Build format performance from campaigns
        if (a.campaigns && a.campaigns.length > 0) {
          setCampaignList(a.campaigns);
          const formatMap: Record<string, { pieces: number; totalScore: number; count: number }> = {};
          a.campaigns.forEach((c: any) => {
            (c.formats || []).forEach((f: string) => {
              if (!formatMap[f]) formatMap[f] = { pieces: 0, totalScore: 0, count: 0 };
              formatMap[f].pieces += (c.pieces || 0) / (c.formats?.length || 1);
              formatMap[f].totalScore += c.score || 0;
              formatMap[f].count += 1;
            });
          });
          const fp = Object.entries(formatMap).map(([format, data]) => ({
            format,
            pieces: Math.round(data.pieces),
            avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
          }));
          if (fp.length > 0) setFormatPerformance(fp);

          // Build weekly data from campaign dates
          const weeks: Record<number, { pieces: number; scores: number[]; count: number }> = {};
          a.campaigns.forEach((c: any, i: number) => {
            const weekNum = Math.min(Math.floor(i / 2), 7);
            if (!weeks[weekNum]) weeks[weekNum] = { pieces: 0, scores: [], count: 0 };
            weeks[weekNum].pieces += c.pieces || 0;
            if (c.score > 0) weeks[weekNum].scores.push(c.score);
            weeks[weekNum].count += 1;
          });
          const wd = Object.entries(weeks).map(([num, d]) => ({
            week: `Week ${parseInt(num) + 1}`,
            pieces: d.pieces,
            compliance: d.scores.length > 0 ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length) : 0,
            score: d.scores.length > 0 ? Math.round(d.scores.reduce((s, v) => s + v, 0) / d.scores.length) : 0,
          }));
          if (wd.length > 0) setWeeklyData(wd);
        }
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeader, t]);

  const loadSocialAnalytics = useCallback(async () => {
    setSocialLoading(true);
    setMetricsLoading(true);
    try {
      const token = getAuthHeader();
      // Fetch deploy summary
      const res = await fetch(apiUrl("/analytics/social"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: token }),
      });
      const data = await res.json();
      if (data.success) setSocialData(data);

      // Fetch detailed post-level performance metrics for every deployed asset
      const metricsRes = await fetch(apiUrl("/analytics/all-posts-metrics"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: token }),
      });
      const metricsData = await metricsRes.json();
      if (metricsData.success) setPostMetrics(metricsData);
    } catch (err) {
      console.error("Failed to load social analytics:", err);
    } finally {
      setSocialLoading(false);
      setMetricsLoading(false);
    }
  }, [getAuthHeader]);

  const loadAiInsights = useCallback(async (metricsData: any) => {
    if (!metricsData?.posts?.length) return;
    setAiLoading(true);
    try {
      const token = getAuthHeader();
      const res = await fetch(apiUrl("/analytics/ai-insights"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: token, posts: metricsData.posts, totals: metricsData.totals, byPlatform: metricsData.byPlatform }),
      });
      const data = await res.json();
      if (data.success) setAiInsights(data.analysis);
    } catch (err) {
      console.error("Failed to load AI insights:", err);
    } finally {
      setAiLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => { loadAnalytics(); loadSocialAnalytics(); }, [loadAnalytics, loadSocialAnalytics]);

  // Auto-load AI insights when post metrics arrive
  useEffect(() => {
    if (postMetrics?.posts?.length > 0 && !aiInsights && !aiLoading) {
      loadAiInsights(postMetrics);
    }
  }, [postMetrics, aiInsights, aiLoading, loadAiInsights]);

  const handleRefresh = () => { setRefreshing(true); setAiInsights(null); loadAnalytics(); loadSocialAnalytics(); };

  const maxPieces = Math.max(...weeklyData.map((d) => d.pieces), 1);
  const maxFormatScore = Math.max(...formatPerformance.map((f) => f.avgScore), 1);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-ora-signal" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          {/* Navigation handled by sidebar */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.04em" }}>{t("analytics.title")}</h1>
              <p className="text-muted-foreground" style={{ fontSize: "15px" }}>{t("analytics.subtitle")}</p>
            </div>
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
              style={{ fontSize: "13px", fontWeight: 500 }}>
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> {t("analytics.refresh")}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-4">
              <p className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>{kpi.label}</p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-foreground" style={{ fontSize: "26px", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>{kpi.value}</span>
                <span className="text-muted-foreground" style={{ fontSize: "13px" }}>{kpi.suffix}</span>
              </div>
              {kpi.trend && kpi.trend !== "--" && (
                <div className="flex items-center gap-1 mt-1.5">
                  {kpi.dir === "up" ? <TrendingUp size={12} className="text-[var(--text-secondary)]" /> : kpi.dir === "down" ? <TrendingDown size={12} className="text-destructive" /> : <Minus size={12} className="text-muted-foreground" />}
                  <span className={kpi.dir === "up" ? "text-[var(--text-secondary)]" : "text-muted-foreground"} style={{ fontSize: "11px", fontWeight: 500 }}>{kpi.trend}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Content production chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-foreground mb-5" style={{ fontSize: "16px", fontWeight: 500 }}>{t("analytics.contentProduction")}</h3>
            {weeklyData.some((d) => d.pieces > 0) ? (
              <div className="flex items-end gap-3 h-[180px]">
                {weeklyData.map((d, i) => (
                  <div key={d.week} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{d.pieces}</span>
                    <motion.div initial={{ height: 0 }} animate={{ height: `${(d.pieces / maxPieces) * 140}px` }}
                      transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                      className="w-full bg-ora-signal/20 rounded-t-md relative overflow-hidden">
                      <div className="absolute bottom-0 left-0 right-0 bg-ora-signal rounded-t-md"
                        style={{ height: d.compliance > 0 ? `${Math.max((d.compliance - 70) * 3, 10)}%` : "0%" }} />
                    </motion.div>
                    <span className="text-muted-foreground" style={{ fontSize: "9px" }}>W{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px]">
                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>{t("analytics.noProductionData")}</p>
              </div>
            )}
          </motion.div>

          {/* Format performance */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-foreground mb-5" style={{ fontSize: "16px", fontWeight: 500 }}>{t("analytics.formatPerformance")}</h3>
            {formatPerformance.some((f) => f.avgScore > 0) ? (
              <div className="space-y-3.5">
                {formatPerformance.filter((f) => f.avgScore > 0 || f.pieces > 0).map((f) => (
                  <div key={f.format} className="flex items-center gap-3">
                    <span className="text-foreground w-24 flex-shrink-0" style={{ fontSize: "14px" }}>{f.format}</span>
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(f.avgScore / 100) * 100}%` }} transition={{ delay: 0.4, duration: 0.6 }}
                        className="h-full bg-ora-signal rounded-full" />
                    </div>
                    <span className="text-ora-signal flex-shrink-0" style={{ fontSize: "13px", fontWeight: 600 }}>{f.avgScore || "--"}</span>
                    <span className="text-muted-foreground flex-shrink-0 w-16 text-right" style={{ fontSize: "12px" }}>{f.pieces} {t("analytics.pieces")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px]">
                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>{t("analytics.noFormatData")}</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Social Deployment Analytics */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
          className="bg-card border border-border rounded-xl p-6 mb-10">
          <h3 className="text-foreground mb-5" style={{ fontSize: "16px", fontWeight: 500 }}>{t("analytics.socialDeployment")}</h3>
          {socialLoading || metricsLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-ora-signal" /></div>
          ) : socialData && (socialData.summary?.totalDeployed > 0 || socialData.summary?.totalScheduled > 0) ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg" style={{ background: "rgba(17,17,17,0.06)", border: "1px solid rgba(17,17,17,0.12)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={12} style={{ color: "#666666" }} />
                    <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{t("analytics.publishedLabel")}</span>
                  </div>
                  <span className="text-foreground" style={{ fontSize: "22px", fontWeight: 500 }}>{socialData.summary.totalDeployed}</span>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "var(--ora-signal-light)", border: "1px solid rgba(17,17,17,0.12)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock size={12} className="text-ora-signal" />
                    <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{t("analytics.scheduledLabel")}</span>
                  </div>
                  <span className="text-foreground" style={{ fontSize: "22px", fontWeight: 500 }}>{socialData.summary.totalScheduled}</span>
                </div>
                <div className="p-3 rounded-lg" style={{ background: "rgba(212,24,61,0.04)", border: "1px solid rgba(212,24,61,0.1)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle size={12} className="text-destructive" />
                    <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{t("analytics.failedLabel")}</span>
                  </div>
                  <span className="text-foreground" style={{ fontSize: "22px", fontWeight: 500 }}>{socialData.summary.totalFailed}</span>
                </div>
              </div>

              {/* Per-platform breakdown */}
              {Object.keys(socialData.summary.platforms || {}).length > 0 && (
                <div className="mb-6">
                  <span className="text-muted-foreground uppercase tracking-wider block mb-3" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em" }}>{t("analytics.byPlatform")}</span>
                  <div className="space-y-2.5">
                    {Object.entries(socialData.summary.platforms).map(([platform, data]: [string, any]) => (
                      <div key={platform} className="flex items-center gap-3 p-2.5 rounded-lg border border-border">
                        <span className="text-foreground w-24 flex-shrink-0" style={{ fontSize: "13px", fontWeight: 500 }}>{platform}</span>
                        <div className="flex items-center gap-4 flex-1">
                          <span className="flex items-center gap-1" style={{ fontSize: "12px", color: "#666666" }}>
                            <Send size={10} /> {data.deployed}
                          </span>
                          <span className="flex items-center gap-1" style={{ fontSize: "12px", color: "var(--ora-signal)" }}>
                            <Clock size={10} /> {data.scheduled}
                          </span>
                          {data.impressions > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "12px" }}>
                              <Eye size={10} /> {data.impressions.toLocaleString()}
                            </span>
                          )}
                          {data.engagements > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "12px" }}>
                              <MessageSquare size={10} /> {data.engagements.toLocaleString()}
                            </span>
                          )}
                          {data.clicks > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "12px" }}>
                              <MousePointer size={10} /> {data.clicks.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent posts */}
              {socialData.posts?.length > 0 && (
                <div>
                  <span className="text-muted-foreground uppercase tracking-wider block mb-3" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em" }}>{t("analytics.recentPosts")}</span>
                  <div className="space-y-2">
                    {socialData.posts.slice(0, 8).map((post: any) => (
                      <div key={post.id} className="flex items-center justify-between py-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground" style={{ fontSize: "13px" }}>{post.platform}</span>
                          <span className="px-1.5 py-0.5 rounded" style={{
                            fontSize: "10px", fontWeight: 600,
                            background: post.status === "published" ? "rgba(17,17,17,0.08)" : post.status === "scheduled" ? "var(--ora-signal-light)" : "rgba(212,24,61,0.08)",
                            color: post.status === "published" ? "#666666" : post.status === "scheduled" ? "var(--ora-signal)" : "#d4183d",
                          }}>{post.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {post.metrics && (
                            <div className="flex items-center gap-2">
                              {post.metrics.impressions > 0 && <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{post.metrics.impressions} views</span>}
                              {post.metrics.engagements > 0 && <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{post.metrics.engagements} eng.</span>}
                            </div>
                          )}
                          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>{post.createdAt?.slice(0, 10)}</span>
                          {post.zernioPostUrl && (
                            <a href={post.zernioPostUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <Send size={22} className="mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>{t("analytics.noSocialDeployments")}</p>
              <p className="text-muted-foreground/60 mt-1" style={{ fontSize: "12px" }}>{t("analytics.noSocialDeploymentsDesc")}</p>
            </div>
          )}
        </motion.div>

        {/* Post-level performance metrics */}
        {postMetrics && postMetrics.posts?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
            className="bg-card border border-border rounded-xl p-6 mb-10">
            <h3 className="text-foreground mb-2" style={{ fontSize: "16px", fontWeight: 500 }}>{t("analytics.postPerformance")}</h3>
            <p className="text-muted-foreground mb-5" style={{ fontSize: "13px" }}>{t("analytics.postPerformanceDesc")}</p>

            {/* Totals KPIs */}
            {postMetrics.totals && (postMetrics.totals.likes > 0 || postMetrics.totals.impressions > 0 || postMetrics.totals.comments > 0) && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {[
                  { label: t("analytics.impressions"), value: postMetrics.totals.impressions, icon: Eye },
                  { label: t("analytics.likes"), value: postMetrics.totals.likes, icon: Heart },
                  { label: t("analytics.comments"), value: postMetrics.totals.comments, icon: MessageSquare },
                  { label: t("analytics.shares"), value: postMetrics.totals.shares, icon: Share2 },
                  { label: t("analytics.clicks"), value: postMetrics.totals.clicks, icon: MousePointer },
                  { label: t("analytics.saves"), value: postMetrics.totals.saves, icon: Bookmark },
                  { label: t("analytics.reach"), value: postMetrics.totals.reach, icon: TrendingUp },
                ].filter(m => m.value > 0).map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={11} className="text-ora-signal" />
                        <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>{m.label}</span>
                      </div>
                      <span className="text-foreground" style={{ fontSize: "20px", fontWeight: 500 }}>{m.value.toLocaleString()}</span>
                    </div>
                  );
                })}
                {postMetrics.totals.engagementRate && (
                  <div className="p-3 rounded-lg border border-ora-signal/20" style={{ background: "var(--ora-signal-light)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <ThumbsUp size={11} className="text-ora-signal" />
                      <span className="text-muted-foreground" style={{ fontSize: "10px", fontWeight: 500 }}>{t("analytics.engRate")}</span>
                    </div>
                    <span className="text-ora-signal" style={{ fontSize: "20px", fontWeight: 600 }}>{postMetrics.totals.engagementRate}</span>
                  </div>
                )}
              </div>
            )}

            {/* Per-platform metrics */}
            {postMetrics.byPlatform && Object.keys(postMetrics.byPlatform).length > 0 && (
              <div className="mb-6">
                <span className="text-muted-foreground uppercase tracking-wider block mb-3" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em" }}>{t("analytics.platformBreakdown")}</span>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>{t("analytics.platform")}</th>
                        <th className="text-right py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>{t("analytics.posts")}</th>
                        <th className="text-right py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}><Eye size={10} className="inline" /> {t("analytics.views")}</th>
                        <th className="text-right py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}><Heart size={10} className="inline" /> {t("analytics.likes")}</th>
                        <th className="text-right py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}><MessageSquare size={10} className="inline" /> {t("analytics.comments")}</th>
                        <th className="text-right py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}><Share2 size={10} className="inline" /> {t("analytics.shares")}</th>
                        <th className="text-right py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}><MousePointer size={10} className="inline" /> {t("analytics.clicks")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(postMetrics.byPlatform).map(([plat, data]: [string, any]) => (
                        <tr key={plat} className="border-b border-border/50">
                          <td className="py-2.5 text-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>{plat}</td>
                          <td className="py-2.5 text-right text-foreground" style={{ fontSize: "13px" }}>{data.count}</td>
                          <td className="py-2.5 text-right text-muted-foreground" style={{ fontSize: "13px" }}>{data.impressions > 0 ? data.impressions.toLocaleString() : "--"}</td>
                          <td className="py-2.5 text-right text-muted-foreground" style={{ fontSize: "13px" }}>{data.likes > 0 ? data.likes.toLocaleString() : "--"}</td>
                          <td className="py-2.5 text-right text-muted-foreground" style={{ fontSize: "13px" }}>{data.comments > 0 ? data.comments.toLocaleString() : "--"}</td>
                          <td className="py-2.5 text-right text-muted-foreground" style={{ fontSize: "13px" }}>{data.shares > 0 ? data.shares.toLocaleString() : "--"}</td>
                          <td className="py-2.5 text-right text-muted-foreground" style={{ fontSize: "13px" }}>{data.clicks > 0 ? data.clicks.toLocaleString() : "--"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Individual post metrics */}
            <div>
              <span className="text-muted-foreground uppercase tracking-wider block mb-3" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em" }}>{t("analytics.individualPosts")}</span>
              <div className="space-y-2">
                {postMetrics.posts.slice(0, 15).map((post: any, idx: number) => {
                  const m = post.metrics || {};
                  const hasMetrics = m.likes || m.comments || m.shares || m.impressions;
                  return (
                    <div key={post.deployId || idx} className="flex items-center justify-between py-2.5 border-b border-border/50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-foreground flex-shrink-0" style={{ fontSize: "12px", fontWeight: 500 }}>{post.platform}</span>
                        <span className="px-1.5 py-0.5 rounded flex-shrink-0" style={{
                          fontSize: "9px", fontWeight: 600,
                          background: post.status === "published" ? "rgba(17,17,17,0.08)" : "var(--ora-signal-light)",
                          color: post.status === "published" ? "#666666" : "var(--ora-signal)",
                        }}>{post.status}</span>
                        {post.content && (
                          <span className="text-muted-foreground truncate" style={{ fontSize: "11px" }}>{post.content}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        {hasMetrics ? (
                          <>
                            {m.impressions > 0 && <span className="flex items-center gap-0.5 text-muted-foreground" style={{ fontSize: "11px" }}><Eye size={9} /> {m.impressions.toLocaleString()}</span>}
                            {m.likes > 0 && <span className="flex items-center gap-0.5 text-muted-foreground" style={{ fontSize: "11px" }}><Heart size={9} /> {m.likes}</span>}
                            {m.comments > 0 && <span className="flex items-center gap-0.5 text-muted-foreground" style={{ fontSize: "11px" }}><MessageSquare size={9} /> {m.comments}</span>}
                            {m.shares > 0 && <span className="flex items-center gap-0.5 text-muted-foreground" style={{ fontSize: "11px" }}><Share2 size={9} /> {m.shares}</span>}
                            {m.clicks > 0 && <span className="flex items-center gap-0.5 text-muted-foreground" style={{ fontSize: "11px" }}><MousePointer size={9} /> {m.clicks}</span>}
                            {m.saves > 0 && <span className="flex items-center gap-0.5 text-muted-foreground" style={{ fontSize: "11px" }}><Bookmark size={9} /> {m.saves}</span>}
                          </>
                        ) : (
                          <span className="text-muted-foreground/50" style={{ fontSize: "10px" }}>
                            {post._hasAnalytics === false ? t("analytics.noAnalyticsYet") : t("analytics.pending")}
                          </span>
                        )}
                        <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{(post.publishedAt || post.scheduledAt || "")?.slice(0, 10)}</span>
                        {post.zernioPostUrl && (
                          <a href={post.zernioPostUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink size={10} /></a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Insights */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="border border-border rounded-xl p-6 mb-10" style={{ background: "linear-gradient(135deg, var(--card) 0%, rgba(124,58,237,0.03) 100%)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-ora-signal" />
              <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 500 }}>AI Performance Insights</h3>
            </div>
            {postMetrics?.posts?.length > 0 && (
              <button onClick={() => { setAiInsights(null); loadAiInsights(postMetrics); }} disabled={aiLoading}
                className="flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-lg text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
                style={{ fontSize: "11px", fontWeight: 500 }}>
                {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                {aiLoading ? "Analyse en cours..." : "Relancer l'analyse"}
              </button>
            )}
          </div>
          {aiLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 size={20} className="animate-spin text-ora-signal mx-auto mb-3" />
                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>L'IA analyse vos performances...</p>
              </div>
            </div>
          ) : aiInsights ? (
            <div className="prose prose-sm max-w-none" style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--foreground)" }}
              dangerouslySetInnerHTML={{ __html: aiInsights
                .replace(/^## (.*$)/gm, '<h3 style="font-size:15px;font-weight:600;margin-top:20px;margin-bottom:8px;color:var(--foreground)">$1</h3>')
                .replace(/^### (.*$)/gm, '<h4 style="font-size:13px;font-weight:600;margin-top:16px;margin-bottom:6px;color:var(--foreground)">$1</h4>')
                .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight:600">$1</strong>')
                .replace(/^- (.*$)/gm, '<div style="display:flex;gap:6px;margin:4px 0"><span style="color:var(--ora-signal)">•</span><span>$1</span></div>')
                .replace(/^(\d+)\. (.*$)/gm, '<div style="display:flex;gap:6px;margin:4px 0"><span style="font-weight:600;color:var(--ora-signal)">$1.</span><span>$2</span></div>')
                .replace(/\n\n/g, '<br/>')
              }} />
          ) : (
            <div className="text-center py-10">
              <Sparkles size={22} className="mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>Publiez du contenu pour obtenir une analyse IA de vos performances</p>
              <p className="text-muted-foreground/60 mt-1" style={{ fontSize: "12px" }}>L'IA analysera vos posts et vous donnera des recommandations personnalisées</p>
            </div>
          )}
        </motion.div>

        {/* Recent campaigns table */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-foreground mb-5" style={{ fontSize: "16px", fontWeight: 500 }}>{t("analytics.campaignActivity")}</h3>
          {campaignList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>{t("analytics.campaignCol")}</th>
                    <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>{t("analytics.scoreCol")}</th>
                    <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>{t("analytics.piecesCol")}</th>
                    <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>{t("analytics.statusCol")}</th>
                    <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>{t("analytics.dateCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignList.slice(0, 10).map((c) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-ora-signal" />
                          <span className="text-foreground" style={{ fontSize: "14px" }}>{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-ora-signal" style={{ fontSize: "14px", fontWeight: 600 }}>{c.score > 0 ? `${c.score}/100` : "--"}</td>
                      <td className="py-3 text-right text-foreground" style={{ fontSize: "14px", fontWeight: 500 }}>{c.pieces || 0}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded text-xs" style={{ fontSize: "10px", fontWeight: 600, background: "var(--secondary)", color: "var(--muted-foreground)" }}>{c.status}</span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground" style={{ fontSize: "12px" }}>{c.date || c.createdAt?.slice(0, 10) || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>{t("analytics.noCampaignData")}</p>
              <Link to="/hub" className="inline-flex items-center gap-1 mt-2 text-ora-signal" style={{ fontSize: "13px", fontWeight: 500 }}>
                {t("analytics.createFirstCampaign")} <TrendingUp size={12} />
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
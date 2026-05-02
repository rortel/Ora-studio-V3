import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { useI18n } from "../lib/i18n";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { toast } from "sonner";
import { downloadAsset } from "../lib/asset-persistence";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Clock,
  Check, FileText, Calendar, Mail,
  MessageSquare, Image, Loader2, Trash2, Video, Hash,
  Type, Eye, Play, Send, Download, AlertCircle, Rocket,
  ExternalLink, CheckCircle2, Instagram, Facebook, Twitter, Youtube, Clapperboard, RefreshCw,
} from "lucide-react";

// Platforms available for social connection
const CAL_CONNECTABLE_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "twitter", label: "Twitter/X", icon: Twitter },
  { id: "tiktok", label: "TikTok", icon: Clapperboard },
  { id: "youtube", label: "YouTube", icon: Youtube },
  { id: "pinterest", label: "Pinterest", icon: Image },
];

type ContentStatus = "draft" | "scheduled" | "published" | "review" | "deploying" | "failed";

interface CalendarEvent {
  id: string;
  title: string;
  channel: string;
  channelIcon: string;
  time: string;
  status: ContentStatus;
  score: number;
  color: string;
  day: number;
  month: number;
  year: number;
  postingNote?: string;
  campaignTheme?: string;
  assetType?: string;
  copy?: string;
  caption?: string;
  hashtags?: string;
  headline?: string;
  imageUrl?: string;
  videoUrl?: string;
  pfmPostId?: string;
  pfmPostUrl?: string;
  deployedAt?: string;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  draft: { bg: "rgba(107,107,123,0.08)", text: "var(--muted-foreground)" },
  scheduled: { bg: "var(--ora-signal-light)", text: "var(--ora-signal)" },
  published: { bg: "rgba(17,17,17,0.08)", text: "#666666" },
  review: { bg: "rgba(17,17,17,0.08)", text: "#999999" },
  deploying: { bg: "rgba(17,17,17,0.08)", text: "var(--ora-signal)" },
  failed: { bg: "rgba(212,24,61,0.08)", text: "#d4183d" },
};

const channelIconMap: Record<string, typeof Mail> = {
  Email: Mail, "Twitter/X": MessageSquare, Instagram: Image,
  Facebook: MessageSquare, TikTok: Video, YouTube: Play, Pinterest: Image,
};

const channelColors: Record<string, string> = {
  Email: "#666666", "Twitter/X": "#666666", Instagram: "#666666",
  Facebook: "#666666", TikTok: "#666666", YouTube: "#666666", Pinterest: "#666666",
};

// daysOfWeek and monthNames moved inside CalendarPageContent to use t()

export function CalendarPage() {
  return (
    <RouteGuard requireAuth requireFeature="campaignLab">
      <CalendarPageContent />
    </RouteGuard>
  );
}

function CalendarPageContent() {
  const { t } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(new Date().getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newChannel, setNewChannel] = useState("Instagram");
  const [newTime, setNewTime] = useState("09:00");
  const [creating, setCreating] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [deployingEvent, setDeployingEvent] = useState<string | null>(null);
  const [deployingAll, setDeployingAll] = useState(false);

  // ── Social accounts ──
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  const { getAuthHeader } = useAuth();

  const daysOfWeek = [t("calendar.dayMon"), t("calendar.dayTue"), t("calendar.dayWed"), t("calendar.dayThu"), t("calendar.dayFri"), t("calendar.daySat"), t("calendar.daySun")];
  const monthNames = [t("calendar.monthJanuary"), t("calendar.monthFebruary"), t("calendar.monthMarch"), t("calendar.monthApril"), t("calendar.monthMay"), t("calendar.monthJune"), t("calendar.monthJuly"), t("calendar.monthAugust"), t("calendar.monthSeptember"), t("calendar.monthOctober"), t("calendar.monthNovember"), t("calendar.monthDecember")];
  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: t("calendar.statusDraft"), ...statusStyles.draft },
    scheduled: { label: t("calendar.statusScheduled"), ...statusStyles.scheduled },
    published: { label: t("calendar.statusPublished"), ...statusStyles.published },
    review: { label: t("calendar.statusReview"), ...statusStyles.review },
    deploying: { label: t("calendar.statusDeploying"), ...statusStyles.deploying },
    failed: { label: t("calendar.statusFailed"), ...statusStyles.failed },
  };

  const loadEvents = useCallback(async () => {
    try {
      const token = await getAuthHeader();
      const res = await fetch(`${API_BASE}/calendar/list`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ _token: token }),
      });
      const data = await res.json();
      if (data.success && data.events && data.events.length > 0) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.error("Failed to load calendar:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ── Load social accounts ──
  const loadSocialAccounts = useCallback(async () => {
    setSocialLoading(true);
    try {
      const token = await getAuthHeader();
      // /pfm/accounts/list — Post for Me (PRs #111/#112). Multi-tenant
      // native via external_id; same shape as before so no other changes
      // needed in CalendarPage.
      const res = await fetch(`${API_BASE}/pfm/accounts/list`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ _token: token }),
      });
      const data = await res.json();
      if (data.success && data.accounts) setSocialAccounts(data.accounts);
    } catch (err) { console.log("[Calendar] Social accounts fetch:", err); }
    finally { setSocialLoading(false); }
  }, [getAuthHeader]);

  useEffect(() => { loadSocialAccounts(); }, [loadSocialAccounts]);

  // ── Connect a social platform via OAuth popup ──
  const handleConnectPlatform = async (platform: string) => {
    setConnectingPlatform(platform);
    try {
      const token = await getAuthHeader();
      // /pfm/connect/:platform with our static callback page — the page
      // postMessages back to the opener, the popup self-closes.
      const redirectUrl = `${window.location.origin}/zernio-callback.html`;
      const res = await fetch(`${API_BASE}/pfm/connect/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ _token: token, redirectUrl }),
      });
      const data = await res.json();
      if (!data.success || !data.authUrl) {
        toast.error(data.error || t("studio.connectFailed").replace("{platform}", platform));
        setConnectingPlatform(null);
        return;
      }
      const popup = window.open(data.authUrl, `connect_${platform}`, "width=600,height=700,left=200,top=100");
      if (!popup) { toast.error(t("studio.popupBlocked")); setConnectingPlatform(null); return; }
      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setConnectingPlatform(null);
          setTimeout(() => loadSocialAccounts(), 1500);
          toast.success(t("studio.connectSuccess").replace("{platform}", platform.charAt(0).toUpperCase() + platform.slice(1)));
        }
      }, 500);
      setTimeout(() => { clearInterval(poll); if (!popup.closed) popup.close(); setConnectingPlatform(null); }, 300_000);
    } catch (err: any) {
      toast.error(`${t("studio.connectionFailed")}: ${err?.message || "Unknown error"}`);
      setConnectingPlatform(null);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || selectedDay === null) return;
    setCreating(true);
    try {
      const token = await getAuthHeader();
      const headers: Record<string, string> = { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` };
      const eventData = {
        title: newTitle, channel: newChannel, channelIcon: newChannel, time: newTime,
        status: "draft" as ContentStatus, score: 0, color: channelColors[newChannel] || "#666666",
        day: selectedDay, month: currentMonth, year: currentYear,
        _token: token || undefined,
      };
      const res = await fetch(`${API_BASE}/calendar`, { method: "POST", headers, body: JSON.stringify(eventData) });
      const data = await res.json();
      if (data.success && data.event) setEvents((prev) => [...prev, data.event]);
      setNewTitle("");
      setShowNew(false);
    } catch (err) {
      console.error("Failed to create event:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = await getAuthHeader();
      await fetch(`${API_BASE}/calendar/delete`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ _token: token, eventId: id }),
      });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (expandedEvent === id) setExpandedEvent(null);
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // Deploy a single event
  const handleDeployEvent = async (eventId: string) => {
    setDeployingEvent(eventId);
    try {
      const token = await getAuthHeader();
      const res = await fetch(`${API_BASE}/calendar/deploy`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ eventId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, _token: token }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { success: false, error: `Server error (HTTP ${res.status})` }; }
      if (data.success) {
        setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, status: data.status as ContentStatus, pfmPostId: data.postId } : ev));
        toast.success(data.status === "scheduled" ? t("calendar.scheduledSuccess") : t("calendar.publishedSuccess"));
      } else if (data.needsConnect) {
        toast.error(t("calendar.connectPlatformFirst").replace("{platform}", data.platform));
      } else {
        // Run diagnostic to understand why deploy failed
        console.error("[calendar-deploy] FAILED:", data.error, "HTTP:", res.status, "Body:", text.slice(0, 300));
        try {
          const diagRes = await fetch(`${API_BASE}/calendar/deploy-check`, {
            method: "POST",
            headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
            body: JSON.stringify({ eventId, _token: token }),
          });
          const diagText = await diagRes.text();
          console.error("[calendar-deploy] DIAGNOSTIC:", diagText);
        } catch (diagErr) { console.error("[calendar-deploy] Diagnostic also failed:", diagErr); }
        toast.error(data.error || t("studio.deployFailed"));
      }
    } catch (err: any) {
      toast.error(`${t("studio.deployError")}: ${err?.message || "Network error"}`);
    } finally {
      setDeployingEvent(null);
    }
  };

  // Deploy all events with content
  const handleDeployAll = async () => {
    const deployableEvents = events.filter(ev =>
      (ev.status === "draft" || ev.status === "scheduled") &&
      (ev.copy || ev.caption || ev.headline || ev.imageUrl || ev.videoUrl)
    );
    if (deployableEvents.length === 0) {
      toast.error(t("calendar.noEventsWithContent"));
      return;
    }
    setDeployingAll(true);
    try {
      const token = await getAuthHeader();
      const res = await fetch(`${API_BASE}/calendar/deploy-all`, {
        method: "POST",
        headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          eventIds: deployableEvents.map(ev => ev.id),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          _token: token,
        }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = { success: false, error: `Server error (HTTP ${res.status})` }; }
      if (data.success && data.results) {
        // Update event statuses
        const resultMap = new Map(data.results.map((r: any) => [r.eventId, r]));
        setEvents(prev => prev.map(ev => {
          const result = resultMap.get(ev.id) as any;
          if (result) return { ...ev, status: result.success ? result.status as ContentStatus : "failed", pfmPostId: result.postId || ev.pfmPostId };
          return ev;
        }));
        const failed = data.results.filter((r: any) => !r.success).length;
        const needConnect = data.results.filter((r: any) => r.needsConnect).length;
        let msg = t("calendar.eventsDeployed").replace("{success}", data.successCount).replace("{total}", data.totalCount);
        if (failed > 0) msg += ` (${failed} failed)`;
        if (needConnect > 0) msg += ` — ${needConnect} need social account connection`;
        toast.success(msg);
      } else {
        toast.error(data.error || t("studio.batchDeployFailed"));
      }
    } catch (err: any) {
      toast.error(`${t("studio.deployError")}: ${err?.message || "Network error"}`);
    } finally {
      setDeployingAll(false);
    }
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
    setSelectedDay(null);
    setExpandedEvent(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
    setSelectedDay(null);
    setExpandedEvent(null);
  };

  const monthEvents = events.filter((e) => e.month === currentMonth && e.year === currentYear);
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  monthEvents.forEach((e) => { if (!eventsByDay[e.day]) eventsByDay[e.day] = []; eventsByDay[e.day].push(e); });

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];
  const today = new Date().getDate();
  const isCurrentMonth = currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

  const deployableCount = monthEvents.filter(ev =>
    (ev.status === "draft" || ev.status === "scheduled") &&
    (ev.copy || ev.caption || ev.headline || ev.imageUrl || ev.videoUrl)
  ).length;

  const stats = {
    total: monthEvents.length,
    scheduled: monthEvents.filter((e) => e.status === "scheduled").length,
    drafts: monthEvents.filter((e) => e.status === "draft").length,
    published: monthEvents.filter((e) => e.status === "published").length,
  };

  const hasContent = (ev: CalendarEvent) => !!(ev.copy || ev.caption || ev.imageUrl || ev.videoUrl || ev.headline);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          {/* Navigation handled by sidebar */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-foreground" style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.04em" }}>{t("calendar.title")}</h1>
                {stats.total > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full" style={{ fontSize: "11px", fontWeight: 600, color: "var(--ora-signal)", background: "var(--ora-signal-light)" }}>{stats.total} {t("calendar.pieces")}</span>
                )}
              </div>
              <p className="text-muted-foreground" style={{ fontSize: "15px" }}>{t("calendar.subtitle")}</p>
            </div>
            <div className="flex items-center gap-3">
              {deployableCount > 0 && (
                <button
                  onClick={handleDeployAll}
                  disabled={deployingAll}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all cursor-pointer"
                  style={{
                    background: deployingAll ? "rgba(17,17,17,0.08)" : "var(--ora-signal)",
                    color: deployingAll ? "var(--ora-signal)" : "#fff",
                    fontSize: "14px", fontWeight: 500,
                    opacity: deployingAll ? 0.7 : 1,
                  }}
                >
                  {deployingAll ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}
                  {deployingAll ? t("calendar.deploying") : `${t("calendar.deployAll")} (${deployableCount})`}
                </button>
              )}
              <button onClick={() => { if (selectedDay) setShowNew(true); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity cursor-pointer"
                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#FFFFFF", fontSize: "14px", fontWeight: 500 }}>
                <Plus size={15} /> {t("calendar.newContent")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: t("calendar.totalThisMonth"), value: stats.total, icon: Calendar },
            { label: t("calendar.scheduled"), value: stats.scheduled, icon: Clock },
            { label: t("calendar.drafts"), value: stats.drafts, icon: FileText },
            { label: t("calendar.published"), value: stats.published, icon: CheckCircle2 },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-card border border-border rounded-xl p-4" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} className="text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontSize: "12px" }}>{stat.label}</span>
                </div>
                <span className="text-foreground" style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.02em" }}>{stat.value}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Social Accounts — connect your networks */}
        <div className="mb-6 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--ora-signal)", color: "#fff" }}>
                  <Send size={14} />
                </div>
                <div>
                  <span style={{ fontSize: "14px", color: "var(--foreground)", fontWeight: 600, display: "block" }}>{t("calendar.socialConnected")}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    {socialAccounts.length > 0
                      ? t("calendar.socialConnectedDesc").replace("{count}", String(socialAccounts.length))
                      : t("calendar.connectPlatformFirst").replace("{platform}", "")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {socialLoading && <Loader2 size={12} className="animate-spin" style={{ color: "var(--text-secondary)" }} />}
                {!socialLoading && socialAccounts.length > 0 && (
                  <button onClick={loadSocialAccounts} className="p-1.5 rounded-md cursor-pointer" style={{ background: "rgba(26,23,20,0.03)" }}>
                    <RefreshCw size={12} style={{ color: "var(--text-secondary)" }} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Connected */}
              {socialAccounts.map((acc: any, i: number) => {
                const pName = acc.platform?.charAt(0).toUpperCase() + acc.platform?.slice(1);
                const PIcon = CAL_CONNECTABLE_PLATFORMS.find(cp => cp.id === acc.platform)?.icon || Send;
                return (
                  <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: "rgba(17,17,17,0.06)", fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>
                    <PIcon size={13} style={{ color: "#666" }} />
                    {pName} {acc.username ? <span style={{ color: "var(--text-secondary)" }}>@{acc.username}</span> : ""}
                    <Check size={11} style={{ color: "#666" }} />
                  </span>
                );
              })}
              {/* Unconnected */}
              {CAL_CONNECTABLE_PLATFORMS.filter(p => !socialAccounts.some((a: any) => a.platform === p.id)).map(p => {
                const isConnecting = connectingPlatform === p.id;
                const PIcon = p.icon;
                return (
                  <button key={p.id} onClick={() => handleConnectPlatform(p.id)}
                    disabled={isConnecting || !!connectingPlatform}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                    style={{
                      background: isConnecting ? "rgba(17,17,17,0.08)" : "rgba(26,23,20,0.02)",
                      border: isConnecting ? "1px solid rgba(17,17,17,0.2)" : "1px solid var(--border)",
                      fontSize: "12px", fontWeight: 500, color: isConnecting ? "var(--ora-signal)" : "var(--text-secondary)",
                      opacity: connectingPlatform && !isConnecting ? 0.4 : 1,
                    }}>
                    {isConnecting ? <Loader2 size={13} className="animate-spin" /> : <PIcon size={13} />}
                    {isConnecting ? "..." : `+ ${p.label}`}
                  </button>
                );
              })}
              {CAL_CONNECTABLE_PLATFORMS.filter(p => !socialAccounts.some((a: any) => a.platform === p.id)).length === 0 && socialAccounts.length > 0 && (
                <span className="flex items-center gap-1.5" style={{ fontSize: "11px", color: "#666" }}>
                  <CheckCircle2 size={12} /> {t("calendar.allNetworksConnected")}
                </span>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-ora-signal" /></div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            {/* Calendar grid */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-foreground" style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.02em" }}>{monthNames[currentMonth]} {currentYear}</h2>
                <div className="flex items-center gap-1">
                  <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-secondary transition-colors cursor-pointer text-muted-foreground"><ChevronLeft size={16} /></button>
                  <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-secondary transition-colors cursor-pointer text-muted-foreground"><ChevronRight size={16} /></button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-0 mb-2">
                {daysOfWeek.map((d) => (
                  <div key={d} className="text-center py-2" style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.04em" }}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0">
                {calendarDays.map((day, idx) => {
                  const dayEvents = day ? eventsByDay[day] || [] : [];
                  const isToday = isCurrentMonth && day === today;
                  const isSelected = day === selectedDay;
                  return (
                    <button key={idx} onClick={() => { if (day) { setSelectedDay(day); setExpandedEvent(null); } }} disabled={!day}
                      className={`relative min-h-[72px] p-1.5 border-t transition-colors cursor-pointer text-left ${isSelected ? "bg-ora-signal-light" : day ? "hover:bg-secondary/50" : ""}`}
                      style={{ borderColor: "var(--border)" }}>
                      {day && (
                        <>
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? "bg-primary text-primary-foreground" : ""}`}
                            style={{ fontSize: "12px", fontWeight: isToday ? 600 : 400, color: isToday ? "#ffffff" : "var(--foreground)" }}>{day}</span>
                          <div className="flex flex-wrap gap-0.5 mt-1">
                            {dayEvents.slice(0, 3).map((e) => (
                              <div key={e.id} className="w-full rounded px-1 py-0.5 truncate" style={{ fontSize: "9px", fontWeight: 500, background: e.color + "12", color: e.color }}>
                                {e.status === "published" ? "* " : ""}{e.title.length > 16 ? e.title.slice(0, 16) + "..." : e.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && <span style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>+{dayEvents.length - 3} {t("calendar.more")}</span>}
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {monthEvents.length === 0 && (
                <div className="text-center py-10 border-t border-border mt-2">
                  <Calendar size={28} className="mx-auto mb-3 text-muted-foreground/20" />
                  <p className="text-foreground mb-1" style={{ fontSize: "15px", fontWeight: 500 }}>{t("calendar.noContentPlanned")}</p>
                  <p className="text-muted-foreground mb-4" style={{ fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {t("calendar.noContentPlannedDesc")}
                  </p>
                  <Link to="/campaign-lab" className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-opacity hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)", color: "#FFFFFF", fontSize: "13px", fontWeight: 500 }}>
                    {t("calendar.openCampaignLab")}
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-card border border-border rounded-xl" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center justify-between p-4 pb-0">
                  <h3 className="text-foreground" style={{ fontSize: "15px", fontWeight: 500 }}>
                    {selectedDay ? `${monthNames[currentMonth]} ${selectedDay}` : t("calendar.selectDay")}
                  </h3>
                  {selectedDay && (
                    <button onClick={() => setShowNew(true)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground cursor-pointer"><Plus size={14} /></button>
                  )}
                </div>

                <div className="p-4">
                  {/* New event form */}
                  <AnimatePresence>
                    {showNew && selectedDay && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                        <div className="border border-ora-signal/20 rounded-xl p-3 space-y-2 bg-ora-signal-light/20">
                          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("calendar.contentTitle")}
                            className="w-full bg-card border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:border-ora-signal outline-none" style={{ fontSize: "13px" }} />
                          <div className="flex gap-2">
                            <select value={newChannel} onChange={(e) => setNewChannel(e.target.value)}
                              className="bg-card border border-border rounded-md px-3 py-2 text-foreground" style={{ fontSize: "12px" }}>
                              {Object.keys(channelIconMap).map((ch) => <option key={ch} value={ch}>{ch}</option>)}
                            </select>
                            <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                              className="bg-card border border-border rounded-md px-3 py-2 text-foreground" style={{ fontSize: "12px" }} />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleCreate} disabled={creating || !newTitle.trim()}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-white cursor-pointer disabled:opacity-40"
                              style={{ background: "var(--ora-signal)", fontSize: "12px", fontWeight: 500 }}>
                              {creating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} {t("calendar.add")}
                            </button>
                            <button onClick={() => setShowNew(false)} className="px-3 py-2 rounded-md border border-border text-muted-foreground cursor-pointer" style={{ fontSize: "12px" }}>{t("calendar.cancel")}</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Event list + post preview */}
                  {selectedEvents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedEvents.map((event) => {
                        const Icon = channelIconMap[event.channel] || FileText;
                        const status = statusConfig[event.status] || statusConfig.draft;
                        const isExpanded = expandedEvent === event.id;
                        const contentAvailable = hasContent(event);
                        const isDeploying = deployingEvent === event.id;
                        const canDeploy = contentAvailable && event.status !== "published" && event.status !== "deploying";

                        return (
                          <motion.div key={event.id} layout
                            className="border border-border rounded-xl overflow-hidden hover:border-border-strong transition-colors group">
                            {/* Event header */}
                            <div className="p-3.5 cursor-pointer" onClick={() => setExpandedEvent(isExpanded ? null : event.id)}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: event.color + "14" }}>
                                    <Icon size={12} style={{ color: event.color }} />
                                  </div>
                                  <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{event.channel}</span>
                                  {contentAvailable && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ fontSize: "9px", fontWeight: 500, background: "rgba(17,17,17,0.08)", color: "#666666" }}>
                                      <Eye size={8} /> Preview
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-foreground mb-2" style={{ fontSize: "13px", fontWeight: 500 }}>{event.title}</p>
                              {event.campaignTheme && (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="px-1.5 py-0.5 rounded-full bg-ora-signal-light text-ora-signal" style={{ fontSize: "9px", fontWeight: 600 }}>Campaign</span>
                                  <span className="text-muted-foreground truncate" style={{ fontSize: "10px" }}>{event.campaignTheme}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded" style={{ fontSize: "10px", fontWeight: 600, color: status.text, background: status.bg }}>{status.label}</span>
                                  <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "11px" }}><Clock size={10} /> {event.time}</span>
                                </div>
                                {event.score > 0 && <span className="text-ora-signal" style={{ fontSize: "12px", fontWeight: 600 }}>{event.score}/100</span>}
                              </div>
                            </div>

                            {/* Expanded: post preview + actions */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.25, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div style={{ borderTop: "1px solid var(--border)" }}>
                                    {contentAvailable ? (
                                      <div className="p-3.5">
                                        <div className="flex items-center gap-1.5 mb-3">
                                          <Eye size={11} className="text-muted-foreground" />
                                          <span className="uppercase tracking-wider text-muted-foreground" style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.1em" }}>
                                            {t("calendar.postPreview")}
                                          </span>
                                        </div>

                                        {/* Platform-styled preview card */}
                                        <div className="rounded-xl border border-border overflow-hidden" style={{ background: "var(--secondary)" }}>
                                          <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: event.color + "20" }}>
                                              <Icon size={12} style={{ color: event.color }} />
                                            </div>
                                            <div>
                                              <span className="block text-foreground" style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1.2 }}>{t("calendar.yourBrand")}</span>
                                              <span className="block text-muted-foreground" style={{ fontSize: "9px", lineHeight: 1.2 }}>{event.time} - {event.channel}</span>
                                            </div>
                                          </div>

                                          {event.headline && (
                                            <div className="px-3 pt-2.5">
                                              <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.3 }}>{event.headline}</p>
                                            </div>
                                          )}

                                          {event.imageUrl && (
                                            <div className="px-3 pt-2">
                                              <div className="rounded-md overflow-hidden border border-border relative group/img">
                                                <img src={event.imageUrl} alt={event.title} className="w-full h-40 object-cover" />
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); downloadAsset(event.imageUrl!, `ora-${event.channel}-${event.id}.png`, "image"); }}
                                                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                  <Download size={12} />
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {event.videoUrl && !event.imageUrl && (
                                            <div className="px-3 pt-2">
                                              <div className="rounded-md overflow-hidden border border-border bg-foreground/5 h-40 flex items-center justify-center relative group/vid">
                                                <a href={event.videoUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
                                                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: event.color + "20" }}>
                                                    <Play size={16} style={{ color: event.color }} />
                                                  </div>
                                                  <span className="text-muted-foreground" style={{ fontSize: "10px" }}>{t("calendar.playVideo")}</span>
                                                </a>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); downloadAsset(event.videoUrl!, `ora-${event.channel}-${event.id}.mp4`, "video"); }}
                                                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/50 text-white opacity-0 group-hover/vid:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                  <Download size={12} />
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {(event.copy || event.caption) && (
                                            <div className="px-3 py-2.5">
                                              <p className="text-foreground whitespace-pre-line" style={{ fontSize: "12px", lineHeight: 1.55 }}>
                                                {(event.copy || event.caption || "").length > 400
                                                  ? (event.copy || event.caption || "").slice(0, 400) + "..."
                                                  : (event.copy || event.caption || "")}
                                              </p>
                                            </div>
                                          )}

                                          {event.copy && event.caption && (
                                            <div className="px-3 pb-2">
                                              <p className="text-muted-foreground italic" style={{ fontSize: "11px", lineHeight: 1.4 }}>{event.caption}</p>
                                            </div>
                                          )}

                                          {event.hashtags && (
                                            <div className="px-3 pb-2.5">
                                              <div className="flex items-start gap-1">
                                                <Hash size={10} className="text-ora-signal mt-0.5 flex-shrink-0" />
                                                <p className="text-ora-signal" style={{ fontSize: "11px", lineHeight: 1.4 }}>{event.hashtags}</p>
                                              </div>
                                            </div>
                                          )}

                                          {(event.assetType || event.postingNote) && (
                                            <div className="px-3 py-2" style={{ borderTop: "1px solid var(--border)" }}>
                                              <div className="flex items-center gap-2">
                                                {event.assetType && (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded" style={{
                                                    fontSize: "9px", fontWeight: 600,
                                                    background: event.assetType === "video" ? "rgba(17,17,17,0.08)" : event.assetType === "image" ? "rgba(17,17,17,0.08)" : "rgba(107,107,123,0.08)",
                                                    color: event.assetType === "video" ? "#DC2626" : event.assetType === "image" ? "#666666" : "var(--muted-foreground)",
                                                  }}>
                                                    {event.assetType === "video" ? <Video size={8} /> : event.assetType === "image" ? <Image size={8} /> : <Type size={8} />}
                                                    {event.assetType}
                                                  </span>
                                                )}
                                                {event.postingNote && (
                                                  <span className="text-muted-foreground truncate" style={{ fontSize: "9px" }}>{event.postingNote}</span>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 mt-3">
                                          {canDeploy && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeployEvent(event.id); }}
                                              disabled={isDeploying}
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer"
                                              style={{
                                                background: isDeploying ? "rgba(17,17,17,0.08)" : "var(--ora-signal)",
                                                color: isDeploying ? "var(--ora-signal)" : "#fff",
                                                fontSize: "11px", fontWeight: 600,
                                                opacity: isDeploying ? 0.7 : 1,
                                              }}
                                            >
                                              {isDeploying ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                                              {isDeploying ? t("calendar.deploying") : t("calendar.deploy")}
                                            </button>
                                          )}
                                          {event.status === "published" && (
                                            <span className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ fontSize: "11px", fontWeight: 600, background: "rgba(17,17,17,0.08)", color: "#666666" }}>
                                              <CheckCircle2 size={11} /> {t("calendar.statusPublished")}
                                            </span>
                                          )}
                                          {event.pfmPostUrl && (
                                            <a href={event.pfmPostUrl} target="_blank" rel="noopener noreferrer"
                                              className="flex items-center gap-1 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                                              style={{ fontSize: "11px", border: "1px solid var(--border)" }}>
                                              <ExternalLink size={10} /> {t("calendar.viewPost")}
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center py-5 px-3.5">
                                        <FileText size={16} className="mx-auto mb-2 text-muted-foreground/30" />
                                        <p className="text-muted-foreground" style={{ fontSize: "11px" }}>{t("calendar.noContentGenerated")}</p>
                                        <p className="text-muted-foreground/60 mt-0.5" style={{ fontSize: "10px" }}>{t("calendar.noContentGeneratedDesc")}</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : selectedDay ? (
                    <div className="text-center py-8">
                      <Calendar size={24} className="mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-muted-foreground" style={{ fontSize: "13px" }}>{t("calendar.nothingScheduled")}</p>
                      <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 mt-3 text-ora-signal hover:opacity-80 transition-opacity cursor-pointer" style={{ fontSize: "13px", fontWeight: 500 }}>
                        <Plus size={13} /> {t("calendar.createContent")}
                      </button>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

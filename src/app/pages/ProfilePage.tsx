import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { RouteGuard } from "../components/RouteGuard";
import { AppTabs } from "../components/AppTabs";
import { InstagramSetupGuide } from "../components/InstagramSetupGuide";
import { useI18n } from "../lib/i18n";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import {
  User, Mail, Building2, Briefcase, Shield, CreditCard,
  ArrowRight, Check, Lock, Sparkles, BarChart3, Clock,
  Download, ExternalLink, Settings, Bell, Key, Users,
  ImageIcon, FileText, Film, Music, Code2, RefreshCcw,
  GitBranch, Zap, ChevronRight, Crown, AlertCircle,
  FolderOpen, Globe, Palette, BookOpen, Eye,
  Calendar, TrendingUp, Layers, PenTool,
  Instagram, Facebook, Twitter, Plus, Loader2, Send, RefreshCw,
} from "lucide-react";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

type PlanTier = "free" | "starter" | "pro" | "business";
type ProfileTab = "overview" | "library" | "settings";

interface UserProfile {
  name: string;
  email: string;
  company: string;
  role: string;
  initials: string;
  plan: PlanTier;
  joinedDate: string;
  avatar?: string;
}

interface PlanDetails {
  name: string;
  price: string;
  period: string;
  color: string;
  contentUsed: number;
  contentMax: number;
  vaults: number;
  maxVaults: number;
  storageUsed: number;
  storageMax: number;
  renewalDate: string;
  features: string[];
  lockedFeatures: string[];
}

interface LibraryAsset {
  id: string;
  type: "image" | "text" | "code" | "film" | "sound";
  name: string;
  date: string;
  source: "hub" | "remix" | "studio";
}

interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  icon: typeof Sparkles;
  iconColor: string;
}

/* ═══════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════ */

const freeUser: UserProfile = {
  name: "Alex Martin",
  email: "alex@martin-studio.com",
  company: "Martin Studio",
  role: "Founder",
  initials: "AM",
  plan: "free",
  joinedDate: "Feb 2026",
};

const agencyUser: UserProfile = {
  name: "Alex Martin",
  email: "alex@acmecorp.com",
  company: "Acme Corp",
  role: "CMO",
  initials: "AM",
  plan: "business",
  joinedDate: "Nov 2025",
};

/* Plan metadata — aligned with /pricing and the server's PLAN_CREDITS.
 * The codenames free / starter / pro / business are the legacy auth keys
 * used by the server; the display names below are the public tiers users
 * see everywhere else (Free trial, Creator, Studio, Agency). */
const planData: Record<PlanTier, PlanDetails> = {
  free: {
    name: "Free trial",
    price: "0",
    period: "",
    color: "var(--muted-foreground)",
    contentUsed: 0,
    contentMax: 10,
    vaults: 0,
    maxVaults: 1,
    storageUsed: 0,
    storageMax: 0.1,
    renewalDate: "--",
    features: ["6 posts on the house", "Every platform covered", "No card required"],
    lockedFeatures: ["More posts every month", "Auto-publish", "Library downloads", "Editor overlays"],
  },
  starter: {
    name: "Creator",
    price: "19",
    period: "/mo",
    color: "#FF5C39",
    contentUsed: 0,
    contentMax: 60,
    vaults: 1,
    maxVaults: 1,
    storageUsed: 0,
    storageMax: 5,
    renewalDate: "--",
    features: ["60 posts / month", "Images + 5s videos", "Captions written for you", "IG · Facebook · TikTok", "Auto-publish, one click", "Logo + text overlay editor"],
    lockedFeatures: ["Brand Vault — read your site", "Multi-brand", "Team seats", "API access"],
  },
  pro: {
    name: "Studio",
    price: "49",
    period: "/mo",
    color: "#FF5C39",
    contentUsed: 0,
    contentMax: 200,
    vaults: 1,
    maxVaults: 1,
    storageUsed: 0,
    storageMax: 20,
    renewalDate: "--",
    features: ["200 posts / month", "Brand Vault — colours, tone, voice, photo style", "Paste your URL, we read your brand", "Logo on every post", "Priority queue", "Everything in Creator"],
    lockedFeatures: ["Multi-brand (×5)", "Team seats", "API access"],
  },
  business: {
    name: "Agency",
    price: "199",
    period: "/mo",
    color: "#FF5C39",
    contentUsed: 0,
    contentMax: 1000,
    vaults: 1,
    maxVaults: 5,
    storageUsed: 0,
    storageMax: 100,
    renewalDate: "--",
    features: ["1 000 posts / month", "Up to 5 brands in one account", "3 team seats", "API access", "Priority support", "Everything in Studio"],
    lockedFeatures: [],
  },
};

const mockLibraryFree: LibraryAsset[] = [
  { id: "a1", type: "image", name: "Abstract brand pattern", date: "Today", source: "hub" },
  { id: "a2", type: "text", name: "Product description draft", date: "Yesterday", source: "hub" },
  { id: "a3", type: "text", name: "Tagline variations", date: "2 days ago", source: "hub" },
];

const mockLibraryAgency: LibraryAsset[] = [
  { id: "a1", type: "image", name: "Q2 Campaign — Hero Visual", date: "Today", source: "studio" },
  { id: "a2", type: "text", name: "Instagram post — Product Launch", date: "Today", source: "remix" },
  { id: "a3", type: "code", name: "Email template — April NL", date: "Yesterday", source: "studio" },
  { id: "a4", type: "film", name: "15s Social Teaser", date: "Yesterday", source: "hub" },
  { id: "a5", type: "sound", name: "Podcast intro jingle", date: "2 days ago", source: "hub" },
  { id: "a6", type: "image", name: "Ad Creative — Variant B", date: "2 days ago", source: "studio" },
  { id: "a7", type: "text", name: "Email copy — Re-engagement", date: "3 days ago", source: "remix" },
  { id: "a8", type: "image", name: "Newsletter header", date: "4 days ago", source: "studio" },
];

const mockActivityFree: ActivityItem[] = [
  { id: "act1", action: "Generated image", detail: "Abstract pattern via AI Hub", timestamp: "2h ago", icon: ImageIcon, iconColor: "var(--ora-signal)" },
  { id: "act2", action: "Generated text", detail: "Product description draft", timestamp: "Yesterday", icon: FileText, iconColor: "#666666" },
  { id: "act3", action: "Signed up", detail: "Welcome to ORA", timestamp: "2 days ago", icon: Sparkles, iconColor: "var(--ora-signal)" },
];

const mockActivityAgency: ActivityItem[] = [
  { id: "act1", action: "Ran flow", detail: "Product Launch Campaign — 4 steps completed", timestamp: "32m ago", icon: GitBranch, iconColor: "var(--ora-signal)" },
  { id: "act2", action: "Remixed content", detail: "Competitor ad → 4 brand-compliant formats", timestamp: "1h ago", icon: RefreshCcw, iconColor: "#666666" },
  { id: "act3", action: "Exported campaign", detail: "Q2 Launch — Instagram + Email + Ad + Stories", timestamp: "2h ago", icon: Download, iconColor: "#666666" },
  { id: "act4", action: "Brand score: 96/100", detail: "Newsletter copy validated by Compliance Guard", timestamp: "3h ago", icon: Shield, iconColor: "#666666" },
  { id: "act5", action: "Generated visuals", detail: "4 variants via AI Hub (Flux Pro, DALL-E 3)", timestamp: "Yesterday", icon: ImageIcon, iconColor: "var(--ora-signal)" },
  { id: "act6", action: "Updated Brand Vault", detail: "Added 12 new approved terms", timestamp: "Yesterday", icon: BookOpen, iconColor: "#999999" },
  { id: "act7", action: "Team invite sent", detail: "sarah@acmecorp.com — Editor role", timestamp: "2 days ago", icon: Users, iconColor: "#4a5568" },
];

/* ═══════════════════════════════════
   TYPE ICONS
   ═══════════════════════════════════ */

const typeIcons: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  text: FileText,
  code: Code2,
  film: Film,
  sound: Music,
};

function useSourceLabels(): Record<string, string> {
  const { t } = useI18n();
  return {
    hub: t("profile.aiHub"),
    remix: t("profile.remix"),
    studio: t("profile.studio"),
  };
}

/* ═══════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════ */

export function ProfilePage() {
  return (
    <RouteGuard requireAuth>
      <ProfilePageContent />
    </RouteGuard>
  );
}

function ProfilePageContent() {
  const { user: authCtxUser, profile, isAdmin, plan: authPlan, remainingCredits, signOut, isLoading: authLoading, accessToken } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [realLibrary, setRealLibrary] = useState<LibraryAsset[]>([]);
  const [realActivity, setRealActivity] = useState<ActivityItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !authCtxUser) {
      navigate("/login");
    }
  }, [authLoading, authCtxUser, navigate]);

  // Fetch real library items for profile view
  useEffect(() => {
    if (!accessToken) { setLibraryLoading(false); return; }
    (async () => {
      try {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "text/plain",
        };
        const res = await fetch(`${API_BASE}/library/list`, {
          method: "POST",
          headers,
          body: JSON.stringify({ _token: accessToken }),
          signal: AbortSignal.timeout(8_000),
        });
        const data = await res.json();
        if (data.success && data.items) {
          const items: LibraryAsset[] = data.items.slice(0, 12).map((item: any) => {
            const typeMap: Record<string, string> = { image: "image", text: "text", code: "code", film: "film", sound: "sound" };
            const itemType = typeMap[item.type] || "text";
            const name = item.customName || item.prompt?.slice(0, 60) || t("profile.untitled");
            const savedDate = item.savedAt ? new Date(item.savedAt) : new Date();
            const now = new Date();
            const diffMs = now.getTime() - savedDate.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            let dateStr = t("profile.today");
            if (diffDays === 1) dateStr = t("profile.yesterday");
            else if (diffDays > 1 && diffDays < 7) dateStr = `${diffDays} ${t("profile.daysAgo")}`;
            else if (diffDays >= 7) dateStr = savedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

            return { id: item.id, type: itemType as LibraryAsset["type"], name, date: dateStr, source: "hub" as const };
          });
          setRealLibrary(items);

          // Build activity from most recent library items
          const typeActions: Record<string, { action: string; icon: typeof Sparkles; iconColor: string }> = {
            image: { action: t("profile.generatedImage"), icon: ImageIcon, iconColor: "var(--ora-signal)" },
            text: { action: t("profile.generatedText"), icon: FileText, iconColor: "#666666" },
            code: { action: t("profile.generatedCode"), icon: Code2, iconColor: "#666666" },
            film: { action: t("profile.generatedVideo"), icon: Film, iconColor: "#999999" },
            sound: { action: t("profile.generatedAudio"), icon: Music, iconColor: "#888888" },
          };
          const acts: ActivityItem[] = items.slice(0, 8).map((item, i) => {
            const cfg = typeActions[item.type] || typeActions.text;
            return {
              id: `act-${i}`,
              action: cfg.action,
              detail: item.name,
              timestamp: item.date,
              icon: cfg.icon,
              iconColor: cfg.iconColor,
            };
          });
          if (acts.length === 0) {
            acts.push({ id: "act-signup", action: t("profile.signedUp"), detail: t("profile.welcomeToOra"), timestamp: "Recently", icon: Sparkles, iconColor: "var(--ora-signal)" });
          }
          setRealActivity(acts);
        }
      } catch (err) {
        console.error("[Profile] Library fetch error:", err);
      }
      setLibraryLoading(false);
    })();
  }, [accessToken]);

  // Plan is now already mapped in auth-context (free/pro/business)
  const isSubscriber = authPlan !== "free";
  const mappedPlan: PlanTier = authPlan as PlanTier;

  const baseUser = isSubscriber ? agencyUser : freeUser;
  const realName = profile?.name || profile?.displayName || authCtxUser?.name || authCtxUser?.email?.split("@")[0] || "";
  const user: UserProfile = authCtxUser ? {
    ...baseUser,
    name: realName,
    email: authCtxUser.email,
    initials: realName ? realName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : authCtxUser.email[0].toUpperCase(),
    plan: mappedPlan,
    joinedDate: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "",
    company: profile?.company || "",
    role: profile?.jobTitle || "",
  } : baseUser;
  const plan = planData[user.plan];

  // Use real library/activity data when available, fallback to mock
  const library = realLibrary.length > 0 ? realLibrary : (isSubscriber ? mockLibraryAgency : mockLibraryFree);
  const activity = realActivity.length > 0 ? realActivity : (isSubscriber ? mockActivityAgency : mockActivityFree);

  // Update plan usage from real profile data
  if (profile) {
    plan.contentUsed = profile.creditsUsed || 0;
    plan.contentMax = profile.credits || plan.contentMax;
  }

  const tabs: { id: ProfileTab; label: string; icon: typeof User }[] = [
    { id: "overview", label: t("profile.tabOverview"), icon: BarChart3 },
    { id: "library", label: t("profile.tabLibrary"), icon: FolderOpen },
    { id: "settings", label: t("profile.tabSettings"), icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppTabs />
      <div className="max-w-[1200px] mx-auto px-6 py-8">

        {/* Auth status + Credits */}
        <div className="flex items-center justify-between mb-6">
          {authCtxUser && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--surface-4)]" />
                <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  {t("profile.signedInAs")} {authCtxUser.email}
                </span>
              </div>
              {!isAdmin && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border" style={{ fontSize: "11px" }}>
                  <Zap size={10} className="text-ora-signal" />
                  <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{remainingCredits}</span>
                  <span style={{ color: "var(--muted-foreground)" }}>{t("profile.creditsRemaining")}</span>
                </div>
              )}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full" style={{ background: "var(--ora-signal-light)", fontSize: "11px", fontWeight: 500, color: "var(--ora-signal)" }}>
                  <Shield size={10} /> {t("profile.adminUnlimited")}
                </span>
              )}
            </div>
          )}
          <div className="ml-auto" />
        </div>

        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-8"
        >
          <div className="flex items-center gap-5">
            <div
              className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
              style={{
                background: isSubscriber ? "var(--primary)" : "var(--secondary)",
                color: isSubscriber ? "var(--primary-foreground)" : "var(--muted-foreground)",
                fontSize: "22px",
                fontWeight: 600,
              }}
            >
              {user.initials}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 style={{ fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)", lineHeight: 1.2 }}>
                  {user.name}
                </h1>
                <PlanBadge plan={user.plan} />
              </div>
              {(user.role || user.company) && (
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                  {user.role && user.company ? `${user.role} ${t("profile.roleAt")} ${user.company}` : user.role || user.company}
                </p>
              )}
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                  <Mail size={10} /> {user.email}
                </span>
                {user.joinedDate && (
                  <span className="flex items-center gap-1" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    <Calendar size={10} /> {t("profile.joinedPrefix")} {user.joinedDate}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-ora-signal/20 text-ora-signal hover:bg-ora-signal-light transition-colors"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                <Shield size={13} /> {t("profile.adminDashboard")}
              </Link>
            )}
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border hover:bg-secondary transition-colors cursor-pointer"
              style={{ borderColor: "var(--border)", fontSize: "12px", fontWeight: 500 }}
            >
              {authCtxUser ? t("profile.signOut") : t("profile.editProfile")}
            </button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b" style={{ borderColor: "var(--border)" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer -mb-px ${
                  isActive
                    ? "border-ora-signal text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                style={{ fontSize: "13px", fontWeight: isActive ? 500 : 400 }}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <OverviewTab user={user} plan={plan} activity={activity} library={library} isSubscriber={isSubscriber} />
            </motion.div>
          )}
          {activeTab === "library" && (
            <motion.div key="library" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <LibraryTab library={library} isSubscriber={isSubscriber} />
            </motion.div>
          )}
          {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <SettingsTab isSubscriber={isSubscriber} authEmail={authCtxUser?.email} userName={user.name} userCompany={user.company} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   PLAN BADGE
   ═══════════════════════════════════ */

function PlanBadge({ plan }: { plan: PlanTier }) {
  const { t } = useI18n();
  const config = {
    free: { label: t("profile.planFree"), bg: "var(--secondary)", color: "var(--muted-foreground)", icon: null },
    starter: { label: t("profile.planStarter"), bg: "var(--ora-signal-light)", color: "var(--ora-signal)", icon: null },
    pro: { label: t("profile.planPro"), bg: "var(--ora-signal-light)", color: "var(--ora-signal)", icon: null },
    business: { label: t("profile.planBusiness"), bg: "var(--ora-signal-light)", color: "var(--ora-signal)", icon: Crown },
  }[plan];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full" style={{ background: config.bg, fontSize: "11px", fontWeight: 600, color: config.color }}>
      {config.icon && <Crown size={10} />}
      {config.label}
    </span>
  );
}

/* ═══════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════ */

function OverviewTab({ user, plan, activity, library, isSubscriber }: { user: UserProfile; plan: PlanDetails; activity: ActivityItem[]; library: LibraryAsset[]; isSubscriber: boolean }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-6">
        {/* Subscription Card */}
        <div className="border rounded-xl bg-card overflow-hidden" style={{ borderColor: "var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.03)" }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <CreditCard size={14} style={{ color: plan.color }} />
                  <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>{t("profile.currentPlan")}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontSize: "28px", fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                    {plan.price === "0" ? t("profile.planFree") : `${plan.price}`}
                  </span>
                  {plan.period && <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{plan.period}</span>}
                </div>
              </div>
              {!isSubscriber ? (
                <Link to="/subscribe" className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white hover:opacity-90 transition-opacity" style={{ background: "var(--ora-signal)", fontSize: "13px", fontWeight: 500 }}>
                  <Zap size={14} /> {t("profile.upgrade")}
                </Link>
              ) : (
                <Link to="/subscribe" className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-secondary transition-colors" style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)", border: "1px solid var(--border)" }}>
                  <Settings size={13} /> {t("profile.manageSubscription")}
                </Link>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <UsageMeter label={t("profile.contentPieces")} used={plan.contentUsed} max={plan.contentMax} icon={FileText} unit="" />
              <UsageMeter label={t("profile.brandVaults")} used={plan.vaults} max={plan.maxVaults} icon={BookOpen} unit="" />
              <UsageMeter label={t("profile.storage")} used={plan.storageUsed} max={plan.storageMax} icon={FolderOpen} unit=" GB" />
            </div>
          </div>
          {!isSubscriber && (
            <div className="border-t px-5 py-4 bg-ora-signal-light/20" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <Crown size={14} className="text-ora-signal flex-shrink-0" />
                <p className="flex-1" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{t("profile.businessFeatures")}</p>
                <Link to="/subscribe" className="text-ora-signal flex items-center gap-1 flex-shrink-0" style={{ fontSize: "12px", fontWeight: 500 }}>
                  {t("profile.seePlans")} <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>
        <QuickAccess isSubscriber={isSubscriber} />
      </div>
      {/* Activity */}
      <div className="border rounded-xl bg-card p-5" style={{ borderColor: "var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>{t("profile.recentActivity")}</span>
        <div className="mt-4 space-y-0">
          {activity.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative">
                {i < activity.length - 1 && <div className="absolute left-[13px] top-[32px] w-px h-[calc(100%-16px)]" style={{ background: "var(--border)" }} />}
                <div className="flex gap-3 py-2.5">
                  <div className="w-[26px] h-[26px] rounded-full border bg-card flex items-center justify-center flex-shrink-0 z-10" style={{ borderColor: "var(--border)" }}>
                    <Icon size={10} style={{ color: item.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>{item.action}</p>
                    <p className="truncate" style={{ fontSize: "10px", color: "var(--muted-foreground)", lineHeight: 1.4 }}>{item.detail}</p>
                    <span style={{ fontSize: "9px", color: "var(--muted-foreground)", opacity: 0.6 }}>{item.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   USAGE METER
   ═══════════════════════════════════ */

function UsageMeter({ label, used, max, icon: Icon, unit }: { label: string; used: number; max: number; icon: typeof FileText; unit: string }) {
  const percent = max <= 0 ? (max === -1 ? 30 : 0) : Math.min((used / max) * 100, 100);
  const isUnlimited = max === -1;
  const isNear = !isUnlimited && max > 0 && percent > 80;
  return (
    <div className="p-3 rounded-lg bg-secondary/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon size={11} className="text-muted-foreground" />
          <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted-foreground)" }}>{label}</span>
        </div>
        <span style={{ fontSize: "11px", fontWeight: 600, color: isNear ? "var(--destructive)" : "var(--foreground)" }}>
          {used}{unit}{isUnlimited ? "" : ` / ${max}${unit}`}
        </span>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${max === 0 ? 0 : percent}%`, background: isNear ? "var(--destructive)" : "var(--ora-signal)" }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   QUICK ACCESS
   ═══════════════════════════════════ */

function QuickAccess({ isSubscriber }: { isSubscriber: boolean }) {
  const { t } = useI18n();
  const items = [
    { label: t("profile.aiHub"), desc: t("profile.aiHubDesc"), href: "/hub/surprise", icon: Sparkles, locked: false },
    { label: t("profile.libraryLabel"), desc: t("profile.libraryDesc"), href: "/hub/library", icon: BookOpen, locked: false },
    { label: t("profile.brandVault"), desc: t("profile.brandVaultDesc"), href: "/hub/vault", icon: BookOpen, locked: false },
    { label: t("profile.analyticsLabel"), desc: t("profile.analyticsDesc"), href: "/hub/editor", icon: PenTool, locked: false },
  ];
  return (
    <div>
      <span style={{ fontSize: "10px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>{t("profile.quickAccess")}</span>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className={`relative p-3 rounded-xl border transition-all ${item.locked ? "opacity-50 cursor-not-allowed" : "hover:border-border-strong hover:bg-secondary/20 cursor-pointer"}`} style={{ borderColor: "var(--border)" }}>
              {item.locked && <Lock size={9} className="absolute top-2 right-2 text-muted-foreground/40" />}
              <Icon size={16} className={item.locked ? "text-muted-foreground/30 mb-2" : "text-ora-signal mb-2"} />
              <p style={{ fontSize: "12px", fontWeight: 500, color: item.locked ? "var(--muted-foreground)" : "var(--foreground)" }}>{item.label}</p>
              <p style={{ fontSize: "10px", color: "var(--muted-foreground)", lineHeight: 1.3 }}>{item.desc}</p>
            </div>
          );
          return item.locked ? <div key={item.label}>{content}</div> : <Link key={item.label} to={item.href}>{content}</Link>;
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   LIBRARY TAB
   ═══════════════════════════════════ */

function LibraryTab({ library, isSubscriber }: { library: LibraryAsset[]; isSubscriber: boolean }) {
  const sourceLabels = useSourceLabels();
  const [filter, setFilter] = useState<string>("all");
  const types = ["all", "image", "text", "code", "film", "sound"];
  const filtered = filter === "all" ? library : library.filter((a) => a.type === filter);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-5">
        {types.map((tp) => (
          <button key={tp} onClick={() => setFilter(tp)}
            className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${filter === tp ? "bg-ora-signal-light border-ora-signal/20 text-ora-signal" : "border-border text-muted-foreground hover:text-foreground"}`}
            style={{ fontSize: "11px", fontWeight: filter === tp ? 500 : 400, textTransform: "capitalize" }}>{tp}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((asset, i) => {
          const Icon = typeIcons[asset.type];
          return (
            <motion.div key={asset.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="border rounded-xl bg-card overflow-hidden hover:border-border-strong transition-all cursor-pointer group" style={{ borderColor: "var(--border)" }}>
              <div className="h-28 bg-secondary/40 flex items-center justify-center relative">
                <Icon size={24} className="text-muted-foreground/20" />
                <div className="absolute top-2 left-2">
                  <span className="px-1.5 py-0.5 rounded bg-white/80 backdrop-blur-sm" style={{ fontSize: "9px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "capitalize" }}>{asset.type}</span>
                </div>
              </div>
              <div className="p-3">
                <p className="truncate mb-0.5" style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>{asset.name}</p>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-secondary" style={{ fontSize: "9px", fontWeight: 500, color: "var(--muted-foreground)" }}>{sourceLabels[asset.source]}</span>
                  <span style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>{asset.date}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   SOCIAL ACCOUNTS SECTION
   ═══════════════════════════════════ */

const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "#666666" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "#666666" },
  { id: "twitter", label: "Twitter/X", icon: Twitter, color: "#666666" },
];

function SocialAccountsSection() {
  const { t } = useI18n();
  const auth = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [showInstaGuide, setShowInstaGuide] = useState(false);

  const makeHeaders = useCallback(() => {
    return { Authorization: `Bearer ${publicAnonKey}` } as Record<string, string>;
  }, []);

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    const token = auth.getAuthHeader();
    // POST with _token in body — JWT is >8KB, too large for URL query or HTTP header
    // Migrated to /pfm/* (Post for Me) — see PRs #111/#112. Multi-tenant
    // is enforced server-side via external_id=user.id, no per-user fan-out
    // gymnastics, no zernio.com mid-OAuth branding.
    fetch(`${API_BASE}/pfm/accounts/list`, {
      method: "POST",
      headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
      body: JSON.stringify({ _token: token }),
    })
      .then(res => res.json())
      .then(data => { if (data.success && data.accounts) setAccounts(data.accounts); })
      .catch(err => console.error("[SocialAccounts] Fetch error:", err))
      .finally(() => setLoading(false));
  }, [makeHeaders]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleConnect = useCallback(async (platform: string) => {
    setConnecting(platform);
    try {
      const token = auth.getAuthHeader();
      // /pfm/connect/:platform with our own callback page as redirect.
      // The /zernio-callback.html static page is provider-agnostic —
      // just postMessages back to the opener and self-closes after the
      // OAuth provider redirects to it with success params.
      const redirectUrl = `${window.location.origin}/zernio-callback.html`;
      const res = await fetch(`${API_BASE}/pfm/connect/${platform}`, {
        method: "POST",
        headers: { ...makeHeaders(), "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: token, redirectUrl }),
      });
      const data = await res.json();
      if (!data.success || !data.authUrl) {
        setConnecting(null);
        return;
      }
      const popup = window.open(data.authUrl, `connect_${platform}`, "width=600,height=700,left=200,top=100");
      if (!popup) { setConnecting(null); return; }
      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setConnecting(null);
          setTimeout(() => fetchAccounts(), 1500);
        }
      }, 500);
      setTimeout(() => { clearInterval(poll); if (!popup.closed) popup.close(); setConnecting(null); }, 300_000);
    } catch { setConnecting(null); }
  }, [makeHeaders, fetchAccounts]);

  const handleDisconnect = useCallback(async (_platform: string, accountId?: string) => {
    setDisconnecting(_platform);
    try {
      // /pfm/disconnect needs the accountId — Post for Me's per-account
      // model (one connection per Page/handle) means platform is no
      // longer enough to identify what to disconnect.
      if (!accountId) { setDisconnecting(null); return; }
      const res = await fetch(`${API_BASE}/pfm/disconnect`, {
        method: "POST",
        headers: { ...makeHeaders(), "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: auth.getAuthHeader(), accountId }),
      });
      const data = await res.json();
      if (data.success) {
        setAccounts(prev => prev.filter((a: any) => a._id !== accountId));
      }
    } catch (err) { console.error("[SocialAccounts] Disconnect error:", err); }
    finally { setDisconnecting(null); }
  }, [makeHeaders, auth]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{t("profile.socialAccounts")}</h3>
        <button onClick={fetchAccounts} className="cursor-pointer p-1 rounded hover:bg-secondary transition-colors" title={t("profile.refresh")}>
          <RefreshCw size={12} className={`text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="border rounded-xl bg-card overflow-hidden" style={{ borderColor: "var(--border)" }}>
        {SOCIAL_PLATFORMS.map((p, i) => {
          const connected = accounts.find((a: any) => a.platform === p.id);
          const isConnecting = connecting === p.id;
          const Icon = p.icon;
          return (
            <div key={p.id} className={`flex items-start justify-between px-5 py-3 ${i < SOCIAL_PLATFORMS.length - 1 ? "border-b" : ""}`} style={{ borderColor: "var(--border)" }}>
              <div className="flex items-start gap-3 pr-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${p.color}12` }}>
                  <Icon size={14} style={{ color: p.color }} />
                </div>
                <div>
                  <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: 500 }}>{p.label}</span>
                  {connected && (
                    <span className="block" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {connected.username ? `@${connected.username}` : t("profile.connected")}
                    </span>
                  )}
                  {!connected && p.id === "instagram" && (
                    <span className="block mt-0.5" style={{ fontSize: "11px", color: "var(--muted-foreground)", lineHeight: 1.4 }}>
                      {t("profile.instagramRequirement")}
                    </span>
                  )}
                </div>
              </div>
              {connected ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: "rgba(17,17,17,0.08)", fontSize: "10px", fontWeight: 600, color: "#666666" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#666666" }} />
                    {t("profile.connected")}
                  </span>
                  <button
                    onClick={() => handleDisconnect(p.id, connected._id)}
                    disabled={disconnecting === p.id}
                    className="px-2 py-0.5 rounded text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    style={{ fontSize: "10px", fontWeight: 500 }}
                  >
                    {disconnecting === p.id ? "..." : t("profile.disconnect")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(p.id)}
                  disabled={isConnecting || !!connecting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-all hover:bg-secondary"
                  style={{ borderColor: "var(--border)", fontSize: "11px", fontWeight: 500, color: "var(--foreground)", opacity: connecting && !isConnecting ? 0.4 : 1 }}
                >
                  {isConnecting ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  {isConnecting ? t("profile.connecting") : t("profile.connect")}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
        {t("profile.socialAccountsDesc")}
      </p>
      <InstagramSetupGuide open={showInstaGuide} onClose={() => setShowInstaGuide(false)} />
    </div>
  );
}

/* ═══════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════ */

function SettingsTab({ isSubscriber, authEmail, userName, userCompany }: { isSubscriber: boolean; authEmail?: string; userName?: string; userCompany?: string }) {
  const { t } = useI18n();
  const sections = [
    {
      title: t("profile.settingsProfile"),
      items: [
        { label: t("profile.displayName"), value: userName || "—", editable: true },
        { label: t("profile.email"), value: authEmail || "—", editable: true },
        { label: t("profile.company"), value: userCompany || "—", editable: true },
      ],
    },
    {
      title: t("profile.notifications"),
      items: [
        { label: t("profile.campaignAlerts"), value: isSubscriber ? t("profile.enabled") : t("profile.disabled"), editable: true },
        { label: t("profile.weeklyDigest"), value: isSubscriber ? t("profile.enabled") : t("profile.disabled"), editable: true },
      ],
    },
  ];
  return (
    <div className="max-w-[720px] space-y-8">
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-4" style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>{section.title}</h3>
          <div className="border rounded-xl bg-card overflow-hidden" style={{ borderColor: "var(--border)" }}>
            {section.items.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-5 py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{item.label}</span>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)", opacity: item.editable ? 1 : 0.4 }}>{item.value}</span>
                  {item.editable ? (
                    <button className="px-2.5 py-1 rounded-md border hover:bg-secondary cursor-pointer transition-colors" style={{ borderColor: "var(--border)", fontSize: "10px", fontWeight: 500 }}>{t("profile.editBtn")}</button>
                  ) : (
                    <Lock size={10} className="text-muted-foreground/30" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Social Accounts */}
      <SocialAccountsSection />

      <div>
        <h3 className="mb-4" style={{ fontSize: "14px", fontWeight: 500, color: "var(--destructive)" }}>{t("profile.dangerZone")}</h3>
        <div className="border rounded-xl bg-card overflow-hidden" style={{ borderColor: "rgba(212,24,61,0.15)" }}>
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <p style={{ fontSize: "13px", color: "var(--foreground)" }}>{t("profile.deleteAccount")}</p>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{t("profile.deleteAccountDesc")}</p>
            </div>
            <button className="px-3 py-1.5 rounded-md border text-destructive hover:bg-destructive/5 cursor-pointer transition-colors" style={{ borderColor: "rgba(212,24,61,0.2)", fontSize: "11px", fontWeight: 500 }}>{t("profile.deleteBtn")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
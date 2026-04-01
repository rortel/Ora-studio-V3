import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router";
import {
  Shield, Users, CreditCard, Activity, AlertTriangle,
  TrendingUp, RefreshCw, ChevronDown, ChevronUp, Search,
  Crown, Zap, Loader2, ArrowRight, Clock, Server,
  DollarSign, BarChart3, Eye, Edit3, Check, X, Mail,
  Send, FileText, Copy, ChevronLeft, Plus, Trash2,
  GripVertical, Type, AlignLeft, Image, MousePointerClick,
  Minus, Columns2, MessageSquareQuote, MoveUp, MoveDown,
  Bold, Italic, LinkIcon, Variable, Calendar, FlaskConical,
  ListFilter, UserPlus, Sparkles, MailOpen, MousePointer,
  Save, Play, Pause, LayoutTemplate,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { API_BASE, publicAnonKey, supabase } from "../lib/supabase";
import { RouteGuard } from "../components/RouteGuard";

/* ═══════════════════════════════════
   TYPES
   ═══════════════════════════════════ */

interface AdminOverview {
  totalUsers: number;
  planCounts: { free: number; generate: number; studio: number };
  totalCreditsUsed: number;
  totalCreditsAllocated: number;
  mrr: number;
  generateRevenue: number;
  studioRevenue: number;
  recentLogs: SystemLog[];
  serverTime: string;
}

interface AdminUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  credits: number;
  creditsUsed: number;
  createdAt: string;
  lastLoginAt: string;
  company?: string;
}

interface SystemLog {
  id: string;
  type: string;
  details: any;
  timestamp: string;
}

type AdminTab = "overview" | "users" | "logs" | "financial" | "costs" | "emails" | "diagnostics";

/* ═══════════════════════════════════
   COMPONENT
   ═══════════════════════════════════ */

const ADMIN_EMAIL = "romainortel@gmail.com";

export function AdminPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminPageContent />
    </RouteGuard>
  );
}

function AdminPageContent() {
  const { isAdmin, isLoading, accessToken, user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [costsData, setCostsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState("");
  const [error, setError] = useState("");

  /**
   * POST-based admin fetch with Authorization header.
   * _token in body is extracted by server body-parser middleware for user auth.
   */
  const adminPost = useCallback(async (
    path: string,
    extraBody?: Record<string, any>,
    timeout = 30000,
  ): Promise<any> => {
    // Always get the freshest token from Supabase session
    let token = accessToken;
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (sess?.session?.access_token) {
        token = sess.session.access_token;
      }
    } catch { /* use existing token */ }
    if (!token) throw new Error("No auth token available");
    console.log("[Admin] adminPost token length:", token.length, "preview:", token.slice(0, 20) + "...");

    const url = `${API_BASE}${path}`;
    const body = JSON.stringify({ _token: token, ...extraBody });

    const attempt = async (label: string): Promise<any> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        console.log(`[Admin] ${label} POST ${path}`);
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${publicAnonKey}`,
            "Content-Type": "text/plain",
          },
          body,
          signal: controller.signal,
        });
        clearTimeout(timer);
        const data = await res.json();
        if (res.status === 403) throw new Error("Access denied");
        if (res.status === 401) throw new Error("Unauthorized");
        return data;
      } catch (err) {
        clearTimeout(timer);
        throw err;
      }
    };

    try {
      return await attempt("try1");
    } catch (err1) {
      console.warn(`[Admin] ${path} attempt 1 failed:`, err1);
      await new Promise((r) => setTimeout(r, 2500));
      return await attempt("try2");
    }
  }, [accessToken]);

  const isAdminUser = isAdmin || (user?.email?.toLowerCase() === ADMIN_EMAIL);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
    if (!isLoading && user && !isAdminUser && profile) {
      navigate("/profile");
    }
  }, [isLoading, isAdminUser, user, profile, navigate]);

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      console.log("[Admin] No accessToken yet, skipping fetch");
      return;
    }
    console.log("[Admin] accessToken present, length:", accessToken.length, "preview:", accessToken.slice(0, 20) + "...");

    // Refresh session to ensure token is not expired
    let freshToken = accessToken;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        freshToken = sessionData.session.access_token;
        if (freshToken !== accessToken) {
          console.log("[Admin] Using refreshed session token");
        }
      }
    } catch (refreshErr) {
      console.warn("[Admin] Session refresh check failed:", refreshErr);
    }

    setLoading(true);
    setError("");

    const emptyOverview: AdminOverview = {
      totalUsers: 0,
      planCounts: { free: 0, generate: 0, studio: 0 },
      totalCreditsUsed: 0,
      totalCreditsAllocated: 0,
      mrr: 0,
      generateRevenue: 0,
      studioRevenue: 0,
      recentLogs: [],
      serverTime: new Date().toISOString(),
    };

    try {
      // Single POST request — no CORS preflight, all admin data at once
      console.log("[Admin] Fetching all admin data via POST /admin/data...");
      const data = await adminPost("/admin/data");

      if (data.overview) setOverview(data.overview);
      else setOverview(emptyOverview);

      if (data.users) setUsers(data.users);
      if (data.logs) setLogs(data.logs);
      if (data.costs) setCostsData(data.costs);

      if (data.error) setError(data.error);
      else console.log("[Admin] All data loaded:", data.overview?.totalUsers, "users");
    } catch (err) {
      console.error("[Admin] Fetch error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Admin data: ${msg}`);
      if (!overview) setOverview(emptyOverview);
    }
    setLoading(false);
  }, [accessToken, adminPost]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlanChange = async (userId: string) => {
    if (!editPlan) return;
    try {
      await adminPost(`/admin/users/${userId}/plan`, { plan: editPlan });
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error("Plan change error:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile && !isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-[400px]">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(17,17,17,0.08)" }}>
            <Shield size={22} style={{ color: "var(--destructive)" }} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", marginBottom: "8px" }}>
            Access restricted
          </h2>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            This page is reserved for the platform administrator.
            {user && (
              <span style={{ display: "block", marginTop: "8px", fontSize: "12px" }}>
                Signed in as: {user.email}
              </span>
            )}
          </p>
          <Link to="/hub" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors" style={{ fontSize: "13px", fontWeight: 500 }}>
            <ArrowRight size={14} /> Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: typeof Shield }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "financial", label: "Financial", icon: DollarSign },
    { id: "costs", label: "Costs", icon: CreditCard },
    { id: "emails", label: "Emails", icon: Mail },
    { id: "logs", label: "System Logs", icon: Activity },
    { id: "diagnostics", label: "Diagnostics", icon: AlertTriangle },
  ];

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              <Shield size={18} />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
                Admin Dashboard
              </h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                {user?.email} -- {overview?.serverTime ? new Date(overview.serverTime).toLocaleString() : ""}
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border flex items-start gap-3" style={{ borderColor: "rgba(17,17,17,0.15)", background: "rgba(17,17,17,0.04)" }}>
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--destructive)" }} />
            <p style={{ fontSize: "13px", color: "var(--destructive)", lineHeight: 1.5 }}>{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b border-border">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer ${
                  active ? "border-ora-signal text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontSize: "13px", fontWeight: active ? 500 : 400 }}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === "overview" && overview && <OverviewTab overview={overview} />}
        {tab === "users" && (
          <UsersTab
            users={filteredUsers}
            search={search}
            setSearch={setSearch}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            editPlan={editPlan}
            setEditPlan={setEditPlan}
            onPlanChange={handlePlanChange}
          />
        )}
        {tab === "financial" && overview && <FinancialTab overview={overview} users={users} />}
        {tab === "costs" && overview && <CostsTab overview={overview} users={users} preloadedCosts={costsData} onRefresh={fetchData} />}
        {tab === "emails" && <EmailTab adminPost={adminPost} users={users} />}
        {tab === "logs" && <LogsTab logs={logs} />}
        {tab === "diagnostics" && <DiagnosticsTab authToken={accessToken || publicAnonKey} />}

        {loading && !overview && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && !overview && !error && (
          <div className="flex flex-col items-center justify-center py-20">
            <Server size={24} className="mb-3 text-muted-foreground/30" />
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "12px" }}>
              No data loaded yet.
            </p>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              style={{ fontSize: "13px", fontWeight: 500 }}
            >
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── OVERVIEW TAB ─── */

function OverviewTab({ overview }: { overview: AdminOverview }) {
  const kpis = [
    { label: "Total Users", value: overview.totalUsers, icon: Users, color: "var(--ora-signal)" },
    { label: "MRR", value: `${overview.mrr}`, prefix: "EUR ", icon: DollarSign, color: "#666666" },
    { label: "Credits Used", value: overview.totalCreditsUsed, icon: Zap, color: "#999999" },
    { label: "Credits Allocated", value: overview.totalCreditsAllocated, icon: BarChart3, color: "var(--accent)" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-5"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} style={{ color: kpi.color }} />
                <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>
                  {kpi.label}
                </span>
              </div>
              <span style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
                {kpi.prefix || ""}{typeof kpi.value === "number" ? kpi.value.toLocaleString() : kpi.value}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Plan Distribution</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { plan: "Free (legacy)", count: overview.planCounts.free, color: "var(--muted-foreground)" },
            { plan: "Starter", count: overview.planCounts.starter || 0, color: "#999999" },
            { plan: "Pro", count: overview.planCounts.generate, color: "var(--ora-signal)" },
            { plan: "Business", count: overview.planCounts.studio, color: "#666666" },
          ].map((p) => (
            <div key={p.plan} className="text-center">
              <span style={{ fontSize: "32px", fontWeight: 500, color: p.color }}>{p.count}</span>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "4px" }}>{p.plan}</p>
            </div>
          ))}
        </div>
        {overview.totalUsers > 0 && (
          <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden flex">
            {overview.planCounts.free > 0 && <div style={{ width: `${(overview.planCounts.free / overview.totalUsers) * 100}%`, background: "var(--muted-foreground)" }} />}
            {(overview.planCounts as any).starter > 0 && <div style={{ width: `${((overview.planCounts as any).starter / overview.totalUsers) * 100}%`, background: "#999999" }} />}
            {overview.planCounts.generate > 0 && <div style={{ width: `${(overview.planCounts.generate / overview.totalUsers) * 100}%`, background: "var(--ora-signal)" }} />}
            {overview.planCounts.studio > 0 && <div style={{ width: `${(overview.planCounts.studio / overview.totalUsers) * 100}%`, background: "#666666" }} />}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Recent Activity</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {overview.recentLogs.slice(0, 15).map((log) => (
            <LogEntry key={log.id} log={log} />
          ))}
          {overview.recentLogs.length === 0 && (
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── USERS TAB ─── */

function UsersTab({ users, search, setSearch, editingUser, setEditingUser, editPlan, setEditPlan, onPlanChange }: {
  users: AdminUser[]; search: string; setSearch: (s: string) => void;
  editingUser: string | null; setEditingUser: (id: string | null) => void;
  editPlan: string; setEditPlan: (p: string) => void; onPlanChange: (userId: string) => void;
}) {
  const planBadgeColor: Record<string, string> = { free: "var(--muted-foreground)", starter: "#999999", generate: "var(--ora-signal)", studio: "#666666" };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users by email or name..."
          className="w-full bg-input-background border border-border rounded-lg pl-9 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground/40" style={{ fontSize: "14px" }} />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["User", "Plan", "Credits", "Used", "Role", "Joined", "Last Login", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3" style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{u.name || "--"}</span>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingUser === u.userId ? (
                      <div className="flex items-center gap-1">
                        <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} className="bg-input-background border border-border rounded px-2 py-1 text-foreground" style={{ fontSize: "12px" }}>
                          <option value="free">Free (legacy)</option>
                          <option value="starter">Starter</option>
                          <option value="generate">Pro</option>
                          <option value="studio">Business</option>
                        </select>
                        <button onClick={() => onPlanChange(u.userId)} className="text-ora-signal hover:opacity-80 cursor-pointer"><Check size={14} /></button>
                        <button onClick={() => setEditingUser(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={14} /></button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ fontSize: "11px", fontWeight: 500, color: planBadgeColor[u.plan] || "var(--muted-foreground)", background: `${planBadgeColor[u.plan] || "var(--muted-foreground)"}15` }}>
                        {u.plan === "studio" && <Crown size={10} />}
                        {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "13px", color: "var(--foreground)" }}>{u.credits?.toLocaleString()}</td>
                  <td className="px-4 py-3" style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{u.creditsUsed?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ fontSize: "10px", fontWeight: 600, color: u.role === "admin" ? "#fff" : "var(--muted-foreground)", background: u.role === "admin" ? "var(--ora-signal)" : "var(--secondary)" }}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "--"}</td>
                  <td className="px-4 py-3" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "--"}</td>
                  <td className="px-4 py-3">
                    {u.role !== "admin" && (
                      <button onClick={() => { setEditingUser(u.userId); setEditPlan(u.plan); }} className="text-muted-foreground hover:text-ora-signal cursor-pointer transition-colors" title="Change plan">
                        <Edit3 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="text-center py-12">
            <Users size={24} className="mx-auto mb-3 text-muted-foreground/30" />
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── FINANCIAL TAB ─── */

function FinancialTab({ overview, users }: { overview: AdminOverview; users: AdminUser[] }) {
  const paidUsers = users.filter((u) => u.plan !== "free" && u.role !== "admin");
  const conversionRate = overview.totalUsers > 0 ? ((paidUsers.length / overview.totalUsers) * 100).toFixed(1) : "0";
  const arpu = paidUsers.length > 0 ? (overview.mrr / paidUsers.length).toFixed(0) : "0";
  const creditUtilization = overview.totalCreditsAllocated > 0
    ? ((overview.totalCreditsUsed / overview.totalCreditsAllocated) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: `EUR ${overview.mrr}`, sub: "Monthly Recurring Revenue" },
          { label: "ARR", value: `EUR ${overview.mrr * 12}`, sub: "Annual Run Rate" },
          { label: "Conversion", value: `${conversionRate}%`, sub: "Free to Paid" },
          { label: "ARPU", value: `EUR ${arpu}`, sub: "Avg Revenue Per User" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
            <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{kpi.label}</span>
            <p style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)", marginTop: "8px" }}>{kpi.value}</p>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Revenue Breakdown</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-sm" style={{ background: "#999999" }} /><span style={{ fontSize: "13px", color: "var(--foreground)" }}>Starter (EUR 29/mo)</span></div>
            <div className="flex items-center gap-4"><span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{(overview.planCounts as any).starter || 0} users</span><span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>EUR {(overview as any).starterRevenue || 0}</span></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-sm" style={{ background: "var(--ora-signal)" }} /><span style={{ fontSize: "13px", color: "var(--foreground)" }}>Pro (EUR 79/mo)</span></div>
            <div className="flex items-center gap-4"><span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{overview.planCounts.generate} users</span><span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>EUR {overview.generateRevenue}</span></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-sm" style={{ background: "#666666" }} /><span style={{ fontSize: "13px", color: "var(--foreground)" }}>Business (EUR 149/mo)</span></div>
            <div className="flex items-center gap-4"><span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{overview.planCounts.studio} users</span><span style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>EUR {overview.studioRevenue}</span></div>
          </div>
          <div className="border-t border-border pt-3 flex items-center justify-between">
            <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Total MRR</span>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--ora-signal)" }}>EUR {overview.mrr}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Credit Utilization</h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span style={{ fontSize: "36px", fontWeight: 500, color: "var(--foreground)" }}>{creditUtilization}%</span>
          <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>of allocated credits consumed</span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Number(creditUtilization))}%`, background: Number(creditUtilization) > 80 ? "#999999" : "var(--ora-signal)" }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{overview.totalCreditsUsed.toLocaleString()} used</span>
          <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{overview.totalCreditsAllocated.toLocaleString()} allocated</span>
        </div>
      </div>
    </div>
  );
}

/* ─── COSTS TAB (API Cost Tracking) ─── */

const PROVIDER_COLORS: Record<string, string> = {
  runware: "#666666", apipod: "#444444", fal: "#999999", replicate: "#888888",
  luma: "#555555", higgsfield: "#777777", kling: "#999999", unknown: "#AAAAAA",
};
const TYPE_COLORS: Record<string, string> = {
  text: "#444444", image: "#666666", video: "#999999", audio: "#888888",
};

// Fixed infrastructure costs (EUR/month)
const FIXED_COSTS = [
  { name: "Figma Make", cost: 350, status: "confirmed" as const },
  { name: "Supabase Pro", cost: 23, status: "confirmed" as const },
  { name: "Domain + misc", cost: 5, status: "confirmed" as const },
];
const TOTAL_FIXED = FIXED_COSTS.reduce((s, c) => s + c.cost, 0);

function CostsTab({ overview, users, preloadedCosts, onRefresh }: { overview: AdminOverview; users: AdminUser[]; preloadedCosts?: any; onRefresh?: () => void }) {
  const costsData = preloadedCosts;

  const total = costsData?.total || { count: 0, costEur: 0, revenueEur: 0, marginEur: 0 };
  const byProvider = costsData?.byProvider || {};
  const byType = costsData?.byType || {};
  const byDay = costsData?.byDay || {};
  const recentEntries = costsData?.recentEntries || [];
  const marginPct = total.revenueEur > 0 ? ((total.marginEur / total.revenueEur) * 100).toFixed(1) : "0";
  const totalMonthlyBurn = TOTAL_FIXED + total.costEur;
  const netAfterFixed = overview.mrr - totalMonthlyBurn;

  // Chart data
  const dayChartData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([day, d]: [string, any]) => ({
      day: day.slice(5), // MM-DD
      cost: Math.round(d.costEur * 100) / 100,
      revenue: Math.round(d.revenueEur * 100) / 100,
      margin: Math.round(d.marginEur * 100) / 100,
      count: d.count,
    }));

  const pieData = Object.entries(byProvider).map(([name, d]: [string, any]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(d.totalCostEur * 100) / 100,
    color: PROVIDER_COLORS[name] || "#AAAAAA",
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {!costsData && (
        <div className="p-4 rounded-xl border flex items-start gap-3" style={{ borderColor: "rgba(17,17,17,0.15)", background: "rgba(17,17,17,0.04)" }}>
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "var(--destructive)" }} />
          <p style={{ fontSize: "13px", color: "var(--destructive)", lineHeight: 1.5 }}>No cost data loaded. Click Refresh to reload.</p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Cost", value: `EUR ${total.costEur.toFixed(2)}`, sub: "API provider spend", color: "var(--destructive)" },
          { label: "Total Revenue", value: `EUR ${total.revenueEur.toFixed(2)}`, sub: "Credits consumed", color: "#666666" },
          { label: "Net Margin", value: `EUR ${total.marginEur.toFixed(2)}`, sub: `${marginPct}% margin`, color: total.marginEur >= 0 ? "#666666" : "var(--destructive)" },
          { label: "Generations", value: `${total.count}`, sub: "Total API calls", color: "var(--ora-signal)" },
          { label: "Avg Cost/Gen", value: `EUR ${total.count > 0 ? (total.costEur / total.count).toFixed(4) : "0"}`, sub: "Per generation", color: "var(--accent)" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-5" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
            <span style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{kpi.label}</span>
            <p style={{ fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em", color: kpi.color, marginTop: "8px" }}>{kpi.value}</p>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Monthly Burn Summary + Fixed Costs */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Monthly Burn Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Fixed infrastructure</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--destructive)" }}>-EUR {TOTAL_FIXED}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Variable API costs (this period)</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--destructive)" }}>-EUR {total.costEur.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Total monthly burn</span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--destructive)" }}>EUR {totalMonthlyBurn.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>MRR</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#666666" }}>+EUR {overview.mrr}</span>
            </div>
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Net P&L</span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: netAfterFixed >= 0 ? "#666666" : "var(--destructive)" }}>
                {netAfterFixed >= 0 ? "+" : ""}EUR {netAfterFixed.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Fixed Infrastructure (EUR/mo)</h3>
          <div className="space-y-3">
            {FIXED_COSTS.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#666666" }} />
                  <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{c.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>EUR {c.cost}</span>
                  <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 600, color: "#666666", background: "rgba(17,17,17,0.08)" }}>
                    CONFIRMED
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Total fixed</span>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)" }}>EUR {TOTAL_FIXED}/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Breakdown + Pie */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Cost by Provider</h3>
          {Object.keys(byProvider).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(byProvider).map(([name, d]: [string, any]) => {
                const pct = total.costEur > 0 ? (d.totalCostEur / total.costEur * 100) : 0;
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: PROVIDER_COLORS[name] || "#AAAAAA" }} />
                        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", textTransform: "capitalize" }}>{name}</span>
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>({d.count} calls)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize: "12px", color: "var(--destructive)" }}>-EUR {d.totalCostEur.toFixed(4)}</span>
                        <span style={{ fontSize: "12px", color: "#666666" }}>+EUR {d.totalRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: PROVIDER_COLORS[name] || "#AAAAAA" }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{d.avgLatency}ms avg</span>
                      <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>{d.successCount} ok / {d.failCount} fail</span>
                      <span style={{ fontSize: "10px", fontWeight: 500, color: d.totalMargin >= 0 ? "#666666" : "var(--destructive)" }}>
                        Margin: EUR {d.totalMargin.toFixed(4)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>No cost data yet. Generate content to see provider costs.</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Cost Distribution</h3>
          {pieData.length > 0 ? (
            <div>
              {/* Donut chart via SVG */}
              <svg viewBox="0 0 200 200" width="200" height="200" className="mx-auto">
                {(() => {
                  const totalVal = pieData.reduce((s, d) => s + d.value, 0);
                  let cumAngle = -90;
                  return pieData.map((d, i) => {
                    const angle = totalVal > 0 ? (d.value / totalVal) * 360 : 0;
                    const startAngle = cumAngle;
                    cumAngle += angle;
                    const endAngle = cumAngle;
                    const largeArc = angle > 180 ? 1 : 0;
                    const r = 75; const ir = 45; const cx = 100; const cy = 100;
                    const s1 = Math.cos((startAngle * Math.PI) / 180);
                    const s2 = Math.sin((startAngle * Math.PI) / 180);
                    const e1 = Math.cos((endAngle * Math.PI) / 180);
                    const e2 = Math.sin((endAngle * Math.PI) / 180);
                    const path = `M ${cx + ir * s1} ${cy + ir * s2} L ${cx + r * s1} ${cy + r * s2} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * e1} ${cy + r * e2} L ${cx + ir * e1} ${cy + ir * e2} A ${ir} ${ir} 0 ${largeArc} 0 ${cx + ir * s1} ${cy + ir * s2} Z`;
                    return <path key={i} d={path} fill={d.color} stroke="var(--card)" strokeWidth={2} />;
                  });
                })()}
                <text x="100" y="96" textAnchor="middle" style={{ fontSize: "16px", fontWeight: 500, fill: "var(--foreground)" }}>
                  EUR {pieData.reduce((s, d) => s + d.value, 0).toFixed(2)}
                </text>
                <text x="100" y="112" textAnchor="middle" style={{ fontSize: "10px", fill: "var(--muted-foreground)" }}>
                  total cost
                </text>
              </svg>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{d.name} (EUR {d.value.toFixed(4)})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[220px]">
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>No data</p>
            </div>
          )}
        </div>
      </div>

      {/* Cost by Modality */}
      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Cost by Modality</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {["text", "image", "video", "audio"].map((type) => {
            const d = byType[type] || { count: 0, totalCostEur: 0, totalRevenue: 0, totalMargin: 0 };
            return (
              <div key={type} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type] }} />
                  <span style={{ fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground)" }}>{type}</span>
                </div>
                <p style={{ fontSize: "20px", fontWeight: 500, color: "var(--foreground)" }}>{d.count}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Cost</span>
                    <span style={{ fontSize: "10px", color: "var(--destructive)" }}>EUR {(d.totalCostEur || 0).toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Revenue</span>
                    <span style={{ fontSize: "10px", color: "#666666" }}>EUR {(d.totalRevenue || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1">
                    <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted-foreground)" }}>Margin</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: (d.totalMargin || 0) >= 0 ? "#666666" : "var(--destructive)" }}>
                      EUR {(d.totalMargin || 0).toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Trend Chart */}
      {dayChartData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Daily Cost vs Revenue (last 14 days)</h3>
          {/* Legend */}
          <div className="flex items-center gap-5 mb-4">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--destructive)" }} /><span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Cost</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#666666" }} /><span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Revenue</span></div>
          </div>
          {/* Bar chart */}
          <div className="flex items-end gap-1" style={{ height: "200px" }}>
            {(() => {
              const maxVal = Math.max(...dayChartData.map(d => Math.max(d.cost, d.revenue)), 0.01);
              return dayChartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" style={{ height: "100%" }}>
                  <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                    <div className="rounded-t-sm" style={{ width: "40%", height: `${Math.max(2, (d.cost / maxVal) * 100)}%`, background: "var(--destructive)", opacity: 0.8, minHeight: d.cost > 0 ? "4px" : "0" }} title={`Cost: EUR ${d.cost.toFixed(4)}`} />
                    <div className="rounded-t-sm" style={{ width: "40%", height: `${Math.max(2, (d.revenue / maxVal) * 100)}%`, background: "#666666", opacity: 0.8, minHeight: d.revenue > 0 ? "4px" : "0" }} title={`Rev: EUR ${d.revenue.toFixed(4)}`} />
                  </div>
                  <span style={{ fontSize: "9px", color: "var(--muted-foreground)", writingMode: "horizontal-tb" }}>{d.day}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Provider Cost per Call (Reference Table) */}
      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: "16px" }}>Provider Cost Reference (per call)</h3>
        {costsData?.providerCostTable ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Provider / Model", "Cost (USD)", "Cost (EUR)", "Type"].map((h) => (
                    <th key={h} className="text-left px-3 py-2" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(costsData.providerCostTable).sort(([a], [b]) => a.localeCompare(b)).map(([key, costUsd]: [string, any]) => {
                  const prefix = key.split("/")[0];
                  const k = key.toLowerCase();
                  const type = prefix === "apipod" ? "text"
                    : k.includes("musicgen") ? "audio"
                    : k.includes("video") || k.includes("ray") || k.includes("ltx") || k.includes("minimax") || k.includes("soul") || k.includes("kling") || k.includes("seedance") || k.includes("dop") ? "video"
                    : "image";
                  return (
                    <tr key={key} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2" style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--foreground)" }}>{key}</td>
                      <td className="px-3 py-2" style={{ fontSize: "12px", color: "var(--foreground)" }}>${costUsd}</td>
                      <td className="px-3 py-2" style={{ fontSize: "12px", color: "var(--foreground)" }}>EUR {(costUsd * 0.92).toFixed(4)}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "10px", fontWeight: 500, color: TYPE_COLORS[type] || "var(--muted-foreground)", background: `${TYPE_COLORS[type] || "var(--muted-foreground)"}12` }}>{type}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Cost table not loaded</p>
        )}
      </div>

      {/* Recent Cost Entries (log) */}
      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>Recent Generations ({recentEntries.length})</h3>
          <button onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            style={{ fontSize: "11px", fontWeight: 500 }}>
            <RefreshCw size={12} /> Refresh Costs
          </button>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                {["Time", "Type", "Model", "Provider", "Cost", "Revenue", "Margin", "Latency", "Status"].map((h) => (
                  <th key={h} className="text-left px-3 py-2" style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentEntries.slice(0, 50).map((entry: any) => (
                <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-3 py-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "--"}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "10px", fontWeight: 500, color: TYPE_COLORS[entry.type] || "var(--muted-foreground)", background: `${TYPE_COLORS[entry.type] || "var(--muted-foreground)"}12` }}>{entry.type}</span>
                  </td>
                  <td className="px-3 py-2" style={{ fontSize: "11px", color: "var(--foreground)" }}>{entry.model}</td>
                  <td className="px-3 py-2" style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted-foreground)" }}>{entry.provider}</td>
                  <td className="px-3 py-2" style={{ fontSize: "11px", color: "var(--destructive)" }}>EUR {(entry.costEur || 0).toFixed(4)}</td>
                  <td className="px-3 py-2" style={{ fontSize: "11px", color: "#666666" }}>EUR {(entry.revenueEur || 0).toFixed(2)}</td>
                  <td className="px-3 py-2" style={{ fontSize: "11px", fontWeight: 500, color: (entry.marginEur || 0) >= 0 ? "#666666" : "var(--destructive)" }}>EUR {(entry.marginEur || 0).toFixed(4)}</td>
                  <td className="px-3 py-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{entry.latencyMs}ms</td>
                  <td className="px-3 py-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: entry.success ? "#666666" : "var(--destructive)" }} />
                  </td>
                </tr>
              ))}
              {recentEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <DollarSign size={24} className="mx-auto mb-3 text-muted-foreground/30" />
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>No generation costs logged yet</p>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>Generate content from the Hub to see costs here</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── LOGS TAB ─── */

function LogsTab({ logs }: { logs: SystemLog[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>System Events ({logs.length})</h3>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
          {logs.map((log) => (<LogEntry key={log.id} log={log} expanded />))}
          {logs.length === 0 && (
            <div className="text-center py-12">
              <Activity size={24} className="mx-auto mb-3 text-muted-foreground/30" />
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>No system logs yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── DIAGNOSTICS TAB ─── */

interface SingleTestResult {
  provider: string;
  status: string;
  code?: number;
  ms?: number;
  body?: string;
  error?: string;
}

function DiagnosticsTab({ authToken }: { authToken: string }) {
  const [configData, setConfigData] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState("");
  const [healthStatus, setHealthStatus] = useState<"idle" | "ok" | "fail" | "loading">("idle");
  const [healthMs, setHealthMs] = useState(0);
  const [healthError, setHealthError] = useState("");
  const [healthBody, setHealthBody] = useState("");
  const [singleTests, setSingleTests] = useState<Record<string, SingleTestResult | "loading">>({});
  const [genTest, setGenTest] = useState<{ type: string; model?: string; result: any } | null>(null);
  const [genTesting, setGenTesting] = useState(false);

  // No Authorization header — use apikey query param to avoid CORS preflight
  const authH: Record<string, string> = {};

  // Step 1: Health check
  const runHealthCheck = async () => {
    setHealthStatus("loading");
    setHealthError("");
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API_BASE}/health`, { headers: authH, signal: controller.signal });
      clearTimeout(timeout);
      const ms = Date.now() - start;
      const text = await res.text();
      console.log(`[Health] HTTP ${res.status} (${ms}ms)`);
      if (res.ok) {
        setHealthMs(ms);
        setHealthBody(text);
        setHealthStatus("ok");
      } else {
        setHealthError(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        setHealthStatus("fail");
      }
    } catch (err) {
      const ms = Date.now() - start;
      setHealthMs(ms);
      setHealthError(`Network error (${ms}ms): ${err instanceof Error ? err.message : err}\n\nURL: ${API_BASE}/health`);
      setHealthStatus("fail");
    }
  };

  // Step 2: Load config (no auth needed — debug route is public)
  const loadConfig = async () => {
    setConfigLoading(true);
    setConfigError("");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE}/debug/ai-config`, {
        headers: authH,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      console.log("[Diagnostics] ai-config:", data);
      if (res.ok && !data.error) {
        setConfigData(data);
        setConfigLoading(false);
        return;
      }
      setConfigError(`Server returned: ${JSON.stringify(data)}`);
    } catch (err) {
      console.error("[Diagnostics] ai-config error:", err);
      setConfigError(`Failed to load config: ${err}`);
    }
    setConfigLoading(false);
  };

  // Step 3: Individual provider test (no auth needed, increased timeout for slow providers)
  const runSingleTest = async (provider: string) => {
    setSingleTests((prev) => ({ ...prev, [provider]: "loading" }));
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s — FAL/Replicate can be slow
      const res = await fetch(`${API_BASE}/debug/test-single/${provider}`, {
        headers: authH,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      console.log(`[Diagnostics] test-single/${provider}:`, data);
      setSingleTests((prev) => ({ ...prev, [provider]: data as SingleTestResult }));
    } catch (err) {
      console.error(`[Diagnostics] test-single/${provider} error:`, err);
      setSingleTests((prev) => ({
        ...prev,
        [provider]: { provider, status: "ERROR", error: String(err) } as SingleTestResult,
      }));
    }
  };

  // Step 4: Generation test
  const runGenTest = async (type: string, model?: string) => {
    setGenTesting(true);
    setGenTest(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s — race pattern + fallback needs time
      const res = await fetch(`${API_BASE}/debug/generate-test`, {
        method: "POST",
        headers: { ...authH, "Content-Type": "text/plain" },
        body: JSON.stringify({ type, prompt: "A simple blue circle on a white background", model, _token: authToken }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      console.log("[Diagnostics] generate-test:", data);
      setGenTest({ type, model, result: data });
    } catch (err) {
      console.error("[Diagnostics] generate-test error:", err);
      setGenTest({ type, model, result: { success: false, error: String(err) } });
    }
    setGenTesting(false);
  };

  // Auto-run health check on mount
  useEffect(() => {
    runHealthCheck();
  }, []);

  const statusColor = (status: string) => {
    if (status === "OK") return "#666666";
    if (status === "SKIP") return "#999999";
    return "var(--destructive)";
  };

  const statusDot = (status: string) => (
    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusColor(status) }} />
  );

  const providers = [
    { id: "apipod_text", label: "APIPod Text", desc: "Chat completions (GPT-4o)" },
    { id: "apipod_image", label: "APIPod Image", desc: "Image generations (DALL-E 3)" },
    { id: "fal", label: "FAL AI", desc: "Image (Flux Schnell)" },
    { id: "replicate", label: "Replicate", desc: "Account auth check" },
  ];

  return (
    <div className="space-y-6">
      {/* Step 1: Server Health */}
      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
              <Server size={14} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>Step 1 -- Server Health</h3>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Verify the Edge Function responds</p>
            </div>
          </div>
          <button onClick={runHealthCheck} disabled={healthStatus === "loading"}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
            style={{ fontSize: "12px", fontWeight: 500 }}>
            {healthStatus === "loading" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Ping
          </button>
        </div>
        {healthStatus === "ok" && (
          <div className="p-3 rounded-lg" style={{ background: "rgba(17,17,17,0.06)" }}>
            <div className="flex items-center gap-2">
              {statusDot("OK")}
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#666666" }}>Server OK</span>
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>({healthMs}ms)</span>
            </div>
            {healthBody && (
              <pre className="mt-2 ml-5 p-2 bg-secondary/50 rounded" style={{ fontSize: "10px", color: "var(--muted-foreground)", whiteSpace: "pre-wrap" }}>
                {healthBody}
              </pre>
            )}
          </div>
        )}
        {healthStatus === "fail" && (
          <div className="p-3 rounded-lg" style={{ background: "rgba(17,17,17,0.06)" }}>
            <div className="flex items-center gap-2">
              {statusDot("FAIL")}
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--destructive)" }}>Server unreachable</span>
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>({healthMs}ms)</span>
            </div>
            {healthError && <p className="mt-1 ml-5" style={{ fontSize: "11px", color: "var(--destructive)" }}>{healthError}</p>}
          </div>
        )}
        {healthStatus === "loading" && (
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
            <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Pinging server...</span>
          </div>
        )}
      </div>

      {/* Step 2: API Keys */}
      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
              <Eye size={14} style={{ color: "var(--muted-foreground)" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>Step 2 -- API Keys</h3>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Check which keys are configured on the server</p>
            </div>
          </div>
          <button onClick={loadConfig} disabled={configLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
            style={{ fontSize: "12px", fontWeight: 500 }}>
            {configLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            Load Config
          </button>
        </div>
        {configError && <p style={{ fontSize: "12px", color: "var(--destructive)" }}>Error: {configError}</p>}
        {configData && !configData.error && (
          <div className="space-y-2">
            {["apipod", "runware_image", "runware_video", "fal", "replicate"].map((key) => {
              const val = configData[key];
              const isSet = val && !val.includes("NOT SET");
              return (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: isSet ? "#666666" : "var(--destructive)" }} />
                    <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", textTransform: "uppercase" }}>{key}</span>
                  </div>
                  <span style={{ fontSize: "11px", color: isSet ? "#666666" : "var(--destructive)", fontFamily: "monospace" }}>{val || "NOT SET"}</span>
                </div>
              );
            })}
          </div>
        )}
        {!configData && !configLoading && !configError && (
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Click "Load Config" to check API key status.</p>
        )}
      </div>

      {/* Step 3: Individual Provider Tests */}
      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
            <Zap size={14} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>Step 3 -- Provider Tests (individual)</h3>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Test each provider separately to avoid timeouts. Click each button.</p>
          </div>
        </div>
        <div className="space-y-3">
          {providers.map((p) => {
            const result = singleTests[p.id];
            const isLoading = result === "loading";
            const data = result && result !== "loading" ? result : null;
            return (
              <div key={p.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {data ? statusDot(data.status) : <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--border-strong)" }} />}
                    <div>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{p.label}</span>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{p.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {data && (
                      <>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: statusColor(data.status) }}>{data.status}</span>
                        {data.ms && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{data.ms}ms</span>}
                        {data.code && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>HTTP {data.code}</span>}
                      </>
                    )}
                    <button onClick={() => runSingleTest(p.id)} disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-primary-foreground cursor-pointer disabled:opacity-50 transition-opacity"
                      style={{ fontSize: "11px", fontWeight: 500, background: "var(--ora-signal)" }}>
                      {isLoading ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      {isLoading ? "Testing..." : "Test"}
                    </button>
                  </div>
                </div>
                {data?.body && (
                  <pre className="mt-2 p-2 bg-secondary/50 rounded overflow-x-auto" style={{ fontSize: "10px", color: "var(--muted-foreground)", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "120px" }}>
                    {data.body}
                  </pre>
                )}
                {data?.error && (
                  <p className="mt-1" style={{ fontSize: "11px", color: "var(--destructive)" }}>{data.error}</p>
                )}
              </div>
            );
          })}
        </div>
        {/* Run all button */}
        <button
          onClick={() => providers.forEach((p) => runSingleTest(p.id))}
          disabled={Object.values(singleTests).some((v) => v === "loading")}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
          style={{ fontSize: "12px", fontWeight: 500 }}>
          <Zap size={12} /> Run All (sequential requests)
        </button>
      </div>

      {/* Step 4: Generation Pipeline Test */}
      <div className="bg-card border border-border rounded-xl p-6" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
            <Activity size={14} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>Step 4 -- End-to-End Generation</h3>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Test the full pipeline (ai.tsx fallback chain) with prompt "A simple blue circle"</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: "Text (GPT-4o)", type: "text", model: "gpt-4o" },
            { label: "Text (Claude)", type: "text", model: "claude-sonnet" },
            { label: "Image (ORA Vision)", type: "image", model: "ora-vision" },
            { label: "Image (DALL-E)", type: "image", model: "dall-e" },
            { label: "Image (Flux Pro)", type: "image", model: "flux-pro" },
            { label: "Video (ORA Motion)", type: "video", model: "ora-motion" },
            { label: "Audio (ORA Audio)", type: "audio", model: "ora-audio" },
          ].map((t) => (
            <button key={`${t.type}-${t.model}`} onClick={() => runGenTest(t.type, t.model)} disabled={genTesting}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-50"
              style={{ fontSize: "12px", fontWeight: 500 }}>
              {genTesting ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
              {t.label}
            </button>
          ))}
        </div>
        {genTest && (
          <div className="p-4 rounded-lg border border-border" style={{ background: genTest.result.success ? "rgba(17,17,17,0.04)" : "rgba(17,17,17,0.04)" }}>
            <div className="flex items-center gap-2 mb-2">
              {statusDot(genTest.result.success ? "OK" : "FAIL")}
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                {genTest.type} ({genTest.model}) -- {genTest.result.success ? "SUCCESS" : "FAILED"}
              </span>
              {genTest.result.totalMs && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>({genTest.result.totalMs}ms)</span>}
            </div>
            {genTest.result.error && (
              <p className="mb-2 ml-5" style={{ fontSize: "12px", color: "var(--destructive)" }}>{genTest.result.error}</p>
            )}
            <pre className="mt-2 p-2 bg-secondary/50 rounded overflow-x-auto" style={{ fontSize: "10px", color: "var(--muted-foreground)", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "200px" }}>
              {JSON.stringify(genTest.result, null, 2)}
            </pre>
            {genTest.result.result?.imageUrl && (
              <div className="mt-3">
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Generated image:</p>
                <img src={genTest.result.result.imageUrl} alt="Generated test" className="max-w-[300px] rounded-lg border border-border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
            {genTest.result.result?.text && (
              <div className="mt-3 p-3 bg-secondary/50 rounded-lg">
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Generated text:</p>
                <p style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.5 }}>{genTest.result.result.text.slice(0, 500)}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── EMAIL TAB ─── */

interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  variables: string[];
}

/* ── Block types for the visual editor ── */

type EmailBlockType = "heading" | "text" | "image" | "button" | "divider" | "columns" | "highlight";

interface EmailBlockBase {
  id: string;
  type: EmailBlockType;
}
interface HeadingBlock extends EmailBlockBase { type: "heading"; level: "h1" | "h2"; content: string; }
interface TextBlock extends EmailBlockBase { type: "text"; content: string; }
interface ImageBlock extends EmailBlockBase { type: "image"; src: string; alt: string; }
interface ButtonBlock extends EmailBlockBase { type: "button"; text: string; url: string; style: "filled" | "outline"; }
interface DividerBlock extends EmailBlockBase { type: "divider"; }
interface ColumnsBlock extends EmailBlockBase { type: "columns"; left: string; right: string; }
interface HighlightBlock extends EmailBlockBase { type: "highlight"; content: string; }

type EmailBlock = HeadingBlock | TextBlock | ImageBlock | ButtonBlock | DividerBlock | ColumnsBlock | HighlightBlock;

/* ── Email list types ── */
interface EmailList {
  id: string;
  name: string;
  description: string;
  filter: { type: "manual" | "plan" | "smart"; value: string; };
  userIds: string[];
}

/* ── Scheduled email type ── */
interface ScheduledEmail {
  id: string;
  subject: string;
  scheduledAt: string;
  status: "pending" | "sent" | "cancelled";
  recipientCount: number;
}

/* ── Stats types ── */
interface EmailStats {
  totalSent: number;
  openRate: number;
  clickRate: number;
  campaigns: { name: string; sent: number; opened: number; clicked: number; date: string; }[];
}

/* ── Sub-tabs ── */
type EmailSubTab = "editor" | "lists" | "scheduled" | "stats";

/* ── Helpers ── */

const uid = () => Math.random().toString(36).slice(2, 10);

const BLOCK_PALETTE: { type: EmailBlockType; label: string; icon: typeof Type }[] = [
  { type: "heading", label: "Titre", icon: Type },
  { type: "text", label: "Texte", icon: AlignLeft },
  { type: "image", label: "Image", icon: Image },
  { type: "button", label: "Bouton CTA", icon: MousePointerClick },
  { type: "divider", label: "Séparateur", icon: Minus },
  { type: "columns", label: "2 colonnes", icon: Columns2 },
  { type: "highlight", label: "Highlight", icon: MessageSquareQuote },
];

const AVAILABLE_VARIABLES = ["name", "plan", "credits", "remaining", "ctaUrl", "ctaText", "company", "email"];

function createBlock(type: EmailBlockType): EmailBlock {
  const id = uid();
  switch (type) {
    case "heading": return { id, type, level: "h1", content: "Titre de votre email" };
    case "text": return { id, type, content: "Votre texte ici. Utilisez **gras**, *italique* ou [lien](url)." };
    case "image": return { id, type, src: "", alt: "Description de l'image" };
    case "button": return { id, type, text: "Découvrir", url: "https://ora-studio.app", style: "filled" };
    case "divider": return { id, type };
    case "columns": return { id, type, left: "Contenu gauche", right: "Contenu droite" };
    case "highlight": return { id, type, content: "Information mise en avant" };
  }
}

/** Convert markdown-like inline formatting to HTML */
function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#3b4fc4;text-decoration:underline">$1</a>')
    .replace(/\n/g, "<br>");
}

/** Convert blocks array to email-compatible HTML */
function blocksToHtml(blocks: EmailBlock[]): string {
  const rows = blocks.map((b) => {
    switch (b.type) {
      case "heading":
        return `<tr><td style="padding:16px 24px 8px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:${b.level === "h1" ? "24" : "18"}px;font-weight:600;color:#1a1a2e;line-height:1.3;letter-spacing:-0.02em">${inlineFormat(b.content)}</td></tr>`;
      case "text":
        return `<tr><td style="padding:8px 24px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;color:#4a5568;line-height:1.7">${inlineFormat(b.content)}</td></tr>`;
      case "image":
        return b.src
          ? `<tr><td style="padding:12px 24px"><img src="${b.src}" alt="${b.alt}" style="max-width:100%;height:auto;border-radius:12px;display:block" /></td></tr>`
          : "";
      case "button": {
        const isFilled = b.style === "filled";
        return `<tr><td style="padding:16px 24px"><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${isFilled ? "#1a1a2e" : "transparent"};border:${isFilled ? "none" : "1.5px solid rgba(0,0,0,0.14)"};border-radius:999px;padding:12px 28px"><a href="${b.url}" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:${isFilled ? "#ffffff" : "#1a1a2e"};text-decoration:none;display:inline-block">${b.text}</a></td></tr></table></td></tr>`;
      }
      case "divider":
        return `<tr><td style="padding:16px 24px"><hr style="border:none;border-top:1px solid rgba(0,0,0,0.08);margin:0" /></td></tr>`;
      case "columns":
        return `<tr><td style="padding:8px 24px"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="48%" valign="top" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;color:#4a5568;line-height:1.6;padding-right:12px">${inlineFormat(b.left)}</td><td width="4%"></td><td width="48%" valign="top" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;color:#4a5568;line-height:1.6;padding-left:12px">${inlineFormat(b.right)}</td></tr></table></td></tr>`;
      case "highlight":
        return `<tr><td style="padding:8px 24px"><div style="background:#f4f4f6;border-radius:8px;padding:16px 20px;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a2e;line-height:1.6;border-left:3px solid #3b4fc4">${inlineFormat(b.content)}</div></td></tr>`;
      default: return "";
    }
  }).filter(Boolean).join("\n");

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px">\n${rows}\n</table>`;
}

/** Label helper */
const Label = ({ children }: { children: React.ReactNode }) => (
  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{children}</label>
);

/** Pill toggle button */
const Pill = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
  >{children}</button>
);

/* ══════════════════════════════════════
   EMAIL TAB — VISUAL BLOCK EDITOR
   ══════════════════════════════════════ */

function EmailTab({ adminPost, users }: { adminPost: (path: string, body?: any) => Promise<any>; users: AdminUser[] }) {
  /* ── Sub-tab navigation ── */
  const [subTab, setSubTab] = useState<EmailSubTab>("editor");

  /* ── Template system ── */
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  /* ── Block editor state ── */
  const [blocks, setBlocks] = useState<EmailBlock[]>([createBlock("heading"), createBlock("text"), createBlock("button")]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [subject, setSubject] = useState("Votre sujet ici");

  /* ── Send state ── */
  const [sendMode, setSendMode] = useState<"single" | "broadcast" | "list">("single");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  /* ── Variables ── */
  const [variables, setVariables] = useState<Record<string, string>>({ name: "Prénom", plan: "Starter", credits: "500", ctaUrl: "https://ora-studio.app/hub", ctaText: "Découvrir" });
  const [showVarDropdown, setShowVarDropdown] = useState(false);

  /* ── A/B testing ── */
  const [abTestEnabled, setAbTestEnabled] = useState(false);
  const [subjectB, setSubjectB] = useState("");

  /* ── Scheduling ── */
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  /* ── Lists ── */
  const [lists, setLists] = useState<EmailList[]>([
    { id: "smart-new", name: "Nouveaux inscrits", description: "Inscrits il y a moins de 7 jours", filter: { type: "smart", value: "new_7d" }, userIds: [] },
    { id: "smart-inactive", name: "Inactifs", description: "Dernière connexion > 30 jours", filter: { type: "smart", value: "inactive_30d" }, userIds: [] },
    { id: "smart-free", name: "Plan Free", description: "Utilisateurs sur le plan Free", filter: { type: "plan", value: "free" }, userIds: [] },
    { id: "smart-starter", name: "Plan Starter", description: "Utilisateurs sur le plan Starter", filter: { type: "plan", value: "starter" }, userIds: [] },
    { id: "smart-pro", name: "Plan Pro", description: "Utilisateurs sur le plan Pro", filter: { type: "plan", value: "generate" }, userIds: [] },
  ]);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");

  /* ── Scheduled emails ── */
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);

  /* ── Stats ── */
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 1247,
    openRate: 42.3,
    clickRate: 8.7,
    campaigns: [
      { name: "Bienvenue", sent: 523, opened: 312, clicked: 67, date: "2026-03-28" },
      { name: "Nouveautés Mars", sent: 421, opened: 189, clicked: 42, date: "2026-03-15" },
      { name: "Offre spéciale", sent: 303, opened: 156, clicked: 51, date: "2026-03-01" },
    ],
  });

  /* ── Preview ── */
  const previewRef = useRef<HTMLIFrameElement>(null);

  /* ── Smart list user counts ── */
  const smartListCounts = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return {
      new_7d: users.filter(u => u.createdAt && (now - new Date(u.createdAt).getTime()) < sevenDays).length,
      inactive_30d: users.filter(u => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime()) > thirtyDays).length,
      free: users.filter(u => u.plan === "free").length,
      starter: users.filter(u => u.plan === "starter").length,
      generate: users.filter(u => u.plan === "generate").length,
    };
  }, [users]);

  /* ── Load templates from API ── */
  useEffect(() => {
    adminPost("/admin/email/templates")
      .then((data) => {
        if (data.success && data.templates) {
          setTemplates(data.templates);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingTemplates(false));
  }, []);

  /* ── Live preview HTML ── */
  const previewHtml = useMemo(() => {
    const bodyHtml = blocksToHtml(blocks);
    const rendered = renderClientTemplate(bodyHtml, variables);
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{margin:0;padding:20px;background:#f4f4f6;font-family:'Inter',sans-serif;}</style></head><body>${rendered}</body></html>`;
  }, [blocks, variables]);

  /* ── Block manipulation helpers ── */
  const addBlock = (type: EmailBlockType) => {
    setBlocks(prev => [...prev, createBlock(type)]);
  };

  const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } as EmailBlock : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (editingBlockId === id) setEditingBlockId(null);
  };

  const duplicateBlock = (id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const clone = { ...prev[idx], id: uid() } as EmailBlock;
      const next = [...prev];
      next.splice(idx + 1, 0, clone);
      return next;
    });
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  /* ── Template loading: convert HTML template to blocks ── */
  const loadTemplate = (id: string) => {
    const t = templates[id];
    if (!t) return;
    setSelectedTemplateId(id);
    setSubject(t.subject);
    // Since existing templates are raw HTML, we put the whole thing in a single text block
    // but also keep the raw reference for sending
    setBlocks([
      { id: uid(), type: "heading", level: "h1", content: t.name } as HeadingBlock,
      { id: uid(), type: "text", content: "Template chargé. Modifiez les blocs ci-dessous." } as TextBlock,
    ]);
    const defaultVars: Record<string, string> = {};
    for (const v of t.variables) {
      defaultVars[v] = v === "name" ? "Prénom" : v === "plan" ? "Starter" : v === "credits" ? "500" : v === "remaining" ? "15" : v === "ctaUrl" ? "https://ora-studio.app/hub" : v === "ctaText" ? "Découvrir" : "";
    }
    setVariables(prev => ({ ...prev, ...defaultVars }));
  };

  /* ── Save template from blocks ── */
  const handleSaveTemplate = async () => {
    const html = blocksToHtml(blocks);
    const name = selectedTemplateId && templates[selectedTemplateId] ? templates[selectedTemplateId].name : "Custom template";
    const templateId = selectedTemplateId || `custom-${uid()}`;
    const templateVars = AVAILABLE_VARIABLES.filter(v => subject.includes(`{{${v}}}`) || html.includes(`{{${v}}}`));
    const updated = {
      ...templates,
      [templateId]: { name, subject, html, variables: templateVars },
    };
    try {
      const res = await adminPost("/admin/email/templates/save", { templates: updated });
      if (res.success) {
        setTemplates(updated);
        setSelectedTemplateId(templateId);
      }
    } catch (err) { console.error(err); }
  };

  /* ── Send email ── */
  const handleSend = async () => {
    setSending(true);
    setResult(null);
    const html = blocksToHtml(blocks);
    const renderedSubject = renderClientTemplate(subject, variables);

    try {
      if (scheduleMode === "later" && scheduleDate) {
        // Store scheduled email
        const scheduled: ScheduledEmail = {
          id: uid(),
          subject: renderedSubject,
          scheduledAt: `${scheduleDate}T${scheduleTime}:00`,
          status: "pending",
          recipientCount: sendMode === "single" ? recipientEmail.split(",").filter(Boolean).length : users.filter(u => u.role !== "admin").length,
        };
        setScheduledEmails(prev => [...prev, scheduled]);
        // Store in KV
        await adminPost("/admin/email/schedule", {
          ...scheduled,
          html,
          variables,
          sendMode,
          recipientEmail: sendMode === "single" ? recipientEmail : undefined,
          planFilter: sendMode === "broadcast" ? planFilter || undefined : undefined,
          listId: sendMode === "list" ? selectedListId : undefined,
          abTest: abTestEnabled ? { subjectA: renderedSubject, subjectB: renderClientTemplate(subjectB, variables) } : undefined,
        }).catch(() => { /* KV endpoint may not exist yet */ });
        setResult({ sent: 0, failed: 0 });
        setSending(false);
        return;
      }

      if (sendMode === "single") {
        if (!recipientEmail.trim()) { setSending(false); return; }
        const emails = recipientEmail.split(",").map(e => e.trim()).filter(Boolean);

        if (abTestEnabled && emails.length >= 2) {
          const midpoint = Math.ceil(emails.length / 2);
          const groupA = emails.slice(0, midpoint);
          const groupB = emails.slice(midpoint);
          const [resA, resB] = await Promise.all([
            adminPost("/admin/email/send", { recipients: groupA, variables, subject: renderedSubject, html }),
            adminPost("/admin/email/send", { recipients: groupB, variables, subject: renderClientTemplate(subjectB, variables), html }),
          ]);
          setResult({ sent: (resA.sent || 0) + (resB.sent || 0), failed: (resA.failed || 0) + (resB.failed || 0) });
        } else {
          const res = await adminPost("/admin/email/send", {
            recipients: emails,
            variables,
            subject: renderedSubject,
            html,
          });
          if (res.success) setResult({ sent: res.sent, failed: res.failed });
        }
      } else if (sendMode === "broadcast") {
        const res = await adminPost("/admin/email/send-all", {
          variables,
          planFilter: planFilter || undefined,
          subject: renderedSubject,
          html,
          abTest: abTestEnabled ? { subjectA: renderedSubject, subjectB: renderClientTemplate(subjectB, variables) } : undefined,
        });
        if (res.success) setResult({ sent: res.sent, failed: res.failed });
      } else if (sendMode === "list" && selectedListId) {
        const list = lists.find(l => l.id === selectedListId);
        if (!list) { setSending(false); return; }
        // Resolve users from list filter
        let listEmails: string[] = [];
        if (list.filter.type === "plan") {
          listEmails = users.filter(u => u.plan === list.filter.value && u.role !== "admin").map(u => u.email);
        } else if (list.filter.type === "smart") {
          const now = Date.now();
          if (list.filter.value === "new_7d") {
            listEmails = users.filter(u => u.createdAt && (now - new Date(u.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000).map(u => u.email);
          } else if (list.filter.value === "inactive_30d") {
            listEmails = users.filter(u => u.lastLoginAt && (now - new Date(u.lastLoginAt).getTime()) > 30 * 24 * 60 * 60 * 1000).map(u => u.email);
          }
        } else if (list.filter.type === "manual") {
          listEmails = users.filter(u => list.userIds.includes(u.userId)).map(u => u.email);
        }
        if (listEmails.length === 0) { setSending(false); return; }
        const res = await adminPost("/admin/email/send", {
          recipients: listEmails,
          variables,
          subject: renderedSubject,
          html,
        });
        if (res.success) setResult({ sent: res.sent, failed: res.failed });
      }
    } catch (err) { console.error(err); }
    setSending(false);
  };

  /* ── Add list ── */
  const addList = () => {
    if (!newListName.trim()) return;
    setLists(prev => [...prev, {
      id: uid(),
      name: newListName,
      description: newListDesc,
      filter: { type: "manual", value: "" },
      userIds: [],
    }]);
    setNewListName("");
    setNewListDesc("");
  };

  /* ── Loading ── */
  if (loadingTemplates) return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;

  /* ═══════════════════════════════════
     RENDER
     ═══════════════════════════════════ */
  return (
    <div className="space-y-5">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {([
          { id: "editor" as const, label: "Editeur", icon: Edit3 },
          { id: "lists" as const, label: "Listes", icon: ListFilter },
          { id: "scheduled" as const, label: "Programmés", icon: Calendar },
          { id: "stats" as const, label: "Statistiques", icon: BarChart3 },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors cursor-pointer ${subTab === id ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"}`}
            style={{ fontSize: "12px", fontWeight: 500 }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ════════ EDITOR SUB-TAB ════════ */}
      {subTab === "editor" && (
        <>
          {/* Template selector pills */}
          <div>
            <Label>Templates</Label>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <button
                onClick={() => { setSelectedTemplateId(null); setBlocks([createBlock("heading"), createBlock("text"), createBlock("button")]); setSubject("Votre sujet ici"); }}
                className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors ${!selectedTemplateId ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                <Plus size={11} className="inline mr-1" style={{ verticalAlign: "-1px" }} />Nouveau
              </button>
              {Object.entries(templates).map(([id, t]) => (
                <button
                  key={id}
                  onClick={() => loadTemplate(id)}
                  className={`px-3 py-1.5 rounded-full border text-xs cursor-pointer transition-colors ${selectedTemplateId === id ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutTemplate size={11} className="inline mr-1" style={{ verticalAlign: "-1px" }} />{t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subject line + A/B test */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label>{abTestEnabled ? "Objet (Variante A)" : "Objet"}</Label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  style={{ fontSize: "13px" }}
                  placeholder="Objet de l'email..."
                />
              </div>
              <div className="pt-4">
                <Pill active={abTestEnabled} onClick={() => setAbTestEnabled(!abTestEnabled)}>
                  <FlaskConical size={11} className="inline mr-1" style={{ verticalAlign: "-1px" }} />A/B Test
                </Pill>
              </div>
            </div>
            {abTestEnabled && (
              <div>
                <Label>Objet (Variante B)</Label>
                <input
                  value={subjectB}
                  onChange={(e) => setSubjectB(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                  style={{ fontSize: "13px" }}
                  placeholder="Variante B de l'objet..."
                />
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 4 }}>
                  Les destinataires seront divisés 50/50 entre les deux variantes.
                </p>
              </div>
            )}
          </div>

          {/* Main editor layout: left palette+blocks / right preview+send */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
            {/* ── LEFT: Block palette + Block list ── */}
            <div className="space-y-4">
              {/* Block palette */}
              <div>
                <Label>Ajouter un bloc</Label>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {BLOCK_PALETTE.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => addBlock(type)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                      style={{ fontSize: "11px", fontWeight: 500 }}
                    >
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Variable insert dropdown */}
              <div className="relative inline-block">
                <button
                  onClick={() => setShowVarDropdown(!showVarDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  style={{ fontSize: "11px", fontWeight: 500 }}
                >
                  <Variable size={12} /> Insérer une variable
                  <ChevronDown size={10} />
                </button>
                {showVarDropdown && (
                  <div
                    className="absolute top-full left-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-50 py-1"
                    style={{ minWidth: 180 }}
                    onMouseLeave={() => setShowVarDropdown(false)}
                  >
                    {AVAILABLE_VARIABLES.map(v => (
                      <button
                        key={v}
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${v}}}`);
                          setShowVarDropdown(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-secondary transition-colors cursor-pointer"
                        style={{ fontSize: "12px", color: "var(--foreground)" }}
                      >
                        <code style={{ fontSize: "11px", color: "var(--ora-signal)", background: "var(--ora-signal-light)", padding: "1px 6px", borderRadius: 4 }}>{`{{${v}}}`}</code>
                        <span style={{ marginLeft: 8, fontSize: "11px", color: "var(--muted-foreground)" }}>copier</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Block list */}
              <div className="space-y-2">
                {blocks.length === 0 && (
                  <div className="text-center py-12 rounded-xl border border-dashed border-border">
                    <AlignLeft size={24} className="mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                    <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Ajoutez des blocs pour construire votre email</p>
                  </div>
                )}
                {blocks.map((block, idx) => (
                  <div
                    key={block.id}
                    className={`rounded-xl border transition-colors ${editingBlockId === block.id ? "border-foreground/30 bg-secondary/50" : "border-border hover:border-foreground/15"}`}
                    style={{ position: "relative" }}
                  >
                    {/* Block toolbar */}
                    <div className="flex items-center gap-1 px-3 py-2 border-b border-border/50">
                      <GripVertical size={12} style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", flex: 1, marginLeft: 4 }}>
                        {BLOCK_PALETTE.find(p => p.type === block.type)?.label || block.type}
                      </span>
                      <button onClick={() => moveBlock(block.id, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-secondary transition-colors cursor-pointer disabled:opacity-30" title="Monter"><MoveUp size={12} style={{ color: "var(--muted-foreground)" }} /></button>
                      <button onClick={() => moveBlock(block.id, 1)} disabled={idx === blocks.length - 1} className="p-1 rounded hover:bg-secondary transition-colors cursor-pointer disabled:opacity-30" title="Descendre"><MoveDown size={12} style={{ color: "var(--muted-foreground)" }} /></button>
                      <button onClick={() => duplicateBlock(block.id)} className="p-1 rounded hover:bg-secondary transition-colors cursor-pointer" title="Dupliquer"><Copy size={12} style={{ color: "var(--muted-foreground)" }} /></button>
                      <button onClick={() => removeBlock(block.id)} className="p-1 rounded hover:bg-red-50 transition-colors cursor-pointer" title="Supprimer"><Trash2 size={12} style={{ color: "var(--destructive)" }} /></button>
                    </div>

                    {/* Block content / editor */}
                    <div
                      className="px-3 py-3 cursor-pointer"
                      onClick={() => setEditingBlockId(editingBlockId === block.id ? null : block.id)}
                    >
                      {/* ── HEADING ── */}
                      {block.type === "heading" && (
                        editingBlockId === block.id ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <Pill active={(block as HeadingBlock).level === "h1"} onClick={() => updateBlock(block.id, { level: "h1" })}>H1</Pill>
                              <Pill active={(block as HeadingBlock).level === "h2"} onClick={() => updateBlock(block.id, { level: "h2" })}>H2</Pill>
                            </div>
                            <input
                              value={(block as HeadingBlock).content}
                              onChange={e => updateBlock(block.id, { content: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                              style={{ fontSize: "14px", fontWeight: 700 }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <p style={{ fontSize: (block as HeadingBlock).level === "h1" ? "20px" : "16px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
                            {(block as HeadingBlock).content || "Titre..."}
                          </p>
                        )
                      )}

                      {/* ── TEXT ── */}
                      {block.type === "text" && (
                        editingBlockId === block.id ? (
                          <div onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1 mb-2">
                              <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Format :</span>
                              <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontFamily: "monospace" }}>**gras** *italique* [lien](url)</span>
                            </div>
                            <textarea
                              value={(block as TextBlock).content}
                              onChange={e => updateBlock(block.id, { content: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                              style={{ fontSize: "13px", minHeight: 80, resize: "vertical" }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <p style={{ fontSize: "13px", color: "var(--foreground)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {(block as TextBlock).content || "Texte..."}
                          </p>
                        )
                      )}

                      {/* ── IMAGE ── */}
                      {block.type === "image" && (
                        editingBlockId === block.id ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <input
                              value={(block as ImageBlock).src}
                              onChange={e => updateBlock(block.id, { src: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                              style={{ fontSize: "12px" }}
                              placeholder="URL de l'image..."
                              autoFocus
                            />
                            <input
                              value={(block as ImageBlock).alt}
                              onChange={e => updateBlock(block.id, { alt: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                              style={{ fontSize: "12px" }}
                              placeholder="Texte alternatif..."
                            />
                          </div>
                        ) : (
                          (block as ImageBlock).src ? (
                            <img src={(block as ImageBlock).src} alt={(block as ImageBlock).alt} style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, objectFit: "cover" }} />
                          ) : (
                            <div className="flex items-center justify-center py-6 rounded-lg border border-dashed border-border">
                              <Image size={20} style={{ color: "var(--muted-foreground)" }} />
                              <span style={{ fontSize: "12px", color: "var(--muted-foreground)", marginLeft: 8 }}>Cliquez pour ajouter une image</span>
                            </div>
                          )
                        )
                      )}

                      {/* ── BUTTON ── */}
                      {block.type === "button" && (
                        editingBlockId === block.id ? (
                          <div className="space-y-2" onClick={e => e.stopPropagation()}>
                            <input
                              value={(block as ButtonBlock).text}
                              onChange={e => updateBlock(block.id, { text: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                              style={{ fontSize: "12px" }}
                              placeholder="Texte du bouton..."
                              autoFocus
                            />
                            <input
                              value={(block as ButtonBlock).url}
                              onChange={e => updateBlock(block.id, { url: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                              style={{ fontSize: "12px" }}
                              placeholder="URL du bouton..."
                            />
                            <div className="flex items-center gap-2">
                              <Pill active={(block as ButtonBlock).style === "filled"} onClick={() => updateBlock(block.id, { style: "filled" })}>Rempli</Pill>
                              <Pill active={(block as ButtonBlock).style === "outline"} onClick={() => updateBlock(block.id, { style: "outline" })}>Contour</Pill>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "8px 20px",
                                borderRadius: 999,
                                fontSize: "13px",
                                fontWeight: 600,
                                background: (block as ButtonBlock).style === "filled" ? "var(--foreground)" : "transparent",
                                color: (block as ButtonBlock).style === "filled" ? "var(--background)" : "var(--foreground)",
                                border: "2px solid var(--foreground)",
                              }}
                            >
                              {(block as ButtonBlock).text || "Bouton"}
                            </span>
                          </div>
                        )
                      )}

                      {/* ── DIVIDER ── */}
                      {block.type === "divider" && (
                        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />
                      )}

                      {/* ── COLUMNS ── */}
                      {block.type === "columns" && (
                        editingBlockId === block.id ? (
                          <div className="grid grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
                            <div>
                              <Label>Gauche</Label>
                              <textarea
                                value={(block as ColumnsBlock).left}
                                onChange={e => updateBlock(block.id, { left: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                                style={{ fontSize: "12px", minHeight: 60, resize: "vertical" }}
                                autoFocus
                              />
                            </div>
                            <div>
                              <Label>Droite</Label>
                              <textarea
                                value={(block as ColumnsBlock).right}
                                onChange={e => updateBlock(block.id, { right: e.target.value })}
                                className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                                style={{ fontSize: "12px", minHeight: 60, resize: "vertical" }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <p style={{ fontSize: "12px", color: "var(--foreground)", margin: 0 }}>{(block as ColumnsBlock).left || "Gauche..."}</p>
                            <p style={{ fontSize: "12px", color: "var(--foreground)", margin: 0 }}>{(block as ColumnsBlock).right || "Droite..."}</p>
                          </div>
                        )
                      )}

                      {/* ── HIGHLIGHT ── */}
                      {block.type === "highlight" && (
                        editingBlockId === block.id ? (
                          <div onClick={e => e.stopPropagation()}>
                            <textarea
                              value={(block as HighlightBlock).content}
                              onChange={e => updateBlock(block.id, { content: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                              style={{ fontSize: "12px", minHeight: 60, resize: "vertical" }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div style={{ background: "var(--secondary)", borderRadius: 8, padding: "10px 14px", borderLeft: "3px solid var(--ora-signal)", fontSize: "13px", color: "var(--foreground)", lineHeight: 1.6 }}>
                            {(block as HighlightBlock).content || "Highlight..."}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Save button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveTemplate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                >
                  <Save size={13} /> Sauvegarder le template
                </button>
              </div>
            </div>

            {/* ── RIGHT: Preview + Send controls ── */}
            <div className="space-y-4">
              {/* Live preview */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center gap-2" style={{ background: "var(--secondary)" }}>
                  <Eye size={12} style={{ color: "var(--muted-foreground)" }} />
                  <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)" }}>Aperçu en direct</span>
                </div>
                <iframe
                  ref={previewRef}
                  srcDoc={previewHtml}
                  className="w-full border-0"
                  style={{ height: 420, background: "#f4f4f6" }}
                  sandbox="allow-same-origin"
                  title="Email preview"
                />
              </div>

              {/* Variables quick edit */}
              <div className="rounded-xl border border-border p-3 space-y-2">
                <Label>Variables de prévisualisation</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(variables).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2">
                      <code style={{ fontSize: "10px", color: "var(--ora-signal)", minWidth: 60 }}>{`{{${k}}}`}</code>
                      <input
                        value={v}
                        onChange={e => setVariables(prev => ({ ...prev, [k]: e.target.value }))}
                        className="flex-1 px-2 py-1 rounded-md border border-border bg-background text-foreground"
                        style={{ fontSize: "11px" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Scheduling toggle */}
              <div className="rounded-xl border border-border p-3 space-y-2">
                <Label>Programmation</Label>
                <div className="flex items-center gap-2">
                  <Pill active={scheduleMode === "now"} onClick={() => setScheduleMode("now")}>Envoyer maintenant</Pill>
                  <Pill active={scheduleMode === "later"} onClick={() => setScheduleMode("later")}>
                    <Calendar size={11} className="inline mr-1" style={{ verticalAlign: "-1px" }} />Programmer
                  </Pill>
                </div>
                {scheduleMode === "later" && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      className="px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                      style={{ fontSize: "12px" }}
                    />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="px-2 py-1.5 rounded-md border border-border bg-background text-foreground"
                      style={{ fontSize: "12px" }}
                    />
                  </div>
                )}
              </div>

              {/* Send controls */}
              <div className="rounded-xl border border-border p-4 space-y-3" style={{ background: "var(--secondary)" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>Envoyer</p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Pill active={sendMode === "single"} onClick={() => setSendMode("single")}>Email(s) ciblé(s)</Pill>
                  <Pill active={sendMode === "broadcast"} onClick={() => setSendMode("broadcast")}>Broadcast</Pill>
                  <Pill active={sendMode === "list"} onClick={() => setSendMode("list")}>Liste</Pill>
                </div>

                {sendMode === "single" && (
                  <input
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                    style={{ fontSize: "12px" }}
                    placeholder="email@exemple.com (virgules pour multiples)"
                  />
                )}

                {sendMode === "broadcast" && (
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Plan :</span>
                    <select
                      value={planFilter}
                      onChange={e => setPlanFilter(e.target.value)}
                      className="px-2 py-1.5 rounded-md border border-border bg-background text-foreground cursor-pointer"
                      style={{ fontSize: "12px" }}
                    >
                      <option value="">Tous les plans</option>
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="generate">Pro</option>
                      <option value="studio">Business</option>
                    </select>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      ({users.filter(u => !planFilter || u.plan === planFilter).filter(u => u.role !== "admin").length} dest.)
                    </span>
                  </div>
                )}

                {sendMode === "list" && (
                  <select
                    value={selectedListId || ""}
                    onChange={e => setSelectedListId(e.target.value || null)}
                    className="w-full px-2 py-1.5 rounded-md border border-border bg-background text-foreground cursor-pointer"
                    style={{ fontSize: "12px" }}
                  >
                    <option value="">Sélectionner une liste...</option>
                    {lists.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.filter.type === "plan" ? (smartListCounts as any)[l.filter.value] || 0 : l.filter.type === "smart" ? (smartListCounts as any)[l.filter.value] || 0 : l.userIds.length} users)
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-background cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : scheduleMode === "later" ? <Calendar size={14} /> : <Send size={14} />}
                  {sending ? "Envoi en cours..." : scheduleMode === "later" ? "Programmer l'envoi" : sendMode === "single" ? "Envoyer" : sendMode === "broadcast" ? "Envoyer à tous" : "Envoyer à la liste"}
                </button>

                {result && (
                  <div className="flex items-center gap-2 mt-2">
                    <Check size={14} style={{ color: "#22c55e" }} />
                    <span style={{ fontSize: "12px", color: "var(--foreground)" }}>
                      {scheduleMode === "later"
                        ? `Email programmé pour le ${scheduleDate} à ${scheduleTime}`
                        : `${result.sent} envoyé${result.sent > 1 ? "s" : ""}${result.failed > 0 ? ` · ${result.failed} échoué${result.failed > 1 ? "s" : ""}` : ""}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════ LISTS SUB-TAB ════════ */}
      {subTab === "lists" && (
        <div className="space-y-6">
          {/* Create new list */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
              <UserPlus size={14} className="inline mr-2" style={{ verticalAlign: "-2px" }} />
              Créer une liste
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                style={{ fontSize: "12px" }}
                placeholder="Nom de la liste..."
              />
              <input
                value={newListDesc}
                onChange={e => setNewListDesc(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                style={{ fontSize: "12px" }}
                placeholder="Description (optionnel)..."
              />
            </div>
            <button
              onClick={addList}
              disabled={!newListName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-background cursor-pointer disabled:opacity-50"
              style={{ background: "var(--foreground)", fontSize: "12px", fontWeight: 500 }}
            >
              <Plus size={12} /> Créer
            </button>
          </div>

          {/* Smart lists */}
          <div>
            <Label>Listes intelligentes</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {lists.filter(l => l.filter.type === "smart" || l.filter.type === "plan").map(l => {
                const count = (smartListCounts as any)[l.filter.value] || 0;
                return (
                  <div key={l.id} className="rounded-xl border border-border p-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles size={13} style={{ color: "var(--ora-signal)" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{l.name}</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{l.description}</p>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--foreground)", marginTop: 4 }}>
                      {count} utilisateur{count !== 1 ? "s" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual lists */}
          {lists.filter(l => l.filter.type === "manual").length > 0 && (
            <div>
              <Label>Listes manuelles</Label>
              <div className="space-y-2 mt-2">
                {lists.filter(l => l.filter.type === "manual").map(l => (
                  <div key={l.id} className="rounded-xl border border-border p-4 flex items-center justify-between">
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{l.name}</p>
                      {l.description && <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{l.description}</p>}
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 2 }}>{l.userIds.length} membre{l.userIds.length !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                      onClick={() => setLists(prev => prev.filter(x => x.id !== l.id))}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 size={14} style={{ color: "var(--destructive)" }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ SCHEDULED SUB-TAB ════════ */}
      {subTab === "scheduled" && (
        <div className="space-y-4">
          <Label>Emails programmés</Label>
          {scheduledEmails.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <Calendar size={24} className="mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Aucun email programmé</p>
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Utilisez l'éditeur pour programmer un envoi.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledEmails.map(se => (
                <div key={se.id} className="rounded-xl border border-border p-4 flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>{se.subject}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        <Calendar size={10} className="inline mr-1" style={{ verticalAlign: "-1px" }} />
                        {new Date(se.scheduledAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {se.recipientCount} destinataire{se.recipientCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        background: se.status === "pending" ? "var(--ora-signal-light)" : se.status === "sent" ? "rgba(34,197,94,0.1)" : "rgba(212,24,61,0.1)",
                        color: se.status === "pending" ? "var(--ora-signal)" : se.status === "sent" ? "#22c55e" : "var(--destructive)",
                      }}
                    >
                      {se.status === "pending" ? "En attente" : se.status === "sent" ? "Envoyé" : "Annulé"}
                    </span>
                    {se.status === "pending" && (
                      <button
                        onClick={() => setScheduledEmails(prev => prev.map(s => s.id === se.id ? { ...s, status: "cancelled" as const } : s))}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="Annuler"
                      >
                        <X size={13} style={{ color: "var(--destructive)" }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════ STATS SUB-TAB ════════ */}
      {subTab === "stats" && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total envoyés", value: stats.totalSent.toLocaleString(), icon: Send, color: "var(--foreground)" },
              { label: "Taux d'ouverture", value: `${stats.openRate}%`, icon: MailOpen, color: "var(--ora-signal)" },
              { label: "Taux de clic", value: `${stats.clickRate}%`, icon: MousePointer, color: "#22c55e" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color }} />
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
                </div>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Campaign breakdown */}
          <div>
            <Label>Par campagne</Label>
            <div className="rounded-xl border border-border overflow-hidden mt-2">
              <table className="w-full" style={{ fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "var(--secondary)" }}>
                    <th className="text-left px-4 py-2.5" style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Campagne</th>
                    <th className="text-right px-4 py-2.5" style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Envoyés</th>
                    <th className="text-right px-4 py-2.5" style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Ouverts</th>
                    <th className="text-right px-4 py-2.5" style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cliqués</th>
                    <th className="text-right px-4 py-2.5" style={{ fontWeight: 600, color: "var(--muted-foreground)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.campaigns.map((c, i) => (
                    <tr key={i} className="border-t border-border hover:bg-secondary/50 transition-colors">
                      <td className="px-4 py-2.5" style={{ fontWeight: 500, color: "var(--foreground)" }}>{c.name}</td>
                      <td className="text-right px-4 py-2.5" style={{ color: "var(--foreground)" }}>{c.sent}</td>
                      <td className="text-right px-4 py-2.5">
                        <span style={{ color: "var(--ora-signal)" }}>{c.opened}</span>
                        <span style={{ color: "var(--muted-foreground)", marginLeft: 4 }}>({c.sent > 0 ? ((c.opened / c.sent) * 100).toFixed(1) : 0}%)</span>
                      </td>
                      <td className="text-right px-4 py-2.5">
                        <span style={{ color: "#22c55e" }}>{c.clicked}</span>
                        <span style={{ color: "var(--muted-foreground)", marginLeft: 4 }}>({c.sent > 0 ? ((c.clicked / c.sent) * 100).toFixed(1) : 0}%)</span>
                      </td>
                      <td className="text-right px-4 py-2.5" style={{ color: "var(--muted-foreground)" }}>
                        {new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: 8 }}>
              Les statistiques proviennent de /admin/email/stats. Les données ci-dessus sont un aperçu de la structure.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function renderClientTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

/* ─── LOG ENTRY ─── */

function LogEntry({ log, expanded = false }: { log: SystemLog; expanded?: boolean }) {
  const [open, setOpen] = useState(false);
  const typeColors: Record<string, string> = {
    signup: "#666666", generation: "var(--ora-signal)", admin_plan_change: "#999999", error: "var(--destructive)",
  };

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="px-1.5 py-0.5 rounded"
          style={{ fontSize: "10px", fontWeight: 600, color: typeColors[log.type] || "var(--muted-foreground)", background: `${typeColors[log.type] || "var(--muted-foreground)"}12` }}>
          {log.type}
        </span>
        <span style={{ fontSize: "12px", color: "var(--foreground)" }}>
          {log.details?.email || log.details?.userId?.slice(0, 8) || "system"}
        </span>
        {log.details?.type && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>({log.details.type})</span>}
        <span className="flex-1" />
        <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
        </span>
        {expanded && (
          <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground cursor-pointer">
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>
      {open && expanded && (
        <pre className="mt-2 p-2 bg-secondary/50 rounded text-xs overflow-x-auto" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
}
import { Link, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, FolderOpen, Calendar, Palette,
  User, LogOut, Shield, Zap,
} from "lucide-react";
import { OraLogo } from "./OraLogo";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";
import { useState, useRef, useEffect } from "react";

/**
 * AppSidebar — Blaze-inspired micro sidebar
 *   Desktop: ~52px icon-only sidebar, tooltips on hover
 *   Mobile:  bottom tab bar (5 items)
 */

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/hub/library") return pathname.startsWith("/hub/library");
  if (href === "/hub/vault") return pathname.startsWith("/hub/vault");
  if (href === "/hub") return pathname === "/hub";
  return pathname.startsWith(href);
}

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, remainingCredits, plan, isAdmin } = useAuth();
  const { t } = useI18n();
  const [tooltip, setTooltip] = useState<string | null>(null);

  const navItems = [
    { icon: Home, label: t("sidebar.home"), href: "/hub" },
    { icon: Calendar, label: t("sidebar.calendar"), href: "/hub/calendar" },
    { icon: FolderOpen, label: t("sidebar.content"), href: "/hub/library" },
    { icon: Palette, label: t("sidebar.brandKit"), href: "/hub/vault" },
  ];

  const mobileNavItems = [
    { icon: Home, label: t("sidebar.home"), href: "/hub" },
    { icon: Calendar, label: t("sidebar.calendar"), href: "/hub/calendar" },
    { icon: FolderOpen, label: t("sidebar.content"), href: "/hub/library" },
    { icon: Palette, label: t("sidebar.brand"), href: "/hub/vault" },
  ];
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Credit calculations
  const totalCredits = profile?.credits || 50;
  const creditPercent = isAdmin ? 100 : Math.min(100, Math.round((remainingCredits / totalCredits) * 100));
  const creditColor = creditPercent > 30 ? "var(--accent)" : creditPercent > 10 ? "#f59e0b" : "var(--destructive)";
  const showCredits = !isAdmin && plan !== "business";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const userInitial = profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <>
      {/* ═══ DESKTOP MICRO SIDEBAR ═══ */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col items-center py-4"
        style={{
          width: 52,
          background: "#FFFFFF",
          borderRight: "1px solid var(--border)",
        }}
      >
        {/* Logo mark */}
        <Link to="/" className="mb-6 flex items-center justify-center w-full">
          <OraLogo size={22} variant="mark" animate={false} color="var(--text-primary)" />
        </Link>

        {/* Nav icons */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.href, location.pathname);

            return (
              <div key={item.href} className="relative w-full flex justify-center">
                <Link
                  to={item.href}
                  onMouseEnter={() => setTooltip(item.label)}
                  onMouseLeave={() => setTooltip(null)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{
                    background: isActive ? "var(--accent-warm-light)" : "transparent",
                    color: isActive ? "var(--accent)" : "var(--text-tertiary)",
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 1.75 : 1.25} />
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 rounded-r-full"
                      style={{ background: "var(--accent)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
                {/* Tooltip */}
                <AnimatePresence>
                  {tooltip === item.label && (
                    <motion.div
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-[56px] top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-[100]"
                      style={{
                        background: "var(--text-primary)",
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#FFFFFF",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                      }}
                    >
                      {item.label}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Credit counter */}
        {showCredits && (
          <div className="relative mb-3 w-full flex justify-center">
            <button
              onClick={() => navigate("/subscribe")}
              onMouseEnter={() => setTooltip(t("sidebar.credits"))}
              onMouseLeave={() => setTooltip(null)}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 hover:bg-secondary cursor-pointer relative"
              title={`${remainingCredits} ${t("sidebar.credits").toLowerCase()}`}
            >
              <Zap size={16} style={{ color: creditColor }} />
              {/* Mini progress ring */}
              <svg
                className="absolute inset-0"
                viewBox="0 0 36 36"
                style={{ width: 36, height: 36 }}
              >
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="2"
                />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none"
                  stroke={creditColor}
                  strokeWidth="2"
                  strokeDasharray={`${creditPercent * 0.94} 94.2`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                  style={{ transition: "stroke-dasharray 0.5s ease" }}
                />
              </svg>
            </button>
            <AnimatePresence>
              {tooltip === t("sidebar.credits") && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-[56px] top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg whitespace-nowrap pointer-events-none z-[100]"
                  style={{
                    background: "var(--text-primary)",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#FFFFFF",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  {remainingCredits} {t("sidebar.credits").toLowerCase()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Bottom -- avatar */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105"
            style={{
              background: "var(--accent)",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            {userInitial}
          </button>
          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-[56px] bottom-0 w-44 rounded-xl py-1.5 z-[100]"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                }}
              >
                <Link
                  to="/profile"
                  onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                  style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <User size={14} /> {t("sidebar.profile")}
                </Link>
                {profile?.role === "admin" && (
                  <Link
                    to="/admin"
                    onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 transition-colors"
                    style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Shield size={14} /> {t("sidebar.admin")}
                  </Link>
                )}
                <button
                  onClick={async () => { setAvatarOpen(false); await signOut(); }}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors w-full text-left"
                  style={{ fontSize: "13px", fontWeight: 500, color: "var(--destructive)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={14} /> {t("sidebar.signOut")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around"
        style={{
          height: 64,
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavActive(item.href, location.pathname);

          return (
            <Link
              key={item.href}
              to={item.href}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors"
              style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)" }}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                    style={{ background: "var(--accent)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span style={{
                fontSize: "10px",
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.01em",
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

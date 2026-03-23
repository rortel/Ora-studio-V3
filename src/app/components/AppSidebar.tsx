import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, FolderOpen, Palette, BarChart3, Calendar,
  User, LogOut, Shield, Package, Menu, X,
} from "lucide-react";
import { OraLogo } from "./OraLogo";
import { useAuth } from "../lib/auth-context";
import { useState, useRef, useEffect } from "react";

/**
 * AppSidebar — Desktop >=1024: expanded with labels (180px)
 *              Tablet 768-1023: collapsed icon-only (56px), expandable on hover
 *              Mobile <768: bottom tab bar
 *
 * Navigation: CREATE / MANAGE / MEASURE
 */

const navSections = [
  {
    label: "CREATE",
    items: [
      { icon: Sparkles, label: "Studio", href: "/hub" },
      { icon: FolderOpen, label: "My Content", href: "/hub/library" },
    ],
  },
  {
    label: "MANAGE",
    items: [
      { icon: Palette, label: "Brand", href: "/hub/vault" },
      { icon: Package, label: "Products", href: "/hub/vault/products" },
      { icon: Calendar, label: "Calendar", href: "/hub/calendar" },
    ],
  },
  {
    label: "MEASURE",
    items: [
      { icon: BarChart3, label: "Analytics", href: "/hub/analytics" },
    ],
  },
];

const mobileNavItems = [
  { icon: Sparkles, label: "Studio", href: "/hub" },
  { icon: FolderOpen, label: "Content", href: "/hub/library" },
  { icon: Palette, label: "Brand", href: "/hub/vault" },
  { icon: Calendar, label: "Calendar", href: "/hub/calendar" },
  { icon: BarChart3, label: "Stats", href: "/hub/analytics" },
];

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/hub") return pathname === "/hub";
  if (href === "/hub/vault") return pathname === "/hub/vault";
  if (href === "/hub/vault/products") return pathname === "/hub/vault/products";
  return pathname.startsWith(href);
}

export function AppSidebar() {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const userInitial = profile?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";
  const displayName = profile?.displayName || user?.email?.split("@")[0] || "User";

  // Desktop expanded = always on lg+, on hover for md
  const expanded = hovered;

  return (
    <>
      {/* ═══ DESKTOP/TABLET SIDEBAR ═══ */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setAvatarOpen(false); }}
        className="fixed left-0 top-0 bottom-0 z-50 hidden md:flex flex-col transition-all duration-200 ease-out"
        style={{
          width: expanded ? 200 : 56,
          background: "#141316",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 px-4 h-14 flex-shrink-0 overflow-hidden">
          <OraLogo size={20} variant="mark" animate={false} color="#E8E4DF" />
          <span
            className="transition-opacity duration-200 whitespace-nowrap"
            style={{
              fontSize: "15px", fontWeight: 700, color: "#E8E4DF", letterSpacing: "-0.03em",
              opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0,
            }}
          >
            ORA
          </span>
        </Link>

        {/* Nav sections */}
        <nav className="flex-1 flex flex-col gap-4 px-2 pt-2 overflow-y-auto overflow-x-hidden">
          {navSections.map((section) => (
            <div key={section.label}>
              {/* Section label — only when expanded */}
              <div className="px-2 mb-1 overflow-hidden" style={{ height: expanded ? 16 : 0, transition: "height 200ms" }}>
                <span style={{
                  fontSize: "9px", fontWeight: 600, color: "#5C5856",
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  opacity: expanded ? 1 : 0, transition: "opacity 200ms",
                }}>
                  {section.label}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavActive(item.href, location.pathname);
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="relative flex items-center gap-2.5 rounded-xl transition-all overflow-hidden"
                      style={{
                        padding: expanded ? "8px 10px" : "8px 0",
                        justifyContent: expanded ? "flex-start" : "center",
                        background: isActive ? "var(--ora-signal-light)" : "transparent",
                        color: isActive ? "var(--ora-signal)" : "#8A8580",
                      }}
                      title={expanded ? undefined : item.label}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
                      <span
                        className="whitespace-nowrap transition-opacity duration-150"
                        style={{
                          fontSize: "13px",
                          fontWeight: isActive ? 600 : 450,
                          letterSpacing: "-0.01em",
                          opacity: expanded ? 1 : 0,
                          width: expanded ? "auto" : 0,
                          overflow: "hidden",
                        }}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-indicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r"
                          style={{ width: 3, height: 18, background: "var(--ora-signal)" }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom — user */}
        <div className="px-2 pb-3 pt-2 flex-shrink-0" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-full flex items-center gap-2.5 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.04] overflow-hidden"
            style={{ padding: expanded ? "8px 10px" : "8px 0", justifyContent: expanded ? "flex-start" : "center" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--ora-signal) 0%, #D4956B 100%)",
                color: "#fff", fontSize: "12px", fontWeight: 700,
              }}
            >
              {userInitial}
            </div>
            <span
              className="truncate whitespace-nowrap transition-opacity duration-150"
              style={{ fontSize: "12px", fontWeight: 450, color: "#9A9590", opacity: expanded ? 1 : 0, width: expanded ? "auto" : 0 }}
            >
              {displayName}
            </span>
          </button>

          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-2 right-2 bottom-[52px] rounded-xl py-1.5 z-[100]"
                style={{
                  background: "#232228",
                  border: "1px solid rgba(255,255,255,0.10)",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
                }}
              >
                <Link to="/profile" onClick={() => setAvatarOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                  style={{ fontSize: "13px", fontWeight: 500, color: "#E8E4DF" }}>
                  <User size={14} /> Profile
                </Link>
                {profile?.role === "admin" && (
                  <Link to="/admin" onClick={() => setAvatarOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                    style={{ fontSize: "13px", fontWeight: 500, color: "#E8E4DF" }}>
                    <Shield size={14} /> Admin
                  </Link>
                )}
                <button
                  onClick={async () => { setAvatarOpen(false); await signOut(); }}
                  className="flex items-center gap-2.5 px-4 py-2.5 transition-colors w-full text-left hover:bg-white/[0.04]"
                  style={{ fontSize: "13px", fontWeight: 500, color: "#C45B4A" }}>
                  <LogOut size={14} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-stretch justify-around"
        style={{
          height: 64,
          background: "rgba(19,18,17,0.95)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
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
              className="flex flex-col items-center justify-center gap-1 flex-1 transition-colors"
              style={{ color: isActive ? "var(--ora-signal)" : "#5C5856", minHeight: 44 }}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.5} />
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full"
                    style={{ background: "var(--ora-signal)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span style={{
                fontSize: "10px",
                fontWeight: isActive ? 650 : 400,
                letterSpacing: "0.01em",
                color: isActive ? "var(--ora-signal)" : "#5C5856",
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

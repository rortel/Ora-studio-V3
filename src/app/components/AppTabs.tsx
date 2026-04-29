import { Link, useLocation } from "react-router";
import { Sparkles, FolderOpen, Wand2, BookOpen, Zap } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { COLORS } from "./ora/tokens";

const INK   = COLORS.ink;
const MUTED = COLORS.muted;
const LINE  = COLORS.line;
const BG    = COLORS.cream;

type TabId = "surprise" | "library" | "edit" | "vault";

const TABS: Array<{ id: TabId; label: string; href: string; icon: React.ReactNode }> = [
  { id: "surprise", label: "Surprise Me", href: "/hub/surprise", icon: <Sparkles size={14} /> },
  { id: "library",  label: "Library",     href: "/hub/library",  icon: <FolderOpen size={14} /> },
  { id: "edit",     label: "Edit",        href: "/hub/editor",   icon: <Wand2 size={14} /> },
  { id: "vault",    label: "Vault",       href: "/hub/vault",    icon: <BookOpen size={14} /> },
];

/**
 * Shared top bar for the 3 core app tabs. Renders a sticky header with the
 * Ora logo on the left and the 3-tab segmented control centred. The current
 * tab is highlighted based on the URL — or can be forced via the prop.
 * On the right: a discrete credits pill (remaining / link to pricing).
 */
export function AppTabs({ active }: { active?: TabId }) {
  const location = useLocation();
  const { remainingCredits, profile } = useAuth();
  const activeId: TabId = active
    ?? (location.pathname.startsWith("/hub/library") ? "library"
      : location.pathname.startsWith("/hub/editor")  ? "edit"
      : location.pathname.startsWith("/hub/vault")   ? "vault"
      : "surprise");
  const planLabel = (() => {
    const p = String(profile?.plan || "").toLowerCase();
    if (p === "studio"  || p === "pro")      return "Studio";
    if (p === "agency"  || p === "business") return "Agency";
    if (p === "creator" || p === "starter")  return "Creator";
    return "—";
  })();
  const credits = typeof remainingCredits === "number" ? remainingCredits : 0;
  const lowOrEmpty = credits <= 5;
  // On the landing page (root URL) the navbar floats OVER the hero video
  // (position: fixed, transparent bg, no border). Inside the app (/hub/...)
  // it stays in normal flow with a tinted blurred backdrop for legibility
  // against scrolling content.
  const isLanding = location.pathname === "/" || location.pathname === "";
  const headerBg = isLanding ? "transparent" : `${BG}CC`;
  const headerBorder = isLanding ? "1px solid transparent" : `1px solid ${LINE}`;
  const headerBlur = isLanding ? "none" : "blur(18px) saturate(180%)";
  const headerPosClass = isLanding
    ? "fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-5 md:px-8 h-14"
    : "sticky top-0 z-30 flex items-center justify-between px-5 md:px-8 h-14";

  return (
    <header
      className={headerPosClass}
      style={{ background: headerBg, backdropFilter: headerBlur, borderBottom: headerBorder }}
    >
      <Link to="/" className="flex items-center" aria-label="Ora">
        <span className="text-[22px]" style={{ fontFamily: `"Bagel Fat One", "Inter", system-ui, sans-serif`, letterSpacing: "-0.01em" }}>Ora</span>
      </Link>

      <nav
        className="flex items-center p-1 rounded-full"
        style={{ background: "#fff", border: `1px solid ${LINE}` }}
        aria-label="App tabs"
      >
        {TABS.map((t) => {
          const on = t.id === activeId;
          return (
            <Link
              key={t.id}
              to={t.href}
              className="inline-flex items-center gap-1.5 px-3 md:px-4 h-8 rounded-full text-[13px] transition"
              style={{
                background: on ? INK : "transparent",
                color: on ? "#fff" : INK,
                fontWeight: on ? 600 : 500,
              }}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        {/* Credits pill */}
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] transition"
          style={{
            background: lowOrEmpty ? COLORS.coral : "#fff",
            color: lowOrEmpty ? "#fff" : INK,
            border: `1px solid ${lowOrEmpty ? COLORS.coral : LINE}`,
            fontWeight: 600,
          }}
          title={lowOrEmpty ? "Running low — upgrade your plan" : `You have ${credits} assets left on ${planLabel}`}
        >
          <Zap size={12} />
          <span>{credits}</span>
          <span className="hidden md:inline" style={{ opacity: 0.7 }}>· {planLabel}</span>
        </Link>
        <Link to="/profile" className="hidden md:inline-flex text-[12.5px] hover:text-black transition" style={{ color: MUTED }}>Account</Link>
      </div>
    </header>
  );
}

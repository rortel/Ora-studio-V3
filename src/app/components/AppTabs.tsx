import { Link, useLocation } from "react-router";
import { Sparkles, FolderOpen, Wand2 } from "lucide-react";
import { OraLogo } from "./OraLogo";

const INK = "#0A0A0A";
const MUTED = "#6E6E73";
const LINE = "rgba(10,10,10,0.08)";
const BG = "#FBFBFD";

type TabId = "surprise" | "library" | "edit";

const TABS: Array<{ id: TabId; label: string; href: string; icon: React.ReactNode }> = [
  { id: "surprise", label: "Surprise Me", href: "/hub/surprise", icon: <Sparkles size={14} /> },
  { id: "library",  label: "Library",     href: "/hub/library",  icon: <FolderOpen size={14} /> },
  { id: "edit",     label: "Edit",        href: "/hub/editor",   icon: <Wand2 size={14} /> },
];

/**
 * Shared top bar for the 3 core app tabs. Renders a sticky header with the
 * Ora logo on the left and the 3-tab segmented control centred. The current
 * tab is highlighted based on the URL — or can be forced via the prop.
 */
export function AppTabs({ active }: { active?: TabId }) {
  const location = useLocation();
  const activeId: TabId = active
    ?? (location.pathname.startsWith("/hub/library") ? "library"
      : location.pathname.startsWith("/hub/editor")  ? "edit"
      : "surprise");

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-8 h-14"
      style={{ background: `${BG}CC`, backdropFilter: "blur(18px) saturate(180%)", borderBottom: `1px solid ${LINE}` }}
    >
      <Link to="/" className="flex items-center gap-2" aria-label="Ora">
        <OraLogo size={22} />
        <span className="text-[15px] tracking-tight" style={{ fontWeight: 600 }}>Ora</span>
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

      <div className="hidden md:flex items-center gap-3">
        <Link to="/pricing" className="text-[12.5px] hover:text-black transition" style={{ color: MUTED }}>Pricing</Link>
        <Link to="/profile" className="text-[12.5px] hover:text-black transition" style={{ color: MUTED }}>Account</Link>
      </div>
    </header>
  );
}

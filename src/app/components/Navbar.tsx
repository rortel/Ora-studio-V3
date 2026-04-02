import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, X } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { motion, AnimatePresence } from "motion/react";
import { OraLogo } from "./OraLogo";
import { useI18n, type Locale } from "../lib/i18n";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHome = location.pathname === "/";
  // On homepage: white text when at top (over video), dark text when scrolled
  const lightMode = isHome && !scrolled;

  const links = [
    { label: t("nav.models"), href: "/models" },
    { label: t("nav.pricing"), href: "/pricing" },
  ];

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: scrolled ? "1px solid rgba(0,0,0,0.06)" : "1px solid transparent",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <OraLogo size={26} animate={false} color={lightMode ? "#FFFFFF" : "var(--text-primary)"} />
          </Link>

          {/* Desktop nav links — centered */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => {
              const active = location.pathname === l.href;
              return (
                <Link
                  key={l.href}
                  to={l.href}
                  className="px-4 py-2 rounded-full transition-all duration-200"
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: lightMode
                      ? (active ? "#FFFFFF" : "rgba(255,255,255,0.7)")
                      : (active ? "var(--text-primary)" : "var(--text-secondary)"),
                    background: active
                      ? (lightMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.04)")
                      : "transparent",
                  }}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop right */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                to="/hub"
                className="px-5 py-2 rounded-full transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                style={{
                  background: lightMode ? "#FFFFFF" : "var(--primary)",
                  color: lightMode ? "#111111" : "var(--primary-foreground)",
                  fontSize: "14px",
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                }}
              >
                {t("nav.dashboard")}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full transition-all duration-200"
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: lightMode ? "rgba(255,255,255,0.7)" : "var(--text-secondary)",
                  }}
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  to="/login?mode=signup"
                  className="px-5 py-2 rounded-full transition-all duration-200 hover:shadow-md hover:shadow-purple-500/25 active:scale-[0.98]"
                  style={{
                    background: lightMode ? "#FFFFFF" : "linear-gradient(135deg, #7C3AED, #EC4899)",
                    color: lightMode ? "#111111" : "#FFFFFF",
                    fontSize: "14px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t("nav.getStarted")}
                </Link>
              </>
            )}
            {/* Language toggle */}
            <button
              onClick={() => setLocale(locale === "en" ? "fr" : "en")}
              className="px-2.5 py-1.5 rounded-full transition-all duration-200"
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: lightMode ? "rgba(255,255,255,0.6)" : "var(--text-secondary)",
                background: lightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)",
                border: "1px solid",
                borderColor: lightMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
              }}
            >
              {locale === "en" ? "FR" : "EN"}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: lightMode ? "#FFFFFF" : "var(--text-primary)" }}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col"
            style={{ background: "var(--background)" }}
          >
            <div className="flex items-center justify-between px-5 h-16">
              <OraLogo size={26} animate={false} color="var(--text-primary)" />
              <button onClick={() => setMobileOpen(false)} className="p-2" style={{ color: "var(--text-primary)" }}>
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 flex flex-col justify-center px-8 gap-3">
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                >
                  <Link
                    to={l.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "clamp(2rem, 6vw, 3rem)",
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.03em",
                      lineHeight: 1.2,
                      display: "block",
                    }}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="px-8 pb-12 flex flex-col sm:flex-row gap-4"
            >
              {user ? (
                <Link
                  to="/hub"
                  onClick={() => setMobileOpen(false)}
                  className="px-8 py-4 rounded-full text-center"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  {t("nav.dashboard")}
                </Link>
              ) : (
                <>
                  <Link
                    to="/login?mode=signup"
                    onClick={() => setMobileOpen(false)}
                    className="px-8 py-4 rounded-full text-center"
                    style={{
                      background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                      color: "#FFFFFF",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {t("nav.getStarted")}
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="px-6 py-4 text-center"
                    style={{
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {t("nav.signIn")}
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

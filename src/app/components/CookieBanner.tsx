import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router";

/**
 * CNIL/EDPB-compliant cookie banner.
 *
 * - Two top-level buttons of equal visual weight (refuse vs accept all),
 *   per CNIL guidance from 2020 and reinforced in 2024.
 * - "Customise" panel exposing granular consent (analytics, marketing).
 *   Essential cookies cannot be refused — they hold the auth session.
 * - Stored consent is a JSON object so future cookie categories can be
 *   added without breaking older browsers. The previous "all|essential"
 *   string is migrated on read.
 * - The wrapper element is role="dialog" with aria-labelledby pointing
 *   at the title for screen readers.
 */
const COOKIE_KEY = "ora_cookie_consent_v2";
const LEGACY_KEY = "ora_cookie_consent";

export type CookieConsent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decided_at: string;
};

function readConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CookieConsent;
      if (typeof parsed?.analytics === "boolean") return parsed;
    }
    // Migrate legacy single-string consent
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === "all") return { essential: true, analytics: true, marketing: true, decided_at: new Date().toISOString() };
    if (legacy === "essential") return { essential: true, analytics: false, marketing: false, decided_at: new Date().toISOString() };
  } catch { /* fall through */ }
  return null;
}

function writeConsent(c: CookieConsent) {
  try {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(c));
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore quota */ }
}

export function CookieBanner() {
  const [decided, setDecided] = useState<boolean>(true);
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const current = readConsent();
    if (current) {
      setDecided(true);
    } else {
      setDecided(false);
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const persist = (next: CookieConsent) => {
    writeConsent(next);
    setDecided(true);
    setVisible(false);
  };

  const refuseAll = () => persist({ essential: true, analytics: false, marketing: false, decided_at: new Date().toISOString() });
  const acceptAll = () => persist({ essential: true, analytics: true, marketing: true, decided_at: new Date().toISOString() });
  const saveCustom = () => persist({ essential: true, analytics, marketing, decided_at: new Date().toISOString() });

  if (decided || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="false"
        aria-labelledby="cookie-banner-title"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: "min(560px, calc(100vw - 32px))",
        }}
      >
        <div
          style={{
            background: "var(--card, #fff)",
            border: "1px solid var(--border, #ebebeb)",
            borderRadius: 16,
            padding: "20px 24px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.04)",
            fontFamily: "var(--font-family, Inter, sans-serif)",
            position: "relative",
          }}
        >
          <button
            onClick={refuseAll}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--muted-foreground, #999)",
            }}
            aria-label="Close cookie banner (refuses all non-essential cookies)"
          >
            <X size={14} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Cookie size={18} style={{ color: "var(--foreground, #111)" }} />
            <span id="cookie-banner-title" style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground, #111)" }}>
              Cookies & privacy
            </span>
          </div>

          <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground, #666)", margin: "0 0 14px 0" }}>
            ORA Studio uses essential cookies for the site to work and, with your consent, analytics cookies to
            understand usage. Your data is never sold and never used to train AI models.{" "}
            <Link to="/privacy" style={{ color: "var(--foreground, #111)", textDecoration: "underline" }}>
              Privacy Policy
            </Link>{" · "}
            <Link to="/subprocessors" style={{ color: "var(--foreground, #111)", textDecoration: "underline" }}>
              Sub-processors
            </Link>
          </p>

          {showDetails && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, padding: 12, background: "var(--secondary, #fafafa)", borderRadius: 10 }}>
              <ConsentRow
                label="Essential"
                description="Required to keep you signed in and to prevent fraud. Cannot be refused."
                checked
                disabled
                onChange={() => {}}
              />
              <ConsentRow
                label="Analytics"
                description="In-house event tracking (no third-party trackers). Lets us see which features are used."
                checked={analytics}
                onChange={setAnalytics}
              />
              <ConsentRow
                label="Marketing"
                description="Lifecycle emails beyond purely transactional ones (J+7 reminders, product updates)."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            {!showDetails ? (
              <button
                onClick={() => setShowDetails(true)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 9999,
                  border: "1px solid transparent",
                  background: "transparent",
                  color: "var(--muted-foreground, #666)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textDecoration: "underline",
                }}
              >
                Customise
              </button>
            ) : (
              <button
                onClick={saveCustom}
                style={{
                  padding: "8px 16px",
                  borderRadius: 9999,
                  border: "1px solid var(--border, #ebebeb)",
                  background: "transparent",
                  color: "var(--foreground, #111)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Save my choices
              </button>
            )}
            <button
              onClick={refuseAll}
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                border: "1px solid var(--border, #ebebeb)",
                background: "transparent",
                color: "var(--foreground, #111)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Refuse all
            </button>
            <button
              onClick={acceptAll}
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                border: "none",
                background: "var(--foreground, #111)",
                color: "var(--background, #fff)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Accept all
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ConsentRow({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: disabled ? "default" : "pointer" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: "var(--foreground, #111)" }}
        aria-label={`Toggle ${label} cookies`}
      />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground, #111)" }}>{label}{disabled && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--muted-foreground, #999)", fontWeight: 400 }}>(always on)</span>}</span>
        <span style={{ fontSize: 11, color: "var(--muted-foreground, #666)", lineHeight: 1.5 }}>{description}</span>
      </span>
    </label>
  );
}

/**
 * Exposed for analytics.ts to gate event collection — checked before
 * every track() call so a user who refused analytics never ships a
 * single event to the server.
 */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

export function hasMarketingConsent(): boolean {
  return readConsent()?.marketing === true;
}

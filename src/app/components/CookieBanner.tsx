import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, X } from "lucide-react";
import { Link } from "react-router";

const COOKIE_KEY = "ora_cookie_consent";

type Consent = "all" | "essential" | null;

export function CookieBanner() {
  const [consent, setConsent] = useState<Consent>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (stored === "all" || stored === "essential") {
      setConsent(stored);
    } else {
      // Show banner after 1.5s delay (less intrusive)
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = (level: "all" | "essential") => {
    localStorage.setItem(COOKIE_KEY, level);
    setConsent(level);
    setVisible(false);
  };

  if (consent || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
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
          width: "min(520px, calc(100vw - 32px))",
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
          }}
        >
          {/* Close button */}
          <button
            onClick={() => accept("essential")}
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
            aria-label="Fermer"
          >
            <X size={14} />
          </button>

          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Cookie size={18} style={{ color: "var(--foreground, #111)" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground, #111)" }}>
              Cookies & confidentialité
            </span>
          </div>

          {/* Description */}
          <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground, #666)", margin: "0 0 16px 0" }}>
            ORA Studio utilise des cookies essentiels pour le fonctionnement du site et des cookies
            analytiques pour améliorer votre expérience. Vos données ne sont jamais vendues ni utilisées
            pour entraîner des modèles IA.{" "}
            <Link to="/privacy" style={{ color: "var(--foreground, #111)", textDecoration: "underline" }}>
              Politique de confidentialité
            </Link>
          </p>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={() => accept("essential")}
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
              Essentiels uniquement
            </button>
            <button
              onClick={() => accept("all")}
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
              Tout accepter
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

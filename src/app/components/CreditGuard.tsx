import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Zap, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";

/**
 * CreditGuard — Inline credit enforcement component
 *
 * Usage:
 *   <CreditGuard cost={5} type="image">
 *     <button onClick={generate}>Generate</button>
 *   </CreditGuard>
 *
 * If the user has enough credits → renders children normally
 * If credits are low → shows warning + children
 * If credits = 0 → blocks and shows upgrade CTA
 */

interface CreditGuardProps {
  cost?: number;
  type?: "text" | "image" | "video" | "audio";
  children: React.ReactNode;
  /** Show inline warning instead of blocking */
  warnOnly?: boolean;
}

const COST_MAP = { text: 2, image: 5, video: 30, audio: 5 };

export function CreditGuard({ cost, type = "text", children, warnOnly }: CreditGuardProps) {
  const { remainingCredits, isAdmin, plan } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const effectiveCost = cost ?? COST_MAP[type] ?? 2;

  // Admins and unlimited plans bypass
  if (isAdmin || plan === "business") {
    return <>{children}</>;
  }

  const hasEnough = remainingCredits >= effectiveCost;
  const isLow = remainingCredits > 0 && remainingCredits <= effectiveCost * 3;

  // No credits left — block
  if (!hasEnough && !warnOnly) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 text-center"
        style={{
          background: "rgba(212,24,61,0.04)",
          border: "1px solid rgba(212,24,61,0.12)",
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "rgba(212,24,61,0.08)" }}
        >
          <Zap size={18} style={{ color: "var(--destructive)" }} />
        </div>
        <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>
          {t("credits.insufficient")}
        </p>
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 12 }}>
          {t("credits.needCredits")} {effectiveCost} {t("credits.creditsForGeneration")} {remainingCredits} {t("credits.remaining")}.
        </p>
        <button
          onClick={() => navigate("/subscribe")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:opacity-90 cursor-pointer"
          style={{ background: "var(--accent)", fontSize: "13px", fontWeight: 500 }}
        >
          {t("credits.upgradePlan")} <ArrowRight size={14} />
        </button>
      </motion.div>
    );
  }

  return (
    <>
      {/* Low credit warning */}
      <AnimatePresence>
        {isLow && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg px-3 py-2 flex items-center gap-2 mb-2"
            style={{
              background: "rgba(245, 158, 11, 0.06)",
              border: "1px solid rgba(245, 158, 11, 0.12)",
            }}
          >
            <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              {remainingCredits} {t("credits.creditsRemaining")}{" "}
              <button
                onClick={() => navigate("/subscribe")}
                className="underline cursor-pointer"
                style={{ color: "var(--accent)", fontWeight: 500 }}
              >
                {t("credits.upgrade")}
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}

/**
 * CreditBadge — Small inline badge showing credit cost
 * Usage: <CreditBadge cost={5} />
 */
export function CreditBadge({ cost, type }: { cost?: number; type?: "text" | "image" | "video" | "audio" }) {
  const effectiveCost = cost ?? COST_MAP[type || "text"] ?? 2;
  const { isAdmin, plan } = useAuth();

  if (isAdmin || plan === "business") return null;

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
      style={{
        background: "var(--secondary)",
        fontSize: "10px",
        fontWeight: 500,
        color: "var(--muted-foreground)",
      }}
    >
      <Zap size={9} />
      {effectiveCost}
    </span>
  );
}

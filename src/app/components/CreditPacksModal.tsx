import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Zap, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";

/**
 * CreditPacksModal — one-off credit top-up.
 *
 * Backed by /stripe/buy-pack which has been live server-side for months
 * but never had a UI surface. Three packs:
 *   S — €9   / 10 credits  (€0.90/credit)
 *   M — €19  / 25 credits  (€0.76/credit) — "Best value" badge
 *   L — €39  / 60 credits  (€0.65/credit)
 *
 * Compared to a Studio subscription (€49/200 credits = €0.245/credit),
 * packs are intentionally pricier per-unit — they're a top-up safety net
 * for the months a customer blows past their plan, not a replacement for
 * upgrading. The Best-value badge nudges toward Pack M (the
 * highest-margin "decision-frame" middle option).
 *
 * On Buy: POST /stripe/buy-pack returns a Stripe Checkout URL → window
 * redirect. Stripe sends the user back to /subscribe?success=true&pack=*
 * where the existing webhook-driven credit add has already fired.
 */

interface Props { open: boolean; onClose: () => void; }

interface Pack {
  id: "pack_s" | "pack_m" | "pack_l";
  nameKey: string;
  creditsKey: string;
  priceKey: string;
  rateKey: string;
  badgeKey?: string;
  highlight?: boolean;
}

const PACKS: Pack[] = [
  { id: "pack_s", nameKey: "subscribe.packSName", creditsKey: "subscribe.packSCredits", priceKey: "subscribe.packSPrice", rateKey: "subscribe.packSRate" },
  { id: "pack_m", nameKey: "subscribe.packMName", creditsKey: "subscribe.packMCredits", priceKey: "subscribe.packMPrice", rateKey: "subscribe.packMRate", badgeKey: "subscribe.packMBadge", highlight: true },
  { id: "pack_l", nameKey: "subscribe.packLName", creditsKey: "subscribe.packLCredits", priceKey: "subscribe.packLPrice", rateKey: "subscribe.packLRate" },
];

export function CreditPacksModal({ open, onClose }: Props) {
  const { accessToken } = useAuth();
  const { t, locale } = useI18n();
  const isFr = locale === "fr";
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuy = useCallback(async (packId: string) => {
    if (!accessToken) {
      toast.error(isFr ? "Connecte-toi d'abord" : "Sign in first");
      return;
    }
    setBuying(packId);
    try {
      const r = await fetch(`${API_BASE}/stripe/buy-pack`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ pack: packId, _token: accessToken }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await r.json();
      if (!data?.success || !data.url) {
        toast.error(data?.error || (isFr ? "Erreur de paiement" : "Checkout failed"));
        setBuying(null);
        return;
      }
      // Redirect to Stripe — modal stays open until then so the user
      // doesn't see a blank flash. Stripe Checkout opens same-tab.
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err?.message || (isFr ? "Erreur réseau" : "Network error"));
      setBuying(null);
    }
  }, [accessToken, isFr]);

  if (!open) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={() => !buying && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl rounded-2xl"
          style={{ background: "var(--background)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
                <Zap size={20} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
                  {t("subscribe.creditPacksTitle")}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {t("subscribe.creditPacksSubtitle")}
                </div>
              </div>
            </div>
            <button onClick={onClose} disabled={!!buying}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary cursor-pointer shrink-0 disabled:opacity-30">
              <X size={16} />
            </button>
          </div>

          {/* Packs grid */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PACKS.map((pack) => {
              const isBuying = buying === pack.id;
              const disabled = !!buying && !isBuying;
              return (
                <div key={pack.id} className="relative rounded-xl p-5 flex flex-col"
                  style={{
                    background: "var(--secondary)",
                    border: pack.highlight ? `2px solid #EC4899` : `1px solid var(--border)`,
                  }}
                >
                  {pack.badgeKey && (
                    <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full"
                      style={{ background: "#EC4899", color: "#fff", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {t(pack.badgeKey)}
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {t(pack.nameKey)}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span style={{ fontSize: 28, fontWeight: 800, color: "var(--foreground)", lineHeight: 1 }}>
                      {t(pack.priceKey)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--foreground)", marginTop: 4 }}>
                    {t(pack.creditsKey)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                    {t(pack.rateKey)}
                  </div>
                  <button
                    onClick={() => handleBuy(pack.id)}
                    disabled={disabled || isBuying}
                    className="mt-5 px-3 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    style={{
                      background: pack.highlight ? "linear-gradient(135deg, #7C3AED, #EC4899)" : "var(--foreground)",
                      color: pack.highlight ? "#fff" : "var(--background)",
                      fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {isBuying ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : pack.highlight ? (
                      <Zap size={13} strokeWidth={2.5} />
                    ) : (
                      <Check size={13} />
                    )}
                    {isBuying ? (isFr ? "Redirection..." : "Redirecting...") : t("subscribe.buyPack")}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-6 pb-5">
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center", lineHeight: 1.5 }}>
              {isFr
                ? "Paiement unique sécurisé via Stripe. Les crédits sont ajoutés instantanément après paiement et n'expirent jamais."
                : "One-time secure payment via Stripe. Credits are added instantly after payment and never expire."}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

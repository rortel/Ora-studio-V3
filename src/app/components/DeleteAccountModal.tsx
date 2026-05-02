import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";
import { useI18n } from "../lib/i18n";

/**
 * DeleteAccountModal — GDPR-compliant account deletion confirmation.
 *
 * Two safeguards before the irreversible action:
 *   1. Plain-language list of what gets deleted (subscription, socials,
 *      data) — sets expectations
 *   2. User must type the exact word "DELETE" / "SUPPRIMER" into a text
 *      input — same UX pattern as GitHub/Stripe so users recognize it
 *      as a destructive confirmation
 *
 * On success: signs out + navigates to "/" + toasts.
 */

interface Props { open: boolean; onClose: () => void; }

export function DeleteAccountModal({ open, onClose }: Props) {
  const { accessToken, signOut } = useAuth();
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const navigate = useNavigate();

  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Locale-specific confirmation word. The server accepts "DELETE" only,
  // so the French UI translates the displayed token but always sends DELETE.
  const expectedWord = isFr ? "SUPPRIMER" : "DELETE";
  const canConfirm = confirmInput.trim().toUpperCase() === expectedWord;

  const handleDelete = useCallback(async () => {
    if (!canConfirm || !accessToken) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API_BASE}/auth/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${publicAnonKey}`, "Content-Type": "text/plain" },
        body: JSON.stringify({ confirm: "DELETE", _token: accessToken }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await r.json();
      if (!data.success) {
        toast.error(data.error || (isFr ? "Échec de la suppression" : "Deletion failed"));
        setDeleting(false);
        return;
      }
      toast.success(isFr ? "Compte supprimé" : "Account deleted");
      try { await signOut(); } catch {}
      onClose();
      navigate("/");
    } catch (err: any) {
      toast.error(err?.message || (isFr ? "Erreur réseau" : "Network error"));
      setDeleting(false);
    }
  }, [canConfirm, accessToken, isFr, signOut, navigate, onClose]);

  if (!open) return null;

  const content = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={() => !deleting && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl"
          style={{ background: "var(--background)", border: "1px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(212,24,61,0.1)" }}>
                <AlertTriangle size={20} style={{ color: "#d4183d" }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>
                  {isFr ? "Supprimer ton compte ?" : "Delete your account?"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {isFr ? "Cette action est irréversible." : "This action cannot be undone."}
                </div>
              </div>
            </div>
            <button onClick={onClose} disabled={deleting}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary cursor-pointer shrink-0 disabled:opacity-30">
              <X size={16} />
            </button>
          </div>

          {/* What happens */}
          <div className="px-6 py-4 space-y-3">
            <div style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.5 }}>
              {isFr ? "Voici ce qui va se passer :" : "Here's what will happen:"}
            </div>
            <ul className="space-y-2" style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
              {(isFr ? CONSEQUENCES_FR : CONSEQUENCES_EN).map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "var(--muted-foreground)" }} />
                  <span style={{ lineHeight: 1.5 }}>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Confirm input */}
          <div className="px-6 pb-2">
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--foreground)", display: "block", marginBottom: 6 }}>
              {isFr ? `Tape ${expectedWord} pour confirmer` : `Type ${expectedWord} to confirm`}
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={e => setConfirmInput(e.target.value)}
              placeholder={expectedWord}
              autoFocus
              disabled={deleting}
              className="w-full px-3 py-2 rounded-lg outline-none tabular-nums"
              style={{
                background: "var(--secondary)",
                border: `1px solid ${canConfirm ? "#d4183d" : "var(--border)"}`,
                color: "var(--foreground)", fontSize: 14, fontWeight: 600, letterSpacing: "0.05em",
              }}
            />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-end gap-2">
            <button onClick={onClose} disabled={deleting}
              className="px-4 py-2 rounded-lg cursor-pointer hover:bg-secondary disabled:opacity-50"
              style={{ border: "1px solid var(--border)", fontSize: 13, fontWeight: 500, color: "var(--foreground)" }}>
              {isFr ? "Annuler" : "Cancel"}
            </button>
            <button onClick={handleDelete} disabled={!canConfirm || deleting}
              className="px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#d4183d", color: "#fff", fontSize: 13, fontWeight: 600 }}>
              {deleting && <Loader2 size={14} className="animate-spin" />}
              {deleting ? (isFr ? "Suppression..." : "Deleting...") : (isFr ? "Supprimer définitivement" : "Delete permanently")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

const CONSEQUENCES_EN = [
  "Your active subscription will be canceled immediately (no refund for the current period).",
  "All your connected social accounts (Instagram, Facebook, TikTok) will be disconnected.",
  "Every campaign, calendar event, brand vault, and generated asset will be permanently deleted.",
  "Your login email will be released — you can sign up again later, but as a brand-new account.",
];

const CONSEQUENCES_FR = [
  "Ton abonnement actif sera annulé immédiatement (pas de remboursement pour la période en cours).",
  "Tous tes comptes sociaux connectés (Instagram, Facebook, TikTok) seront déconnectés.",
  "Toutes tes campagnes, événements calendrier, brand vault et contenus générés seront supprimés définitivement.",
  "Ton email pourra être réutilisé — tu pourras te réinscrire plus tard, mais en repartant de zéro.",
];

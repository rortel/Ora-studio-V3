/**
 * Onboarding checklist — persistent pill bottom-right that guides
 * first-time users through the 4 key actions:
 *
 *   1. Set up Brand Vault              → /hub/vault
 *   2. Generate first pack             → /hub/surprise
 *   3. Edit a post                     → /hub/editor
 *   4. Connect a social account        → /hub/account?tab=connections
 *
 * Progress is auto-detected from user state (vault fields populated,
 * library count, PfM connected accounts) — not stored separately.
 * Dismissal is stored in localStorage so the checklist disappears
 * once the user marks it as "done" or completes all steps.
 *
 * Visible only when user is logged in AND not all steps are complete
 * AND not dismissed.
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, ChevronDown, ChevronUp, Sparkles, BookOpen, Wand2, Send } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { trackEvent } from "../lib/analytics";

const DISMISS_KEY = "ora_onboarding_dismissed";

interface OnboardingState {
  vaultDone: boolean;
  firstPackDone: boolean;
  firstEditDone: boolean;
  publishDone: boolean;
  loaded: boolean;
}

export function OnboardingChecklist() {
  const { user, accessToken } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<OnboardingState>({
    vaultDone: false, firstPackDone: false, firstEditDone: false, publishDone: false, loaded: false,
  });
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Read dismiss flag once on mount.
  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch {}
  }, []);

  // Detect completion from user state. Re-runs on route change so the
  // checklist auto-updates when the user finishes a step.
  // Gate the network calls on a non-empty access token — without this
  // gate the effect fired during the auth-state warm-up window (the
  // moment between `user` being set and `accessToken` being hydrated)
  // and the server returned 401, polluting the console.
  // BUG FIX 2026-05-05: was reading profile.accessToken which doesn't
  // exist on the profile object (the token lives directly on useAuth's
  // returned context). Effect never ran → onboarding checklist never
  // showed up for any user. Now reads accessToken from the hook root.
  useEffect(() => {
    if (!user) return;
    const token = accessToken || "";
    if (!token) return; // wait until the token is in memory
    let cancelled = false;
    (async () => {
      try {
        // Vault: check if company_name OR colors OR fonts are populated
        const vaultRes = await fetch(`${API_BASE}/vault/load`, {
          method: "POST",
          headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ _token: token }),
        });
        const vaultData = await vaultRes.json().catch(() => ({}));
        const v = vaultData?.vault || {};
        const vaultDone = !!(v.company_name || v.colors?.length || v.fonts?.length || v.archetype);

        // Library: any items?
        const libRes = await fetch(`${API_BASE}/library/list`, {
          method: "POST",
          headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ _token: token }),
        });
        const libData = await libRes.json().catch(() => ({}));
        const items: any[] = libData?.items || [];
        const firstPackDone = items.length > 0;
        // Edit: any item that has been opened in the editor (has
        // editedFrom marker, or a saved version with type "edited").
        const firstEditDone = items.some((it) => it.type === "edited" || it.editedFrom);

        // Publish: detect a connected social account via Post For Me.
        // Hits /pfm/accounts which returns the user's connected social
        // identities (Instagram / Facebook / TikTok / LinkedIn). Gracefully
        // fails if PfM isn't reachable — checklist stays at 3/4 instead
        // of crashing.
        let publishDone = false;
        try {
          const pfmRes = await fetch(`${API_BASE}/pfm/accounts`, {
            method: "POST",
            headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
            body: JSON.stringify({ _token: token }),
          });
          const pfmData = await pfmRes.json().catch(() => ({}));
          const accounts: any[] = pfmData?.accounts || [];
          publishDone = accounts.length > 0;
        } catch { /* PfM unavailable, leave publishDone=false */ }

        if (!cancelled) setState({ vaultDone, firstPackDone, firstEditDone, publishDone, loaded: true });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, loaded: true }));
      }
    })();
    return () => { cancelled = true; };
  }, [user, accessToken, location.pathname]);

  if (!user || dismissed || !state.loaded) return null;
  const completedCount = [state.vaultDone, state.firstPackDone, state.firstEditDone, state.publishDone].filter(Boolean).length;
  if (completedCount === 4) return null; // all 4 steps done — hide

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
    trackEvent("onboarding_dismissed", { completedCount });
  };

  const steps = [
    { id: "vault", label: "Set up Brand Vault", href: "/hub/vault", done: state.vaultDone, icon: <BookOpen size={14} />, hint: "Paste your website URL — we extract palette, fonts, voice in 30s." },
    { id: "pack", label: "Generate your first pack", href: "/hub/surprise", done: state.firstPackDone, icon: <Sparkles size={14} />, hint: "Drop a product photo. We compose 6 platform-ready posts." },
    { id: "edit", label: "Edit a post", href: "/hub/editor", done: state.firstEditDone, icon: <Wand2 size={14} />, hint: "Add a logo, change format, tweak typography." },
    { id: "publish", label: "Connect a social account", href: "/hub/account?tab=connections", done: state.publishDone, icon: <Send size={14} />, hint: "Auto-publish to Instagram, Facebook, TikTok or LinkedIn in one tap." },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="rounded-2xl shadow-lg overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid rgba(17,17,17,0.08)", maxWidth: 360 }}
      >
        {/* Collapsed pill */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-black/[0.02] transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#FFE9DD" }}>
              <Sparkles size={14} style={{ color: "#FF6B47" }} />
            </div>
            <div className="text-left">
              <div className="text-[12.5px] font-semibold leading-tight">Get started</div>
              <div className="text-[11px]" style={{ color: "rgba(17,17,17,0.55)" }}>
                {completedCount}/3 done · {3 - completedCount} step{3 - completedCount === 1 ? "" : "s"} left
              </div>
            </div>
          </div>
          {expanded ? <ChevronDown size={16} style={{ color: "rgba(17,17,17,0.35)" }} /> : <ChevronUp size={16} style={{ color: "rgba(17,17,17,0.35)" }} />}
        </button>

        {/* Expanded body */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ borderTop: "1px solid rgba(17,17,17,0.06)" }}
            >
              <ul className="px-4 py-3 space-y-3">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: step.done ? "#22C55E" : "rgba(17,17,17,0.08)",
                        color: step.done ? "#FFFFFF" : "rgba(17,17,17,0.45)",
                      }}
                    >
                      {step.done ? <Check size={11} strokeWidth={3} /> : step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[12.5px] font-medium leading-tight"
                        style={{
                          color: step.done ? "rgba(17,17,17,0.45)" : "var(--foreground)",
                          textDecoration: step.done ? "line-through" : "none",
                        }}
                      >
                        {step.label}
                      </div>
                      {!step.done && (
                        <div className="text-[11px] mt-0.5 leading-snug" style={{ color: "rgba(17,17,17,0.55)" }}>
                          {step.hint}
                        </div>
                      )}
                      {!step.done && (
                        <Link
                          to={step.href}
                          onClick={() => trackEvent("onboarding_step_click", { step: step.id })}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold mt-1.5 hover:underline"
                          style={{ color: "#FF6B47" }}
                        >
                          Go →
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="px-4 pb-3 pt-1 flex justify-end">
                <button
                  onClick={handleDismiss}
                  className="text-[11px] font-medium hover:underline inline-flex items-center gap-1"
                  style={{ color: "rgba(17,17,17,0.50)" }}
                >
                  <X size={11} /> Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

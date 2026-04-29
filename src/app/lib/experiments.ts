/**
 * Lightweight A/B testing — no Optimizely, no LaunchDarkly, no SDK.
 *
 * Experiments are declared in EXPERIMENTS below. Each user gets a
 * stable variant assignment per experiment, computed by hashing
 * (userId or anonymous device-id) + experiment key. Same user always
 * sees the same variant on every visit.
 *
 * Every analytics event automatically picks up the user's active
 * variants under `_exp` so the admin dashboard can compute conversion
 * rates per variant from the existing `evt:` log without extra schema.
 *
 * Usage:
 *   const { variant } = useExperiment("hero_cta_copy");
 *   return <Button>{variant === "B" ? "Try it free" : "Get started"}</Button>;
 */

import { useEffect, useState } from "react";

// ── Experiment registry ─────────────────────────────────────────────
// Add experiments here. Variant weights must sum to 1.0. Keep variant
// IDs short (single letter is fine, makes dashboards readable).
export interface Experiment {
  key: string;
  description: string;
  variants: { id: string; weight: number; label?: string }[];
  startedAt: string; // ISO date — set when you launch the experiment
}

export const EXPERIMENTS: Experiment[] = [
  {
    key: "hero_cta_copy",
    description: "Test the landing CTA copy on conversion to /hub/surprise",
    variants: [
      { id: "A", weight: 0.5, label: "Try it. No card." },
      { id: "B", weight: 0.5, label: "Drop your product." },
    ],
    startedAt: "2026-04-29",
  },
  {
    key: "surprise_loading_emoji",
    description: "Does the emoji on generation status affect drop-off?",
    variants: [
      { id: "minimal", weight: 0.5, label: "Spinner only" },
      { id: "emoji", weight: 0.5, label: "Animated emojis per phase" },
    ],
    startedAt: "2026-04-29",
  },
];

// ── Stable user-bucket id ───────────────────────────────────────────
// Resolves the userId from supabase auth, or falls back to a per-device
// anon id stored in localStorage. Anon id is preserved across sessions
// so a logged-out visitor always sees the same variant.
function getStableId(): string {
  try {
    const auth = localStorage.getItem("supabase.auth.token") || localStorage.getItem("sb-" + (location.host.split(".")[0]) + "-auth-token");
    if (auth) {
      const parsed = JSON.parse(auth);
      const uid = parsed?.currentSession?.user?.id || parsed?.user?.id;
      if (uid) return `u:${uid}`;
    }
  } catch {}
  let anonId = localStorage.getItem("ora_anon_id");
  if (!anonId) {
    anonId = `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    try { localStorage.setItem("ora_anon_id", anonId); } catch {}
  }
  return `anon:${anonId}`;
}

// ── Deterministic variant picker ────────────────────────────────────
// Simple FNV-1a-ish hash → uniform [0, 1) → bucket by cumulative weight.
function hashToUnit(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Convert to unsigned + normalise to [0, 1)
  return ((h >>> 0) % 100000) / 100000;
}

function pickVariant(exp: Experiment, stableId: string): string {
  const r = hashToUnit(`${stableId}:${exp.key}`);
  let cum = 0;
  for (const v of exp.variants) {
    cum += v.weight;
    if (r < cum) return v.id;
  }
  return exp.variants[exp.variants.length - 1].id;
}

// ── Cached assignments (persistent) ─────────────────────────────────
// Once a user is bucketed, we cache the assignment in localStorage.
// This survives even if EXPERIMENTS weights change later (we only
// honour cached assignments when the experiment still exists with the
// same variants — otherwise we re-bucket).
function getStoredAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem("ora_exp_assignments");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function setStoredAssignments(assignments: Record<string, string>): void {
  try { localStorage.setItem("ora_exp_assignments", JSON.stringify(assignments)); } catch {}
}

/**
 * Returns the assignment map for ALL active experiments. Used by the
 * analytics module to attach `_exp.<key>` to every event.
 */
export function getAllAssignments(): Record<string, string> {
  const stored = getStoredAssignments();
  const stableId = getStableId();
  const out: Record<string, string> = {};
  for (const exp of EXPERIMENTS) {
    const validIds = new Set(exp.variants.map((v) => v.id));
    if (stored[exp.key] && validIds.has(stored[exp.key])) {
      out[exp.key] = stored[exp.key];
    } else {
      out[exp.key] = pickVariant(exp, stableId);
    }
  }
  // Persist the (possibly new) full assignment map.
  setStoredAssignments(out);
  return out;
}

/**
 * React hook — returns the variant assigned to the current user for
 * the named experiment. Stable across renders & sessions.
 *
 * If the experiment isn't defined (typo, removed), returns the first
 * variant or "A" so the UI never crashes.
 */
export function useExperiment(key: string): { variant: string; label?: string; isControl: boolean } {
  const exp = EXPERIMENTS.find((e) => e.key === key);
  const [variant, setVariant] = useState<string>(() => {
    if (!exp) return "A";
    return getAllAssignments()[key] || exp.variants[0].id;
  });
  useEffect(() => {
    if (!exp) return;
    const v = getAllAssignments()[key];
    if (v && v !== variant) setVariant(v);
    // Fire an exposure event the first time this hook is mounted with
    // this experiment key in the session. The analytics module also
    // attaches _exp to every event automatically, but a dedicated
    // exposure event makes funnel analysis cleaner.
    try {
      const sessionKey = `ora_exp_exposed_${key}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "1");
        // Defer to avoid blocking render
        setTimeout(() => {
          import("./analytics").then(({ trackEvent }) => {
            trackEvent("experiment_exposure", { key, variant: v });
          }).catch(() => {});
        }, 0);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const variantConfig = exp?.variants.find((v) => v.id === variant);
  const isControl = !!exp && exp.variants[0].id === variant;
  return { variant, label: variantConfig?.label, isControl };
}

/**
 * In-house analytics + Web Vitals. Replaces Mixpanel/Posthog for the
 * "weapon of war" sprint — no external account needed, no DSN, no ENV
 * var to configure, no bundle bloat.
 *
 * Captures:
 *   - Auto: page views (route changes), session start
 *   - Auto: Web Vitals (LCP, CLS, INP, FCP, TTFB) via PerformanceObserver
 *   - Manual: trackEvent(name, props) for custom events
 *
 * All events POST to /analytics/track which stores in Supabase KV
 * (auto-pruned, last 5000 events). Admin can summarise via
 * /admin/analytics/summary.
 *
 * Throttled: max 100 events per session to prevent floods. Same-event
 * with same props within 1s is deduplicated (handles render loops).
 */

import { API_BASE, publicAnonKey } from "./supabase";
import { hasAnalyticsConsent } from "../components/CookieBanner";

const MAX_EVENTS_PER_SESSION = 100;
const DEDUP_WINDOW_MS = 1000;
let eventCount = 0;
const recentEvents = new Map<string, number>();

// Stable session ID — generated once per page load, sticks across
// route changes within the same tab session. Lets us aggregate by
// "session" in the dashboard (events from the same visit cluster).
const SESSION_ID = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Acquisition attribution. Captured once at session start by reading
 * the URL's UTM query params, then persisted in sessionStorage so the
 * same visit keeps the same source even after SPA navigation drops
 * the params. Sent with every event so the funnel from "ad click" to
 * "subscription_activated" is queryable in /admin/analytics/summary.
 */
const ATTRIBUTION_KEY = "ora_attribution_v1";
type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer_host?: string;
  landed_at?: string;
};

function readAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (raw) return JSON.parse(raw) as Attribution;
  } catch { /* ignore */ }
  return {};
}

function captureAttribution(): Attribution {
  try {
    const existing = readAttribution();
    if (existing.landed_at) return existing; // first touch wins
    const params = new URLSearchParams(location.search);
    const a: Attribution = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const) {
      const v = params.get(k);
      if (v) (a as any)[k] = v.slice(0, 120);
    }
    try {
      if (document.referrer) a.referrer_host = new URL(document.referrer).hostname;
    } catch { /* not a URL */ }
    a.landed_at = new Date().toISOString();
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(a));
    return a;
  } catch { return {}; }
}

function shouldTrack(eventKey: string): boolean {
  if (eventCount >= MAX_EVENTS_PER_SESSION) return false;
  const now = Date.now();
  const last = recentEvents.get(eventKey);
  if (last && now - last < DEDUP_WINDOW_MS) return false;
  recentEvents.set(eventKey, now);
  if (recentEvents.size > 100) {
    for (const [k, v] of recentEvents.entries()) {
      if (now - v > DEDUP_WINDOW_MS * 5) recentEvents.delete(k);
    }
  }
  return true;
}

function getUserId(): string {
  try {
    const auth = localStorage.getItem("supabase.auth.token") || localStorage.getItem("sb-" + (location.host.split(".")[0]) + "-auth-token");
    if (!auth) return "anon";
    const parsed = JSON.parse(auth);
    return parsed?.currentSession?.user?.id || parsed?.user?.id || "anon";
  } catch { return "anon"; }
}

export interface TrackProps {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Track a custom event. Best-effort, never throws, fire-and-forget.
 *
 * @example
 *   trackEvent("surprise_me_started", { assetCount: 6, mediaType: "image" });
 *   trackEvent("publish_clicked", { platform: "instagram" });
 */
// Events that are needed for legal/audit/operational reasons and that
// fire regardless of the analytics consent (purely transactional).
// Everything else is gated behind hasAnalyticsConsent().
const ALWAYS_ON = new Set<string>([
  "subscription_activated",
  "subscription_cancelled",
  "account_deleted",
  "data_exported",
  "consent_changed",
]);

export function trackEvent(name: string, props?: TrackProps): void {
  // GDPR / ePrivacy gate. Refusing analytics in the cookie banner must
  // result in zero analytics traffic leaving the browser — anything else
  // would be a regulatory violation (CNIL 2024 guidance).
  if (!ALWAYS_ON.has(name) && !hasAnalyticsConsent()) return;

  const eventKey = `${name}:${JSON.stringify(props || {}).slice(0, 100)}`;
  if (!shouldTrack(eventKey)) return;
  eventCount += 1;

  try {
    const body = {
      event: name,
      props: props || {},
      userId: getUserId(),
      sessionId: SESSION_ID,
      route: location.pathname,
      // URL is captured without query string to avoid logging UTM tokens
      // and one-time auth params more than once (they live in attribution).
      url: location.origin + location.pathname,
      referrer: (() => { try { return document.referrer ? new URL(document.referrer).hostname : ""; } catch { return ""; } })(),
      userAgent: navigator.userAgent,
      attribution: readAttribution(),
      ts: new Date().toISOString(),
    };
    fetch(`${API_BASE}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => { /* silent */ });
  } catch { /* silent */ }
}

/**
 * Strongly-typed helpers for the AARRR funnel events that the audit
 * flagged as missing. Call these from the relevant call sites so the
 * /admin/analytics/summary dashboard can compute activation, retention
 * and upgrade conversion accurately.
 */
export const Funnel = {
  signupCompleted: (props?: TrackProps) => trackEvent("signup_completed", props),
  onboardingStepCompleted: (step: number, total: number) => trackEvent("onboarding_step_completed", { step, total }),
  onboardingCompleted: () => trackEvent("onboarding_completed"),
  vaultSetupCompleted: (source: "url_scan" | "manual" | "import") => trackEvent("vault_setup_completed", { source }),
  surpriseMeStarted: (props?: TrackProps) => trackEvent("surprise_me_started", props),
  firstPackGenerated: (props?: TrackProps) => trackEvent("first_pack_generated", props),
  packPublished: (platform: string, success: boolean) => trackEvent("pack_published", { platform, success }),
  upgradeClicked: (fromPlan: string, toPlan: string) => trackEvent("upgrade_clicked", { fromPlan, toPlan }),
  subscriptionActivated: (plan: string, billingCycle: "monthly" | "yearly", priceEur: number) =>
    trackEvent("subscription_activated", { plan, billingCycle, priceEur }),
  subscriptionCancelled: (plan: string, reason?: string) => trackEvent("subscription_cancelled", { plan, reason: reason || "" }),
  consentChanged: (analytics: boolean, marketing: boolean) => trackEvent("consent_changed", { analytics, marketing }),
};

let installed = false;

/**
 * Install auto-capture: page views + Web Vitals. Call once at app boot.
 * Idempotent.
 */
export function installAnalytics(): void {
  if (installed) return;
  installed = true;

  // First-touch attribution capture. Must run BEFORE the first event
  // so session_start carries the UTM/referrer payload.
  const attr = captureAttribution();

  // Initial page view + session start.
  trackEvent("session_start", {
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    utm_source: attr.utm_source || "",
    utm_medium: attr.utm_medium || "",
    utm_campaign: attr.utm_campaign || "",
  });
  trackEvent("page_view", { firstPaint: true });

  // ── PAGE_LEAVE — dwell time per route ──
  // We log when the user leaves a route (either to another route or by
  // closing the tab). The duration tells us how long they actually
  // engaged with each page — crucial for "what visitors like vs skip".
  // Without this, /admin/analytics/summary can show top routes by hits
  // but not by attention.
  let routeEnteredAt = Date.now();
  let currentRoute = location.pathname;
  const fireLeave = (reason: "route_change" | "tab_hidden" | "unload") => {
    const durationMs = Date.now() - routeEnteredAt;
    if (durationMs < 100) return; // ignore double-fires + instant bounces
    trackEvent("page_leave", {
      route: currentRoute,
      durationMs,
      reason,
    });
  };
  // Fire on route change (we update routeEnteredAt below).
  // Fire on tab hidden (best signal for "user left").
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") fireLeave("tab_hidden");
  });
  // Fire on actual unload — uses sendBeacon-style keepalive in trackEvent.
  window.addEventListener("pagehide", () => fireLeave("unload"));

  // SPA route changes (history.pushState / popstate). React-router uses
  // history under the hood, so we patch pushState/replaceState.
  const originalPush = history.pushState.bind(history);
  const originalReplace = history.replaceState.bind(history);
  let lastTrackedRoute = location.pathname;
  const trackRouteChange = () => {
    if (location.pathname !== lastTrackedRoute) {
      // Fire leave for the previous route BEFORE we update state.
      fireLeave("route_change");
      lastTrackedRoute = location.pathname;
      currentRoute = location.pathname;
      routeEnteredAt = Date.now();
      trackEvent("page_view", { firstPaint: false });
    }
  };
  history.pushState = function (...args) {
    const ret = originalPush(...args);
    queueMicrotask(trackRouteChange);
    return ret;
  };
  history.replaceState = function (...args) {
    const ret = originalReplace(...args);
    queueMicrotask(trackRouteChange);
    return ret;
  };
  window.addEventListener("popstate", trackRouteChange);

  // ── WEB VITALS via PerformanceObserver ──
  // No external dependency (web-vitals npm is ~3KB but adds bundle weight).
  // We capture the four most actionable metrics: LCP (paint speed), CLS
  // (layout stability), INP (input responsiveness), TTFB (server speed).
  // Each is sent ONCE per page load with the final value.
  try {
    // Largest Contentful Paint — when the biggest above-the-fold
    // element finishes painting. Target: <2.5s good, >4s bad.
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as any;
      if (last?.startTime) {
        trackEvent("web_vital", { metric: "LCP", value: Math.round(last.startTime), rating: last.startTime < 2500 ? "good" : last.startTime < 4000 ? "needs-improvement" : "poor" });
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

    // Cumulative Layout Shift — total layout shift across the session.
    // Target: <0.1 good, >0.25 bad. We sum until visibility change.
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) clsValue += layoutShift.value;
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
    // Send CLS final value when the page loses visibility (tab close/switch).
    const reportCLS = () => {
      if (document.visibilityState === "hidden") {
        trackEvent("web_vital", { metric: "CLS", value: Math.round(clsValue * 1000) / 1000, rating: clsValue < 0.1 ? "good" : clsValue < 0.25 ? "needs-improvement" : "poor" });
        document.removeEventListener("visibilitychange", reportCLS);
      }
    };
    document.addEventListener("visibilitychange", reportCLS);

    // Interaction to Next Paint — slowest interaction during session.
    // Target: <200ms good, >500ms bad.
    let maxINP = 0;
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming;
        const duration = eventEntry.duration || 0;
        if (duration > maxINP) maxINP = duration;
      }
    });
    try { inpObserver.observe({ type: "event", buffered: true, durationThreshold: 16 } as any); } catch { /* not all browsers */ }
    const reportINP = () => {
      if (document.visibilityState === "hidden" && maxINP > 0) {
        trackEvent("web_vital", { metric: "INP", value: Math.round(maxINP), rating: maxINP < 200 ? "good" : maxINP < 500 ? "needs-improvement" : "poor" });
        document.removeEventListener("visibilitychange", reportINP);
      }
    };
    document.addEventListener("visibilitychange", reportINP);

    // Time To First Byte — time from navigation start to first byte
    // received. Reflects server speed + DNS + TCP + TLS. Target: <800ms.
    const navTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navTiming?.responseStart) {
      const ttfb = navTiming.responseStart - navTiming.startTime;
      trackEvent("web_vital", { metric: "TTFB", value: Math.round(ttfb), rating: ttfb < 800 ? "good" : ttfb < 1800 ? "needs-improvement" : "poor" });
    }

    // First Contentful Paint — when the first text/image renders.
    // Target: <1.8s good. Reported once when the metric becomes available.
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          trackEvent("web_vital", { metric: "FCP", value: Math.round(entry.startTime), rating: entry.startTime < 1800 ? "good" : entry.startTime < 3000 ? "needs-improvement" : "poor" });
          fcpObserver.disconnect();
          break;
        }
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch { /* PerformanceObserver not fully available — skip vitals */ }
}

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

const MAX_EVENTS_PER_SESSION = 100;
const DEDUP_WINDOW_MS = 1000;
let eventCount = 0;
const recentEvents = new Map<string, number>();

// Stable session ID — generated once per page load, sticks across
// route changes within the same tab session. Lets us aggregate by
// "session" in the dashboard (events from the same visit cluster).
const SESSION_ID = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

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
export function trackEvent(name: string, props?: TrackProps): void {
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
      url: location.href,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent,
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

let installed = false;

/**
 * Install auto-capture: page views + Web Vitals. Call once at app boot.
 * Idempotent.
 */
export function installAnalytics(): void {
  if (installed) return;
  installed = true;

  // Initial page view + session start.
  trackEvent("session_start", {
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
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

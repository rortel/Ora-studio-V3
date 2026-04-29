/**
 * In-house lightweight error reporting. Replaces Sentry for tonight's
 * "weapon of war" sprint — no external account, no DSN, ~5KB total.
 *
 * Captures:
 *   - window.onerror (sync errors)
 *   - window.onunhandledrejection (async errors)
 *   - manual reportError() calls from React error boundaries
 *
 * Posts to /errors/report which stores in Supabase KV. Admin can list
 * recent errors via /admin/errors/recent.
 *
 * Throttled: max 10 reports per session to avoid floods. Same-message
 * errors within 5 seconds are deduplicated.
 */

import { API_BASE, publicAnonKey } from "./supabase";

const MAX_REPORTS_PER_SESSION = 10;
const DEDUP_WINDOW_MS = 5000;
let reportCount = 0;
const recentMessages = new Map<string, number>();

function shouldReport(message: string): boolean {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return false;
  const last = recentMessages.get(message);
  const now = Date.now();
  if (last && now - last < DEDUP_WINDOW_MS) return false;
  recentMessages.set(message, now);
  // GC old entries (best-effort)
  if (recentMessages.size > 50) {
    for (const [k, v] of recentMessages.entries()) {
      if (now - v > DEDUP_WINDOW_MS * 4) recentMessages.delete(k);
    }
  }
  return true;
}

export type ErrorSeverity = "fatal" | "error" | "warning" | "info";

export interface ReportedError {
  message: string;
  stack?: string;
  severity?: ErrorSeverity;
  context?: Record<string, unknown>;
}

export function reportError(err: ReportedError | Error | unknown, severity: ErrorSeverity = "error"): void {
  let payload: ReportedError;
  if (err instanceof Error) {
    payload = { message: err.message || "Unknown error", stack: err.stack, severity };
  } else if (typeof err === "object" && err !== null && "message" in err) {
    payload = err as ReportedError;
    payload.severity = payload.severity || severity;
  } else {
    payload = { message: String(err), severity };
  }

  if (!shouldReport(payload.message)) return;
  reportCount += 1;

  // Best-effort: never let reporting itself throw.
  try {
    const userId = (() => {
      try {
        const auth = localStorage.getItem("supabase.auth.token") || localStorage.getItem("sb-" + (location.host.split(".")[0]) + "-auth-token");
        if (!auth) return "anon";
        const parsed = JSON.parse(auth);
        return parsed?.currentSession?.user?.id || parsed?.user?.id || "anon";
      } catch { return "anon"; }
    })();
    const body = {
      message: payload.message,
      stack: payload.stack || "",
      url: location.href,
      userAgent: navigator.userAgent,
      userId,
      route: location.pathname,
      severity: payload.severity || severity,
      context: payload.context,
    };
    fetch(`${API_BASE}/errors/report`, {
      method: "POST",
      headers: { "Content-Type": "text/plain", Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(body),
      keepalive: true, // Allow the request to continue if the page unloads
    }).catch(() => { /* silent */ });
  } catch { /* silent */ }
}

let installed = false;

/**
 * Install global handlers. Call once at app boot.
 * Idempotent — safe to call multiple times during HMR.
 */
export function installErrorReporter(): void {
  if (installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    reportError({
      message: event.message || "window.onerror",
      stack: event.error?.stack,
      severity: "error",
      context: { filename: event.filename, line: event.lineno, col: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    reportError({
      message: reason?.message || `Unhandled rejection: ${String(reason).slice(0, 200)}`,
      stack: reason?.stack,
      severity: "error",
    });
  });
}

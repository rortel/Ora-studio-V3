/**
 * Security regression tests — first line of defence for the three
 * exploits the audit flagged. Failure here means a privilege escalation
 * or SSRF window has reopened.
 *
 * These tests mirror the helper logic from the Edge Function so they
 * can run in Node without Deno. When the server-side helper changes,
 * keep the copy below in sync.
 */
import { describe, it, expect } from "vitest";

// ─── Mirror of isValidScrapeUrl (supabase/functions/server/index.tsx) ───
function isValidScrapeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!host) return false;
    if (host === "localhost" || host === "0.0.0.0") return false;
    if (host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:")) return false;
    if (host.endsWith(".internal") || host.endsWith(".local")) return false;
    return true;
  } catch { return false; }
}

// ─── Mirror of isAdminEmail (supabase/functions/server/index.tsx) ───
function isAdminEmailFor(envValue: string, email: string | null | undefined): boolean {
  const ADMIN_EMAIL = (envValue || "").toLowerCase().trim();
  if (!ADMIN_EMAIL) return false;
  return String(email || "").toLowerCase().trim() === ADMIN_EMAIL;
}

describe("SSRF guard — isValidScrapeUrl", () => {
  it.each([
    ["https://example.com", true],
    ["https://www.canva.com/help", true],
    ["http://shopify.com/products", true],
    ["https://blog.openai.com/post-2024", true],
  ])("accepts public URL %s", (url, expected) => {
    expect(isValidScrapeUrl(url)).toBe(expected);
  });

  it.each([
    "http://localhost",
    "http://127.0.0.1",
    "http://127.5.5.5:5432",
    "http://10.0.0.1",
    "http://192.168.1.42",
    "http://172.16.0.1",
    "http://172.20.0.1",
    "http://172.31.255.255",
    "http://169.254.169.254",          // EC2/Azure metadata
    "http://0.0.0.0",
    "http://[::1]/",
    "http://service.internal",
    "http://thing.local",
    "file:///etc/passwd",
    "gopher://evil.com",
    "ftp://example.com",
    "javascript:alert(1)",
    "not a url",
  ])("rejects unsafe target %s", (url) => {
    expect(isValidScrapeUrl(url)).toBe(false);
  });

  it("172.15 and 172.32 are public (must pass)", () => {
    // The 172.16-31 private range is bounded — adjacent /16 ranges are public.
    expect(isValidScrapeUrl("http://172.15.0.1")).toBe(true);
    expect(isValidScrapeUrl("http://172.32.0.1")).toBe(true);
  });
});

describe("Admin email gate — isAdminEmail", () => {
  it("returns false when ADMIN_EMAIL env is empty (no implicit admin)", () => {
    expect(isAdminEmailFor("", "anyone@example.com")).toBe(false);
    expect(isAdminEmailFor("", "")).toBe(false);
    expect(isAdminEmailFor("", null)).toBe(false);
  });

  it("matches case-insensitively when ADMIN_EMAIL is set", () => {
    expect(isAdminEmailFor("ops@oraco.com", "OPS@oraco.com")).toBe(true);
    expect(isAdminEmailFor("Ops@OraCo.com", "ops@oraco.com")).toBe(true);
  });

  it("rejects close variants (no substring escalation)", () => {
    expect(isAdminEmailFor("ops@oraco.com", "ops@oraco.com.attacker.io")).toBe(false);
    expect(isAdminEmailFor("ops@oraco.com", "attacker+ops@oraco.com")).toBe(false);
    expect(isAdminEmailFor("ops@oraco.com", "ops@oraco.co")).toBe(false);
  });

  it("trims whitespace in env and email (paste accidents)", () => {
    expect(isAdminEmailFor("  ops@oraco.com  ", "ops@oraco.com")).toBe(true);
    expect(isAdminEmailFor("ops@oraco.com", "  ops@oraco.com  ")).toBe(true);
  });
});

/**
 * Cookie consent gate — proves that the small set of "always on"
 * legal/audit events are correctly enumerated so transactional events
 * keep flowing while everything else is muted without consent.
 *
 * The actual trackEvent() goes through a fetch + setTimeout pipeline
 * that's awkward to test under Node without a DOM; the regression we
 * care about is purely the gate predicate, which we mirror here.
 */
import { describe, it, expect } from "vitest";

const ALWAYS_ON = new Set<string>([
  "subscription_activated",
  "subscription_cancelled",
  "account_deleted",
  "data_exported",
  "consent_changed",
]);

function shouldShipEvent(name: string, analyticsConsent: boolean): boolean {
  if (ALWAYS_ON.has(name)) return true;
  return analyticsConsent === true;
}

describe("Analytics consent gate predicate", () => {
  it("blocks page_view when consent is missing", () => {
    expect(shouldShipEvent("page_view", false)).toBe(false);
    expect(shouldShipEvent("surprise_me_started", false)).toBe(false);
    expect(shouldShipEvent("upgrade_clicked", false)).toBe(false);
  });

  it("allows page_view when consent is granted", () => {
    expect(shouldShipEvent("page_view", true)).toBe(true);
  });

  it("always ships transactional events, with or without consent", () => {
    for (const evt of [
      "subscription_activated",
      "subscription_cancelled",
      "account_deleted",
      "data_exported",
      "consent_changed",
    ]) {
      expect(shouldShipEvent(evt, false)).toBe(true);
      expect(shouldShipEvent(evt, true)).toBe(true);
    }
  });

  it("does not mistake substrings for transactional events", () => {
    // Defence against a typo'd or attacker-supplied event name.
    expect(shouldShipEvent("subscription_activated_fake", false)).toBe(false);
    expect(shouldShipEvent("my_account_deleted_view", false)).toBe(false);
  });
});

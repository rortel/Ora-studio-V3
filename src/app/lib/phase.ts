/**
 * Phase 1 feature flag
 * ─────────────────────
 * Phase 1 = Aggregator / Comparator only.
 * Phase 2 (later) will bring back: Studio, Brand Vault, Products,
 * Calendar, and Campaign Lab in Library.
 *
 * While PHASE_1_ONLY is true we HIDE (not delete) the Phase 2 UI
 * entry points. All routes and page code remain intact so we can
 * flip this flag back to `false` to restore Phase 2 instantly.
 *
 * Do NOT delete routes, components, or i18n keys referenced by the
 * hidden Phase 2 surfaces — they must stay warm for relaunch.
 */
export const PHASE_1_ONLY = true;

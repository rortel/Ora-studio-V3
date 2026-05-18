/**
 * Feature flags — single source of truth for UI gating.
 *
 * Each flag controls whether a given user-facing feature is exposed in
 * the UI. The underlying code (server routes, helpers, modal
 * components) stays in the bundle so the flag can be flipped back on
 * without a code change — useful for canaries and quick rollbacks.
 *
 * Defaults are conservative: a missing entry means "off".
 */
export const FEATURES = {
  /**
   * In-app social publishing (Instagram, Facebook, TikTok, LinkedIn via
   * Zernio / Post-for-Me).
   *
   * Disabled in May 2026 because connecting a social account requires
   * a Meta Business Suite / Pro account on every platform, which is a
   * hard friction for independent sellers (our core ICP). The download
   * flow is the supported alternative — users export the assets and
   * publish from their own devices.
   *
   * The server routes (/zernio/*, /campaign/deploy*, /webhook/pollo)
   * and the PublishModal component remain in the codebase so we can
   * re-enable the flag without restoring deleted code. Flipping this
   * to `true` is enough to surface the UI again.
   */
  publish: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

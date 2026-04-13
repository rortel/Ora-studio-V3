/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Keyframe Interpolation — Math utilities
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import type { EasingType, Keyframe, SpatialProps } from "./types";

// ── Easing functions (0..1 → 0..1) ──

export function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case "linear": return t;
    case "ease-in": return t * t;
    case "ease-out": return t * (2 - t);
    case "ease-in-out": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}

// ── Lerp ──

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ── Interpolate a single property from keyframes at a given frame ──

export function interpolateProperty(
  keyframes: Keyframe[],
  property: string,
  relativeFrame: number,
): number | string | undefined {
  // Filter keyframes for this property, sorted by frame
  const kfs = keyframes
    .filter(kf => kf.property === property)
    .sort((a, b) => a.frame - b.frame);

  if (kfs.length === 0) return undefined;

  // Before first keyframe
  if (relativeFrame <= kfs[0].frame) return kfs[0].value;

  // After last keyframe
  if (relativeFrame >= kfs[kfs.length - 1].frame) return kfs[kfs.length - 1].value;

  // Find surrounding keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (relativeFrame >= a.frame && relativeFrame <= b.frame) {
      const range = b.frame - a.frame;
      if (range === 0) return a.value;
      const rawT = (relativeFrame - a.frame) / range;
      const t = applyEasing(rawT, b.easing);

      // Numeric interpolation
      if (typeof a.value === "number" && typeof b.value === "number") {
        return lerp(a.value, b.value, t);
      }
      // String: snap at midpoint
      return t < 0.5 ? a.value : b.value;
    }
  }

  return kfs[kfs.length - 1].value;
}

// ── Compute full spatial props at a given frame, applying keyframe overrides ──

export function interpolateSpatialAtFrame(
  baseSpatial: SpatialProps,
  keyframes: Keyframe[],
  relativeFrame: number,
): SpatialProps {
  const result = { ...baseSpatial };
  const props: (keyof SpatialProps)[] = ["x", "y", "width", "height", "rotation", "opacity", "scaleX", "scaleY"];
  for (const prop of props) {
    const v = interpolateProperty(keyframes, prop, relativeFrame);
    if (v !== undefined && typeof v === "number") {
      result[prop] = v;
    }
  }
  return result;
}

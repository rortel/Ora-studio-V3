/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Animation Presets — Auto-generate keyframes
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import type { AnimationPreset, Keyframe, SpatialProps } from "./types";

/**
 * Generate keyframes for a given animation preset.
 * @param preset The animation preset name
 * @param durationInFrames Total duration of the layer in frames
 * @param spatial The base spatial props (used to compute relative values)
 */
export function generatePresetKeyframes(
  preset: AnimationPreset,
  durationInFrames: number,
  spatial: SpatialProps,
): Keyframe[] {
  const end = durationInFrames;

  switch (preset) {
    case "none":
      return [];

    case "ken-burns-in":
      // Slow zoom-in + slight pan
      return [
        { frame: 0, property: "scaleX", value: 1.0, easing: "ease-in-out" },
        { frame: end, property: "scaleX", value: 1.15, easing: "ease-in-out" },
        { frame: 0, property: "scaleY", value: 1.0, easing: "ease-in-out" },
        { frame: end, property: "scaleY", value: 1.15, easing: "ease-in-out" },
        { frame: 0, property: "x", value: spatial.x, easing: "ease-in-out" },
        { frame: end, property: "x", value: spatial.x - spatial.width * 0.03, easing: "ease-in-out" },
        { frame: 0, property: "y", value: spatial.y, easing: "ease-in-out" },
        { frame: end, property: "y", value: spatial.y - spatial.height * 0.02, easing: "ease-in-out" },
      ];

    case "ken-burns-out":
      // Slow zoom-out + slight pan
      return [
        { frame: 0, property: "scaleX", value: 1.15, easing: "ease-in-out" },
        { frame: end, property: "scaleX", value: 1.0, easing: "ease-in-out" },
        { frame: 0, property: "scaleY", value: 1.15, easing: "ease-in-out" },
        { frame: end, property: "scaleY", value: 1.0, easing: "ease-in-out" },
        { frame: 0, property: "x", value: spatial.x - spatial.width * 0.03, easing: "ease-in-out" },
        { frame: end, property: "x", value: spatial.x, easing: "ease-in-out" },
      ];

    case "fade-in":
      return [
        { frame: 0, property: "opacity", value: 0, easing: "ease-out" },
        { frame: Math.min(15, end), property: "opacity", value: 1, easing: "ease-out" },
      ];

    case "fade-out":
      return [
        { frame: Math.max(0, end - 15), property: "opacity", value: 1, easing: "ease-in" },
        { frame: end, property: "opacity", value: 0, easing: "ease-in" },
      ];

    case "zoom-in":
      return [
        { frame: 0, property: "scaleX", value: 0.5, easing: "ease-out" },
        { frame: Math.min(20, end), property: "scaleX", value: 1.0, easing: "ease-out" },
        { frame: 0, property: "scaleY", value: 0.5, easing: "ease-out" },
        { frame: Math.min(20, end), property: "scaleY", value: 1.0, easing: "ease-out" },
        { frame: 0, property: "opacity", value: 0, easing: "ease-out" },
        { frame: Math.min(10, end), property: "opacity", value: 1, easing: "ease-out" },
      ];

    case "zoom-out":
      return [
        { frame: Math.max(0, end - 20), property: "scaleX", value: 1.0, easing: "ease-in" },
        { frame: end, property: "scaleX", value: 0.5, easing: "ease-in" },
        { frame: Math.max(0, end - 20), property: "scaleY", value: 1.0, easing: "ease-in" },
        { frame: end, property: "scaleY", value: 0.5, easing: "ease-in" },
        { frame: Math.max(0, end - 10), property: "opacity", value: 1, easing: "ease-in" },
        { frame: end, property: "opacity", value: 0, easing: "ease-in" },
      ];

    case "slide-left":
      return [
        { frame: 0, property: "x", value: spatial.x + spatial.width, easing: "ease-out" },
        { frame: Math.min(15, end), property: "x", value: spatial.x, easing: "ease-out" },
        { frame: 0, property: "opacity", value: 0, easing: "ease-out" },
        { frame: Math.min(8, end), property: "opacity", value: 1, easing: "ease-out" },
      ];

    case "slide-right":
      return [
        { frame: 0, property: "x", value: spatial.x - spatial.width, easing: "ease-out" },
        { frame: Math.min(15, end), property: "x", value: spatial.x, easing: "ease-out" },
        { frame: 0, property: "opacity", value: 0, easing: "ease-out" },
        { frame: Math.min(8, end), property: "opacity", value: 1, easing: "ease-out" },
      ];

    default:
      return [];
  }
}

/** All available presets with labels */
export const ANIMATION_PRESET_OPTIONS: { id: AnimationPreset; labelFr: string; labelEn: string }[] = [
  { id: "none", labelFr: "Aucune", labelEn: "None" },
  { id: "ken-burns-in", labelFr: "Ken Burns (zoom in)", labelEn: "Ken Burns (zoom in)" },
  { id: "ken-burns-out", labelFr: "Ken Burns (zoom out)", labelEn: "Ken Burns (zoom out)" },
  { id: "fade-in", labelFr: "Fondu entrant", labelEn: "Fade in" },
  { id: "fade-out", labelFr: "Fondu sortant", labelEn: "Fade out" },
  { id: "zoom-in", labelFr: "Zoom entrant", labelEn: "Zoom in" },
  { id: "zoom-out", labelFr: "Zoom sortant", labelEn: "Zoom out" },
  { id: "slide-left", labelFr: "Glissement gauche", labelEn: "Slide left" },
  { id: "slide-right", labelFr: "Glissement droite", labelEn: "Slide right" },
];

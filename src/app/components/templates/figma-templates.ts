/**
 * Figma-sourced templates — converted from community Figma files.
 *
 * Source files:
 * - Instagram Post Templates (Free) — 3 templates (1080×1080)
 * - Products Post For Social Media — 2 templates (1080×1080)
 * - Instagram Stories Template (Free) — 2 templates (1080×1920)
 * - Instagram Bundle Templates 45+ POSTS — 5 representative templates (1080×1080)
 * - Instagram Template for Skincare — 4 templates (1080×1080)
 * - Instagram Post Flyers — 4 flyer templates (1080×1080)
 * - Fashion Ad Bundle (Free) — 4 templates (posts 1080×1350 + stories 1080×1920)
 * - Instagram Fashion Post — 3 templates (738×875 → mapped to instagram-post)
 * - Professional Pack Instagram Post — 4 templates (1080×1080)
 * - 40+ LinkedIn Carousel Templates — 4 cover templates (1080×1350)
 */
import type { TemplateDefinition, TemplateLayer } from "./types";

// ── Helpers ──

const bgImage: TemplateLayer = {
  id: "bg", type: "background-image", x: 0, y: 0, width: 100, height: 100,
  dataBinding: { source: "asset", field: "imageUrl" }, zIndex: 0,
};

const logo = (x: number, y: number, size = 10): TemplateLayer => ({
  id: "logo", type: "logo", x, y, width: size, height: size,
  dataBinding: { source: "vault", field: "logoUrl" },
  style: { objectFit: "contain", opacity: 0.9 },
  visible: { when: "vault.logoUrl", notEmpty: true }, zIndex: 5,
});

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Post Templates (Free)"
// ══════════════════════════════════════════════════════════════

export const figmaInstagramPostTemplates: TemplateDefinition[] = [
  // ── Figma Post 01: Bold brand name + product image, blue bg ──
  {
    id: "figma-igp-01", name: "Brand Showcase Blue", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      // Solid blue background
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#2F8AC4", opacity: 1 }, zIndex: 0 },
      // Decorative diagonal lines (group of stripes)
      { id: "deco-stripe", type: "shape", x: -5, y: -5, width: 65, height: 110,
        style: { fill: "#2578AB", opacity: 0.3, rotation: -10 }, zIndex: 1 },
      // Main product image — right side
      bgImage,
      // Brand name (big bold text) — left side
      { id: "headline", type: "text", x: 5, y: 18, width: 55, height: 38,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 12, fontWeight: 900, color: "#081E27", textAlign: "left", lineHeight: 0.95, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle — below brand
      { id: "subtitle", type: "text", x: 5, y: 56, width: 50, height: 20,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 6, fontWeight: 300, color: "#081E27", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // CTA arrow circle — bottom left
      { id: "cta-circle", type: "circle", x: 8, y: 78, width: 15, height: 15,
        style: { fill: "#FFFFFF", opacity: 0.95, radius: 7.5 }, zIndex: 4 },
      logo(5, 90, 8),
    ],
  },

  // ── Figma Post 02: "Feel the sensation" — dark blue + accent circle ──
  {
    id: "figma-igp-02", name: "Sensation", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      // Dark blue background
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#1C4CC8", opacity: 1 }, zIndex: 0 },
      // Main image — covers lower 2/3
      { id: "product-img", type: "image", x: 0, y: 26, width: 92, height: 73,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 1 },
      // Headline text — top left
      { id: "headline", type: "text", x: 7, y: 7, width: 62, height: 22,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 8, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.05, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Gold accent circle — bottom right
      { id: "accent-circle", type: "circle", x: 78, y: 78, width: 22, height: 22,
        style: { fill: "#FAD768", opacity: 0.9, radius: 11 }, zIndex: 2 },
      // Small ellipse overlay on image
      { id: "deco-ellipse", type: "circle", x: 48, y: 12, width: 25, height: 20,
        style: { fill: "#FFFFFF", opacity: 0.12, radius: 12 }, zIndex: 2 },
      logo(80, 5, 8),
    ],
  },

  // ── Figma Post 03: Brand name on yellow bg ──
  {
    id: "figma-igp-03", name: "Brand Showcase Yellow", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "playful",
    source: "builtin",
    layers: [
      // Yellow background
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#E4E378", opacity: 1 }, zIndex: 0 },
      // Decorative diagonal lines
      { id: "deco-stripe", type: "shape", x: 40, y: -5, width: 65, height: 110,
        style: { fill: "#CDD16B", opacity: 0.3, rotation: 10 }, zIndex: 1 },
      // Product image — right side, overlapping
      bgImage,
      // Brand name (big bold) — left side
      { id: "headline", type: "text", x: 5, y: 6, width: 55, height: 38,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 12, fontWeight: 900, color: "#1A649F", textAlign: "left", lineHeight: 0.95, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 44, width: 50, height: 20,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 6, fontWeight: 300, color: "#1A649F", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // CTA circle
      { id: "cta-circle", type: "circle", x: 8, y: 72, width: 15, height: 15,
        style: { fill: "#FFFFFF", opacity: 0.95, radius: 7.5 }, zIndex: 4 },
      logo(5, 88, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Products Post For Social Media"
// ══════════════════════════════════════════════════════════════

export const figmaProductPostTemplates: TemplateDefinition[] = [
  // ── Product Post 01: Cyan/teal cosmetic style ──
  {
    id: "figma-product-01", name: "Product Spotlight Teal", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      // Light grey base
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F6F6F6", opacity: 1 }, zIndex: 0 },
      // Abstract background pattern
      bgImage,
      // Bottom bar
      { id: "bottom-bar", type: "shape", x: 0, y: 77, width: 100, height: 23,
        style: { fill: "#000000", opacity: 0.85 }, zIndex: 2 },
      // Large accent circle — center
      { id: "accent-circle", type: "circle", x: 7, y: 10, width: 86, height: 86,
        style: { fill: "vault:primary", opacity: 0.15, radius: 43 }, zIndex: 1 },
      // Brand name — top
      { id: "headline", type: "text", x: 5, y: 3, width: 83, height: 8,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 900, color: "#000000", textAlign: "center", maxLines: 1, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle — "Demo Design"
      { id: "subtitle", type: "text", x: 20, y: 11, width: 48, height: 6,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 3.5, fontWeight: 400, color: "#25BCDE", textAlign: "center", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // CTA button — bottom
      { id: "cta-bg", type: "shape", x: 5, y: 85, width: 26, height: 7,
        style: { fill: "#25BCDE", opacity: 0.95, cornerRadius: 4 }, zIndex: 4 },
      { id: "cta", type: "text", x: 5, y: 85, width: 26, height: 7,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#FFFFFF", textAlign: "center", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      // Phone/contact line
      { id: "contact", type: "text", x: 35, y: 85, width: 40, height: 7,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#25BCDE", textAlign: "left" },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 4 },
      // Logo — top left
      logo(5, 14, 9),
    ],
  },

  // ── Product Post 02: Purple/magenta variant ──
  {
    id: "figma-product-02", name: "Product Spotlight Magenta", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      // Light grey base
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F6F6F6", opacity: 1 }, zIndex: 0 },
      // Abstract background
      bgImage,
      // Bottom bar
      { id: "bottom-bar", type: "shape", x: 0, y: 77, width: 100, height: 23,
        style: { fill: "#000000", opacity: 0.85 }, zIndex: 2 },
      // Accent circle
      { id: "accent-circle", type: "circle", x: 7, y: 10, width: 86, height: 86,
        style: { fill: "vault:primary", opacity: 0.15, radius: 43 }, zIndex: 1 },
      // Brand name
      { id: "headline", type: "text", x: 5, y: 3, width: 83, height: 8,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 900, color: "#000000", textAlign: "center", maxLines: 1, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 20, y: 11, width: 48, height: 6,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 3.5, fontWeight: 400, color: "#CD42CA", textAlign: "center", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // CTA button
      { id: "cta-bg", type: "shape", x: 5, y: 85, width: 26, height: 7,
        style: { fill: "#CD42CA", opacity: 0.95, cornerRadius: 4 }, zIndex: 4 },
      { id: "cta", type: "text", x: 5, y: 85, width: 26, height: 7,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#FFFFFF", textAlign: "center", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      // Contact
      { id: "contact", type: "text", x: 35, y: 85, width: 40, height: 7,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#CD42CA", textAlign: "left" },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 4 },
      logo(5, 14, 9),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM STORY — from "Instagram Stories Template (Free)"
// ══════════════════════════════════════════════════════════════

export const figmaInstagramStoryTemplates: TemplateDefinition[] = [
  // ── Story 01: "Shop now, pay later" — full image + framed product ──
  {
    id: "figma-story-01", name: "Shop & Frame", formatId: "instagram-story",
    aspectRatio: "9:16", canvasWidth: 1080, canvasHeight: 1920, category: "editorial",
    source: "builtin",
    layers: [
      // Full background image
      bgImage,
      // Decorative shape — angled overlay left
      { id: "deco-left", type: "shape", x: -5, y: 15, width: 45, height: 65,
        style: { fill: "#000000", opacity: 0.08, rotation: -8 }, zIndex: 1 },
      // Decorative shape — angled overlay right
      { id: "deco-right", type: "shape", x: 55, y: 20, width: 35, height: 55,
        style: { fill: "#000000", opacity: 0.06, rotation: 5 }, zIndex: 1 },
      // Gradient from bottom for text readability
      { id: "grad", type: "gradient-overlay", x: 0, y: 45, width: 100, height: 55,
        style: { gradientDirection: "bottom", gradientStops: [
          { offset: 0, color: "#000000", opacity: 0 },
          { offset: 1, color: "#000000", opacity: 0.7 },
        ]}, zIndex: 2 },
      // Product image frame — center
      { id: "product-frame", type: "image", x: 15, y: 20, width: 69, height: 53,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover", cornerRadius: 4 }, zIndex: 3 },
      // Main headline
      { id: "headline", type: "text", x: 7, y: 68, width: 84, height: 20,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 7, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.05, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 4 },
      // Decorative line
      { id: "line", type: "line", x: 7, y: 88, width: 42, height: 0.6,
        style: { fill: "#FFFFFF", opacity: 0.7, points: [0, 50, 100, 50] }, zIndex: 4 },
      // CTA button
      { id: "cta-bg", type: "shape", x: 7, y: 90, width: 29, height: 5,
        style: { fill: "#FFFFFF", opacity: 0.95, cornerRadius: 8 }, zIndex: 5 },
      { id: "cta", type: "text", x: 7, y: 90, width: 29, height: 5,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.2, fontWeight: 600, color: "#4C4C4C", textAlign: "center" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 6 },
      logo(7, 5, 8),
    ],
  },

  // ── Story 02: "SALE" — fullscreen image with big text overlay ──
  {
    id: "figma-story-02", name: "Sale Fullscreen", formatId: "instagram-story",
    aspectRatio: "9:16", canvasWidth: 1080, canvasHeight: 1920, category: "bold",
    source: "builtin",
    layers: [
      // Warm beige base
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F3F1E5", opacity: 1 }, zIndex: 0 },
      // Full image behind
      bgImage,
      // Decorative shape overlays
      { id: "deco-left", type: "shape", x: -5, y: 15, width: 45, height: 65,
        style: { fill: "#000000", opacity: 0.06, rotation: -8 }, zIndex: 2 },
      { id: "deco-right", type: "shape", x: 55, y: 20, width: 35, height: 55,
        style: { fill: "#000000", opacity: 0.04, rotation: 5 }, zIndex: 2 },
      // Big headline — centered
      { id: "headline", type: "text", x: 10, y: 25, width: 80, height: 35,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 12, fontWeight: 900, color: "#FFFFFF", textAlign: "center", lineHeight: 0.95, maxLines: 3, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 4 },
      // Subtitle
      { id: "subtitle", type: "text", x: 15, y: 62, width: 70, height: 10,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 3.5, fontWeight: 400, color: "#FFFFFF", textAlign: "center", maxLines: 2, opacity: 0.9 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 4 },
      // Product cutout area
      { id: "product-rect", type: "shape", x: 14, y: 55, width: 72, height: 41,
        style: { fill: "#C4C4C4", opacity: 0.15, cornerRadius: 4 }, zIndex: 3 },
      logo(7, 5, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Bundle Templates 45+ POSTS"
// ══════════════════════════════════════════════════════════════

export const figmaBundleTemplates: TemplateDefinition[] = [
  // ── Bundle 33: Funnel infographic — light warm bg, 3 circles ──
  {
    id: "figma-bundle-33", name: "Funnel Infographic", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F5F0EA", opacity: 1 }, zIndex: 0 },
      // Decorative dots top-right
      { id: "dot-1", type: "circle", x: 82, y: 3, width: 14, height: 14,
        style: { fill: "#DEAC89", opacity: 0.7, radius: 7 }, zIndex: 1 },
      { id: "dot-2", type: "circle", x: 68, y: 3, width: 14, height: 14,
        style: { fill: "#DEAC89", opacity: 0.7, radius: 7 }, zIndex: 1 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 8, width: 57, height: 15,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 6.5, fontWeight: 700, color: "#3E484A", textAlign: "left", lineHeight: 1.05, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle / description
      { id: "subtitle", type: "text", x: 5, y: 23, width: 57, height: 8,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.5, fontWeight: 400, color: "#3E484A", textAlign: "left", lineHeight: 1.4, maxLines: 3 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Three info circles
      { id: "circle-1", type: "circle", x: 28, y: 38, width: 28, height: 28,
        style: { fill: "#384243", opacity: 1, radius: 14 }, zIndex: 2 },
      { id: "circle-2", type: "circle", x: 5, y: 55, width: 28, height: 28,
        style: { fill: "#384243", opacity: 1, radius: 14 }, zIndex: 2 },
      { id: "circle-3", type: "circle", x: 51, y: 55, width: 28, height: 28,
        style: { fill: "#384243", opacity: 1, radius: 14 }, zIndex: 2 },
      // Features text (bullet points)
      { id: "features", type: "text", x: 60, y: 72, width: 35, height: 20,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.8, fontWeight: 600, color: "#000000", textAlign: "left", lineHeight: 1.6 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(5, 90, 8),
    ],
  },

  // ── Bundle 37: Live Tonight — dark bg, image right, event style ──
  {
    id: "figma-bundle-37", name: "Live Event Dark", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#384243", opacity: 1 }, zIndex: 0 },
      // Image on right side
      { id: "product-img", type: "image", x: 38, y: 10, width: 62, height: 55,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover", cornerRadius: 4 }, zIndex: 1 },
      // Big headline
      { id: "headline", type: "text", x: 5, y: 10, width: 54, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.1, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 25, width: 33, height: 5,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.5, fontWeight: 300, color: "#FFFFFF", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Badge "LIVE"
      { id: "badge-bg", type: "shape", x: 5, y: 35, width: 17, height: 6,
        style: { fill: "#FAF6F3", opacity: 1, cornerRadius: 4 }, zIndex: 3 },
      { id: "badge-text", type: "text", x: 5, y: 35, width: 17, height: 6,
        dataBinding: { source: "static", field: "" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#DCAB8B", textAlign: "center" }, zIndex: 4 },
      // CTA / time text
      { id: "cta", type: "text", x: 25, y: 35, width: 30, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#DCAB8B", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      // Website / URL bottom
      { id: "url", type: "text", x: 5, y: 92, width: 30, height: 4,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2, fontWeight: 300, color: "#F5F0EA", textAlign: "left" },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(85, 90, 8),
    ],
  },

  // ── Bundle 35: Q&A style — warm terracotta bg ──
  {
    id: "figma-bundle-35", name: "Q&A Warm", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#DCAB8B", opacity: 1 }, zIndex: 0 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 5, width: 43, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 700, color: "#F1ECE6", textAlign: "left", lineHeight: 1.1, maxLines: 3, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Large decorative letter
      { id: "deco-letter", type: "shape", x: 0, y: 25, width: 35, height: 50,
        style: { fill: "#3E484A", opacity: 0.12 }, zIndex: 1 },
      // Answer boxes
      { id: "box-1", type: "shape", x: 5, y: 55, width: 75, height: 18,
        style: { fill: "#C4C4C4", opacity: 0.25, cornerRadius: 4 }, zIndex: 2 },
      { id: "box-2", type: "shape", x: 5, y: 76, width: 75, height: 18,
        style: { fill: "#C4C4C4", opacity: 0.25, cornerRadius: 4 }, zIndex: 2 },
      // Body text
      { id: "features", type: "text", x: 8, y: 57, width: 69, height: 35,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2.2, fontWeight: 600, color: "#000000", textAlign: "left", lineHeight: 1.6 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(85, 5, 8),
    ],
  },

  // ── Bundle 68: Music/gallery — sage green bg, 3-column images ──
  {
    id: "figma-bundle-68", name: "Gallery Sage", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#D7D8CA", opacity: 1 }, zIndex: 0 },
      // Decorative plant/leaf shape — left
      { id: "deco-plant", type: "shape", x: 0, y: -5, width: 40, height: 95,
        style: { fill: "#CF9E7D", opacity: 0.35 }, zIndex: 1 },
      // Background image
      bgImage,
      // Headline
      { id: "headline", type: "text", x: 5, y: 5, width: 65, height: 10,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 400, color: "#393939", textAlign: "left", lineHeight: 1.1, maxLines: 1 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 15, width: 46, height: 4,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#393939", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Social handle
      { id: "cta", type: "text", x: 55, y: 90, width: 25, height: 5,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2, fontWeight: 300, color: "#000000", textAlign: "right" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(5, 90, 8),
    ],
  },

  // ── Bundle 71: Podcast card — dark charcoal, centered content card ──
  {
    id: "figma-bundle-71", name: "Podcast Card Dark", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#2A2A2A", opacity: 1 }, zIndex: 0 },
      // Content card — centered
      { id: "card", type: "shape", x: 18, y: 10, width: 63, height: 75,
        style: { fill: "#F8F5EE", opacity: 1, cornerRadius: 4 }, zIndex: 1 },
      // Decorative copper elements
      { id: "deco-1", type: "shape", x: 5, y: 25, width: 8, height: 19,
        style: { fill: "#CF9E7D", opacity: 0.8 }, zIndex: 2 },
      { id: "deco-2", type: "shape", x: 87, y: 25, width: 8, height: 19,
        style: { fill: "#CF9E7D", opacity: 0.8 }, zIndex: 2 },
      // Big keyword top-left
      { id: "keyword", type: "text", x: 5, y: 5, width: 20, height: 10,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 600, color: "#F8F5EE", textAlign: "left", textTransform: "uppercase", maxLines: 1 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Card headline
      { id: "headline", type: "text", x: 22, y: 55, width: 55, height: 12,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 4.5, fontWeight: 400, color: "#393939", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Card body
      { id: "body", type: "text", x: 22, y: 68, width: 55, height: 10,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.8, fontWeight: 400, color: "#393939", textAlign: "left", lineHeight: 1.5 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // Social at bottom
      { id: "social", type: "text", x: 22, y: 78, width: 35, height: 4,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2, fontWeight: 300, color: "#000000", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(22, 14, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Template for Skincare"
// ══════════════════════════════════════════════════════════════

export const figmaSkincareTemplates: TemplateDefinition[] = [
  // ── Skincare 01: Sun Screen — dark teal + gold accents ──
  {
    id: "figma-skincare-01", name: "Skincare Hero Teal", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#13564F", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Big headline
      { id: "headline", type: "text", x: 5, y: 10, width: 45, height: 25,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 8, fontWeight: 700, color: "#EFCD91", textAlign: "left", lineHeight: 1.0, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 36, width: 37, height: 5,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Gold decorative circles
      { id: "deco-circle-1", type: "circle", x: 82, y: 75, width: 8, height: 8,
        style: { fill: "#EFCD91", opacity: 0.8, radius: 4 }, zIndex: 2 },
      { id: "deco-circle-2", type: "circle", x: 88, y: 82, width: 3, height: 3,
        style: { fill: "#EFCD91", opacity: 0.6, radius: 1.5 }, zIndex: 2 },
      logo(5, 90, 8),
    ],
  },

  // ── Skincare 04: Testimonial — gold bg + white card ──
  {
    id: "figma-skincare-04", name: "Testimonial Gold", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#EFCD91", opacity: 1 }, zIndex: 0 },
      bgImage,
      // White card
      { id: "card", type: "shape", x: 10, y: 50, width: 70, height: 27,
        style: { fill: "#FFFFFF", opacity: 0.95, cornerRadius: 8 }, zIndex: 2 },
      // "Testimonial" headline
      { id: "headline", type: "text", x: 12, y: 52, width: 60, height: 8,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 700, color: "#13564F", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Quote body
      { id: "features", type: "text", x: 12, y: 60, width: 60, height: 10,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2, fontWeight: 400, color: "#13564F", textAlign: "left", lineHeight: 1.5, maxLines: 4 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // Author name
      { id: "subtitle", type: "text", x: 12, y: 71, width: 30, height: 4,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2, fontWeight: 400, color: "#13564F", textAlign: "left" },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      logo(5, 5, 8),
    ],
  },

  // ── Skincare 05: Serum — dark teal, giant text + benefit circles ──
  {
    id: "figma-skincare-05", name: "Product Benefits Teal", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#13564F", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Giant product name
      { id: "headline", type: "text", x: 5, y: 5, width: 66, height: 30,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 12, fontWeight: 700, color: "#EFCD91", textAlign: "left", lineHeight: 0.95, maxLines: 1 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Benefit circle 1
      { id: "benefit-1", type: "circle", x: 5, y: 50, width: 22, height: 22,
        style: { fill: "#D9D9D9", opacity: 0.25, radius: 11 }, zIndex: 2 },
      // Benefit circle 2
      { id: "benefit-2", type: "circle", x: 30, y: 50, width: 22, height: 22,
        style: { fill: "#D9D9D9", opacity: 0.25, radius: 11 }, zIndex: 2 },
      // Features text inside/below circles
      { id: "features", type: "text", x: 5, y: 75, width: 50, height: 15,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.5 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(5, 90, 8),
    ],
  },

  // ── Skincare 03: Quote overlay — dark teal + full image ──
  {
    id: "figma-skincare-03", name: "Quote Overlay", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#13564F", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Dark overlay for readability
      { id: "overlay", type: "gradient-overlay", x: 0, y: 0, width: 100, height: 100,
        style: { gradientDirection: "bottom", gradientStops: [
          { offset: 0, color: "#000000", opacity: 0.2 },
          { offset: 1, color: "#000000", opacity: 0.6 },
        ]}, zIndex: 1 },
      // Quote text — centered
      { id: "headline", type: "text", x: 10, y: 35, width: 66, height: 20,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 400, color: "#EFCD91", textAlign: "left", lineHeight: 1.2, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      logo(5, 90, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Post Flyers"
// ══════════════════════════════════════════════════════════════

export const figmaFlyerTemplates: TemplateDefinition[] = [
  // ── Flyer: Modern Furniture — dark image bg + discount circle ──
  {
    id: "figma-flyer-furniture", name: "Furniture Promo", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bgImage,
      // Left panel — dark area for text
      { id: "text-panel", type: "shape", x: 0, y: 0, width: 42, height: 100,
        style: { fill: "#200B01", opacity: 0.85 }, zIndex: 1 },
      // Product circle frame — right side
      { id: "circle-outer", type: "circle", x: 38, y: 12, width: 59, height: 59,
        style: { fill: "#FFF8F2", opacity: 0.2, radius: 29.5 }, zIndex: 2 },
      { id: "circle-inner", type: "circle", x: 43, y: 17, width: 46, height: 46,
        style: { fill: "#FFF8F2", opacity: 0.1, radius: 23 }, zIndex: 2 },
      // Headline
      { id: "headline", type: "text", x: 4, y: 20, width: 35, height: 15,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 600, color: "#FFF8F2", textAlign: "left", lineHeight: 1.1, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "subtitle", type: "text", x: 4, y: 37, width: 39, height: 10,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 1.8, fontWeight: 400, color: "#FFF8F2", textAlign: "left", lineHeight: 1.4, maxLines: 4 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // CTA button
      { id: "cta-bg", type: "shape", x: 4, y: 52, width: 26, height: 6,
        style: { fill: "#D37528", opacity: 1, cornerRadius: 4 }, zIndex: 4 },
      { id: "cta", type: "text", x: 4, y: 52, width: 26, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.2, fontWeight: 600, color: "#200B01", textAlign: "center", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      // Discount badge — circle
      { id: "badge-bg", type: "circle", x: 55, y: 55, width: 20, height: 20,
        style: { fill: "#200B01", opacity: 1, radius: 10 }, zIndex: 4 },
      { id: "price", type: "text", x: 55, y: 57, width: 20, height: 16,
        dataBinding: { source: "asset", field: "price" },
        style: { fontSize: 3.5, fontWeight: 600, color: "#FFF8F2", textAlign: "center", lineHeight: 1.0, maxLines: 2 },
        visible: { when: "asset.price", notEmpty: true }, zIndex: 5 },
      logo(4, 5, 8),
    ],
  },

  // ── Flyer: Hygienic Food — warm yellow + food image ──
  {
    id: "figma-flyer-food", name: "Food Delivery", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "playful",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#FFCA6C", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Large accent circle
      { id: "accent-circle", type: "circle", x: 5, y: 55, width: 29, height: 29,
        style: { fill: "#FFF8F2", opacity: 0.7, radius: 14.5 }, zIndex: 1 },
      // Headline — big bold
      { id: "headline", type: "text", x: 5, y: 8, width: 55, height: 22,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 7, fontWeight: 800, color: "#000000", textAlign: "left", lineHeight: 1.0, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // CTA button — bottom
      { id: "cta-bg", type: "shape", x: 5, y: 82, width: 39, height: 9,
        style: { fill: "#7A3D2E", opacity: 1, cornerRadius: 6 }, zIndex: 4 },
      { id: "cta", type: "text", x: 5, y: 82, width: 39, height: 9,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 3.5, fontWeight: 800, color: "#FFFFFF", textAlign: "center", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      // Discount badge
      { id: "badge-text", type: "text", x: 8, y: 58, width: 20, height: 15,
        dataBinding: { source: "asset", field: "price" },
        style: { fontSize: 3.5, fontWeight: 600, color: "#D37528", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.price", notEmpty: true }, zIndex: 3 },
      logo(5, 92, 8),
    ],
  },

  // ── Flyer: Fashion Designer — dark bg + circular product images ──
  {
    id: "figma-flyer-fashion", name: "Fashion Craftsville", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      bgImage,
      // Headline area
      { id: "headline", type: "text", x: 5, y: 8, width: 30, height: 15,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 400, color: "#F2C672", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "subtitle", type: "text", x: 5, y: 28, width: 46, height: 12,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#F2C672", textAlign: "left", lineHeight: 1.4, maxLines: 4 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Large circular product image
      { id: "product-circle", type: "circle", x: 45, y: 15, width: 50, height: 50,
        style: { fill: "#D9D9D9", opacity: 0.15, radius: 25 }, zIndex: 1 },
      // Decorative icons area
      { id: "deco-panel", type: "shape", x: 55, y: 0, width: 45, height: 100,
        style: { fill: "#000000", opacity: 0.04 }, zIndex: 1 },
      logo(5, 90, 8),
    ],
  },

  // ── Flyer: Catering — warm image bg + services list ──
  {
    id: "figma-flyer-catering", name: "Catering Services", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bgImage,
      // Dark overlay
      { id: "overlay", type: "gradient-overlay", x: 0, y: 0, width: 100, height: 100,
        style: { gradientDirection: "bottom", gradientStops: [
          { offset: 0, color: "#000000", opacity: 0.3 },
          { offset: 1, color: "#000000", opacity: 0.7 },
        ]}, zIndex: 1 },
      // 2x2 image grid — center
      { id: "grid-tl", type: "shape", x: 10, y: 10, width: 38, height: 38,
        style: { fill: "#D37528", opacity: 0.2, cornerRadius: 4 }, zIndex: 2 },
      { id: "grid-tr", type: "shape", x: 52, y: 10, width: 38, height: 38,
        style: { fill: "#D37528", opacity: 0.2, cornerRadius: 4 }, zIndex: 2 },
      { id: "grid-bl", type: "shape", x: 10, y: 52, width: 38, height: 38,
        style: { fill: "#D37528", opacity: 0.2, cornerRadius: 4 }, zIndex: 2 },
      { id: "grid-br", type: "shape", x: 52, y: 52, width: 38, height: 38,
        style: { fill: "#D37528", opacity: 0.2, cornerRadius: 4 }, zIndex: 2 },
      // Brand name
      { id: "headline", type: "text", x: 5, y: 56, width: 70, height: 10,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4, fontWeight: 900, color: "#FFCA6C", textAlign: "left", lineHeight: 1.1, maxLines: 1 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 67, width: 70, height: 6,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 3, fontWeight: 300, color: "#FFCA6C", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Services / features list
      { id: "features", type: "text", x: 5, y: 76, width: 35, height: 20,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2, fontWeight: 700, color: "#FFF8F2", textAlign: "left", lineHeight: 1.8, textTransform: "uppercase" },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(80, 90, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// FASHION AD — from "Fashion Ad Bundle (Free)"
// Posts (1080×1350) + Stories (1080×1920)
// ══════════════════════════════════════════════════════════════

export const figmaFashionAdTemplates: TemplateDefinition[] = [
  // ── Fashion Post 01: Elegant image + headline bottom ──
  {
    id: "figma-fashion-post-01", name: "Fashion Elegant", formatId: "instagram-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F6F8F5", opacity: 1 }, zIndex: 0 },
      // Main image — near full frame
      { id: "product-img", type: "image", x: 4, y: 4, width: 91, height: 93,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 1 },
      // Gradient bottom
      { id: "grad", type: "gradient-overlay", x: 0, y: 60, width: 100, height: 40,
        style: { gradientDirection: "bottom", gradientStops: [
          { offset: 0, color: "#000000", opacity: 0 },
          { offset: 1, color: "#000000", opacity: 0.65 },
        ]}, zIndex: 2 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 72, width: 77, height: 14,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 87, width: 55, height: 5,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Social proof text
      { id: "features", type: "text", x: 5, y: 93, width: 60, height: 3,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left", opacity: 0.8 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(85, 5, 7),
    ],
  },

  // ── Fashion Post 03: Bold statement — full image + feature list ──
  {
    id: "figma-fashion-post-03", name: "Fashion Statement", formatId: "instagram-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#FFFFFF", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Dark overlay
      { id: "overlay", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.4 }, zIndex: 1 },
      // Big bold headline
      { id: "headline", type: "text", x: 5, y: 10, width: 55, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 800, color: "#FFFFFF", textAlign: "left", lineHeight: 1.05, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 30, width: 36, height: 8,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Features list
      { id: "features", type: "text", x: 5, y: 70, width: 43, height: 18,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#FFFFFF", textAlign: "left", lineHeight: 1.6, textTransform: "uppercase" },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(5, 92, 7),
    ],
  },

  // ── Fashion Post 09: Testimonial card — warm bg ──
  {
    id: "figma-fashion-post-09", name: "Fashion Testimonial", formatId: "instagram-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#D1BA9C", opacity: 1 }, zIndex: 0 },
      // Product image — top half
      { id: "product-img", type: "image", x: 10, y: 5, width: 70, height: 55,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 1 },
      // Feature badges bar
      { id: "badges-bar", type: "shape", x: 5, y: 60, width: 73, height: 4,
        style: { fill: "#FFFFFF", opacity: 0.95, cornerRadius: 4 }, zIndex: 2 },
      { id: "features", type: "text", x: 7, y: 60, width: 69, height: 4,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.5, fontWeight: 400, color: "#09193A", textAlign: "center", maxLines: 1 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // Testimonial card
      { id: "card", type: "shape", x: 10, y: 67, width: 65, height: 25,
        style: { fill: "#FFFFFF", opacity: 0.95, cornerRadius: 8 }, zIndex: 2 },
      // Quote
      { id: "headline", type: "text", x: 14, y: 72, width: 56, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#091A3B", textAlign: "left", lineHeight: 1.4, maxLines: 4 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Avatar circle
      { id: "avatar", type: "circle", x: 10, y: 88, width: 7, height: 7,
        style: { fill: "#D9D9D9", opacity: 0.5, radius: 3.5 }, zIndex: 3 },
      logo(82, 5, 7),
    ],
  },

  // ── Fashion Story 01: Full image + bottom content ──
  {
    id: "figma-fashion-story-01", name: "Fashion Story Elegant", formatId: "instagram-story",
    aspectRatio: "9:16", canvasWidth: 1080, canvasHeight: 1920, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F6F8F5", opacity: 1 }, zIndex: 0 },
      { id: "product-img", type: "image", x: 4, y: 2, width: 91, height: 93,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 1 },
      { id: "grad", type: "gradient-overlay", x: 0, y: 55, width: 100, height: 45,
        style: { gradientDirection: "bottom", gradientStops: [
          { offset: 0, color: "#000000", opacity: 0 },
          { offset: 1, color: "#000000", opacity: 0.7 },
        ]}, zIndex: 2 },
      { id: "headline", type: "text", x: 5, y: 72, width: 77, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      { id: "subtitle", type: "text", x: 5, y: 85, width: 55, height: 4,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#FFFFFF", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      { id: "features", type: "text", x: 5, y: 90, width: 60, height: 3,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left", opacity: 0.8 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(85, 5, 7),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Fashion Post"
// (738×875 mapped to standard instagram-post 1080×1080)
// ══════════════════════════════════════════════════════════════

export const figmaFashionPostTemplates: TemplateDefinition[] = [
  // ── Summer Sale — dark red bg + product images ──
  {
    id: "figma-fashpost-summer", name: "Summer Sale", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#3D0A00", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Top bar
      { id: "top-bar", type: "shape", x: 0, y: 0, width: 100, height: 12,
        style: { fill: "#FFFFFF", opacity: 0.95 }, zIndex: 2 },
      // Headline — big sale text
      { id: "headline", type: "text", x: 5, y: 15, width: 48, height: 25,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 7, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.0, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "subtitle", type: "text", x: 5, y: 42, width: 45, height: 8,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 1.8, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.4, maxLines: 4 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Heart badge
      { id: "heart-badge", type: "circle", x: 50, y: 45, width: 5, height: 5,
        style: { fill: "#FFFFFF", opacity: 0.9, radius: 2.5 }, zIndex: 3 },
      // "NEW!" label
      { id: "new-badge", type: "shape", x: 58, y: 20, width: 14, height: 8,
        style: { fill: "#EE106F", opacity: 0.9, cornerRadius: 4 }, zIndex: 4 },
      // Bottom bar — profile/social
      { id: "bottom-bar", type: "shape", x: 0, y: 83, width: 100, height: 17,
        style: { fill: "#FFFFFF", opacity: 0.95 }, zIndex: 2 },
      { id: "cta", type: "text", x: 5, y: 86, width: 40, height: 5,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#000000", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(5, 2, 7),
    ],
  },

  // ── Big Sale — white bg + orange accent text ──
  {
    id: "figma-fashpost-bigsale", name: "Big Sale Clean", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#FFFFFF", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Top bar
      { id: "top-bar", type: "shape", x: 0, y: 0, width: 100, height: 12,
        style: { fill: "#FFFFFF", opacity: 0.95 }, zIndex: 2 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 18, width: 30, height: 20,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 7, fontWeight: 700, color: "#000000", textAlign: "left", lineHeight: 1.0, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Price / discount in orange
      { id: "price", type: "text", x: 5, y: 40, width: 47, height: 25,
        dataBinding: { source: "asset", field: "price" },
        style: { fontSize: 7, fontWeight: 700, color: "#FD7E50", textAlign: "left", lineHeight: 1.0, maxLines: 2 },
        visible: { when: "asset.price", notEmpty: true }, zIndex: 3 },
      // Bottom bar
      { id: "bottom-bar", type: "shape", x: 0, y: 83, width: 100, height: 17,
        style: { fill: "#FFFFFF", opacity: 0.95 }, zIndex: 2 },
      { id: "cta", type: "text", x: 5, y: 86, width: 40, height: 5,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#000000", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(5, 2, 7),
    ],
  },

  // ── New Collection — clean white + "Coming Soon" circles ──
  {
    id: "figma-fashpost-collection", name: "New Collection", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#FFFFFF", opacity: 1 }, zIndex: 0 },
      bgImage,
      // Top bar
      { id: "top-bar", type: "shape", x: 0, y: 0, width: 100, height: 12,
        style: { fill: "#FFFFFF", opacity: 0.95 }, zIndex: 2 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 15, width: 47, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 700, color: "#000000", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "subtitle", type: "text", x: 5, y: 35, width: 45, height: 12,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2, fontWeight: 400, color: "#000000", textAlign: "left", lineHeight: 1.4, maxLines: 5 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Decorative circles — right side
      { id: "circle-1", type: "circle", x: 55, y: 25, width: 35, height: 35,
        style: { fill: "#D9D9D9", opacity: 0.3, radius: 17.5 }, zIndex: 1 },
      { id: "circle-2", type: "circle", x: 60, y: 30, width: 25, height: 25,
        style: { fill: "#D9D9D9", opacity: 0.2, radius: 12.5 }, zIndex: 1 },
      // Bottom bar
      { id: "bottom-bar", type: "shape", x: 0, y: 83, width: 100, height: 17,
        style: { fill: "#FFFFFF", opacity: 0.95 }, zIndex: 2 },
      { id: "cta", type: "text", x: 5, y: 86, width: 40, height: 5,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#000000", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(5, 2, 7),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Professional Pack Instagram Post"
// ══════════════════════════════════════════════════════════════

export const figmaProPackTemplates: TemplateDefinition[] = [
  // ── Webinar: Dark red + gold accent, speaker photo ──
  {
    id: "figma-pro-webinar", name: "Business Webinar", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#87221B", opacity: 1 }, zIndex: 0 },
      // Gold accent rectangle
      { id: "accent-rect", type: "shape", x: 0, y: 10, width: 57, height: 73,
        style: { fill: "#EEA23B", opacity: 1, cornerRadius: 4 }, zIndex: 1 },
      // Speaker image
      { id: "speaker-img", type: "image", x: 5, y: 7, width: 67, height: 86,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 2 },
      // Big headline
      { id: "headline", type: "text", x: 50, y: 8, width: 48, height: 22,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 6, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.0, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 50, y: 32, width: 35, height: 4,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.2, fontWeight: 600, color: "#FFFFFF", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "features", type: "text", x: 50, y: 50, width: 34, height: 10,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.8, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.4 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // CTA badge
      { id: "cta-bg", type: "shape", x: 50, y: 38, width: 20, height: 6,
        style: { fill: "#EEA33B", opacity: 1, cornerRadius: 4 }, zIndex: 4 },
      { id: "cta", type: "text", x: 50, y: 38, width: 20, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2, fontWeight: 500, color: "#FFFFFF", textAlign: "center" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      logo(50, 5, 8),
    ],
  },

  // ── Winter Fashion: Soft green bg + 3 image blocks ──
  {
    id: "figma-pro-winter", name: "Winter Collection", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#E0E8E3", opacity: 1 }, zIndex: 0 },
      // Main image — large left
      { id: "main-img", type: "image", x: 5, y: 5, width: 56, height: 56,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 1 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 64, width: 36, height: 10,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5.5, fontWeight: 800, color: "#472E24", textAlign: "left", maxLines: 1, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle
      { id: "subtitle", type: "text", x: 5, y: 75, width: 25, height: 5,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.5, fontWeight: 500, color: "#2D2D2D", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "features", type: "text", x: 5, y: 81, width: 45, height: 10,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.6, fontWeight: 400, color: "#2D2D2D", textAlign: "left", lineHeight: 1.5 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // CTA
      { id: "cta", type: "text", x: 5, y: 93, width: 17, height: 4,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2, fontWeight: 500, color: "#2D2D2D", textAlign: "left", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(85, 90, 7),
    ],
  },

  // ── Fashion Collection: Brown tones, big "NEW ARRIVAL" text ──
  {
    id: "figma-pro-arrival", name: "New Arrival Fashion", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#644B37", opacity: 1 }, zIndex: 0 },
      // Product image — circle
      { id: "product-img", type: "image", x: 38, y: 20, width: 62, height: 62,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover", clipType: "circle" }, zIndex: 1 },
      // Big headline
      { id: "headline", type: "text", x: 5, y: 10, width: 76, height: 36,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 10, fontWeight: 500, color: "#FFEAD7", textAlign: "left", lineHeight: 0.95, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Price / discount
      { id: "price", type: "text", x: 5, y: 52, width: 20, height: 20,
        dataBinding: { source: "asset", field: "price" },
        style: { fontSize: 6, fontWeight: 500, color: "#FFEAD7", textAlign: "left", lineHeight: 1.0, maxLines: 2 },
        visible: { when: "asset.price", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "features", type: "text", x: 5, y: 76, width: 33, height: 12,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.6, fontWeight: 500, color: "#FFFFFF", textAlign: "left", lineHeight: 1.5 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(5, 90, 8),
    ],
  },

  // ── Construction: White + green accents, professional ──
  {
    id: "figma-pro-construction", name: "Construction Pro", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#FFFFFF", opacity: 1 }, zIndex: 0 },
      // Main image — top portion
      { id: "main-img", type: "image", x: 0, y: 0, width: 100, height: 78,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 1 },
      // Green accent shapes
      { id: "accent-1", type: "shape", x: 55, y: 45, width: 45, height: 55,
        style: { fill: "#62BA7D", opacity: 0.85 }, zIndex: 2 },
      { id: "accent-2", type: "shape", x: 0, y: 75, width: 32, height: 25,
        style: { fill: "#04666C", opacity: 0.9 }, zIndex: 2 },
      // Headline
      { id: "headline", type: "text", x: 3, y: 50, width: 45, height: 14,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 700, color: "#2A201E", textAlign: "left", lineHeight: 1.1, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "features", type: "text", x: 3, y: 66, width: 48, height: 10,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.6, fontWeight: 600, color: "#2A201E", textAlign: "left", lineHeight: 1.5 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // Accent text on green
      { id: "subtitle", type: "text", x: 58, y: 55, width: 19, height: 18,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 3, fontWeight: 500, color: "#FFFFFF", textAlign: "left", lineHeight: 1.1, maxLines: 4, textTransform: "uppercase" },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // URL
      { id: "cta", type: "text", x: 3, y: 93, width: 23, height: 3,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 1.6, fontWeight: 600, color: "#2A201E", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(3, 4, 7),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// LINKEDIN POST — from "40+ LinkedIn Carousel Templates"
// Cover slides (1080×1350) mapped to linkedin-post
// ══════════════════════════════════════════════════════════════

export const figmaLinkedInTemplates: TemplateDefinition[] = [
  // ── Carousel 05: Light purple + circle accent ──
  {
    id: "figma-li-carousel-05", name: "Business Growth Purple", formatId: "linkedin-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F9F4FF", opacity: 1 }, zIndex: 0 },
      // Accent circle
      { id: "accent-circle", type: "circle", x: 40, y: 5, width: 54, height: 40,
        style: { fill: "#7D2AE8", opacity: 0.9, radius: 27 }, zIndex: 1 },
      // Headline — big text
      { id: "headline", type: "text", x: 5, y: 20, width: 66, height: 35,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 8, fontWeight: 700, color: "#000000", textAlign: "left", lineHeight: 0.95, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // CTA button
      { id: "cta-bg", type: "shape", x: 5, y: 75, width: 34, height: 6,
        style: { fill: "#FF7928", opacity: 1, cornerRadius: 8 }, zIndex: 4 },
      { id: "cta", type: "text", x: 5, y: 75, width: 34, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 400, color: "#FFFFFF", textAlign: "center" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      logo(5, 90, 7),
    ],
  },

  // ── Carousel 06: Dark navy + geometric ──
  {
    id: "figma-li-carousel-06", name: "Business Growth Navy", formatId: "linkedin-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#071C34", opacity: 1 }, zIndex: 0 },
      // Accent circle with nested circles
      { id: "outer-circle", type: "circle", x: 40, y: 25, width: 54, height: 40,
        style: { fill: "#7D2AE8", opacity: 0.8, radius: 27 }, zIndex: 1 },
      { id: "mid-circle", type: "circle", x: 45, y: 30, width: 40, height: 30,
        style: { fill: "#3E64B4", opacity: 0.7, radius: 20 }, zIndex: 1 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 10, width: 82, height: 30,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 6.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.0, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // CTA
      { id: "cta-bg", type: "shape", x: 5, y: 80, width: 34, height: 6,
        style: { fill: "#7D2AE8", opacity: 1, cornerRadius: 8 }, zIndex: 4 },
      { id: "cta", type: "text", x: 5, y: 80, width: 34, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 400, color: "#FFFFFF", textAlign: "center" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      logo(5, 90, 7),
    ],
  },

  // ── Hiring Post: Purple bg ──
  {
    id: "figma-li-hiring", name: "Hiring Post", formatId: "linkedin-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#7D2AE8", opacity: 1 }, zIndex: 0 },
      // Headline — big bold
      { id: "headline", type: "text", x: 8, y: 15, width: 51, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 8, fontWeight: 800, color: "#000000", textAlign: "left", lineHeight: 0.95, maxLines: 2, textTransform: "uppercase" },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Subtitle (job position)
      { id: "subtitle", type: "text", x: 8, y: 38, width: 72, height: 10,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 3, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.2, maxLines: 2 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // CTA button — "APPLY TODAY"
      { id: "cta-bg", type: "shape", x: 8, y: 52, width: 75, height: 8,
        style: { fill: "#3B0015", opacity: 1, cornerRadius: 6 }, zIndex: 4 },
      { id: "cta", type: "text", x: 8, y: 52, width: 75, height: 8,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 3, fontWeight: 700, color: "#FFFFFF", textAlign: "center", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      // Features / details
      { id: "features", type: "text", x: 8, y: 65, width: 60, height: 12,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.5 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // URL
      { id: "url", type: "text", x: 8, y: 90, width: 25, height: 3,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 1.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(8, 5, 7),
    ],
  },

  // ── Carousel 04: Black bg + green accent — modern ──
  {
    id: "figma-li-carousel-04", name: "Dark Modern Green", formatId: "linkedin-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "neon",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 1 }, zIndex: 0 },
      // Green accent stripe
      { id: "accent-stripe", type: "shape", x: 30, y: 5, width: 40, height: 70,
        style: { fill: "#28FF79", opacity: 0.9, cornerRadius: 8 }, zIndex: 1 },
      // Image inside stripe
      { id: "product-img", type: "image", x: 31, y: 6, width: 38, height: 68,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover", cornerRadius: 6 }, zIndex: 2 },
      // Number accent
      { id: "number", type: "text", x: 5, y: 10, width: 10, height: 15,
        dataBinding: { source: "asset", field: "price" },
        style: { fontSize: 10, fontWeight: 700, color: "#FF7928", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.price", notEmpty: true }, zIndex: 3 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 55, width: 40, height: 28,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5.5, fontWeight: 400, color: "#FFFFFF", textAlign: "left", lineHeight: 1.0, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // URL
      { id: "cta", type: "text", x: 5, y: 90, width: 32, height: 3,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 1.8, fontWeight: 400, color: "#FFFFFF", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(75, 90, 7),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// LINKEDIN AD — from "100+ B2B LinkedIn Ads Templates"
// ══════════════════════════════════════════════════════════════

export const figmaB2BLinkedInTemplates: TemplateDefinition[] = [
  // ── Template 1: Dark navy + purple CTA + product image ──
  {
    id: "figma-b2b-01", name: "B2B Dark CTA", formatId: "linkedin-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#00141F", opacity: 1 }, zIndex: 0 },
      // Product image — right side
      { id: "product-img", type: "image", x: 38, y: 5, width: 62, height: 48,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover" }, zIndex: 1 },
      // Question headline
      { id: "headline", type: "text", x: 5, y: 55, width: 79, height: 15,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Description
      { id: "subtitle", type: "text", x: 5, y: 30, width: 79, height: 18,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 4, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.15, maxLines: 3 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // CTA button
      { id: "cta-bg", type: "shape", x: 5, y: 75, width: 34, height: 9,
        style: { fill: "#865DFF", opacity: 1, cornerRadius: 8 }, zIndex: 4 },
      { id: "cta", type: "text", x: 5, y: 75, width: 34, height: 9,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.8, fontWeight: 700, color: "#F5F5F5", textAlign: "center" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      logo(5, 5, 8),
    ],
  },

  // ── Template 3: Light cream + stats + green accent ──
  {
    id: "figma-b2b-03", name: "B2B Stats Green", formatId: "linkedin-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#FFFBE6", opacity: 1 }, zIndex: 0 },
      // Big stat number
      { id: "price", type: "text", x: 5, y: 5, width: 35, height: 15,
        dataBinding: { source: "asset", field: "price" },
        style: { fontSize: 10, fontWeight: 900, color: "#347928", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.price", notEmpty: true }, zIndex: 3 },
      // Description text
      { id: "subtitle", type: "text", x: 5, y: 22, width: 41, height: 10,
        dataBinding: { source: "asset", field: "subtitle" },
        style: { fontSize: 2.8, fontWeight: 400, color: "#2D2D2D", textAlign: "left", lineHeight: 1.3, maxLines: 3 },
        visible: { when: "asset.subtitle", notEmpty: true }, zIndex: 3 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 60, width: 68, height: 10,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 2.8, fontWeight: 400, color: "#2D2D2D", textAlign: "left", lineHeight: 1.4, maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Before/After bar
      { id: "bar-top", type: "shape", x: 5, y: 35, width: 79, height: 20,
        style: { fill: "#CFCBB7", opacity: 0.6, cornerRadius: 4 }, zIndex: 1 },
      // Green accent bar
      { id: "bar-accent", type: "shape", x: 55, y: 35, width: 31, height: 20,
        style: { fill: "#347928", opacity: 0.9, cornerRadius: 4 }, zIndex: 2 },
      // Features
      { id: "features", type: "text", x: 7, y: 37, width: 45, height: 8,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2.2, fontWeight: 400, color: "#5B5A53", textAlign: "left", lineHeight: 1.5 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(5, 90, 7),
    ],
  },

  // ── Template 5: Red + side-by-side images + tags ──
  {
    id: "figma-b2b-05", name: "B2B Compare Red", formatId: "linkedin-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#EB455F", opacity: 1 }, zIndex: 0 },
      // Headline question
      { id: "headline", type: "text", x: 5, y: 5, width: 64, height: 10,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 3.5, fontWeight: 600, color: "#FCFFE7", textAlign: "left", lineHeight: 1.2, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Image placeholder — left
      { id: "img-left", type: "shape", x: 5, y: 20, width: 36, height: 52,
        style: { fill: "#D9D9D9", opacity: 0.3, cornerRadius: 8 }, zIndex: 1 },
      // Image placeholder — right
      { id: "img-right", type: "shape", x: 45, y: 20, width: 36, height: 52,
        style: { fill: "#D9D9D9", opacity: 0.3, cornerRadius: 8 }, zIndex: 1 },
      // Label bars at bottom of images
      { id: "label-left", type: "shape", x: 5, y: 63, width: 36, height: 9,
        style: { fill: "#171E46", opacity: 1, cornerRadius: 4 }, zIndex: 2 },
      { id: "label-right", type: "shape", x: 45, y: 63, width: 36, height: 9,
        style: { fill: "#171E46", opacity: 1, cornerRadius: 4 }, zIndex: 2 },
      // Background image
      bgImage,
      // Tags row
      { id: "features", type: "text", x: 5, y: 78, width: 80, height: 8,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 1.8, fontWeight: 400, color: "#FCFFE7", textAlign: "left", lineHeight: 1.8 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      logo(5, 90, 7),
    ],
  },

  // ── Template 8: Light warm + red CTA + stats bar ──
  {
    id: "figma-b2b-08", name: "B2B Stats Warm", formatId: "linkedin-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#FFF9F0", opacity: 1 }, zIndex: 0 },
      // Headline
      { id: "headline", type: "text", x: 5, y: 12, width: 76, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 800, color: "#242424", textAlign: "left", lineHeight: 1.1, maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Statistics bar — orange
      { id: "stats-bar", type: "shape", x: 5, y: 30, width: 83, height: 28,
        style: { fill: "#FA812F", opacity: 1, cornerRadius: 8 }, zIndex: 1 },
      // Stats text
      { id: "features", type: "text", x: 8, y: 33, width: 77, height: 22,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 2.5, fontWeight: 500, color: "#FEF3E2", textAlign: "left", lineHeight: 1.8 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // Big stat number
      { id: "price", type: "text", x: 8, y: 32, width: 20, height: 10,
        dataBinding: { source: "asset", field: "price" },
        style: { fontSize: 5.5, fontWeight: 700, color: "#FEF3E2", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.price", notEmpty: true }, zIndex: 3 },
      // CTA button — red
      { id: "cta-bg", type: "shape", x: 5, y: 65, width: 83, height: 9,
        style: { fill: "#FA4032", opacity: 1, cornerRadius: 8 }, zIndex: 4 },
      { id: "cta", type: "text", x: 5, y: 65, width: 83, height: 9,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.8, fontWeight: 700, color: "#F5F5F5", textAlign: "center" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 5 },
      logo(5, 3, 8),
    ],
  },

  // ── Template 7: Dark + colored word rows — list style ──
  {
    id: "figma-b2b-07", name: "B2B List Dark", formatId: "linkedin-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "neon",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#1B1B1B", opacity: 1 }, zIndex: 0 },
      // Colored accent rows
      { id: "row-green", type: "shape", x: 5, y: 8, width: 71, height: 12,
        style: { fill: "#76E7CD", opacity: 1, cornerRadius: 8 }, zIndex: 1 },
      { id: "row-yellow", type: "shape", x: 5, y: 30, width: 67, height: 12,
        style: { fill: "#FFF07C", opacity: 1, cornerRadius: 8 }, zIndex: 1 },
      { id: "row-purple", type: "shape", x: 5, y: 52, width: 42, height: 12,
        style: { fill: "#A600FF", opacity: 1, cornerRadius: 8 }, zIndex: 1 },
      { id: "row-lime", type: "shape", x: 5, y: 74, width: 81, height: 12,
        style: { fill: "#DDF45B", opacity: 1, cornerRadius: 8 }, zIndex: 1 },
      // Headline — features as bullet list
      { id: "headline", type: "text", x: 8, y: 10, width: 65, height: 8,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 900, color: "#1B1B1B", textAlign: "left", maxLines: 1 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 3 },
      // Features in rows
      { id: "features", type: "text", x: 8, y: 32, width: 60, height: 50,
        dataBinding: { source: "asset", field: "featuresText" },
        style: { fontSize: 5, fontWeight: 900, color: "#FFFFFF", textAlign: "left", lineHeight: 2.8 },
        visible: { when: "asset.featuresText", notEmpty: true }, zIndex: 3 },
      // URL
      { id: "cta", type: "text", x: 5, y: 92, width: 38, height: 3,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 400, color: "#E4E0E1", textAlign: "left" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(5, 88, 7),
    ],
  },
];

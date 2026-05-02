/**
 * Figma-inspired templates — redesigned with proper layer stacking.
 *
 * Every template follows one of these proven patterns:
 * A) Full image + gradient overlay + white text (cinematic)
 * B) Full image + opaque panel/bar + white text on panel (split)
 * C) Solid vault-colored bg + partial image zone + text (card)
 * D) Full image + dark scrim + white text (editorial)
 *
 * All accent colors use vault: tokens for brand customization.
 */
import type { TemplateDefinition, TemplateLayer } from "./types";

// ── Thumbnail lookup — Figma-rendered previews stored in /public/templates/ ──
const THUMBNAILS = new Set([
  "figma-igp-01","figma-igp-02","figma-igp-03",
  "figma-story-01","figma-story-02",
  "figma-bundle-33","figma-bundle-35","figma-bundle-37","figma-bundle-68","figma-bundle-71",
  "figma-skincare-01","figma-skincare-02","figma-skincare-03","figma-skincare-04",
  "figma-flyer-music","figma-flyer-fitness","figma-flyer-food",
  "figma-fashion-post-01","figma-fashion-post-02","figma-fashion-post-03",
  "figma-pro-01","figma-pro-02","figma-pro-03","figma-pro-04",
  "figma-linkedin-01","figma-linkedin-02","figma-linkedin-03","figma-linkedin-04",
  "figma-b2b-01","figma-b2b-02","figma-b2b-03","figma-b2b-04","figma-b2b-05",
]);

/** Attach referenceImageUrl to templates that have Figma-rendered thumbnails */
function applyThumbnails(templates: TemplateDefinition[]): TemplateDefinition[] {
  return templates.map(t => THUMBNAILS.has(t.id) ? { ...t, referenceImageUrl: `/templates/${t.id}.png` } : t);
}

// ── Shared helpers ──

const bg: TemplateLayer = {
  id: "bg", type: "background-image", x: 0, y: 0, width: 100, height: 100,
  dataBinding: { source: "asset", field: "imageUrl" }, zIndex: 0,
};

const grad = (id: string, fromY: number, opacity = 0.75): TemplateLayer => ({
  id, type: "gradient-overlay", x: 0, y: fromY, width: 100, height: 100 - fromY,
  style: { gradientDirection: "bottom", gradientStops: [
    { offset: 0, color: "#000000", opacity: 0 },
    { offset: 1, color: "#000000", opacity },
  ]}, zIndex: 1,
});

const gradTop = (id: string, toY: number, opacity = 0.7): TemplateLayer => ({
  id, type: "gradient-overlay", x: 0, y: 0, width: 100, height: toY,
  style: { gradientDirection: "top", gradientStops: [
    { offset: 0, color: "#000000", opacity },
    { offset: 1, color: "#000000", opacity: 0 },
  ]}, zIndex: 1,
});

const logo = (x: number, y: number, size = 8): TemplateLayer => ({
  id: "logo", type: "logo", x, y, width: size, height: size,
  dataBinding: { source: "vault", field: "logoUrl" },
  style: { objectFit: "contain", opacity: 0.9 },
  visible: { when: "vault.logoUrl", notEmpty: true }, zIndex: 6,
});

const panel = (id: string, x: number, y: number, w: number, h: number, fill = "vault:primary", opacity = 0.92, cr = 0): TemplateLayer => ({
  id, type: "shape", x, y, width: w, height: h,
  style: { fill, opacity, cornerRadius: cr }, zIndex: 2,
});

const txt = (id: string, x: number, y: number, w: number, h: number, binding: string, fontSize: number, opts: Partial<TemplateLayer["style"]> = {}, src: "asset" | "vault" = "asset"): TemplateLayer => ({
  id, type: "text", x, y, width: w, height: h,
  dataBinding: { source: src, field: binding },
  style: { fontSize, fontWeight: 700, color: "#FFFFFF", textAlign: "left", lineHeight: 1.15, maxLines: 2, ...opts },
  visible: { when: `${src}.${binding}`, notEmpty: true }, zIndex: 3,
});

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST (1080×1080) — 3 templates from "Instagram Post Templates"
// Pattern: image + gradient + white text
// ══════════════════════════════════════════════════════════════

// ── Positioned product image (not full-bleed) ──
const productImg = (id: string, x: number, y: number, w: number, h: number, zIndex = 1): TemplateLayer => ({
  id, type: "image", x, y, width: w, height: h,
  dataBinding: { source: "asset", field: "imageUrl" },
  style: { opacity: 1 }, zIndex,
});

export const figmaInstagramPostTemplates: TemplateDefinition[] = [
  // ── 01: Bold product card — solid bg + positioned product + headline bottom ──
  // Like the Nike Post thumbnail: colored bg, product center, big text bottom
  {
    id: "figma-igp-01", name: "Brand Showcase Cinematic", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      // Solid dark background
      panel("bg-solid", 0, 0, 100, 100, "#0D0D0D", 1),
      // Accent color block top-left
      panel("accent-block", 0, 0, 100, 3, "vault:primary", 1),
      // Product image — positioned center, not full-bleed
      productImg("bg", 15, 5, 70, 55),
      // Headline zone — bottom area on dark bg
      txt("headline", 6, 63, 88, 18, "headline", 8, { fontWeight: 900, lineHeight: 1.05, maxLines: 3 }),
      txt("subtitle", 6, 82, 75, 7, "subtitle", 3, { fontWeight: 400, opacity: 0.8 }),
      // CTA button
      panel("cta-bg", 6, 90, 35, 7, "vault:primary", 0.95, 10),
      txt("cta", 6, 90, 35, 7, "ctaText", 2.8, { fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(85, 90, 8),
    ],
  },

  // ── 02: Split panel — vault-colored left panel + product image right ──
  {
    id: "figma-igp-02", name: "Split Panel", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      // Right side: product image
      panel("bg-right", 0, 0, 100, 100, "#111111", 1),
      productImg("bg", 45, 0, 55, 100),
      // Left side: solid vault-colored panel for text
      panel("left-panel", 0, 0, 48, 100, "vault:primary", 0.97),
      txt("headline", 5, 18, 40, 32, "headline", 7, { fontWeight: 800, lineHeight: 1.05, maxLines: 4 }),
      txt("subtitle", 5, 52, 40, 18, "subtitle", 2.8, { fontWeight: 400, lineHeight: 1.35, opacity: 0.9, maxLines: 4 }),
      // Decorative line
      { id: "line", type: "line", x: 5, y: 75, width: 18, height: 0.5,
        style: { fill: "#FFFFFF", opacity: 0.7, points: [0, 50, 100, 50] }, zIndex: 3 },
      txt("cta", 5, 80, 38, 7, "ctaText", 2.5, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 2 }),
      logo(5, 5, 10),
    ],
  },

  // ── 03: Top header card — headline top on vault bg + product image bottom ──
  {
    id: "figma-igp-03", name: "Top Header", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "playful",
    source: "builtin",
    layers: [
      // Full solid bg
      panel("bg-solid", 0, 0, 100, 100, "#0D0D0D", 1),
      // Accent strip top
      panel("accent-strip", 0, 0, 100, 2, "vault:primary", 1),
      // Text zone top
      txt("headline", 5, 5, 80, 20, "headline", 7.5, { fontWeight: 900, lineHeight: 1.05, maxLines: 3 }),
      txt("subtitle", 5, 26, 65, 8, "subtitle", 3, { fontWeight: 400, opacity: 0.85 }),
      // Product image — positioned center-bottom
      productImg("bg", 10, 36, 80, 58),
      // Logo bottom corner
      logo(85, 5, 10),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Products Post For Social Media"
// Pattern: image + dark bottom bar + CTA zone
// ══════════════════════════════════════════════════════════════

export const figmaProductPostTemplates: TemplateDefinition[] = [
  // ── Product 01: Image + bottom info bar ──
  {
    id: "figma-product-01", name: "Product Spotlight Teal", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bg,
      // Dark bottom bar for text
      panel("bottom-bar", 0, 72, 100, 28, "#111111", 0.9),
      // Accent circle behind product
      { id: "accent-circle", type: "circle", x: 15, y: 8, width: 70, height: 70,
        style: { fill: "vault:primary", opacity: 0.12, radius: 35 }, zIndex: 1 },
      // Brand headline — on dark bar
      txt("headline", 5, 74, 60, 8, "headline", 4.5, { fontWeight: 900, textTransform: "uppercase", maxLines: 1 }),
      txt("subtitle", 5, 82, 55, 6, "subtitle", 2.8, { fontWeight: 400, color: "vault:primary", opacity: 0.9, maxLines: 1 }),
      // CTA button
      panel("cta-bg", 5, 90, 26, 6, "vault:primary", 0.95, 8),
      txt("cta", 5, 90, 26, 6, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      // Features
      txt("features", 35, 88, 40, 8, "featuresText", 2, { fontWeight: 400, color: "vault:primary" }),
      logo(5, 5, 9),
    ],
  },

  // ── Product 02: Purple/magenta variant ──
  {
    id: "figma-product-02", name: "Product Spotlight Magenta", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bg,
      panel("bottom-bar", 0, 72, 100, 28, "#111111", 0.9),
      { id: "accent-circle", type: "circle", x: 15, y: 8, width: 70, height: 70,
        style: { fill: "vault:secondary", opacity: 0.12, radius: 35 }, zIndex: 1 },
      txt("headline", 5, 74, 60, 8, "headline", 4.5, { fontWeight: 900, textTransform: "uppercase", maxLines: 1 }),
      txt("subtitle", 5, 82, 55, 6, "subtitle", 2.8, { fontWeight: 400, color: "vault:secondary", opacity: 0.9, maxLines: 1 }),
      panel("cta-bg", 5, 90, 26, 6, "vault:secondary", 0.95, 8),
      txt("cta", 5, 90, 26, 6, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      txt("features", 35, 88, 40, 8, "featuresText", 2, { fontWeight: 400, color: "vault:secondary" }),
      logo(5, 5, 9),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM STORY (1080×1920) — 2 templates
// Pattern: full image + gradient bottom + text zone
// ══════════════════════════════════════════════════════════════

export const figmaInstagramStoryTemplates: TemplateDefinition[] = [
  // ── Story 01: Cinematic gradient — product frame center ──
  {
    id: "figma-story-01", name: "Shop & Frame", formatId: "instagram-story",
    aspectRatio: "9:16", canvasWidth: 1080, canvasHeight: 1920, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 50, 0.8),
      txt("headline", 7, 68, 84, 16, "headline", 6, { fontWeight: 700, lineHeight: 1.05, maxLines: 3 }),
      { id: "line", type: "line", x: 7, y: 85, width: 30, height: 0.5,
        style: { fill: "#FFFFFF", opacity: 0.6, points: [0, 50, 100, 50] }, zIndex: 3 },
      panel("cta-bg", 7, 88, 28, 5, "vault:primary", 0.95, 10),
      txt("cta", 7, 88, 28, 5, "ctaText", 2.2, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(7, 3, 7),
    ],
  },

  // ── Story 02: Bold sale — large text overlay ──
  {
    id: "figma-story-02", name: "Sale Fullscreen", formatId: "instagram-story",
    aspectRatio: "9:16", canvasWidth: 1080, canvasHeight: 1920, category: "bold",
    source: "builtin",
    layers: [
      bg,
      // Full dark scrim for text contrast
      { id: "scrim", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.35 }, zIndex: 1 },
      txt("headline", 8, 25, 84, 30, "headline", 10, { fontWeight: 900, textAlign: "center", lineHeight: 0.95, maxLines: 3, textTransform: "uppercase" }),
      txt("subtitle", 15, 58, 70, 8, "subtitle", 3.5, { fontWeight: 400, textAlign: "center", opacity: 0.9 }),
      panel("cta-bg", 25, 88, 50, 6, "vault:primary", 0.95, 12),
      txt("cta", 25, 88, 50, 6, "ctaText", 2.8, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(7, 4, 7),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Bundle Templates 45+ POSTS"
// Mixed patterns: solid bg (card), split panel, gradient
// ══════════════════════════════════════════════════════════════

export const figmaBundleTemplates: TemplateDefinition[] = [
  // ── Bundle 33: Infographic — solid warm bg + dark circles ──
  {
    id: "figma-bundle-33", name: "Funnel Infographic", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      panel("bg-solid", 0, 0, 100, 100, "vault:primary", 0.12),
      { id: "bg-tint", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F5F0EA", opacity: 1 }, zIndex: 0 },
      // Decorative circles
      { id: "circle-1", type: "circle", x: 28, y: 38, width: 28, height: 28,
        style: { fill: "vault:primary", opacity: 0.85, radius: 14 }, zIndex: 2 },
      { id: "circle-2", type: "circle", x: 5, y: 55, width: 28, height: 28,
        style: { fill: "vault:primary", opacity: 0.85, radius: 14 }, zIndex: 2 },
      { id: "circle-3", type: "circle", x: 51, y: 55, width: 28, height: 28,
        style: { fill: "vault:primary", opacity: 0.85, radius: 14 }, zIndex: 2 },
      txt("headline", 5, 8, 60, 15, "headline", 6, { fontWeight: 700, color: "#3E484A", lineHeight: 1.05 }),
      txt("subtitle", 5, 23, 57, 10, "subtitle", 2.5, { fontWeight: 400, color: "#3E484A", lineHeight: 1.4, maxLines: 3 }),
      txt("features", 5, 85, 90, 10, "featuresText", 2, { fontWeight: 500, color: "#3E484A", lineHeight: 1.5 }),
      logo(5, 92, 7),
    ],
  },

  // ── Bundle 37: Event dark — split layout, image right ──
  {
    id: "figma-bundle-37", name: "Live Event Dark", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#1A1A1A", opacity: 1 }, zIndex: 0 },
      // Partial image right
      { id: "product-img", type: "image", x: 40, y: 5, width: 58, height: 60,
        dataBinding: { source: "asset", field: "imageUrl" },
        style: { objectFit: "cover", cornerRadius: 4 }, zIndex: 1 },
      txt("headline", 5, 10, 50, 15, "headline", 5.5, { fontWeight: 800, lineHeight: 1.05, textTransform: "uppercase" }),
      txt("subtitle", 5, 27, 35, 6, "subtitle", 2.5, { fontWeight: 300, opacity: 0.8 }),
      // Accent badge
      panel("badge-bg", 5, 37, 18, 5.5, "vault:primary", 1, 6),
      txt("cta", 5, 37, 18, 5.5, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      txt("features", 5, 72, 90, 20, "featuresText", 2, { fontWeight: 400, opacity: 0.7, lineHeight: 1.6 }),
      logo(85, 90, 7),
    ],
  },

  // ── Bundle 35: Q&A — warm solid bg ──
  {
    id: "figma-bundle-35", name: "Q&A Warm", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      { id: "bg-solid", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "vault:primary", opacity: 0.25 }, zIndex: 0 },
      { id: "bg-warm", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#F5F0EA", opacity: 1 }, zIndex: 0 },
      txt("headline", 5, 5, 55, 20, "headline", 5.5, { fontWeight: 700, color: "vault:primary", lineHeight: 1.1, maxLines: 3, textTransform: "uppercase" }),
      // Answer boxes
      panel("box-1", 5, 50, 90, 18, "vault:primary", 0.08, 8),
      panel("box-2", 5, 72, 90, 18, "vault:primary", 0.08, 8),
      txt("features", 8, 52, 84, 36, "featuresText", 2.2, { fontWeight: 500, color: "#333333", lineHeight: 1.6 }),
      logo(85, 5, 7),
    ],
  },

  // ── Bundle 68: Gallery — image + gradient bottom ──
  {
    id: "figma-bundle-68", name: "Gallery Editorial", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 55, 0.8),
      txt("headline", 5, 60, 70, 15, "headline", 6, { fontWeight: 700, lineHeight: 1.1, maxLines: 2 }),
      txt("subtitle", 5, 76, 55, 8, "subtitle", 2.8, { fontWeight: 400, opacity: 0.85 }),
      txt("cta", 5, 90, 40, 5, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(5, 5, 7),
    ],
  },

  // ── Bundle 71: Card on dark bg ──
  {
    id: "figma-bundle-71", name: "Podcast Card Dark", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      { id: "bg-dark", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#1A1A1A", opacity: 1 }, zIndex: 0 },
      // White content card
      panel("card", 15, 8, 70, 80, "#FFFFFF", 0.98, 8),
      // Accent bars
      panel("deco-1", 3, 25, 7, 20, "vault:primary", 0.8),
      panel("deco-2", 90, 25, 7, 20, "vault:primary", 0.8),
      // Card content
      txt("headline", 19, 15, 62, 12, "headline", 5, { fontWeight: 700, color: "vault:primary", textTransform: "uppercase", maxLines: 1 }),
      txt("subtitle", 19, 45, 62, 15, "subtitle", 4, { fontWeight: 400, color: "#333333", lineHeight: 1.15 }),
      txt("features", 19, 62, 62, 18, "featuresText", 2, { fontWeight: 400, color: "#666666", lineHeight: 1.5 }),
      txt("cta", 19, 80, 40, 4, "ctaText", 2, { fontWeight: 600, color: "vault:primary" }),
      logo(19, 28, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Template for Skincare"
// Pattern: image + gradient or split
// ══════════════════════════════════════════════════════════════

export const figmaSkincareTemplates: TemplateDefinition[] = [
  // ── Skincare 01: Image + dark bottom zone ──
  {
    id: "figma-skincare-01", name: "Skincare Hero", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 45, 0.85),
      panel("accent-line", 5, 58, 18, 0.8, "vault:primary", 1),
      txt("headline", 5, 60, 70, 18, "headline", 7, { fontWeight: 800, lineHeight: 1.05, maxLines: 3 }),
      txt("subtitle", 5, 79, 55, 8, "subtitle", 3, { fontWeight: 400, opacity: 0.85 }),
      panel("cta-bg", 5, 89, 30, 6, "vault:primary", 0.95, 10),
      txt("cta", 5, 89, 30, 6, "ctaText", 2.5, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(85, 5, 8),
    ],
  },

  // ── Skincare 02: Split — vault panel right ──
  {
    id: "figma-skincare-02", name: "Skincare Split", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bg,
      panel("right-panel", 55, 0, 45, 100, "vault:primary", 0.93),
      txt("headline", 58, 15, 38, 25, "headline", 6.5, { fontWeight: 800, lineHeight: 1.05, maxLines: 3 }),
      txt("subtitle", 58, 42, 38, 15, "subtitle", 2.8, { fontWeight: 400, lineHeight: 1.3, opacity: 0.85, maxLines: 3 }),
      txt("cta", 58, 80, 35, 6, "ctaText", 2.2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      txt("features", 58, 60, 38, 18, "featuresText", 2, { fontWeight: 400, lineHeight: 1.6, opacity: 0.8 }),
      logo(58, 5, 8),
    ],
  },

  // ── Skincare 03: Full overlay — dark scrim ──
  {
    id: "figma-skincare-03", name: "Skincare Overlay", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    source: "builtin",
    layers: [
      bg,
      { id: "scrim", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.4 }, zIndex: 1 },
      txt("headline", 10, 30, 80, 20, "headline", 8, { fontWeight: 900, textAlign: "center", lineHeight: 1.0, maxLines: 3 }),
      txt("subtitle", 15, 52, 70, 10, "subtitle", 3.2, { fontWeight: 400, textAlign: "center", opacity: 0.9 }),
      panel("cta-bg", 30, 88, 40, 6, "vault:primary", 0.95, 12),
      txt("cta", 30, 88, 40, 6, "ctaText", 2.5, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(42, 8, 16),
    ],
  },

  // ── Skincare 04: Corner badge ──
  {
    id: "figma-skincare-04", name: "Skincare Badge", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      panel("badge", 0, 68, 55, 32, "vault:primary", 0.92, 0),
      txt("headline", 4, 72, 48, 14, "headline", 5, { fontWeight: 800, lineHeight: 1.1, maxLines: 2 }),
      txt("cta", 4, 90, 40, 5, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      // Price badge
      panel("price-bg", 75, 5, 20, 10, "vault:primary", 0.95, 8),
      txt("price", 75, 5, 20, 10, "price", 4, { fontWeight: 700, textAlign: "center" }),
      logo(5, 5, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — from "Instagram Post Flyers"
// Pattern: gradient + bold text
// ══════════════════════════════════════════════════════════════

export const figmaFlyerTemplates: TemplateDefinition[] = [
  // ── Flyer 01: Music event — gradient bottom ──
  {
    id: "figma-flyer-music", name: "Music Event", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 35, 0.85),
      panel("accent", 5, 55, 22, 1, "vault:primary", 1),
      txt("headline", 5, 58, 75, 20, "headline", 8, { fontWeight: 900, lineHeight: 0.95, maxLines: 3, textTransform: "uppercase" }),
      txt("subtitle", 5, 78, 65, 8, "subtitle", 3, { fontWeight: 400, opacity: 0.85 }),
      txt("cta", 5, 90, 40, 5, "ctaText", 2.2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(85, 5, 8),
    ],
  },

  // ── Flyer 02: Fitness — split panel ──
  {
    id: "figma-flyer-fitness", name: "Fitness Promo", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bg,
      panel("left-panel", 0, 0, 42, 100, "#111111", 0.92),
      panel("accent-strip", 0, 0, 1.5, 100, "vault:primary", 1),
      txt("headline", 3, 15, 37, 35, "headline", 6.5, { fontWeight: 900, lineHeight: 1.0, maxLines: 4 }),
      txt("subtitle", 3, 55, 37, 15, "subtitle", 2.8, { fontWeight: 400, opacity: 0.8, lineHeight: 1.3, maxLines: 3 }),
      panel("cta-bg", 3, 85, 25, 6, "vault:primary", 0.95, 8),
      txt("cta", 3, 85, 25, 6, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(3, 5, 8),
    ],
  },

  // ── Flyer 03: Food — bottom bar ──
  {
    id: "figma-flyer-food", name: "Food Promo", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      panel("bottom-zone", 0, 65, 100, 35, "#111111", 0.88),
      panel("accent-line", 0, 65, 100, 0.8, "vault:primary", 1),
      txt("headline", 5, 68, 70, 14, "headline", 6, { fontWeight: 800, lineHeight: 1.05, maxLines: 2 }),
      txt("subtitle", 5, 82, 55, 6, "subtitle", 2.8, { fontWeight: 400, opacity: 0.85 }),
      panel("cta-bg", 5, 90, 28, 6, "vault:primary", 0.95, 10),
      txt("cta", 5, 90, 28, 6, "ctaText", 2.5, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      // Price badge top-right
      panel("price-bg", 75, 5, 20, 10, "vault:primary", 0.95, 8),
      txt("price", 75, 5, 20, 10, "price", 4, { fontWeight: 700, textAlign: "center" }),
      logo(5, 5, 8),
    ],
  },

  // ── Flyer 04: Fashion — full scrim + centered ──
  {
    id: "figma-flyer-fashion", name: "Fashion Promo", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    source: "builtin",
    layers: [
      bg,
      { id: "scrim", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.35 }, zIndex: 1 },
      txt("headline", 10, 30, 80, 20, "headline", 9, { fontWeight: 900, textAlign: "center", lineHeight: 0.95, maxLines: 2, textTransform: "uppercase" }),
      txt("subtitle", 15, 52, 70, 8, "subtitle", 3.2, { fontWeight: 400, textAlign: "center", opacity: 0.9 }),
      panel("cta-bg", 28, 88, 44, 6, "vault:primary", 0.95, 12),
      txt("cta", 28, 88, 44, 6, "ctaText", 2.8, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(42, 10, 16),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// FASHION AD — posts (1080×1350) + stories (1080×1920)
// Pattern: gradient or split panel
// ══════════════════════════════════════════════════════════════

export const figmaFashionAdTemplates: TemplateDefinition[] = [
  // ── Fashion Ad 01: Post — gradient bottom ──
  {
    id: "figma-fashion-ad-01", name: "Fashion Lookbook", formatId: "instagram-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 50, 0.82),
      panel("accent", 5, 62, 20, 0.8, "vault:primary", 1),
      txt("headline", 5, 64, 70, 18, "headline", 7, { fontWeight: 800, lineHeight: 1.0, maxLines: 3 }),
      txt("subtitle", 5, 82, 55, 6, "subtitle", 3, { fontWeight: 400, opacity: 0.85 }),
      panel("cta-bg", 5, 90, 30, 5, "vault:primary", 0.95, 10),
      txt("cta", 5, 90, 30, 5, "ctaText", 2.2, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(85, 3, 7),
    ],
  },

  // ── Fashion Ad 02: Post — split right panel ──
  {
    id: "figma-fashion-ad-02", name: "Fashion Split", formatId: "instagram-post",
    aspectRatio: "4:5", canvasWidth: 1080, canvasHeight: 1350, category: "bold",
    source: "builtin",
    layers: [
      bg,
      panel("right-panel", 55, 0, 45, 100, "vault:primary", 0.92),
      txt("headline", 58, 12, 38, 25, "headline", 6, { fontWeight: 800, lineHeight: 1.05, maxLines: 4 }),
      txt("subtitle", 58, 40, 38, 15, "subtitle", 2.5, { fontWeight: 400, lineHeight: 1.3, opacity: 0.85, maxLines: 4 }),
      // Price
      txt("price", 58, 62, 38, 10, "price", 5, { fontWeight: 700 }),
      panel("cta-bg", 58, 80, 30, 5, "#FFFFFF", 0.95, 10),
      txt("cta", 58, 80, 30, 5, "ctaText", 2.2, { fontWeight: 700, textAlign: "center", color: "vault:primary", textTransform: "uppercase" }),
      logo(58, 3, 7),
    ],
  },

  // ── Fashion Ad 03: Story — cinematic ──
  {
    id: "figma-fashion-story-01", name: "Fashion Story", formatId: "instagram-story",
    aspectRatio: "9:16", canvasWidth: 1080, canvasHeight: 1920, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 45, 0.82),
      txt("headline", 7, 62, 86, 16, "headline", 7, { fontWeight: 800, lineHeight: 1.0, maxLines: 3 }),
      txt("subtitle", 7, 79, 70, 6, "subtitle", 3, { fontWeight: 400, opacity: 0.85 }),
      panel("cta-bg", 7, 88, 35, 5, "vault:primary", 0.95, 10),
      txt("cta", 7, 88, 35, 5, "ctaText", 2.5, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(7, 3, 7),
    ],
  },

  // ── Fashion Ad 04: Story — bold overlay ──
  {
    id: "figma-fashion-story-02", name: "Fashion Bold Story", formatId: "instagram-story",
    aspectRatio: "9:16", canvasWidth: 1080, canvasHeight: 1920, category: "bold",
    source: "builtin",
    layers: [
      bg,
      { id: "scrim", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.3 }, zIndex: 1 },
      txt("headline", 8, 25, 84, 25, "headline", 9, { fontWeight: 900, textAlign: "center", lineHeight: 0.95, maxLines: 3, textTransform: "uppercase" }),
      txt("subtitle", 12, 53, 76, 8, "subtitle", 3.2, { fontWeight: 400, textAlign: "center", opacity: 0.9 }),
      panel("cta-bg", 20, 88, 60, 5.5, "vault:primary", 0.95, 12),
      txt("cta", 20, 88, 60, 5.5, "ctaText", 2.8, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(40, 5, 20),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM FASHION POST (1080×1080) — 3 templates
// ══════════════════════════════════════════════════════════════

export const figmaFashionPostTemplates: TemplateDefinition[] = [
  // ── Fashion Post 01: Gradient bottom ──
  {
    id: "figma-fashion-post-01", name: "Fashion Minimal", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 50, 0.78),
      txt("headline", 5, 62, 70, 18, "headline", 7, { fontWeight: 700, lineHeight: 1.05, maxLines: 2 }),
      txt("subtitle", 5, 80, 55, 6, "subtitle", 2.8, { fontWeight: 400, opacity: 0.85 }),
      txt("cta", 5, 92, 40, 4, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(85, 5, 8),
    ],
  },

  // ── Fashion Post 02: Dark panel bottom ──
  {
    id: "figma-fashion-post-02", name: "Fashion Banner", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    source: "builtin",
    layers: [
      bg,
      panel("bottom-bar", 0, 70, 100, 30, "#111111", 0.9),
      panel("accent-line", 0, 70, 100, 0.8, "vault:primary", 1),
      txt("headline", 5, 73, 65, 12, "headline", 5.5, { fontWeight: 800, lineHeight: 1.05, maxLines: 2 }),
      txt("subtitle", 5, 85, 50, 5, "subtitle", 2.5, { fontWeight: 400, opacity: 0.8 }),
      panel("cta-bg", 70, 85, 25, 6, "vault:primary", 0.95, 10),
      txt("cta", 70, 85, 25, 6, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(5, 5, 8),
    ],
  },

  // ── Fashion Post 03: Split left ──
  {
    id: "figma-fashion-post-03", name: "Fashion Editorial", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      panel("left-panel", 0, 0, 40, 100, "vault:primary", 0.93),
      txt("headline", 4, 18, 34, 30, "headline", 6, { fontWeight: 800, lineHeight: 1.05, maxLines: 3 }),
      txt("subtitle", 4, 50, 34, 18, "subtitle", 2.5, { fontWeight: 400, lineHeight: 1.3, opacity: 0.85, maxLines: 4 }),
      { id: "line", type: "line", x: 4, y: 73, width: 12, height: 0.5,
        style: { fill: "#FFFFFF", opacity: 0.6, points: [0, 50, 100, 50] }, zIndex: 3 },
      txt("cta", 4, 78, 32, 5, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(4, 5, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// PROFESSIONAL PACK — INSTAGRAM POST (1080×1080)
// ══════════════════════════════════════════════════════════════

export const figmaProPackTemplates: TemplateDefinition[] = [
  // ── Pro 01: Corporate gradient ──
  {
    id: "figma-pro-01", name: "Corporate Gradient", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 40, 0.85),
      panel("accent", 5, 55, 22, 1, "vault:primary", 1),
      txt("headline", 5, 58, 70, 20, "headline", 7, { fontWeight: 800, lineHeight: 1.0, maxLines: 3 }),
      txt("subtitle", 5, 78, 55, 8, "subtitle", 3, { fontWeight: 400, opacity: 0.85 }),
      panel("cta-bg", 5, 89, 30, 6.5, "vault:primary", 0.95, 10),
      txt("cta", 5, 89, 30, 6.5, "ctaText", 2.5, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(85, 5, 8),
    ],
  },

  // ── Pro 02: Split panel corporate ──
  {
    id: "figma-pro-02", name: "Corporate Split", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    source: "builtin",
    layers: [
      bg,
      panel("left-panel", 0, 0, 42, 100, "vault:primary", 0.94),
      txt("headline", 4, 15, 36, 30, "headline", 6, { fontWeight: 800, lineHeight: 1.05, maxLines: 3 }),
      txt("subtitle", 4, 48, 36, 18, "subtitle", 2.5, { fontWeight: 400, lineHeight: 1.3, opacity: 0.85, maxLines: 4 }),
      txt("features", 4, 68, 36, 15, "featuresText", 1.8, { fontWeight: 400, lineHeight: 1.6, opacity: 0.75 }),
      txt("cta", 4, 88, 35, 5, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(4, 4, 8),
    ],
  },

  // ── Pro 03: Bottom bar ──
  {
    id: "figma-pro-03", name: "Professional Bar", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      panel("bottom-zone", 0, 68, 100, 32, "#111111", 0.9),
      panel("accent-line", 0, 68, 100, 0.8, "vault:primary", 1),
      txt("headline", 5, 71, 65, 12, "headline", 5.5, { fontWeight: 800, lineHeight: 1.1, maxLines: 2 }),
      txt("subtitle", 5, 83, 50, 6, "subtitle", 2.5, { fontWeight: 400, opacity: 0.8 }),
      panel("cta-bg", 68, 84, 27, 6, "vault:primary", 0.95, 10),
      txt("cta", 68, 84, 27, 6, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(5, 5, 8),
    ],
  },

  // ── Pro 04: Centered overlay ──
  {
    id: "figma-pro-04", name: "Professional Overlay", formatId: "instagram-post",
    aspectRatio: "1:1", canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    source: "builtin",
    layers: [
      bg,
      { id: "scrim", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.4 }, zIndex: 1 },
      // Centered content box
      panel("content-box", 10, 25, 80, 50, "vault:primary", 0.12, 8),
      txt("headline", 15, 30, 70, 18, "headline", 7, { fontWeight: 900, textAlign: "center", lineHeight: 1.0, maxLines: 3 }),
      txt("subtitle", 18, 50, 64, 10, "subtitle", 3, { fontWeight: 400, textAlign: "center", opacity: 0.9 }),
      panel("cta-bg", 28, 63, 44, 6, "vault:primary", 0.95, 12),
      txt("cta", 28, 63, 44, 6, "ctaText", 2.8, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(40, 8, 20),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// LANDSCAPE POST (1200×628 → 1.91:1) — 4 templates
// ══════════════════════════════════════════════════════════════

export const figmaLandscapeTemplates: TemplateDefinition[] = [
  // ── Landscape 01: Split panel ──
  {
    id: "figma-linkedin-01", name: "Landscape Split", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "corporate",
    source: "builtin",
    layers: [
      bg,
      panel("left-panel", 0, 0, 45, 100, "vault:primary", 0.94),
      txt("headline", 4, 15, 38, 30, "headline", 5, { fontWeight: 800, lineHeight: 1.1, maxLines: 3 }),
      txt("subtitle", 4, 50, 38, 20, "subtitle", 2.5, { fontWeight: 400, lineHeight: 1.3, opacity: 0.85, maxLines: 3 }),
      txt("cta", 4, 82, 35, 6, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(4, 4, 8),
    ],
  },

  // ── Landscape 02: Bottom gradient ──
  {
    id: "figma-linkedin-02", name: "Landscape Cinematic", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "bold",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 35, 0.85),
      txt("headline", 4, 55, 60, 22, "headline", 5.5, { fontWeight: 800, lineHeight: 1.1, maxLines: 2 }),
      txt("cta", 4, 85, 40, 6, "ctaText", 2.2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(88, 5, 8),
    ],
  },

  // ── Landscape 03: Corner badge ──
  {
    id: "figma-linkedin-03", name: "Landscape Badge", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      panel("badge", 0, 65, 50, 35, "vault:primary", 0.94),
      txt("headline", 3, 69, 45, 16, "headline", 4, { fontWeight: 800, lineHeight: 1.15, maxLines: 2 }),
      txt("cta", 3, 90, 35, 5, "ctaText", 1.8, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(88, 5, 8),
    ],
  },

  // ── Landscape 04: Dark overlay ──
  {
    id: "figma-linkedin-04", name: "Landscape Overlay", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "minimal",
    source: "builtin",
    layers: [
      bg,
      { id: "scrim", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.4 }, zIndex: 1 },
      txt("headline", 10, 25, 80, 25, "headline", 6, { fontWeight: 900, textAlign: "center", lineHeight: 1.05, maxLines: 2 }),
      txt("subtitle", 15, 55, 70, 12, "subtitle", 3, { fontWeight: 400, textAlign: "center", opacity: 0.9 }),
      panel("cta-bg", 32, 78, 36, 8, "vault:primary", 0.95, 12),
      txt("cta", 32, 78, 36, 8, "ctaText", 2.5, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(4, 4, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// B2B ADS (1200×628) — 5 templates
// ══════════════════════════════════════════════════════════════

export const figmaB2BTemplates: TemplateDefinition[] = [
  // ── B2B 01: Split professional ──
  {
    id: "figma-b2b-01", name: "B2B Professional", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "corporate",
    source: "builtin",
    layers: [
      bg,
      panel("left-panel", 0, 0, 48, 100, "vault:primary", 0.95),
      txt("headline", 4, 12, 42, 35, "headline", 5, { fontWeight: 800, lineHeight: 1.1, maxLines: 3 }),
      txt("subtitle", 4, 50, 42, 20, "subtitle", 2.5, { fontWeight: 400, lineHeight: 1.3, opacity: 0.85, maxLines: 3 }),
      txt("cta", 4, 82, 35, 6, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(4, 4, 8),
    ],
  },

  // ── B2B 02: Gradient + stats ──
  {
    id: "figma-b2b-02", name: "B2B Impact", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "bold",
    source: "builtin",
    layers: [
      bg,
      grad("grad", 30, 0.88),
      txt("headline", 4, 45, 60, 25, "headline", 5.5, { fontWeight: 900, lineHeight: 1.05, maxLines: 2 }),
      txt("subtitle", 4, 72, 55, 10, "subtitle", 2.5, { fontWeight: 400, opacity: 0.85 }),
      panel("cta-bg", 4, 86, 28, 7, "vault:primary", 0.95, 10),
      txt("cta", 4, 86, 28, 7, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(88, 4, 8),
    ],
  },

  // ── B2B 03: Full overlay ──
  {
    id: "figma-b2b-03", name: "B2B Showcase", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "editorial",
    source: "builtin",
    layers: [
      bg,
      { id: "scrim", type: "shape", x: 0, y: 0, width: 100, height: 100,
        style: { fill: "#000000", opacity: 0.45 }, zIndex: 1 },
      txt("headline", 8, 20, 84, 25, "headline", 6, { fontWeight: 900, textAlign: "center", lineHeight: 1.05, maxLines: 2 }),
      txt("features", 15, 50, 70, 15, "featuresText", 2.5, { fontWeight: 400, textAlign: "center", lineHeight: 1.5, opacity: 0.9 }),
      panel("cta-bg", 30, 75, 40, 9, "vault:primary", 0.95, 12),
      txt("cta", 30, 75, 40, 9, "ctaText", 2.8, { fontWeight: 700, textAlign: "center", textTransform: "uppercase" }),
      logo(4, 4, 8),
    ],
  },

  // ── B2B 04: Corner badge ──
  {
    id: "figma-b2b-04", name: "B2B Badge", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "minimal",
    source: "builtin",
    layers: [
      bg,
      panel("badge", 0, 60, 55, 40, "vault:primary", 0.94),
      txt("headline", 3, 64, 50, 18, "headline", 4.5, { fontWeight: 800, lineHeight: 1.1, maxLines: 2 }),
      txt("cta", 3, 88, 40, 5, "ctaText", 2, { fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }),
      logo(88, 4, 8),
    ],
  },

  // ── B2B 05: Right panel ──
  {
    id: "figma-b2b-05", name: "B2B Right Panel", formatId: "facebook-post",
    aspectRatio: "1.91:1", canvasWidth: 1200, canvasHeight: 628, category: "corporate",
    source: "builtin",
    layers: [
      bg,
      panel("right-panel", 52, 0, 48, 100, "vault:primary", 0.94),
      txt("headline", 55, 12, 42, 35, "headline", 5, { fontWeight: 800, lineHeight: 1.1, maxLines: 3 }),
      txt("subtitle", 55, 50, 42, 20, "subtitle", 2.5, { fontWeight: 400, lineHeight: 1.3, opacity: 0.85, maxLines: 3 }),
      panel("cta-bg", 55, 78, 30, 7, "#FFFFFF", 0.95, 10),
      txt("cta", 55, 78, 30, 7, "ctaText", 2.3, { fontWeight: 700, textAlign: "center", color: "vault:primary", textTransform: "uppercase" }),
      logo(55, 4, 8),
    ],
  },
];

// ── Apply Figma thumbnails to all exported arrays ──
// Mutate in-place so consumers get referenceImageUrl automatically
[figmaInstagramPostTemplates, figmaProductPostTemplates, figmaInstagramStoryTemplates,
 figmaBundleTemplates, figmaSkincareTemplates, figmaFlyerTemplates,
 figmaFashionAdTemplates, figmaFashionPostTemplates, figmaProPackTemplates,
 figmaLandscapeTemplates, figmaB2BTemplates].forEach(arr => {
  for (let i = 0; i < arr.length; i++) {
    if (THUMBNAILS.has(arr[i].id)) {
      arr[i] = { ...arr[i], referenceImageUrl: `/templates/${arr[i].id}.png` };
    }
  }
});

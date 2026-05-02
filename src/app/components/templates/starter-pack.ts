import type { TemplateDefinition, TemplateLayer } from "./types";

// ── Shared layer helpers ──

const bg: TemplateLayer = {
  id: "bg", type: "background-image", x: 0, y: 0, width: 100, height: 100,
  dataBinding: { source: "asset", field: "imageUrl" }, zIndex: 0,
};

const grad = (id: string, from: number, dir: "bottom" | "top" = "bottom", opacity = 0.75): TemplateLayer => ({
  id, type: "gradient-overlay", x: 0, y: dir === "bottom" ? from : 0, width: 100, height: dir === "bottom" ? 100 - from : from,
  style: { gradientDirection: dir, gradientStops: [{ offset: 0, color: "#000000", opacity: 0 }, { offset: 1, color: "#000000", opacity }] },
  zIndex: 1,
});

const logo = (x: number, y: number, size = 10): TemplateLayer => ({
  id: "logo", type: "logo", x, y, width: size, height: size,
  dataBinding: { source: "vault", field: "logoUrl" },
  style: { objectFit: "contain", opacity: 0.9 },
  visible: { when: "vault.logoUrl", notEmpty: true }, zIndex: 5,
});

const headlineLayer = (x: number, y: number, w: number, h: number, fontSize: number, opts: Partial<TemplateLayer["style"]> = {}): TemplateLayer => ({
  id: "headline", type: "text", x, y, width: w, height: h,
  dataBinding: { source: "asset", field: "headline" },
  style: { fontSize, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2, ...opts },
  visible: { when: "asset.headline", notEmpty: true }, zIndex: 3,
});

const ctaLayer = (x: number, y: number, w: number, h: number, fontSize: number, opts: Partial<TemplateLayer["style"]> = {}): TemplateLayer => ({
  id: "cta", type: "text", x, y, width: w, height: h,
  dataBinding: { source: "asset", field: "ctaText" },
  style: { fontSize, fontWeight: 600, color: "#FFFFFF", textAlign: "left", textTransform: "uppercase", letterSpacing: 1, ...opts },
  visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 4,
});

const bar = (x: number, y: number, w: number, h: number, fill = "vault:primary", opacity = 0.92): TemplateLayer => ({
  id: "bar", type: "shape", x, y, width: w, height: h,
  style: { fill, opacity }, zIndex: 2,
});

const accent = (id: string, x: number, y: number, w: number, h: number, fill = "vault:primary", opacity = 0.6, cornerRadius = 0): TemplateLayer => ({
  id, type: "shape", x, y, width: w, height: h,
  style: { fill, opacity, cornerRadius }, zIndex: 2,
});

// ══════════════════════════════════════════════════════════════
// LANDSCAPE POST — 5 new templates (1.91:1, Facebook landscape)
// ══════════════════════════════════════════════════════════════

const landscapePostStarterPack: TemplateDefinition[] = [
  {
    id: "lp-magazine", name: "Magazine", formatId: "facebook-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "magazine",
    layers: [
      bg,
      bar("sidebar", 0, 0, 35, 100, "#111111", 0.88),
      headlineLayer(3, 25, 30, 25, 4.5, { textAlign: "left", lineHeight: 1.2 }),
      ctaLayer(3, 85, 28, 6, 2, { color: "vault:primary" }),
      logo(3, 5, 10),
      accent("line", 3, 55, 15, 0.5, "vault:primary", 1),
    ],
  },
  {
    id: "lp-corporate", name: "Corporate", formatId: "facebook-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "corporate",
    layers: [
      bg,
      grad("grad", 0, "top", 0.6),
      bar("topbar", 0, 0, 100, 18, "vault:primary", 0.95),
      headlineLayer(5, 2, 65, 14, 3.5, { textAlign: "left", maxLines: 2 }),
      ctaLayer(5, 88, 35, 6, 2.2),
      logo(85, 3, 10),
    ],
  },
  {
    id: "lp-neon", name: "Neon", formatId: "facebook-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "neon",
    layers: [
      bg,
      grad("grad", 30, "bottom", 0.85),
      headlineLayer(5, 60, 60, 22, 5.5, { textAlign: "left", lineHeight: 1.1, shadowColor: "vault:primary", shadowBlur: 20, shadowOffsetX: 0, shadowOffsetY: 0 }),
      ctaLayer(5, 90, 40, 6, 2.5, { shadowColor: "vault:primary", shadowBlur: 10 }),
      logo(88, 88, 8),
    ],
  },
  {
    id: "lp-vintage", name: "Vintage", formatId: "facebook-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "vintage",
    layers: [
      bg,
      { id: "overlay", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#2a1810", opacity: 0.3 }, zIndex: 1 },
      { id: "frame", type: "shape", x: 3, y: 5, width: 94, height: 90, style: { fill: "transparent", opacity: 1, stroke: "#D4A574", strokeWidth: 2 }, zIndex: 2 },
      headlineLayer(8, 65, 55, 20, 5, { fontFamily: "Georgia", textAlign: "left", lineHeight: 1.2 }),
      ctaLayer(8, 88, 40, 6, 2.2, { fontFamily: "Georgia", letterSpacing: 3 }),
      logo(85, 8, 10),
    ],
  },
  {
    id: "lp-playful", name: "Playful", formatId: "facebook-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "playful",
    layers: [
      bg,
      accent("circle1", 70, -10, 40, 65, "vault:primary", 0.3, 50),
      accent("circle2", -5, 60, 30, 50, "vault:primary", 0.2, 50),
      grad("grad", 50, "bottom", 0.7),
      headlineLayer(5, 65, 55, 20, 5, { textAlign: "left", lineHeight: 1.15 }),
      ctaLayer(5, 90, 30, 6, 2.2, { color: "vault:primary" }),
      logo(88, 5, 9),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM POST — 5 new templates
// ══════════════════════════════════════════════════════════════

const instagramPostStarterPack: TemplateDefinition[] = [
  {
    id: "ip-magazine", name: "Magazine", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "magazine",
    layers: [
      bg,
      bar("topstrip", 0, 0, 100, 12, "#111111", 0.9),
      bar("bottomstrip", 0, 82, 100, 18, "#111111", 0.9),
      headlineLayer(5, 83, 65, 14, 4.5, { textAlign: "left" }),
      ctaLayer(5, 3, 40, 6, 2, { color: "vault:primary", textTransform: "uppercase", letterSpacing: 2 }),
      logo(85, 2, 10),
    ],
  },
  {
    id: "ip-corporate", name: "Corporate", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    layers: [
      bg,
      grad("grad", 55, "bottom", 0.8),
      accent("badge", 5, 5, 30, 6, "vault:primary", 0.95, 3),
      headlineLayer(5, 68, 60, 18, 5, { textAlign: "left" }),
      ctaLayer(5, 90, 40, 6, 2.5),
      logo(5, 6, 0, /* hidden behind badge text */),
    ],
  },
  {
    id: "ip-neon", name: "Neon", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "neon",
    layers: [
      bg,
      { id: "darken", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#000000", opacity: 0.4 }, zIndex: 1 },
      headlineLayer(10, 35, 80, 30, 6, { textAlign: "center", lineHeight: 1.1, shadowColor: "vault:primary", shadowBlur: 25 }),
      ctaLayer(20, 88, 60, 6, 2.5, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 15 }),
      logo(43, 5, 14),
    ],
  },
  {
    id: "ip-vintage", name: "Vintage", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "vintage",
    layers: [
      bg,
      { id: "sepia", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#3d2b1f", opacity: 0.25 }, zIndex: 1 },
      { id: "frame", type: "shape", x: 4, y: 4, width: 92, height: 92, style: { fill: "transparent", stroke: "#C9A96E", strokeWidth: 2, opacity: 0.8 }, zIndex: 2 },
      headlineLayer(10, 70, 80, 16, 5.5, { fontFamily: "Georgia", textAlign: "center", lineHeight: 1.2 }),
      ctaLayer(20, 90, 60, 5, 2, { fontFamily: "Georgia", textAlign: "center", letterSpacing: 4 }),
      logo(42, 6, 14),
    ],
  },
  {
    id: "ip-playful", name: "Playful", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "playful",
    layers: [
      bg,
      accent("blob1", -10, -15, 50, 45, "vault:primary", 0.25, 50),
      accent("blob2", 65, 70, 45, 40, "vault:primary", 0.2, 50),
      grad("grad", 60, "bottom", 0.65),
      headlineLayer(8, 70, 84, 16, 5, { textAlign: "left", lineHeight: 1.15 }),
      ctaLayer(8, 92, 40, 5, 2.2, { color: "vault:primary" }),
      logo(82, 5, 12),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// INSTAGRAM STORY — 5 new templates
// ══════════════════════════════════════════════════════════════

const instagramStoryStarterPack: TemplateDefinition[] = [
  {
    id: "is-magazine", name: "Magazine", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "magazine",
    layers: [
      bg,
      bar("topbar", 0, 0, 100, 8, "#111111", 0.9),
      bar("bottombar", 0, 75, 100, 25, "#111111", 0.88),
      headlineLayer(5, 78, 65, 12, 4, { textAlign: "left" }),
      ctaLayer(5, 92, 50, 4, 2, { color: "vault:primary", letterSpacing: 2 }),
      logo(5, 2, 8),
    ],
  },
  {
    id: "is-corporate", name: "Corporate", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "corporate",
    layers: [
      bg,
      grad("grad", 55, "bottom", 0.85),
      accent("badge", 5, 80, 50, 4, "vault:primary", 0.95, 4),
      headlineLayer(5, 64, 70, 14, 4.5, { textAlign: "left" }),
      ctaLayer(7, 81, 46, 3, 1.8, { color: "#FFFFFF" }),
      logo(82, 3, 12),
    ],
  },
  {
    id: "is-neon", name: "Neon", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "neon",
    layers: [
      bg,
      { id: "dark", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#000000", opacity: 0.5 }, zIndex: 1 },
      headlineLayer(8, 40, 84, 15, 5, { textAlign: "center", lineHeight: 1.1, shadowColor: "vault:primary", shadowBlur: 30 }),
      ctaLayer(15, 88, 70, 4, 2.5, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 15 }),
      logo(40, 5, 18),
    ],
  },
  {
    id: "is-vintage", name: "Vintage", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "vintage",
    layers: [
      bg,
      { id: "sepia", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#3d2b1f", opacity: 0.2 }, zIndex: 1 },
      { id: "frame", type: "shape", x: 3, y: 2, width: 94, height: 96, style: { fill: "transparent", stroke: "#C9A96E", strokeWidth: 2 }, zIndex: 2 },
      headlineLayer(8, 72, 84, 12, 4.5, { fontFamily: "Georgia", textAlign: "center" }),
      ctaLayer(20, 88, 60, 4, 2, { fontFamily: "Georgia", textAlign: "center", letterSpacing: 3 }),
      logo(38, 4, 22),
    ],
  },
  {
    id: "is-playful", name: "Playful", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "playful",
    layers: [
      bg,
      accent("blob1", -15, -8, 55, 25, "vault:primary", 0.25, 50),
      accent("blob2", 55, 75, 55, 28, "vault:primary", 0.2, 50),
      grad("grad", 60, "bottom", 0.6),
      headlineLayer(8, 70, 84, 14, 4.5, { textAlign: "left", lineHeight: 1.15 }),
      ctaLayer(8, 92, 45, 4, 2.2, { color: "vault:primary" }),
      logo(78, 3, 14),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// FACEBOOK AD — 5 new templates
// ══════════════════════════════════════════════════════════════

const facebookAdStarterPack: TemplateDefinition[] = [
  {
    id: "fa-magazine", name: "Magazine", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "magazine",
    layers: [
      bg,
      bar("left", 0, 0, 38, 100, "#111111", 0.9),
      headlineLayer(3, 30, 33, 25, 4.5, { lineHeight: 1.2 }),
      ctaLayer(3, 80, 30, 7, 2.2, { color: "vault:primary" }),
      logo(3, 5, 10),
    ],
  },
  {
    id: "fa-corporate", name: "Corporate", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "corporate",
    layers: [
      bg,
      grad("grad", 45, "bottom", 0.8),
      bar("ctabg", 55, 82, 40, 13, "vault:primary", 0.95),
      headlineLayer(5, 55, 50, 20, 5, { lineHeight: 1.1 }),
      ctaLayer(58, 85, 34, 7, 2.5, { textAlign: "center" }),
      logo(5, 5, 10),
    ],
  },
  {
    id: "fa-neon", name: "Neon", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "neon",
    layers: [
      bg,
      { id: "dark", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#000000", opacity: 0.45 }, zIndex: 1 },
      headlineLayer(10, 30, 80, 25, 6, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 25 }),
      ctaLayer(25, 88, 50, 7, 2.5, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 12 }),
      logo(44, 5, 10),
    ],
  },
  {
    id: "fa-vintage", name: "Vintage", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "vintage",
    layers: [
      bg,
      { id: "warm", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#2a1810", opacity: 0.3 }, zIndex: 1 },
      headlineLayer(8, 60, 55, 22, 5, { fontFamily: "Georgia", lineHeight: 1.2 }),
      ctaLayer(8, 88, 40, 7, 2.2, { fontFamily: "Georgia", letterSpacing: 3 }),
      logo(85, 5, 10),
    ],
  },
  {
    id: "fa-playful", name: "Playful", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "playful",
    layers: [
      bg,
      accent("c1", 70, -15, 40, 60, "vault:primary", 0.25, 50),
      grad("grad", 45, "bottom", 0.65),
      headlineLayer(5, 58, 55, 22, 5, { lineHeight: 1.15 }),
      ctaLayer(5, 88, 35, 7, 2.3, { color: "vault:primary" }),
      logo(88, 5, 9),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// YOUTUBE THUMBNAIL — 5 new templates
// ══════════════════════════════════════════════════════════════

const youtubeThumbnailStarterPack: TemplateDefinition[] = [
  {
    id: "yt-magazine", name: "Magazine", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "magazine",
    layers: [
      bg,
      bar("side", 0, 0, 40, 100, "#111111", 0.88),
      headlineLayer(3, 25, 35, 35, 5.5, { lineHeight: 1.1 }),
      ctaLayer(3, 88, 30, 6, 2.2, { color: "vault:primary" }),
      logo(3, 5, 10),
    ],
  },
  {
    id: "yt-corporate", name: "Corporate", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "corporate",
    layers: [
      bg,
      bar("bottom", 0, 72, 100, 28, "vault:primary", 0.92),
      headlineLayer(5, 76, 70, 18, 5, { textAlign: "left", lineHeight: 1.1 }),
      logo(88, 78, 8),
    ],
  },
  {
    id: "yt-neon", name: "Neon", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "neon",
    layers: [
      bg,
      { id: "dark", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#000000", opacity: 0.35 }, zIndex: 1 },
      headlineLayer(5, 55, 90, 30, 7, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 30 }),
      logo(43, 3, 12),
    ],
  },
  {
    id: "yt-vintage", name: "Vintage", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "vintage",
    layers: [
      bg,
      { id: "warm", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#2a1810", opacity: 0.25 }, zIndex: 1 },
      headlineLayer(5, 60, 60, 25, 6, { fontFamily: "Georgia", lineHeight: 1.1 }),
      logo(85, 5, 10),
    ],
  },
  {
    id: "yt-playful", name: "Playful", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "playful",
    layers: [
      bg,
      accent("blob", -10, -15, 50, 50, "vault:primary", 0.3, 50),
      grad("grad", 50, "bottom", 0.6),
      headlineLayer(5, 62, 55, 25, 6, { lineHeight: 1.1 }),
      ctaLayer(5, 90, 35, 6, 2.5, { color: "vault:primary" }),
      logo(88, 5, 9),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// PINTEREST PIN — 5 new templates
// ══════════════════════════════════════════════════════════════

const pinterestPinStarterPack: TemplateDefinition[] = [
  {
    id: "pp-magazine", name: "Magazine", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "magazine",
    layers: [
      bg,
      bar("topstrip", 0, 0, 100, 10, "#111111", 0.9),
      bar("bottomstrip", 0, 80, 100, 20, "#111111", 0.88),
      headlineLayer(5, 82, 60, 12, 4, { textAlign: "left" }),
      ctaLayer(5, 3, 40, 5, 1.8, { color: "vault:primary", letterSpacing: 2 }),
      logo(82, 2, 12),
    ],
  },
  {
    id: "pp-corporate", name: "Corporate", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "corporate",
    layers: [
      bg,
      grad("grad", 50, "bottom", 0.8),
      accent("badge", 5, 80, 50, 5, "vault:primary", 0.95, 4),
      headlineLayer(5, 66, 70, 12, 4, { textAlign: "left" }),
      ctaLayer(7, 81, 46, 3, 1.8),
      logo(82, 3, 12),
    ],
  },
  {
    id: "pp-neon", name: "Neon", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "neon",
    layers: [
      bg,
      { id: "dark", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#000000", opacity: 0.45 }, zIndex: 1 },
      headlineLayer(8, 42, 84, 14, 4.5, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 25 }),
      ctaLayer(20, 88, 60, 4, 2.2, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 12 }),
      logo(40, 4, 18),
    ],
  },
  {
    id: "pp-vintage", name: "Vintage", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "vintage",
    layers: [
      bg,
      { id: "sepia", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#3d2b1f", opacity: 0.2 }, zIndex: 1 },
      { id: "frame", type: "shape", x: 3, y: 2, width: 94, height: 96, style: { fill: "transparent", stroke: "#C9A96E", strokeWidth: 2 }, zIndex: 2 },
      headlineLayer(8, 72, 84, 12, 4, { fontFamily: "Georgia", textAlign: "center" }),
      ctaLayer(25, 88, 50, 4, 1.8, { fontFamily: "Georgia", textAlign: "center", letterSpacing: 3 }),
      logo(40, 4, 18),
    ],
  },
  {
    id: "pp-playful", name: "Playful", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "playful",
    layers: [
      bg,
      accent("blob1", -12, -6, 50, 22, "vault:primary", 0.25, 50),
      accent("blob2", 60, 78, 48, 25, "vault:primary", 0.2, 50),
      grad("grad", 60, "bottom", 0.6),
      headlineLayer(8, 72, 84, 14, 4.5, { lineHeight: 1.15 }),
      ctaLayer(8, 92, 45, 4, 2, { color: "vault:primary" }),
      logo(78, 3, 14),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// X POST — 5 new templates
// ══════════════════════════════════════════════════════════════

const xPostStarterPack: TemplateDefinition[] = [
  {
    id: "xp-magazine", name: "Magazine", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "magazine",
    layers: [
      bg,
      bar("side", 0, 0, 38, 100, "#111111", 0.88),
      headlineLayer(3, 25, 33, 30, 4.5, { lineHeight: 1.2 }),
      ctaLayer(3, 85, 30, 6, 2, { color: "vault:primary" }),
      logo(3, 5, 10),
    ],
  },
  {
    id: "xp-corporate", name: "Corporate", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "corporate",
    layers: [
      bg,
      bar("top", 0, 0, 100, 18, "vault:primary", 0.92),
      headlineLayer(5, 2, 65, 14, 3.5),
      ctaLayer(5, 88, 35, 6, 2.2),
      logo(85, 3, 10),
    ],
  },
  {
    id: "xp-neon", name: "Neon", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "neon",
    layers: [
      bg,
      { id: "dark", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#000000", opacity: 0.4 }, zIndex: 1 },
      headlineLayer(10, 50, 80, 30, 6, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 25 }),
      logo(43, 4, 12),
    ],
  },
  {
    id: "xp-vintage", name: "Vintage", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "vintage",
    layers: [
      bg,
      { id: "warm", type: "shape", x: 0, y: 0, width: 100, height: 100, style: { fill: "#2a1810", opacity: 0.3 }, zIndex: 1 },
      headlineLayer(8, 58, 55, 25, 5, { fontFamily: "Georgia", lineHeight: 1.2 }),
      logo(85, 5, 10),
    ],
  },
  {
    id: "xp-playful", name: "Playful", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "playful",
    layers: [
      bg,
      accent("blob", 65, -15, 45, 55, "vault:primary", 0.25, 50),
      grad("grad", 50, "bottom", 0.6),
      headlineLayer(5, 60, 55, 25, 5, { lineHeight: 1.15 }),
      ctaLayer(5, 90, 35, 6, 2.3, { color: "vault:primary" }),
      logo(88, 5, 9),
    ],
  },
];

// ── Export all starter pack templates ──

export const STARTER_PACK_TEMPLATES: TemplateDefinition[] = [
  ...landscapePostStarterPack,
  ...instagramPostStarterPack,
  ...instagramStoryStarterPack,
  ...facebookAdStarterPack,
  ...youtubeThumbnailStarterPack,
  ...pinterestPinStarterPack,
  ...xPostStarterPack,
];

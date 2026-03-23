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

const headline = (x: number, y: number, w: number, h: number, fontSize: number, opts: Partial<TemplateLayer["style"]> = {}): TemplateLayer => ({
  id: "headline", type: "text", x, y, width: w, height: h,
  dataBinding: { source: "asset", field: "headline" },
  style: { fontSize, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2, lineHeight: 1.15, ...opts },
  visible: { when: "asset.headline", notEmpty: true }, zIndex: 3,
});

const cta = (x: number, y: number, w: number, h: number, fontSize: number, opts: Partial<TemplateLayer["style"]> = {}): TemplateLayer => ({
  id: "cta", type: "text", x, y, width: w, height: h,
  dataBinding: { source: "asset", field: "ctaText" },
  style: { fontSize, fontWeight: 600, color: "#FFFFFF", textAlign: "left", textTransform: "uppercase", letterSpacing: 1.5, ...opts },
  visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 4,
});

const bar = (id: string, x: number, y: number, w: number, h: number, fill = "vault:primary", opacity = 0.92, cornerRadius = 0): TemplateLayer => ({
  id, type: "shape", x, y, width: w, height: h,
  style: { fill, opacity, cornerRadius }, zIndex: 2,
});

const shape = (id: string, x: number, y: number, w: number, h: number, fill: string, opacity = 1, extra: Partial<TemplateLayer["style"]> = {}): TemplateLayer => ({
  id, type: "shape", x, y, width: w, height: h,
  style: { fill, opacity, ...extra }, zIndex: 2,
});

// ══════════════════════════════════════════════════════════════
// 1) LINKEDIN POST — 1.91:1 (1200×628)
// ══════════════════════════════════════════════════════════════

const linkedinPostTemplates: TemplateDefinition[] = [
  // ── Split Panel ──
  {
    id: "lp-split", name: "Split Panel", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 0, 42, 100, "vault:primary", 0.95),
      headline(4, 20, 35, 30, 4.5, { lineHeight: 1.15 }),
      cta(4, 80, 30, 8, 2, { color: "#FFFFFF", letterSpacing: 2 }),
      shape("line", 4, 74, 12, 0.5, "#FFFFFF", 0.5),
      logo(4, 5, 9),
    ],
  },
  // ── Cinematic ──
  {
    id: "lp-cinematic", name: "Cinematic", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "bold",
    layers: [
      bg,
      grad("grad", 35, "bottom", 0.85),
      headline(5, 60, 55, 22, 5.5, { lineHeight: 1.1 }),
      cta(5, 88, 35, 6, 2.2),
      logo(88, 5, 8),
    ],
  },
  // ── Corner Badge ──
  {
    id: "lp-corner", name: "Corner Badge", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "minimal",
    layers: [
      bg,
      bar("badge", 0, 72, 48, 28, "vault:primary", 0.94),
      headline(3, 76, 43, 16, 3.8, { lineHeight: 1.2 }),
      cta(3, 93, 30, 4, 1.8),
      logo(88, 5, 8),
    ],
  },
  // ── Top Bar ──
  {
    id: "lp-topbar", name: "Top Bar", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "corporate",
    layers: [
      bg,
      bar("top", 0, 0, 100, 20, "vault:primary", 0.94),
      headline(4, 2, 70, 16, 3.5),
      logo(88, 3, 8),
      grad("bottomgrad", 65, "bottom", 0.5),
      cta(5, 88, 35, 6, 2.2),
    ],
  },
  // ── Centered ──
  {
    id: "lp-centered", name: "Centered", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "gradient",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.4),
      headline(10, 30, 80, 25, 5.5, { textAlign: "center", lineHeight: 1.15 }),
      cta(25, 80, 50, 8, 2.5, { textAlign: "center" }),
      logo(44, 5, 12),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// 2) INSTAGRAM POST — 1:1 (1080×1080)
// ══════════════════════════════════════════════════════════════

const instagramPostTemplates: TemplateDefinition[] = [
  // ── Split Panel ──
  {
    id: "ip-split", name: "Split Panel", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 72, 100, 28, "vault:primary", 0.94),
      headline(5, 75, 65, 16, 4.5, { lineHeight: 1.15 }),
      cta(5, 93, 40, 4, 2, { letterSpacing: 2 }),
      logo(82, 76, 12),
    ],
  },
  // ── Cinematic ──
  {
    id: "ip-cinematic", name: "Cinematic", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    layers: [
      bg,
      grad("grad", 40, "bottom", 0.85),
      headline(6, 68, 70, 18, 5, { lineHeight: 1.1 }),
      cta(6, 90, 45, 5, 2.2),
      logo(82, 5, 12),
    ],
  },
  // ── Frame ──
  {
    id: "ip-frame", name: "Frame", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    layers: [
      bg,
      shape("border", 3, 3, 94, 94, "transparent", 1, { stroke: "#FFFFFF", strokeWidth: 2 }),
      grad("grad", 55, "bottom", 0.7),
      headline(8, 72, 74, 16, 4.5, { lineHeight: 1.15 }),
      cta(8, 90, 40, 5, 2),
      logo(80, 6, 12),
    ],
  },
  // ── Neon ──
  {
    id: "ip-neon", name: "Neon", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "neon",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.45),
      headline(10, 35, 80, 25, 6, { textAlign: "center", lineHeight: 1.1, shadowColor: "vault:primary", shadowBlur: 25 }),
      cta(20, 88, 60, 5, 2.5, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 12 }),
      logo(42, 5, 16),
    ],
  },
  // ── Stripe ──
  {
    id: "ip-stripe", name: "Stripe", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "corporate",
    layers: [
      bg,
      bar("stripe", 0, 40, 100, 22, "vault:primary", 0.92),
      headline(6, 42, 70, 18, 4.5, { lineHeight: 1.15 }),
      logo(5, 5, 10),
      grad("bottomgrad", 70, "bottom", 0.5),
      cta(6, 90, 40, 5, 2),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// 3) INSTAGRAM STORY — 9:16 (1080×1920)
// ══════════════════════════════════════════════════════════════

const instagramStoryTemplates: TemplateDefinition[] = [
  // ── Split Panel ──
  {
    id: "is-split", name: "Split Panel", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 70, 100, 30, "vault:primary", 0.94),
      headline(6, 73, 70, 14, 4, { lineHeight: 1.15 }),
      cta(6, 92, 50, 4, 1.8, { letterSpacing: 2 }),
      logo(80, 74, 14),
    ],
  },
  // ── Cinematic ──
  {
    id: "is-cinematic", name: "Cinematic", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "bold",
    layers: [
      bg,
      grad("grad", 50, "bottom", 0.85),
      headline(6, 68, 80, 14, 4.5, { lineHeight: 1.1 }),
      cta(6, 88, 55, 4, 2.2),
      logo(78, 4, 14),
    ],
  },
  // ── Frame ──
  {
    id: "is-frame", name: "Frame", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "minimal",
    layers: [
      bg,
      shape("border", 3, 2, 94, 96, "transparent", 1, { stroke: "#FFFFFF", strokeWidth: 2 }),
      grad("grad", 55, "bottom", 0.7),
      headline(8, 74, 80, 10, 4, { lineHeight: 1.15 }),
      cta(8, 88, 50, 4, 1.8),
      logo(40, 4, 18),
    ],
  },
  // ── Top Band ──
  {
    id: "is-topband", name: "Top Band", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "corporate",
    layers: [
      bg,
      bar("top", 0, 0, 100, 18, "vault:primary", 0.94),
      headline(6, 3, 68, 12, 3.5, { lineHeight: 1.2 }),
      logo(80, 3, 12),
      grad("bottomgrad", 70, "bottom", 0.55),
      cta(6, 92, 50, 4, 1.8),
    ],
  },
  // ── Centered Glow ──
  {
    id: "is-glow", name: "Centered Glow", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "neon",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.5),
      headline(8, 38, 84, 14, 5, { textAlign: "center", lineHeight: 1.1, shadowColor: "vault:primary", shadowBlur: 28 }),
      cta(15, 88, 70, 4, 2.2, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 14 }),
      logo(38, 4, 22),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// 4) FACEBOOK POST — 16:9 (1200×630)
// ══════════════════════════════════════════════════════════════

const facebookPostTemplates: TemplateDefinition[] = [
  // ── Split Panel ──
  {
    id: "fp-split", name: "Split Panel", formatId: "facebook-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 630, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 0, 40, 100, "vault:primary", 0.94),
      headline(3, 22, 35, 30, 4.5, { lineHeight: 1.15 }),
      cta(3, 82, 30, 7, 2, { letterSpacing: 2 }),
      shape("line", 3, 76, 10, 0.5, "#FFFFFF", 0.5),
      logo(3, 5, 9),
    ],
  },
  // ── Cinematic ──
  {
    id: "fp-cinematic", name: "Cinematic", formatId: "facebook-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 630, category: "bold",
    layers: [
      bg,
      grad("grad", 35, "bottom", 0.85),
      headline(5, 60, 55, 22, 5.5, { lineHeight: 1.1 }),
      cta(5, 88, 35, 6, 2.2),
      logo(88, 5, 8),
    ],
  },
  // ── Corner Badge ──
  {
    id: "fp-corner", name: "Corner Badge", formatId: "facebook-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 630, category: "minimal",
    layers: [
      bg,
      bar("badge", 0, 72, 48, 28, "vault:primary", 0.94),
      headline(3, 76, 43, 16, 3.8, { lineHeight: 1.2 }),
      cta(3, 93, 30, 4, 1.8),
      logo(88, 5, 8),
    ],
  },
  // ── Centered ──
  {
    id: "fp-centered", name: "Centered", formatId: "facebook-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 630, category: "gradient",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.4),
      headline(10, 30, 80, 25, 5.5, { textAlign: "center", lineHeight: 1.15 }),
      cta(25, 80, 50, 8, 2.5, { textAlign: "center" }),
      logo(44, 5, 12),
    ],
  },
  // ── Top Bar ──
  {
    id: "fp-topbar", name: "Top Bar", formatId: "facebook-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 630, category: "corporate",
    layers: [
      bg,
      bar("top", 0, 0, 100, 20, "vault:primary", 0.94),
      headline(4, 2, 70, 16, 3.5),
      logo(88, 3, 8),
      grad("bottomgrad", 65, "bottom", 0.5),
      cta(5, 88, 35, 6, 2.2),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// 5) YOUTUBE THUMBNAIL — 16:9 (1280×720)
// ══════════════════════════════════════════════════════════════

const youtubeThumbnailTemplates: TemplateDefinition[] = [
  // ── Impact (big bold text) ──
  {
    id: "yt-impact", name: "Impact", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "bold",
    layers: [
      bg,
      grad("grad", 25, "bottom", 0.8),
      headline(5, 55, 90, 30, 7, { textAlign: "center", lineHeight: 1.05 }),
      logo(5, 5, 8),
    ],
  },
  // ── Side Panel ──
  {
    id: "yt-side", name: "Side Panel", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 0, 40, 100, "vault:primary", 0.92),
      headline(3, 20, 35, 40, 5, { lineHeight: 1.1 }),
      cta(3, 85, 30, 8, 2.2),
      logo(3, 5, 10),
    ],
  },
  // ── Bottom Bar ──
  {
    id: "yt-bottom", name: "Bottom Bar", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "corporate",
    layers: [
      bg,
      bar("bottom", 0, 72, 100, 28, "vault:primary", 0.94),
      headline(4, 76, 72, 18, 5, { lineHeight: 1.1 }),
      logo(88, 78, 8),
    ],
  },
  // ── Centered ──
  {
    id: "yt-centered", name: "Centered", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "gradient",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.4),
      headline(5, 30, 90, 30, 7, { textAlign: "center", lineHeight: 1.1 }),
      logo(44, 5, 12),
    ],
  },
  // ── Corner Badge ──
  {
    id: "yt-badge", name: "Corner Badge", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "minimal",
    layers: [
      bg,
      bar("badge", 0, 68, 55, 32, "vault:primary", 0.94),
      headline(4, 72, 48, 22, 5.5, { lineHeight: 1.1 }),
      logo(88, 5, 8),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// 6) PINTEREST PIN — 2:3 (1000×1500)
// ══════════════════════════════════════════════════════════════

const pinterestPinTemplates: TemplateDefinition[] = [
  // ── Bottom Panel ──
  {
    id: "pp-panel", name: "Bottom Panel", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 75, 100, 25, "vault:primary", 0.94),
      headline(5, 78, 65, 12, 4, { lineHeight: 1.15 }),
      cta(5, 92, 45, 4, 1.8, { letterSpacing: 2 }),
      logo(80, 78, 14),
    ],
  },
  // ── Cinematic ──
  {
    id: "pp-cinematic", name: "Cinematic", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "bold",
    layers: [
      bg,
      grad("grad", 50, "bottom", 0.85),
      headline(6, 72, 80, 14, 4.5, { lineHeight: 1.1 }),
      cta(6, 90, 50, 4, 2),
      logo(80, 4, 14),
    ],
  },
  // ── Frame ──
  {
    id: "pp-frame", name: "Frame", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "minimal",
    layers: [
      bg,
      shape("border", 3, 2, 94, 96, "transparent", 1, { stroke: "#FFFFFF", strokeWidth: 2 }),
      grad("grad", 55, "bottom", 0.65),
      headline(8, 75, 84, 12, 4, { lineHeight: 1.15 }),
      cta(8, 90, 45, 4, 1.8),
      logo(40, 4, 18),
    ],
  },
  // ── Top Band ──
  {
    id: "pp-topband", name: "Top Band", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "corporate",
    layers: [
      bg,
      bar("top", 0, 0, 100, 12, "vault:primary", 0.94),
      headline(5, 2, 65, 8, 3, { lineHeight: 1.2 }),
      logo(82, 2, 9),
      grad("bottomgrad", 65, "bottom", 0.55),
      cta(6, 92, 45, 4, 1.8),
    ],
  },
  // ── Neon ──
  {
    id: "pp-neon", name: "Neon", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "neon",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.45),
      headline(8, 42, 84, 14, 4.5, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 25 }),
      cta(20, 88, 60, 4, 2, { textAlign: "center", shadowColor: "vault:primary", shadowBlur: 12 }),
      logo(40, 4, 18),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// 7) X POST — 16:9 (1200×675)
// ══════════════════════════════════════════════════════════════

const xPostTemplates: TemplateDefinition[] = [
  // ── Split Panel ──
  {
    id: "xp-split", name: "Split Panel", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 0, 40, 100, "vault:primary", 0.94),
      headline(3, 22, 35, 30, 4.5, { lineHeight: 1.15 }),
      cta(3, 82, 30, 7, 2, { letterSpacing: 2 }),
      logo(3, 5, 9),
    ],
  },
  // ── Cinematic ──
  {
    id: "xp-cinematic", name: "Cinematic", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "bold",
    layers: [
      bg,
      grad("grad", 35, "bottom", 0.85),
      headline(5, 60, 55, 22, 5.5, { lineHeight: 1.1 }),
      cta(5, 88, 35, 6, 2.2),
      logo(88, 5, 8),
    ],
  },
  // ── Corner Badge ──
  {
    id: "xp-corner", name: "Corner Badge", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "minimal",
    layers: [
      bg,
      bar("badge", 0, 72, 48, 28, "vault:primary", 0.94),
      headline(3, 76, 43, 16, 3.8, { lineHeight: 1.2 }),
      cta(3, 93, 30, 4, 1.8),
      logo(88, 5, 8),
    ],
  },
  // ── Top Bar ──
  {
    id: "xp-topbar", name: "Top Bar", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "corporate",
    layers: [
      bg,
      bar("top", 0, 0, 100, 20, "vault:primary", 0.94),
      headline(4, 2, 70, 16, 3.5),
      logo(88, 3, 8),
      grad("bottomgrad", 65, "bottom", 0.5),
      cta(5, 88, 35, 6, 2.2),
    ],
  },
  // ── Centered ──
  {
    id: "xp-centered", name: "Centered", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "gradient",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.4),
      headline(10, 30, 80, 25, 5.5, { textAlign: "center", lineHeight: 1.15 }),
      cta(25, 80, 50, 8, 2.5, { textAlign: "center" }),
      logo(44, 5, 12),
    ],
  },
];

// ══════════════════════════════════════════════════════════════
// 8) FACEBOOK AD — 1.91:1 (1200×628)
// ══════════════════════════════════════════════════════════════

const facebookAdTemplates: TemplateDefinition[] = [
  {
    id: "fa-split", name: "Split Panel", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "editorial",
    layers: [
      bg,
      bar("panel", 0, 0, 42, 100, "vault:primary", 0.95),
      headline(4, 22, 35, 28, 4.5, { lineHeight: 1.15 }),
      cta(4, 80, 30, 8, 2, { letterSpacing: 2 }),
      logo(4, 5, 9),
    ],
  },
  {
    id: "fa-cinematic", name: "Cinematic", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "bold",
    layers: [
      bg,
      grad("grad", 35, "bottom", 0.85),
      headline(5, 60, 55, 22, 5.5, { lineHeight: 1.1 }),
      cta(5, 88, 35, 6, 2.2),
      logo(88, 5, 8),
    ],
  },
  {
    id: "fa-centered", name: "Centered", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "gradient",
    layers: [
      bg,
      shape("darken", 0, 0, 100, 100, "#000000", 0.4),
      headline(10, 30, 80, 25, 5.5, { textAlign: "center", lineHeight: 1.15 }),
      cta(25, 80, 50, 8, 2.5, { textAlign: "center" }),
      logo(44, 5, 12),
    ],
  },
];

// ── Template Registry ──

const ALL_TEMPLATES: TemplateDefinition[] = [
  ...linkedinPostTemplates,
  ...instagramPostTemplates,
  ...instagramStoryTemplates,
  ...facebookPostTemplates,
  ...youtubeThumbnailTemplates,
  ...pinterestPinTemplates,
  ...xPostTemplates,
  ...facebookAdTemplates,
];

const TEMPLATE_BY_FORMAT: Record<string, TemplateDefinition[]> = {};
const TEMPLATE_BY_ID: Record<string, TemplateDefinition> = {};

// ── Dynamic templates (AI-generated, persisted per user) ──
const DYNAMIC_TEMPLATES: TemplateDefinition[] = [];

function rebuildLookups() {
  for (const key of Object.keys(TEMPLATE_BY_FORMAT)) delete TEMPLATE_BY_FORMAT[key];
  for (const key of Object.keys(TEMPLATE_BY_ID)) delete TEMPLATE_BY_ID[key];
  for (const t of [...ALL_TEMPLATES, ...DYNAMIC_TEMPLATES]) {
    if (!TEMPLATE_BY_FORMAT[t.formatId]) TEMPLATE_BY_FORMAT[t.formatId] = [];
    TEMPLATE_BY_FORMAT[t.formatId].push(t);
    TEMPLATE_BY_ID[t.id] = t;
  }
}

// Initial build
rebuildLookups();

export function registerTemplate(template: TemplateDefinition): void {
  const idx = DYNAMIC_TEMPLATES.findIndex(t => t.id === template.id);
  if (idx >= 0) DYNAMIC_TEMPLATES[idx] = template;
  else DYNAMIC_TEMPLATES.push(template);
  rebuildLookups();
}

export function getAIGeneratedTemplates(): TemplateDefinition[] {
  return DYNAMIC_TEMPLATES.filter(t => t.source === "ai-generated");
}

export function getTemplatesForFormat(formatId: string): TemplateDefinition[] {
  return TEMPLATE_BY_FORMAT[formatId] || [];
}

export function getTemplateById(id: string): TemplateDefinition | null {
  return TEMPLATE_BY_ID[id] || null;
}

export { ALL_TEMPLATES };

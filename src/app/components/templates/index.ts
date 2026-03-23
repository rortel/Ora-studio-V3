import type { TemplateDefinition } from "./types";
import { STARTER_PACK_TEMPLATES } from "./starter-pack";

// ── Helper: gradient overlay from bottom ──
const bottomGradient = (id: string, startY = 50): TemplateDefinition["layers"][0] => ({
  id, type: "gradient-overlay", x: 0, y: startY, width: 100, height: 100 - startY,
  style: { gradientDirection: "bottom", gradientStops: [{ offset: 0, color: "#000000", opacity: 0 }, { offset: 1, color: "#000000", opacity: 0.75 }] },
  zIndex: 1,
});

const bgImage: TemplateDefinition["layers"][0] = {
  id: "bg", type: "background-image", x: 0, y: 0, width: 100, height: 100,
  dataBinding: { source: "asset", field: "imageUrl" }, zIndex: 0,
};

const logo = (x: number, y: number, size = 12): TemplateDefinition["layers"][0] => ({
  id: "logo", type: "logo", x, y, width: size, height: size,
  dataBinding: { source: "vault", field: "logoUrl" },
  style: { objectFit: "contain", opacity: 0.9 },
  visible: { when: "vault.logoUrl", notEmpty: true }, zIndex: 4,
});

// ══════════════════════════════════════════════════════════════
// TEMPLATE DEFINITIONS — 3 variants per main format
// ══════════════════════════════════════════════════════════════

const linkedinPostTemplates: TemplateDefinition[] = [
  {
    id: "lp-minimal", name: "Minimal", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "minimal",
    layers: [
      bgImage,
      bottomGradient("grad", 55),
      { id: "headline", type: "text", x: 5, y: 72, width: 65, height: 20,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      { id: "cta", type: "text", x: 5, y: 90, width: 40, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.2, fontWeight: 600, color: "vault:primary", textAlign: "left", textTransform: "uppercase", letterSpacing: 1 },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(84, 84, 12),
    ],
  },
  {
    id: "lp-bold", name: "Bold", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "bold",
    layers: [
      bgImage,
      { id: "bar", type: "shape", x: 0, y: 78, width: 100, height: 22,
        style: { fill: "vault:primary", opacity: 0.92 }, zIndex: 1 },
      { id: "headline", type: "text", x: 4, y: 82, width: 70, height: 14,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(86, 83, 10),
    ],
  },
  {
    id: "lp-editorial", name: "Editorial", formatId: "linkedin-post", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "editorial",
    layers: [
      bgImage,
      bottomGradient("grad", 40),
      { id: "headline", type: "text", x: 5, y: 62, width: 55, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      { id: "cta", type: "text", x: 5, y: 88, width: 35, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#FFFFFF", textAlign: "left", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(86, 6, 10),
    ],
  },
];

const instagramPostTemplates: TemplateDefinition[] = [
  {
    id: "ip-minimal", name: "Minimal", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "minimal",
    layers: [
      bgImage,
      bottomGradient("grad", 60),
      { id: "headline", type: "text", x: 6, y: 78, width: 70, height: 14,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(82, 82, 12),
    ],
  },
  {
    id: "ip-bold", name: "Bold", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "bold",
    layers: [
      bgImage,
      { id: "bar", type: "shape", x: 0, y: 82, width: 100, height: 18,
        style: { fill: "vault:primary", opacity: 0.9 }, zIndex: 1 },
      { id: "headline", type: "text", x: 5, y: 85, width: 72, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 3.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(84, 86, 10),
    ],
  },
  {
    id: "ip-gradient", name: "Gradient", formatId: "instagram-post", aspectRatio: "1:1",
    canvasWidth: 1080, canvasHeight: 1080, category: "gradient",
    layers: [
      bgImage,
      bottomGradient("grad", 45),
      { id: "headline", type: "text", x: 6, y: 70, width: 60, height: 15,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      { id: "cta", type: "text", x: 6, y: 90, width: 50, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "vault:primary", textAlign: "left", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(82, 4, 12),
    ],
  },
];

const instagramStoryTemplates: TemplateDefinition[] = [
  {
    id: "is-minimal", name: "Minimal", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "minimal",
    layers: [
      bgImage,
      bottomGradient("grad", 60),
      { id: "headline", type: "text", x: 6, y: 76, width: 75, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 3.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      { id: "cta", type: "text", x: 6, y: 91, width: 50, height: 4,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2, fontWeight: 600, color: "vault:primary", textAlign: "left", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(80, 4, 14),
    ],
  },
  {
    id: "is-bold", name: "Bold", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "bold",
    layers: [
      bgImage,
      { id: "bar", type: "shape", x: 0, y: 0, width: 100, height: 20,
        style: { fill: "vault:primary", opacity: 0.92 }, zIndex: 1 },
      { id: "headline", type: "text", x: 5, y: 5, width: 70, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 3, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(80, 4, 12),
    ],
  },
  {
    id: "is-gradient", name: "Gradient", formatId: "instagram-story", aspectRatio: "9:16",
    canvasWidth: 1080, canvasHeight: 1920, category: "gradient",
    layers: [
      bgImage,
      bottomGradient("grad", 50),
      { id: "headline", type: "text", x: 6, y: 72, width: 80, height: 15,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4, fontWeight: 700, color: "#FFFFFF", textAlign: "center", maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(42, 90, 16),
    ],
  },
];

const facebookAdTemplates: TemplateDefinition[] = [
  {
    id: "fa-minimal", name: "Minimal", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "minimal",
    layers: [
      bgImage,
      bottomGradient("grad", 50),
      { id: "headline", type: "text", x: 5, y: 70, width: 60, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      { id: "cta", type: "text", x: 5, y: 90, width: 30, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 700, color: "vault:primary", textAlign: "left", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(84, 84, 12),
    ],
  },
  {
    id: "fa-bold", name: "Bold", formatId: "facebook-ad", aspectRatio: "1.91:1",
    canvasWidth: 1200, canvasHeight: 628, category: "bold",
    layers: [
      bgImage,
      { id: "bar", type: "shape", x: 0, y: 0, width: 45, height: 100,
        style: { fill: "vault:primary", opacity: 0.88 }, zIndex: 1 },
      { id: "headline", type: "text", x: 3, y: 30, width: 38, height: 30,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      { id: "cta", type: "text", x: 3, y: 80, width: 30, height: 6,
        dataBinding: { source: "asset", field: "ctaText" },
        style: { fontSize: 2.5, fontWeight: 600, color: "#FFFFFF", textAlign: "left", textTransform: "uppercase" },
        visible: { when: "asset.ctaText", notEmpty: true }, zIndex: 3 },
      logo(3, 6, 10),
    ],
  },
];

const youtubeThumbnailTemplates: TemplateDefinition[] = [
  {
    id: "yt-minimal", name: "Minimal", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "minimal",
    layers: [
      bgImage,
      bottomGradient("grad", 50),
      { id: "headline", type: "text", x: 5, y: 65, width: 70, height: 25,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 6, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(85, 5, 10),
    ],
  },
  {
    id: "yt-bold", name: "Bold", formatId: "youtube-thumbnail", aspectRatio: "16:9",
    canvasWidth: 1280, canvasHeight: 720, category: "bold",
    layers: [
      bgImage,
      { id: "bar", type: "shape", x: 0, y: 72, width: 100, height: 28,
        style: { fill: "vault:primary", opacity: 0.92 }, zIndex: 1 },
      { id: "headline", type: "text", x: 4, y: 77, width: 80, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 5.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(88, 78, 8),
    ],
  },
];

const pinterestPinTemplates: TemplateDefinition[] = [
  {
    id: "pp-minimal", name: "Minimal", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "minimal",
    layers: [
      bgImage,
      bottomGradient("grad", 60),
      { id: "headline", type: "text", x: 6, y: 78, width: 75, height: 12,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 3.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 3 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(80, 4, 14),
    ],
  },
  {
    id: "pp-bold", name: "Bold", formatId: "pinterest-pin", aspectRatio: "2:3",
    canvasWidth: 1000, canvasHeight: 1500, category: "bold",
    layers: [
      bgImage,
      { id: "bar", type: "shape", x: 0, y: 82, width: 100, height: 18,
        style: { fill: "vault:primary", opacity: 0.9 }, zIndex: 1 },
      { id: "headline", type: "text", x: 5, y: 85, width: 72, height: 10,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 3, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(82, 86, 10),
    ],
  },
];

const xPostTemplates: TemplateDefinition[] = [
  {
    id: "xp-minimal", name: "Minimal", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "minimal",
    layers: [
      bgImage,
      bottomGradient("grad", 55),
      { id: "headline", type: "text", x: 5, y: 72, width: 65, height: 18,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4.5, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(86, 84, 10),
    ],
  },
  {
    id: "xp-bold", name: "Bold", formatId: "x-post", aspectRatio: "16:9",
    canvasWidth: 1200, canvasHeight: 675, category: "bold",
    layers: [
      bgImage,
      { id: "bar", type: "shape", x: 0, y: 78, width: 100, height: 22,
        style: { fill: "vault:primary", opacity: 0.92 }, zIndex: 1 },
      { id: "headline", type: "text", x: 4, y: 82, width: 70, height: 14,
        dataBinding: { source: "asset", field: "headline" },
        style: { fontSize: 4, fontWeight: 700, color: "#FFFFFF", textAlign: "left", maxLines: 2 },
        visible: { when: "asset.headline", notEmpty: true }, zIndex: 2 },
      logo(86, 83, 10),
    ],
  },
];

// ── Template Registry ──

const ALL_TEMPLATES: TemplateDefinition[] = [
  ...linkedinPostTemplates,
  ...instagramPostTemplates,
  ...instagramStoryTemplates,
  ...facebookAdTemplates,
  ...youtubeThumbnailTemplates,
  ...pinterestPinTemplates,
  ...xPostTemplates,
  ...STARTER_PACK_TEMPLATES,
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

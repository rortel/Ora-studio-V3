import type { TemplateDefinition, TemplateLayer } from "./types";
import { FIGMA_SVG_TEMPLATES } from "../../lib/figmaSvgEngine";

// ── Template Registry ──
// Only Figma SVG templates — real designs from Figma, rendered via SVG engine

const ALL_TEMPLATES: TemplateDefinition[] = [
  ...FIGMA_SVG_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    formatId: t.formatId,
    aspectRatio: `${t.canvasWidth}:${t.canvasHeight}`,
    canvasWidth: t.canvasWidth,
    canvasHeight: t.canvasHeight,
    category: t.category as TemplateDefinition["category"],
    layers: [], // No Konva layers — rendering goes through SVG engine
    figmaSvgTemplateId: t.id,
    referenceImageUrl: `/templates/${t.id}.png`,
  } satisfies TemplateDefinition)),
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

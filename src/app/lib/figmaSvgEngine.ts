/**
 * Figma SVG Template Engine
 *
 * Loads pre-exported SVG templates from /public/templates/svg/,
 * replaces placeholder elements (images, texts, colors) with campaign data,
 * then renders to PNG via offscreen canvas.
 *
 * Flow: static SVG file → DOM parse → replace placeholders → serialize → canvas → PNG
 */

// ── Figma template registry ──

export interface FigmaSvgTemplate {
  id: string;                    // e.g. "figma-svg-fashion-post-01"
  name: string;
  formatId: string;              // e.g. "instagram-post"
  canvasWidth: number;
  canvasHeight: number;
  category: string;
  /** Placeholder mappings — which SVG element IDs map to which data roles */
  placeholders: {
    /** SVG element IDs that should have their image replaced with the product photo */
    imageIds: string[];
    /** SVG text element IDs → data field they bind to */
    textMappings: Record<string, "headline" | "ctaText" | "caption" | "subtitle" | "price" | "brandName">;
    /** SVG rect/element IDs whose fill should be replaced with vault colors */
    colorMappings: Record<string, "primary" | "secondary" | "accent" | "background">;
  };
  /** Thumbnail URL for template picker */
  thumbnailUrl?: string;
}

// ── SVG Cache ──
const svgCache = new Map<string, string>();

/**
 * Load SVG from pre-exported static file in /templates/svg/.
 * Caches the result to avoid repeated fetches.
 */
async function loadSvgTemplate(templateId: string): Promise<string> {
  if (svgCache.has(templateId)) return svgCache.get(templateId)!;

  const url = `/templates/svg/${templateId}.svg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[figmaSvgEngine] Failed to load SVG template: ${url} (${res.status})`);
  const svgText = await res.text();

  svgCache.set(templateId, svgText);
  return svgText;
}

// ── Resolve vault color ──
function resolveVaultColor(role: string, vault: Record<string, any> | null): string {
  const colors = vault?.colors as { hex: string; name: string; role: string }[] | undefined;
  if (!colors?.length) return "#111111";
  const match = colors.find(c => c.role?.toLowerCase() === role || c.name?.toLowerCase() === role);
  return match?.hex || colors[0]?.hex || "#111111";
}

export interface SvgReplaceOptions {
  imageUrl: string;
  headline?: string;
  ctaText?: string;
  caption?: string;
  subtitle?: string;
  price?: string;
  brandName?: string;
  vault: Record<string, any> | null;
  logoUrl?: string;
}

/**
 * Replace placeholders in the SVG string with actual campaign data.
 * Uses DOMParser to manipulate the SVG DOM, then serializes back.
 */
function replaceSvgPlaceholders(
  svgText: string,
  template: FigmaSvgTemplate,
  opts: SvgReplaceOptions
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const { placeholders } = template;

  // ── Replace images ──
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  for (const imgId of placeholders.imageIds) {
    // Figma SVGs use <rect fill="url(#patternXXX)"> for images.
    // The pattern contains <use xlink:href="#imageXXX"/> referencing an <image> in <defs>.
    const rect = doc.querySelector(`[id="${imgId}"]`)
      || doc.querySelector(`[id="${CSS.escape(imgId)}"]`);
    if (!rect) {
      // Also try: the imgId might be a <g> wrapping a <rect>
      const group = doc.getElementById(imgId);
      const innerRect = group?.querySelector("rect[fill^='url(#']");
      if (!innerRect) {
        console.warn(`[figmaSvgEngine] Image placeholder "${imgId}" not found in SVG`);
        continue;
      }
      replaceImageInRect(innerRect);
      continue;
    }

    const fill = rect.getAttribute("fill");
    if (fill?.startsWith("url(#")) {
      replaceImageInRect(rect);
    } else {
      // Might be a <g> containing a <rect> with pattern fill
      const innerRect = rect.querySelector("rect[fill^='url(#']");
      if (innerRect) replaceImageInRect(innerRect);
    }
  }

  function replaceImageInRect(rectEl: Element) {
    const fill = rectEl.getAttribute("fill");
    if (!fill?.startsWith("url(#")) return;
    const patternId = fill.slice(5, -1);
    const pattern = doc.getElementById(patternId);
    if (!pattern) return;

    // First try: <image> directly inside <pattern>
    let imageEl: Element | null = pattern.querySelector("image");

    if (!imageEl) {
      // Figma structure: <pattern><use xlink:href="#imageXXX"/></pattern>
      // The <image> is a sibling in <defs>, not a child of <pattern>
      const useEl = pattern.querySelector("use");
      if (useEl) {
        const useRef = useEl.getAttributeNS(XLINK_NS, "href")
          || useEl.getAttribute("href")
          || useEl.getAttribute("xlink:href");
        if (useRef?.startsWith("#")) {
          imageEl = doc.getElementById(useRef.slice(1));
        }
      }
    }

    if (imageEl) {
      // Remove old href (both namespaced and non-namespaced)
      imageEl.removeAttributeNS(XLINK_NS, "href");
      imageEl.removeAttribute("href");
      // Set new URL using xlink:href (what Figma SVGs expect)
      imageEl.setAttributeNS(XLINK_NS, "xlink:href", opts.imageUrl);
      imageEl.setAttribute("preserveAspectRatio", "xMidYMid slice");
    }
  }

  // ── Hide original text paths and store overlay data ──
  // Figma renders text as <path> outlines. We hide them and overlay real text on the canvas.
  for (const [svgId, field] of Object.entries(placeholders.textMappings)) {
    const value = opts[field] || "";
    if (!value) continue;

    const el = doc.querySelector(`[id="${CSS.escape(svgId)}"]`) || doc.getElementById(svgId);
    if (el) {
      // Hide the original path-based text
      el.setAttribute("opacity", "0");
    }
  }

  // ── Replace colors ──
  for (const [svgId, colorRole] of Object.entries(placeholders.colorMappings)) {
    const color = resolveVaultColor(colorRole, opts.vault);
    const el = doc.querySelector(`[id="${CSS.escape(svgId)}"]`) || doc.getElementById(svgId);
    if (el) {
      const currentFill = el.getAttribute("fill");
      if (currentFill && !currentFill.startsWith("url(")) {
        el.setAttribute("fill", color);
      }
      // Also recolor child rects
      el.querySelectorAll("rect").forEach(r => {
        const f = r.getAttribute("fill");
        if (f && !f.startsWith("url(") && f !== "none") {
          r.setAttribute("fill", color);
        }
      });
    }
  }

  return new XMLSerializer().serializeToString(doc);
}

/**
 * Render a modified SVG string to a PNG data URL via offscreen canvas.
 * First draws the SVG, then overlays replacement text.
 */
async function renderSvgToPng(
  svgText: string,
  width: number,
  height: number,
  textOverlays: TextOverlay[]
): Promise<string> {
  // First, load the product image so the SVG can reference it
  // SVGs rendered via <img> can't load external images, so we need to inline them.
  // Convert the image URL references to base64 inline.
  const inlinedSvg = await inlineExternalImages(svgText);

  return new Promise((resolve, reject) => {
    const blob = new Blob([inlinedSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;

      // Draw SVG as base layer
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      // Draw text overlays on top
      for (const overlay of textOverlays) {
        ctx.save();
        ctx.fillStyle = overlay.color || "#FFFFFF";
        ctx.font = `${overlay.fontWeight || "bold"} ${overlay.fontSize}px ${overlay.fontFamily || "Inter, Helvetica, Arial, sans-serif"}`;
        ctx.textAlign = (overlay.textAlign as CanvasTextAlign) || "left";
        ctx.textBaseline = "top";

        // Add text shadow for readability
        if (overlay.shadow) {
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
        }

        const lines = wrapText(ctx, overlay.text, overlay.width);
        const lineHeight = overlay.fontSize * (overlay.lineHeight || 1.2);
        let y = overlay.y;
        const maxLines = overlay.maxLines || lines.length;
        for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
          ctx.fillText(lines[i], overlay.x, y);
          y += lineHeight;
        }
        ctx.restore();
      }

      resolve(canvas.toDataURL("image/png", 1));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load SVG as image for canvas rendering"));
    };
    img.src = url;
  });
}

/**
 * Inline external image URLs in SVG as base64 data URIs.
 * Required because SVGs rendered via <img> tag can't fetch external resources.
 */
async function inlineExternalImages(svgText: string): Promise<string> {
  // Find all href/xlink:href references to external URLs in the SVG
  const urlRegex = /((?:xlink:)?href)="(https?:\/\/[^"]+)"/g;
  const matches = [...svgText.matchAll(urlRegex)];

  if (matches.length === 0) return svgText;

  let result = svgText;
  const inlinedCache = new Map<string, string>();

  for (const match of matches) {
    const attrName = match[1]; // "href" or "xlink:href"
    const externalUrl = match[2];

    if (inlinedCache.has(externalUrl)) {
      result = result.replace(match[0], `${attrName}="${inlinedCache.get(externalUrl)}"`);
      continue;
    }

    try {
      const response = await fetch(externalUrl, { mode: "cors" });
      if (!response.ok) {
        console.warn(`[figmaSvgEngine] Image fetch failed (${response.status}): ${externalUrl.slice(0, 60)}...`);
        continue;
      }
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      inlinedCache.set(externalUrl, base64);
      result = result.replace(match[0], `${attrName}="${base64}"`);
    } catch (err) {
      console.warn(`[figmaSvgEngine] Could not inline image: ${externalUrl.slice(0, 60)}...`, err);
    }
  }

  return result;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color?: string;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: string;
  lineHeight?: number;
  maxLines?: number;
  shadow?: boolean;
}

/** Simple word-wrap for canvas text rendering */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Text overlay extraction ──

/**
 * Build text overlays from the SVG's original text element positions.
 * Since Figma renders text as paths, we find their bounding boxes
 * and overlay our replacement text at those coordinates.
 */
function buildTextOverlays(
  rawSvg: string,
  template: FigmaSvgTemplate,
  opts: SvgReplaceOptions
): TextOverlay[] {
  const overlays: TextOverlay[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, "image/svg+xml");

  const svgRoot = doc.documentElement;
  const viewBox = svgRoot.getAttribute("viewBox")?.split(" ").map(Number) || [0, 0, template.canvasWidth, template.canvasHeight];
  const scaleX = template.canvasWidth / viewBox[2];
  const scaleY = template.canvasHeight / viewBox[3];

  for (const [svgId, field] of Object.entries(template.placeholders.textMappings)) {
    const value = opts[field];
    if (!value) continue;

    const el = doc.querySelector(`[id="${CSS.escape(svgId)}"]`) || doc.getElementById(svgId);
    if (!el) {
      console.warn(`[figmaSvgEngine] Text element "${svgId}" not found in SVG`);
      continue;
    }

    const bbox = getElementBBox(el, scaleX, scaleY);
    if (!bbox) {
      console.warn(`[figmaSvgEngine] Could not determine bbox for "${svgId}"`);
      continue;
    }

    const isHeadline = field === "headline" || field === "brandName";
    const isCta = field === "ctaText";
    const isPrice = field === "price";

    overlays.push({
      text: isPrice ? value : value,
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      fontSize: isHeadline
        ? Math.max(32, Math.round(bbox.height * 0.35))
        : isCta
          ? Math.max(20, Math.round(bbox.height * 0.55))
          : isPrice
            ? Math.max(28, Math.round(bbox.height * 0.6))
            : Math.max(16, Math.round(bbox.height * 0.25)),
      color: "#FFFFFF",
      fontWeight: isHeadline || isCta || isPrice ? "bold" : "normal",
      textAlign: "left",
      lineHeight: isHeadline ? 1.15 : 1.3,
      maxLines: isHeadline ? 3 : isCta ? 1 : isPrice ? 1 : 4,
      shadow: true,
    });
  }

  return overlays;
}

/** Get approximate bounding box of an SVG element */
function getElementBBox(
  el: Element,
  scaleX: number,
  scaleY: number
): { x: number; y: number; width: number; height: number } | null {
  let node: Element | null = el;
  let x = 0, y = 0;

  // Walk up to accumulate transforms
  while (node && node.tagName !== "svg") {
    const transform = node.getAttribute("transform");
    if (transform) {
      const m = transform.match(/translate\(\s*([-\d.]+)\s*[,\s]\s*([-\d.]*)\s*\)/);
      if (m) {
        x += parseFloat(m[1]) || 0;
        y += parseFloat(m[2]) || 0;
      }
    }
    node = node.parentElement;
  }

  // Get dimensions from the element's path data
  const pathEl = el.tagName === "path" ? el : el.querySelector("path");
  if (pathEl) {
    const d = pathEl.getAttribute("d");
    if (d) {
      // Extract all numbers from path, separate x/y
      const nums = d.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
      if (nums.length >= 4) {
        const xs = nums.filter((_, i) => i % 2 === 0);
        const ys = nums.filter((_, i) => i % 2 === 1);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        return {
          x: (x + minX) * scaleX,
          y: (y + minY) * scaleY,
          width: (maxX - minX) * scaleX,
          height: (maxY - minY) * scaleY,
        };
      }
    }
  }

  // Fallback: check for rect child or attributes
  const rect = el.querySelector("rect");
  if (rect) {
    return {
      x: (x + parseFloat(rect.getAttribute("x") || "0")) * scaleX,
      y: (y + parseFloat(rect.getAttribute("y") || "0")) * scaleY,
      width: parseFloat(rect.getAttribute("width") || "100") * scaleX,
      height: parseFloat(rect.getAttribute("height") || "100") * scaleY,
    };
  }

  // Last resort: check element's own x/y/width/height
  const elW = el.getAttribute("width");
  const elH = el.getAttribute("height");
  if (elW && elH) {
    return {
      x: (x + parseFloat(el.getAttribute("x") || "0")) * scaleX,
      y: (y + parseFloat(el.getAttribute("y") || "0")) * scaleY,
      width: parseFloat(elW) * scaleX,
      height: parseFloat(elH) * scaleY,
    };
  }

  return null;
}

// ── High-level composite function ──

/**
 * Full pipeline: load SVG → replace placeholders → overlay text → render PNG.
 * This is the main entry point called from compositeAdCreative.
 */
export async function compositeFigmaSvgTemplate(
  template: FigmaSvgTemplate,
  opts: SvgReplaceOptions
): Promise<string> {
  console.log(`[figmaSvgEngine] Compositing "${template.id}" (${template.name})`);

  // 1. Load SVG from static file (cached)
  const rawSvg = await loadSvgTemplate(template.id);
  console.log(`[figmaSvgEngine] SVG loaded (${(rawSvg.length / 1024).toFixed(0)}KB)`);

  // 2. Build text overlays from original SVG positions
  const textOverlays = buildTextOverlays(rawSvg, template, opts);
  console.log(`[figmaSvgEngine] ${textOverlays.length} text overlays prepared`);

  // 3. Replace image/color placeholders in SVG
  const modifiedSvg = replaceSvgPlaceholders(rawSvg, template, opts);

  // 4. Render to PNG
  const png = await renderSvgToPng(modifiedSvg, template.canvasWidth, template.canvasHeight, textOverlays);
  console.log(`[figmaSvgEngine] PNG rendered (${template.canvasWidth}x${template.canvasHeight})`);

  return png;
}

// ── Pre-built template registry ──

export const FIGMA_SVG_TEMPLATES: FigmaSvgTemplate[] = [
  // ═══ Fashion Ad Bundle — Posts (1080×1350) ═══
  {
    id: "figma-svg-fashion-post-01",
    name: "Fashion Post — Promo & Price",
    formatId: "instagram-post",
    canvasWidth: 1080, canvasHeight: 1350,
    category: "fashion",
    placeholders: {
      imageIds: ["Image"],
      textMappings: {
        "The Look of Success, Shockingly Affordable": "headline",
        "Dress sharp. Spend smart.": "ctaText",
        "25% OFF": "price",
      },
      colorMappings: {},
    },
  },
  {
    id: "figma-svg-fashion-post-03",
    name: "Fashion Post — Bold Statement",
    formatId: "instagram-post",
    canvasWidth: 1080, canvasHeight: 1350,
    category: "fashion",
    placeholders: {
      imageIds: ["Image"],
      textMappings: {
        "Stop Hiding. Start Owning Your Style.": "headline",
        "You deserve to feel BEST in your body!": "subtitle",
      },
      colorMappings: {},
    },
  },
  {
    id: "figma-svg-fashion-post-09",
    name: "Fashion Post — Testimonial Product",
    formatId: "instagram-post",
    canvasWidth: 1080, canvasHeight: 1350,
    category: "fashion",
    placeholders: {
      imageIds: ["Product"],
      textMappings: {},
      colorMappings: {},
    },
  },

  // ═══ Fashion Ad Bundle — Stories (1080×1920) ═══
  {
    id: "figma-svg-fashion-story-01",
    name: "Fashion Story — Promo & Price",
    formatId: "instagram-story",
    canvasWidth: 1080, canvasHeight: 1920,
    category: "fashion",
    placeholders: {
      imageIds: ["Image"],
      textMappings: {
        "The Look of Success, Shockingly Affordable": "headline",
        "Dress sharp. Spend smart.": "ctaText",
        "25% OFF": "price",
      },
      colorMappings: {},
    },
  },
  {
    id: "figma-svg-fashion-story-03",
    name: "Fashion Story — Bold Statement",
    formatId: "instagram-story",
    canvasWidth: 1080, canvasHeight: 1920,
    category: "fashion",
    placeholders: {
      imageIds: ["Image"],
      textMappings: {
        "Stop Hiding. Start Owning Your Style.": "headline",
        "You deserve to feel BEST in your body!": "subtitle",
      },
      colorMappings: {},
    },
  },
  {
    id: "figma-svg-fashion-story-09",
    name: "Fashion Story — Testimonial Product",
    formatId: "instagram-story",
    canvasWidth: 1080, canvasHeight: 1920,
    category: "fashion",
    placeholders: {
      imageIds: ["Product"],
      textMappings: {},
      colorMappings: {},
    },
  },

  // ═══ Instagram Post Templates (1080×1080) ═══
  {
    id: "figma-svg-igpost-01",
    name: "Instagram Post — Brand Showcase",
    formatId: "instagram-post",
    canvasWidth: 1080, canvasHeight: 1080,
    category: "bold",
    placeholders: {
      imageIds: ["image 1"],
      textMappings: { "Nike": "brandName" },
      colorMappings: {},
    },
  },
  {
    id: "figma-svg-igpost-03",
    name: "Instagram Post — Brand Showcase Alt",
    formatId: "instagram-post",
    canvasWidth: 1080, canvasHeight: 1080,
    category: "bold",
    placeholders: {
      imageIds: ["image 1"],
      textMappings: { "Nike": "brandName" },
      colorMappings: {},
    },
  },

  // ═══ B2B Square Ads (1080×1080) ═══
  {
    id: "figma-svg-b2b-01",
    name: "B2B Square — Product Demo",
    formatId: "facebook-post",
    canvasWidth: 1080, canvasHeight: 1080,
    category: "corporate",
    placeholders: {
      imageIds: ["Your Assets"],
      textMappings: {
        "Duis aute irure dolor in reprehenderit in voluptate?": "headline",
        "Book a demo": "ctaText",
      },
      colorMappings: { "CTA": "primary" },
    },
  },
  {
    id: "figma-svg-b2b-02",
    name: "B2B Square — Full Visual",
    formatId: "facebook-post",
    canvasWidth: 1080, canvasHeight: 1080,
    category: "corporate",
    placeholders: {
      imageIds: [],
      textMappings: { "Lorem ipsum dolor sit amet.": "headline" },
      colorMappings: { "Bottom Rectangle": "primary" },
    },
  },
  {
    id: "figma-svg-b2b-03",
    name: "B2B Square — Stats & Metrics",
    formatId: "facebook-post",
    canvasWidth: 1080, canvasHeight: 1080,
    category: "corporate",
    placeholders: {
      imageIds: [],
      textMappings: { "Lorem ipsum dolor sit amet consectetur adipiscing elit": "headline" },
      colorMappings: { "Bar 1": "primary" },
    },
  },

  // ═══ Instagram Fashion Posts (1080×1080) ═══
  {
    id: "figma-svg-igfashion-01",
    name: "Instagram Fashion — Summer Sale",
    formatId: "instagram-post",
    canvasWidth: 1080, canvasHeight: 1080,
    category: "fashion",
    placeholders: {
      imageIds: ["image 40", "image 41"],
      textMappings: { "SUMMER SALE": "headline" },
      colorMappings: {},
    },
  },
];

/** Get all Figma SVG templates for a given format */
export function getFigmaSvgTemplatesForFormat(formatId: string): FigmaSvgTemplate[] {
  const formatMap: Record<string, string[]> = {
    "instagram-post": ["instagram-post"],
    "instagram-carousel": ["instagram-post"],
    "instagram-story": ["instagram-story"],
    "facebook-post": ["instagram-post", "facebook-post"],
    "facebook-story": ["instagram-story"],
    "facebook-ad": ["instagram-post", "facebook-post"],
    "twitter-post": ["instagram-post", "facebook-post"],
    "tiktok-image": ["instagram-story"],
  };
  const allowed = formatMap[formatId] || [formatId];
  return FIGMA_SVG_TEMPLATES.filter(t => allowed.includes(t.formatId));
}

/** Get a Figma SVG template by ID */
export function getFigmaSvgTemplateById(id: string): FigmaSvgTemplate | null {
  return FIGMA_SVG_TEMPLATES.find(t => t.id === id) || null;
}

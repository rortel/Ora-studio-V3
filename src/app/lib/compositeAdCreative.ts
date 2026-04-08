/**
 * compositeAdCreative — Offscreen Konva compositing for ad-ready creatives.
 *
 * Takes a generated post (image + text + headline + CTA) and composites it
 * through a template into a finished ad creative PNG, client-side.
 */
import Konva from "konva";
import type { TemplateDefinition, TemplateLayer } from "../components/templates/types";
import { getTemplatesForFormat } from "../components/templates";
import { getFigmaSvgTemplateById, compositeFigmaSvgTemplate } from "./figmaSvgEngine";

// ── Format → template format mapping (campaign format IDs → template formatId) ──
const FORMAT_TO_TEMPLATE: Record<string, string> = {
  "linkedin-post": "linkedin-post",
  "linkedin-carousel": "linkedin-post",
  "instagram-post": "instagram-post",
  "instagram-carousel": "instagram-post",
  "instagram-story": "instagram-story",
  "facebook-post": "facebook-post",
  "facebook-story": "instagram-story",
  "facebook-ad": "facebook-ad",
  "tiktok-image": "instagram-story",
  "twitter-post": "x-post",
  "youtube-thumbnail": "youtube-thumbnail",
  "pinterest-pin": "pinterest-pin",
};

// ── Pick best template for a given format ──
export function selectTemplateForFormat(formatId: string, preferredCategory?: string): TemplateDefinition | null {
  const templateFormat = FORMAT_TO_TEMPLATE[formatId] || formatId;
  const templates = getTemplatesForFormat(templateFormat);
  if (templates.length === 0) return null;
  // Prefer user-chosen category first, then "ad-ready" templates (Omneky-style with subtitle, price, features)
  const preferred = (preferredCategory
    ? templates.find(t => t.category === preferredCategory)
    : null) ||
    templates.find(t => t.category === "ad-ready") ||
    templates.find(t => t.category === "bold") ||
    templates.find(t => t.category === "editorial") ||
    templates[0];
  return preferred;
}

// ── Load image as HTMLImageElement from URL (handles CORS) ──
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // Try fetch-as-blob first (bypasses CORS for toDataURL)
    fetch(url, { mode: "cors" })
      .then(r => { if (!r.ok) throw new Error("not ok"); return r.blob(); })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = objectUrl;
      })
      .catch(() => {
        // Fallback: direct load
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
      });
  });
}

// ── Resolve vault color ("vault:primary" → hex) ──
function resolveColor(color: string | undefined, vault: Record<string, any> | null): string {
  if (!color) return "#FFFFFF";
  if (!color.startsWith("vault:")) return color;
  const role = color.slice(6);
  const colors = vault?.colors as { hex: string; name: string; role: string }[] | undefined;
  if (!colors?.length) return "#111111";
  const match = colors.find(c => c.role?.toLowerCase() === role || c.name?.toLowerCase() === role);
  return match?.hex || colors[0]?.hex || "#111111";
}

// ── Cover crop helper ──
function coverCrop(imgW: number, imgH: number, boxW: number, boxH: number) {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  let cropW = imgW, cropH = imgH, cropX = 0, cropY = 0;
  if (imgRatio > boxRatio) { cropW = imgH * boxRatio; cropX = (imgW - cropW) / 2; }
  else { cropH = imgW / boxRatio; cropY = (imgH - cropH) / 2; }
  return { x: cropX, y: cropY, width: cropW, height: cropH };
}

// ── Resolve data binding ──
function resolveBinding(
  binding: TemplateLayer["dataBinding"],
  asset: Record<string, any>,
  vault: Record<string, any> | null,
  logoUrl: string
): string {
  if (!binding) return "";
  if (binding.source === "asset") return asset?.[binding.field] || "";
  if (binding.source === "vault") {
    if (binding.field === "logoUrl") return logoUrl || vault?.logo_url || "";
    return vault?.[binding.field] || "";
  }
  return binding.field || "";
}

// ── Check visibility ──
function isVisible(layer: TemplateLayer, asset: Record<string, any>, vault: Record<string, any> | null): boolean {
  if (!layer.visible) return true;
  const field = layer.visible.when.replace("asset.", "").replace("vault.", "");
  const source = layer.visible.when.startsWith("vault.") ? vault : asset;
  const value = source?.[field];
  if (layer.visible.notEmpty) return !!value && value !== "";
  return true;
}

interface CompositeOptions {
  imageUrl: string;
  headline?: string;
  ctaText?: string;
  caption?: string;
  subtitle?: string;
  price?: string;
  featuresText?: string;
  vault: Record<string, any> | null;
  logoUrl: string;
  template: TemplateDefinition;
}

/**
 * Composite an ad creative offscreen using Konva imperative API.
 * Returns a PNG data URL.
 */
export async function compositeAdCreative(opts: CompositeOptions): Promise<string> {
  const { imageUrl, headline, ctaText, caption, subtitle, price, featuresText, vault, logoUrl, template } = opts;

  // ── Figma SVG template path — use SVG engine instead of Konva ──
  if (template.figmaSvgTemplateId) {
    const figmaTemplate = getFigmaSvgTemplateById(template.figmaSvgTemplateId);
    if (figmaTemplate) {
      console.log(`[composite] Using Figma SVG engine for "${template.figmaSvgTemplateId}"`);
      return compositeFigmaSvgTemplate(figmaTemplate, {
        imageUrl,
        headline,
        ctaText,
        caption,
        subtitle,
        price,
        brandName: vault?.name || vault?.brand_name || "",
        vault,
        logoUrl,
      });
    }
    console.warn(`[composite] Figma SVG template "${template.figmaSvgTemplateId}" not found, falling back to Konva`);
  }

  const asset: Record<string, any> = {
    imageUrl,
    headline: headline || "",
    ctaText: ctaText || "",
    caption: caption || "",
    subtitle: subtitle || "",
    price: price || "",
    featuresText: featuresText || "",
  };

  const cw = template.canvasWidth;
  const ch = template.canvasHeight;

  // ── Preload images ──
  const imageLayers = collectImageLayers(template.layers);
  const loadedImages: Record<string, HTMLImageElement> = {};

  await Promise.all(
    imageLayers.map(async (layer) => {
      const url = resolveBinding(layer.dataBinding, asset, vault, logoUrl);
      if (!url) return;
      try {
        loadedImages[layer.id] = await loadImage(url);
      } catch { /* skip failed images */ }
    })
  );

  // ── Create offscreen Konva stage ──
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  document.body.appendChild(container);

  const stage = new Konva.Stage({ container, width: cw, height: ch });
  const layer = new Konva.Layer();
  stage.add(layer);

  // ── Render layers in zIndex order ──
  const sorted = [...template.layers].sort((a, b) => a.zIndex - b.zIndex);

  console.log(`[composite] Template: ${template.id} (${template.name}), ${sorted.length} layers, canvas: ${cw}x${ch}`);
  console.log(`[composite] Asset data:`, { headline: asset.headline, ctaText: asset.ctaText, subtitle: asset.subtitle, caption: asset.caption?.slice(0, 40) });
  console.log(`[composite] Images loaded:`, Object.keys(loadedImages));

  // ── Auto-design: when template has a full-bleed background-image, convert to positioned product ──
  // Detect if the first layer is a full-bleed background-image (x=0,y=0,w=100,h=100)
  const bgLayer = sorted.find(l => l.type === "background-image" && l.x === 0 && l.y === 0 && l.width === 100 && l.height === 100);
  const hasTextBelow50 = sorted.some(l => l.type === "text" && l.y >= 50);
  const useAutoDesign = !!bgLayer && hasTextBelow50;

  if (useAutoDesign) {
    // 1) Solid dark background
    layer.add(new Konva.Rect({ x: 0, y: 0, width: cw, height: ch, fill: "#0D0D0D" }));
    // 2) Vault accent strip at top
    const accentColor = resolveColor("vault:primary", vault);
    layer.add(new Konva.Rect({ x: 0, y: 0, width: cw, height: Math.round(ch * 0.025), fill: accentColor }));
    console.log(`[composite] Auto-design: solid bg #0D0D0D + accent strip ${accentColor}`);
  }

  let nodesAdded = 0;
  for (const tl of sorted) {
    const vis = isVisible(tl, asset, vault);
    if (!vis) {
      console.log(`[composite] Layer "${tl.id}" (${tl.type}) — HIDDEN (visible.when=${tl.visible?.when})`);
      continue;
    }

    // Auto-design: transform full-bleed bg image into positioned product
    if (useAutoDesign && tl === bgLayer) {
      const img = loadedImages[tl.id];
      if (img) {
        // Position product: centered, top portion (leaving bottom for text)
        const prodW = Math.round(cw * 0.65);
        const prodH = Math.round(ch * 0.52);
        const prodX = Math.round((cw - prodW) / 2);
        const prodY = Math.round(ch * 0.04);
        const crop = coverCrop(img.width, img.height, prodW, prodH);
        layer.add(new Konva.Image({
          x: prodX, y: prodY, width: prodW, height: prodH, image: img,
          crop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
          cornerRadius: 12,
        }));
        nodesAdded++;
        console.log(`[composite] Layer "${tl.id}" — AUTO-DESIGN: product ${prodW}x${prodH} at (${prodX},${prodY}) ✓`);
      }
      continue;
    }

    const node = renderLayerImperative(tl, cw, ch, loadedImages, asset, vault, logoUrl);
    if (node) {
      layer.add(node);
      nodesAdded++;
      console.log(`[composite] Layer "${tl.id}" (${tl.type}) — RENDERED ✓`);
    } else {
      console.log(`[composite] Layer "${tl.id}" (${tl.type}) — visible but node=null (no data?)`);
    }
  }

  console.log(`[composite] Total nodes: ${nodesAdded}/${sorted.length}`);
  layer.draw();

  // ── Export to data URL ──
  const dataUrl = stage.toDataURL({ pixelRatio: 1, mimeType: "image/png", quality: 1 });

  // Cleanup
  stage.destroy();
  document.body.removeChild(container);

  return dataUrl;
}

// ── Collect all image layers recursively ──
function collectImageLayers(layers: TemplateLayer[]): TemplateLayer[] {
  const result: TemplateLayer[] = [];
  for (const l of layers) {
    if ((l.type === "background-image" || l.type === "logo" || l.type === "image") && l.dataBinding) {
      result.push(l);
    }
    if (l.type === "group" && l.children) {
      result.push(...collectImageLayers(l.children));
    }
  }
  return result;
}

// ── Render a single layer imperatively (returns Konva.Node) ──
function renderLayerImperative(
  tl: TemplateLayer,
  cw: number,
  ch: number,
  images: Record<string, HTMLImageElement>,
  asset: Record<string, any>,
  vault: Record<string, any> | null,
  logoUrl: string
): Konva.Node | null {
  const x = (tl.x / 100) * cw;
  const y = (tl.y / 100) * ch;
  const w = (tl.width / 100) * cw;
  const h = (tl.height / 100) * ch;

  switch (tl.type) {
    case "background-image":
    case "image": {
      const img = loadedImages[tl.id];
      if (!img) return null;
      const crop = coverCrop(img.width, img.height, w, h);
      return new Konva.Image({
        x, y, width: w, height: h, image: img,
        crop: { x: crop.x, y: crop.y, width: crop.width, height: crop.height },
        opacity: tl.style?.opacity ?? 1,
      });
    }

    case "text": {
      let text = resolveBinding(tl.dataBinding, asset, vault, logoUrl);
      if (!text) return null;
      if (tl.style?.textTransform === "uppercase") text = text.toUpperCase();
      else if (tl.style?.textTransform === "lowercase") text = text.toLowerCase();
      if (tl.style?.maxLines) {
        const lines = text.split("\n").slice(0, tl.style.maxLines);
        text = lines.join("\n");
      }
      const fontSize = ((tl.style?.fontSize || 3) / 100) * ch;
      return new Konva.Text({
        x, y, width: w, height: h, text,
        fontSize,
        fontFamily: tl.style?.fontFamily || "Inter, Helvetica, Arial, sans-serif",
        fontStyle: tl.style?.fontWeight && tl.style.fontWeight >= 700 ? "bold" : "normal",
        fill: resolveColor(tl.style?.color, vault),
        align: tl.style?.textAlign || "left",
        verticalAlign: "middle",
        lineHeight: tl.style?.lineHeight || 1.3,
        letterSpacing: tl.style?.letterSpacing || 0,
        wrap: "word",
        ellipsis: true,
        opacity: tl.style?.opacity ?? 1,
        shadowColor: tl.style?.shadowColor || undefined,
        shadowBlur: tl.style?.shadowBlur || 0,
      });
    }

    case "shape": {
      return new Konva.Rect({
        x, y, width: w, height: h,
        fill: resolveColor(tl.style?.fill, vault),
        cornerRadius: tl.style?.cornerRadius || 0,
        opacity: tl.style?.opacity ?? 1,
      });
    }

    case "gradient-overlay": {
      const stops = tl.style?.gradientStops || [];
      const flatStops: (number | string)[] = [];
      for (const s of stops) {
        flatStops.push(s.offset);
        const r = parseInt(s.color.slice(1, 3), 16);
        const g = parseInt(s.color.slice(3, 5), 16);
        const b = parseInt(s.color.slice(5, 7), 16);
        flatStops.push(`rgba(${r},${g},${b},${s.opacity})`);
      }
      return new Konva.Rect({
        x, y, width: w, height: h,
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: 0, y: h },
        fillLinearGradientColorStops: flatStops,
        opacity: tl.style?.opacity ?? 1,
      });
    }

    case "logo": {
      const img = loadedImages[tl.id];
      if (!img) return null;
      const imgRatio = img.width / img.height;
      const boxRatio = w / h;
      let dw = w, dh = h, dx = x, dy = y;
      if (imgRatio > boxRatio) { dh = w / imgRatio; dy = y + (h - dh) / 2; }
      else { dw = h * imgRatio; dx = x + (w - dw) / 2; }
      return new Konva.Image({
        x: dx, y: dy, width: dw, height: dh, image: img,
        opacity: tl.style?.opacity ?? 0.9,
      });
    }

    case "circle": {
      const radius = tl.style?.radius
        ? (tl.style.radius / 100) * cw
        : Math.min(w, h) / 2;
      return new Konva.Circle({
        x: x + w / 2, y: y + h / 2, radius,
        fill: tl.style?.fill ? resolveColor(tl.style.fill, vault) : undefined,
        opacity: tl.style?.opacity ?? 1,
        stroke: tl.style?.stroke ? resolveColor(tl.style.stroke, vault) : undefined,
        strokeWidth: tl.style?.strokeWidth || 0,
      });
    }

    case "line": {
      if (!tl.style?.points || tl.style.points.length < 4) return null;
      const absPoints = tl.style.points.map((p, i) =>
        i % 2 === 0 ? (p / 100) * cw : (p / 100) * ch
      );
      return new Konva.Line({
        points: absPoints,
        stroke: resolveColor(tl.style?.stroke || tl.style?.fill, vault),
        strokeWidth: tl.style?.strokeWidth || 2,
        tension: tl.style?.tension || 0,
        closed: tl.style?.closed || false,
        fill: tl.style?.closed && tl.style?.fill ? resolveColor(tl.style.fill, vault) : undefined,
        opacity: tl.style?.opacity ?? 1,
      });
    }

    case "group": {
      if (!tl.children || tl.children.length === 0) return null;
      const group = new Konva.Group({ x, y, opacity: tl.style?.opacity ?? 1 });
      const childSorted = [...tl.children].sort((a, b) => a.zIndex - b.zIndex);
      for (const child of childSorted) {
        if (!isVisible(child, asset, vault)) continue;
        // Children are relative to group, so pass group dims
        const node = renderLayerImperative(child, cw, ch, images, asset, vault, logoUrl);
        if (node) group.add(node);
      }
      return group;
    }

    default:
      return null;
  }
}

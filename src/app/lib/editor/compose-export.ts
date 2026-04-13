/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Compose & Export — Render layers to off-screen canvas
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

import type { UnifiedLayer, SpatialProps, ShapeLayer } from "./types";

interface ImageRefs {
  logos: Record<string, HTMLImageElement>;
  subjects: Record<string, HTMLImageElement>;
  videos: Record<string, HTMLVideoElement>;
}

/**
 * Compose all visible layers onto an off-screen canvas at a given frame.
 * Returns a base64 PNG data URL, or null on failure.
 */
export function composeCanvasDataUrl(
  baseImage: HTMLImageElement | null,
  layers: UnifiedLayer[],
  imageRefs: ImageRefs,
  frame: number,
  fps: number,
  getSpatialAtFrame?: (layer: UnifiedLayer, frame: number) => SpatialProps,
): string | null {
  if (!baseImage) return null;

  const c = document.createElement("canvas");
  c.width = baseImage.width;
  c.height = baseImage.height;
  const ctx = c.getContext("2d")!;

  // Draw base image
  ctx.drawImage(baseImage, 0, 0);

  // Sort by zIndex
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    if (!layer.visible) continue;

    // Check temporal range
    const relFrame = frame - layer.temporal.startFrame;
    if (relFrame < 0 || relFrame >= layer.temporal.durationInFrames) continue;

    // Get spatial props (animated or base)
    const sp = getSpatialAtFrame ? getSpatialAtFrame(layer, frame) : layer.spatial;

    ctx.save();
    ctx.globalAlpha = sp.opacity;

    switch (layer.type) {
      case "text":
        renderTextLayer(ctx, layer, sp);
        break;
      case "logo":
        renderLogoLayer(ctx, layer, sp, imageRefs.logos[layer.id]);
        break;
      case "subject":
        renderSubjectLayer(ctx, layer, imageRefs.subjects[layer.id], baseImage);
        break;
      case "shape":
        renderShapeLayer(ctx, layer, sp);
        break;
      case "image": {
        const img = imageRefs.logos[layer.id]; // image layers also stored in logos ref
        if (img) {
          ctx.translate(sp.x, sp.y);
          ctx.rotate((sp.rotation * Math.PI) / 180);
          ctx.scale(sp.scaleX, sp.scaleY);
          ctx.drawImage(img, 0, 0, sp.width, sp.height);
        }
        break;
      }
      case "video": {
        const vid = imageRefs.videos[layer.id];
        if (vid) {
          ctx.translate(sp.x, sp.y);
          ctx.rotate((sp.rotation * Math.PI) / 180);
          ctx.scale(sp.scaleX, sp.scaleY);
          ctx.drawImage(vid, 0, 0, sp.width, sp.height);
        }
        break;
      }
    }

    ctx.restore();
  }

  return c.toDataURL("image/png");
}

// ── Per-layer renderers ──

function renderTextLayer(ctx: CanvasRenderingContext2D, layer: Extract<UnifiedLayer, { type: "text" }>, sp: SpatialProps) {
  ctx.translate(sp.x, sp.y);
  ctx.rotate((sp.rotation * Math.PI) / 180);
  ctx.scale(sp.scaleX, sp.scaleY);

  const weight = layer.fontStyle.includes("bold") ? "bold" : "normal";
  const italic = layer.fontStyle.includes("italic") ? "italic " : "";
  ctx.font = `${italic}${weight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.fillStyle = layer.fill;
  ctx.textBaseline = "top";
  ctx.textAlign = layer.align;

  // Shadow
  if (layer.shadow.enabled) {
    ctx.shadowColor = layer.shadow.color;
    ctx.shadowBlur = layer.shadow.blur;
    ctx.shadowOffsetX = layer.shadow.offsetX;
    ctx.shadowOffsetY = layer.shadow.offsetY;
  }

  // Multi-line support
  const lines = layer.text.split("\n");
  const lineH = layer.fontSize * layer.lineHeight;
  const xOffset = layer.align === "center" ? sp.width / 2 : layer.align === "right" ? sp.width : 0;
  lines.forEach((line, i) => {
    ctx.fillText(line, xOffset, i * lineH);
  });
}

function renderLogoLayer(ctx: CanvasRenderingContext2D, _layer: Extract<UnifiedLayer, { type: "logo" }>, sp: SpatialProps, img?: HTMLImageElement) {
  if (!img) return;
  ctx.translate(sp.x, sp.y);
  ctx.rotate((sp.rotation * Math.PI) / 180);
  ctx.scale(sp.scaleX, sp.scaleY);
  ctx.drawImage(img, 0, 0, sp.width, sp.height);
}

function renderSubjectLayer(ctx: CanvasRenderingContext2D, _layer: Extract<UnifiedLayer, { type: "subject" }>, img?: HTMLImageElement, baseImage?: HTMLImageElement) {
  if (!img || !baseImage) return;
  ctx.drawImage(img, 0, 0, baseImage.width, baseImage.height);
}

function renderShapeLayer(ctx: CanvasRenderingContext2D, layer: ShapeLayer, sp: SpatialProps) {
  ctx.translate(sp.x + sp.width / 2, sp.y + sp.height / 2);
  ctx.rotate((sp.rotation * Math.PI) / 180);
  ctx.scale(sp.scaleX, sp.scaleY);
  ctx.translate(-sp.width / 2, -sp.height / 2);

  const w = sp.width;
  const h = sp.height;

  ctx.beginPath();
  switch (layer.shape) {
    case "rect":
    case "patch":
    case "pill": {
      const r = layer.shape === "pill"
        ? Math.min(w, h) / 2
        : Math.min(layer.cornerRadius, w / 2, h / 2);
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, h - r);
      ctx.quadraticCurveTo(w, h, w - r, h);
      ctx.lineTo(r, h);
      ctx.quadraticCurveTo(0, h, 0, h - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      break;
    }
    case "circle": {
      const rx = w / 2;
      const ry = h / 2;
      ctx.ellipse(rx, ry, rx, ry, 0, 0, Math.PI * 2);
      break;
    }
    case "star": {
      const cx = w / 2;
      const cy = h / 2;
      const outer = Math.min(w, h) / 2;
      const inner = outer * layer.innerRadiusRatio;
      const points = layer.numPoints;
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI * i) / points - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case "triangle": {
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      break;
    }
    case "arrow": {
      const aw = w * 0.3; // shaft width
      const ah = h * 0.4; // arrowhead start
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, ah);
      ctx.lineTo(w / 2 + aw, ah);
      ctx.lineTo(w / 2 + aw, h);
      ctx.lineTo(w / 2 - aw, h);
      ctx.lineTo(w / 2 - aw, ah);
      ctx.lineTo(0, ah);
      ctx.closePath();
      break;
    }
  }

  // Fill
  if (layer.fillType === "gradient") {
    const a = (layer.gradientAngle * Math.PI) / 180;
    const cx = w / 2;
    const cy = h / 2;
    const diag = Math.sqrt(w * w + h * h) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(a) * diag, cy - Math.sin(a) * diag,
      cx + Math.cos(a) * diag, cy + Math.sin(a) * diag,
    );
    grad.addColorStop(0, layer.gradientStart);
    grad.addColorStop(1, layer.gradientEnd);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = layer.fill;
  }
  ctx.fill();

  if (layer.strokeWidth > 0) {
    ctx.lineWidth = layer.strokeWidth;
    ctx.strokeStyle = layer.stroke;
    ctx.stroke();
  }
}

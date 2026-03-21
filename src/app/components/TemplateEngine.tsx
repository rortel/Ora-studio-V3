import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Text, Rect, Circle as KonvaCircle, Path as KonvaPath, Line as KonvaLine, Group } from "react-konva";
import type Konva from "konva";
import type { TemplateDefinition, TemplateLayer } from "./templates/types";
import { Download } from "lucide-react";

interface TemplateEngineProps {
  template: TemplateDefinition;
  /** GeneratedAsset fields: imageUrl, headline, ctaText, caption, etc. */
  asset: Record<string, any>;
  /** Vault data with colors array, logoUrl, etc. */
  vault: Record<string, any> | null;
  /** Brand logo signed URL */
  brandLogoUrl: string | null;
  /** Display width in pixels (scaled from canvasWidth) */
  width?: number;
  /** Called with PNG data URL on export */
  onExport?: (dataUrl: string) => void;
  /** Show export button */
  showExport?: boolean;
}

// ── Recursively collect all image layers (including inside groups) ──
function collectImageLayers(layers: TemplateLayer[]): TemplateLayer[] {
  const result: TemplateLayer[] = [];
  for (const layer of layers) {
    if ((layer.type === "background-image" || layer.type === "logo" || layer.type === "image") && layer.dataBinding) {
      result.push(layer);
    }
    if (layer.type === "group" && layer.children) {
      result.push(...collectImageLayers(layer.children));
    }
  }
  return result;
}

/**
 * Konva-based compositing engine that renders a template with brand overlays.
 * Supports: background-image, image, text, shape, circle, path, line, gradient-overlay, logo, group.
 */
export function TemplateEngine({ template, asset, vault, brandLogoUrl, width, onExport, showExport }: TemplateEngineProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  const displayWidth = width || 600;
  const scale = displayWidth / template.canvasWidth;
  const displayHeight = template.canvasHeight * scale;

  // ── Resolve data binding ──
  const resolveBinding = useCallback((binding: TemplateLayer["dataBinding"]): string => {
    if (!binding) return "";
    if (binding.source === "asset") return asset?.[binding.field] || "";
    if (binding.source === "vault") {
      if (binding.field === "logoUrl") return brandLogoUrl || vault?.logo_url || "";
      return vault?.[binding.field] || "";
    }
    return binding.field || "";
  }, [asset, vault, brandLogoUrl]);

  // ── Resolve color (supports "vault:primary" notation) ──
  const resolveColor = useCallback((color: string | undefined): string => {
    if (!color) return "#FFFFFF";
    if (!color.startsWith("vault:")) return color;
    const role = color.slice(6);
    const colors = vault?.colors as { hex: string; name: string; role: string }[] | undefined;
    if (!colors?.length) return "#3B4FC4";
    const match = colors.find(c => c.role?.toLowerCase() === role || c.name?.toLowerCase() === role);
    return match?.hex || colors[0]?.hex || "#3B4FC4";
  }, [vault]);

  // ── Common props (rotation, stroke, shadow, opacity) for all layer types ──
  const commonProps = useCallback((layer: TemplateLayer) => ({
    stroke: layer.style?.stroke ? resolveColor(layer.style.stroke) : undefined,
    strokeWidth: layer.style?.strokeWidth || 0,
    shadowColor: layer.style?.shadowColor || undefined,
    shadowBlur: layer.style?.shadowBlur || 0,
    shadowOffsetX: layer.style?.shadowOffsetX || 0,
    shadowOffsetY: layer.style?.shadowOffsetY || 0,
    opacity: layer.style?.opacity ?? 1,
  }), [resolveColor]);

  // ── Rotation props (centered rotation via offset) ──
  const rotationProps = useCallback((layer: TemplateLayer, px: number, py: number, pw: number, ph: number) => {
    if (!layer.style?.rotation) return { x: px, y: py };
    return { x: px + pw / 2, y: py + ph / 2, offsetX: pw / 2, offsetY: ph / 2, rotation: layer.style.rotation };
  }, []);

  // ── Preload images (recursively includes group children) ──
  useEffect(() => {
    const imageUrls: Record<string, string> = {};
    const imageLayers = collectImageLayers(template.layers);
    for (const layer of imageLayers) {
      const url = resolveBinding(layer.dataBinding);
      if (url) imageUrls[layer.id] = url;
    }

    const keys = Object.keys(imageUrls);
    if (keys.length === 0) return;

    const loaded: Record<string, HTMLImageElement> = {};
    let remaining = keys.length;

    const done = () => { remaining--; if (remaining === 0) setLoadedImages({ ...loaded }); };

    for (const [id, url] of Object.entries(imageUrls)) {
      fetch(url, { mode: "cors" })
        .then(r => { if (!r.ok) throw new Error("not ok"); return r.blob(); })
        .then(blob => {
          const objectUrl = URL.createObjectURL(blob);
          const img = new window.Image();
          img.onload = () => { loaded[id] = img; done(); };
          img.onerror = () => done();
          img.src = objectUrl;
        })
        .catch(() => {
          const img = new window.Image();
          img.onload = () => { loaded[id] = img; done(); };
          img.onerror = () => done();
          img.src = url;
        });
    }
  }, [template, resolveBinding]);

  // ── Export handler ──
  const handleExport = useCallback(() => {
    if (!stageRef.current) return;
    try {
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: template.canvasWidth / displayWidth,
        mimeType: "image/png",
        quality: 1,
      });
      onExport?.(dataUrl);
    } catch {
      alert("Export not available for external CDN images. Use the Download button instead.");
    }
  }, [template, displayWidth, onExport]);

  // ── Check visibility condition ──
  const isVisible = useCallback((layer: TemplateLayer): boolean => {
    if (!layer.visible) return true;
    const field = layer.visible.when.replace("asset.", "").replace("vault.", "");
    const source = layer.visible.when.startsWith("vault.") ? vault : asset;
    const value = source?.[field];
    if (layer.visible.notEmpty) return !!value && value !== "";
    return true;
  }, [asset, vault]);

  // ── Cover-fit crop helper ──
  const coverCrop = (img: HTMLImageElement, w: number, h: number) => {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let cropW = img.width, cropH = img.height, cropX = 0, cropY = 0;
    if (imgRatio > boxRatio) { cropW = img.height * boxRatio; cropX = (img.width - cropW) / 2; }
    else { cropH = img.width / boxRatio; cropY = (img.height - cropH) / 2; }
    return { x: cropX, y: cropY, width: cropW, height: cropH };
  };

  // ── Render a single layer ──
  const renderLayer = useCallback((layer: TemplateLayer): React.ReactNode => {
    if (!isVisible(layer)) return null;

    const x = (layer.x / 100) * template.canvasWidth;
    const y = (layer.y / 100) * template.canvasHeight;
    const w = (layer.width / 100) * template.canvasWidth;
    const h = (layer.height / 100) * template.canvasHeight;

    switch (layer.type) {
      // ── Background image (cover fit, full bleed) ──
      case "background-image": {
        const img = loadedImages[layer.id];
        if (!img) return null;
        return (
          <KonvaImage
            key={layer.id} image={img}
            {...rotationProps(layer, x, y, w, h)} width={w} height={h}
            crop={coverCrop(img, w, h)}
            {...commonProps(layer)}
          />
        );
      }

      // ── Additional image (cover fit + clip mask + rotation + stroke) ──
      case "image": {
        const img = loadedImages[layer.id];
        if (!img) return null;
        const crop = coverCrop(img, w, h);
        const cp = commonProps(layer);
        const rp = rotationProps(layer, x, y, w, h);

        // Clip mask support
        if (layer.style?.clipType === "circle") {
          const clipFunc = (ctx: any) => { ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2); };
          return (
            <Group key={layer.id} clipFunc={clipFunc} {...rp} {...cp}>
              <KonvaImage image={img} x={0} y={0} width={w} height={h} crop={crop} />
            </Group>
          );
        }
        if (layer.style?.clipType === "roundedRect") {
          const cr = ((layer.style?.clipRadius || 5) / 100) * Math.min(w, h);
          const clipFunc = (ctx: any) => {
            ctx.moveTo(cr, 0); ctx.arcTo(w, 0, w, h, cr); ctx.arcTo(w, h, 0, h, cr);
            ctx.arcTo(0, h, 0, 0, cr); ctx.arcTo(0, 0, w, 0, cr); ctx.closePath();
          };
          return (
            <Group key={layer.id} clipFunc={clipFunc} {...rp} {...cp}>
              <KonvaImage image={img} x={0} y={0} width={w} height={h} crop={crop} />
            </Group>
          );
        }

        return (
          <KonvaImage key={layer.id} image={img}
            {...rp} width={w} height={h} crop={crop} {...cp}
          />
        );
      }

      // ── Text ──
      case "text": {
        const rawText = resolveBinding(layer.dataBinding);
        if (!rawText) return null;
        let text = rawText;
        if (layer.style?.textTransform === "uppercase") text = text.toUpperCase();
        else if (layer.style?.textTransform === "lowercase") text = text.toLowerCase();
        if (layer.style?.maxLines) {
          const lines = text.split("\n").slice(0, layer.style.maxLines);
          text = lines.join("\n");
        }
        const fontSize = ((layer.style?.fontSize || 3) / 100) * template.canvasHeight;
        return (
          <Text
            key={layer.id} {...rotationProps(layer, x, y, w, h)} width={w} height={h}
            text={text}
            fontSize={fontSize}
            fontFamily={layer.style?.fontFamily || "Inter, Helvetica, Arial, sans-serif"}
            fontStyle={layer.style?.fontWeight ? `${layer.style.fontWeight >= 700 ? "bold" : "normal"}` : "normal"}
            fill={resolveColor(layer.style?.color)}
            align={layer.style?.textAlign || "left"}
            verticalAlign="middle"
            lineHeight={layer.style?.lineHeight || 1.3}
            letterSpacing={layer.style?.letterSpacing || 0}
            wrap="word"
            ellipsis={true}
            {...commonProps(layer)}
          />
        );
      }

      // ── Shape (rectangle) ──
      case "shape": {
        return (
          <Rect
            key={layer.id}
            {...rotationProps(layer, x, y, w, h)} width={w} height={h}
            fill={resolveColor(layer.style?.fill)}
            cornerRadius={layer.style?.cornerRadius || 0}
            {...commonProps(layer)}
          />
        );
      }

      // ── Circle ──
      case "circle": {
        const radius = layer.style?.radius
          ? (layer.style.radius / 100) * template.canvasWidth
          : Math.min(w, h) / 2;
        return (
          <KonvaCircle
            key={layer.id}
            x={x + w / 2} y={y + h / 2}
            radius={radius}
            fill={layer.style?.fill ? resolveColor(layer.style.fill) : undefined}
            rotation={layer.style?.rotation || 0}
            {...commonProps(layer)}
          />
        );
      }

      // ── Path (SVG path data) ──
      case "path": {
        if (!layer.style?.pathData) return null;
        const pathScl = layer.style?.pathScale || 1;
        return (
          <KonvaPath
            key={layer.id}
            x={x} y={y}
            data={layer.style.pathData}
            fill={layer.style?.fill ? resolveColor(layer.style.fill) : undefined}
            scaleX={pathScl * (w / 100)} scaleY={pathScl * (h / 100)}
            rotation={layer.style?.rotation || 0}
            {...commonProps(layer)}
          />
        );
      }

      // ── Line (polyline / curve) ──
      case "line": {
        if (!layer.style?.points || layer.style.points.length < 4) return null;
        const absPoints = layer.style.points.map((p, i) =>
          i % 2 === 0 ? (p / 100) * template.canvasWidth : (p / 100) * template.canvasHeight
        );
        return (
          <KonvaLine
            key={layer.id}
            points={absPoints}
            stroke={resolveColor(layer.style?.stroke || layer.style?.fill)}
            strokeWidth={layer.style?.strokeWidth || 2}
            lineCap={layer.style?.lineCap || "round"}
            lineJoin={layer.style?.lineJoin || "round"}
            tension={layer.style?.tension || 0}
            closed={layer.style?.closed || false}
            dash={layer.style?.dash}
            fill={layer.style?.closed && layer.style?.fill ? resolveColor(layer.style.fill) : undefined}
            opacity={layer.style?.opacity ?? 1}
            shadowColor={layer.style?.shadowColor}
            shadowBlur={layer.style?.shadowBlur || 0}
          />
        );
      }

      // ── Gradient overlay ──
      case "gradient-overlay": {
        const stops = layer.style?.gradientStops || [];
        const flatStops: (number | string)[] = [];
        for (const s of stops) {
          flatStops.push(s.offset);
          const r = parseInt(s.color.slice(1, 3), 16);
          const g = parseInt(s.color.slice(3, 5), 16);
          const b = parseInt(s.color.slice(5, 7), 16);
          flatStops.push(`rgba(${r},${g},${b},${s.opacity})`);
        }
        return (
          <Rect
            key={layer.id} x={x} y={y} width={w} height={h}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: h }}
            fillLinearGradientColorStops={flatStops}
            {...commonProps(layer)}
          />
        );
      }

      // ── Logo (contain fit) ──
      case "logo": {
        const img = loadedImages[layer.id];
        if (!img) return null;
        const imgRatio = img.width / img.height;
        const boxRatio = w / h;
        let drawW = w, drawH = h, drawX = x, drawY = y;
        if (imgRatio > boxRatio) { drawH = w / imgRatio; drawY = y + (h - drawH) / 2; }
        else { drawW = h * imgRatio; drawX = x + (w - drawW) / 2; }
        return (
          <KonvaImage
            key={layer.id} image={img}
            x={drawX} y={drawY} width={drawW} height={drawH}
            {...commonProps(layer)}
          />
        );
      }

      // ── Group (recursive children) ──
      case "group": {
        if (!layer.children || layer.children.length === 0) return null;
        return (
          <Group key={layer.id}
            {...rotationProps(layer, x, y, w, h)}
            opacity={layer.style?.opacity ?? 1}
          >
            {[...layer.children]
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(renderLayer)}
          </Group>
        );
      }
    }
    return null;
  }, [loadedImages, template, resolveBinding, resolveColor, isVisible, commonProps, rotationProps]);

  return (
    <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
      <Stage ref={stageRef} width={displayWidth} height={displayHeight} scaleX={scale} scaleY={scale}>
        <Layer>
          {[...template.layers]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map(renderLayer)}
        </Layer>
      </Stage>
      {showExport && onExport && (
        <button
          onClick={handleExport}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: "var(--ora-signal, #3B4FC4)", color: "#fff", fontSize: "12px", fontWeight: 600 }}
        >
          <Download size={12} /> Export PNG
        </button>
      )}
    </div>
  );
}

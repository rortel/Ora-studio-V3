import { useRef, useEffect, useState, useCallback } from "react";
import type { TemplateDefinition } from "./templates/types";
import { Download } from "lucide-react";

interface SVGTemplateEngineProps {
  template: TemplateDefinition;
  asset: Record<string, any>;
  vault: Record<string, any> | null;
  brandLogoUrl: string | null;
  width?: number;
  onExport?: (dataUrl: string) => void;
  showExport?: boolean;
}

// ── Helpers ──

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript\s*:/gi, "blocked:");
}

/**
 * SVG-based template engine for AI-generated templates.
 * Replaces placeholders in SVG with actual asset/vault data, inlines images for CORS-safe export.
 */
export function SVGTemplateEngine({ template, asset, vault, brandLogoUrl, width, onExport, showExport }: SVGTemplateEngineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedSvg, setResolvedSvg] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  const displayWidth = width || 600;
  const scale = displayWidth / template.canvasWidth;
  const displayHeight = template.canvasHeight * scale;

  // ── Resolve vault color by role ──
  const resolveVaultColor = useCallback((role: string): string => {
    const colors = vault?.colors as { hex: string; name: string; role: string }[] | undefined;
    if (!colors?.length) return "#111111";
    const match = colors.find(c => c.role?.toLowerCase() === role || c.name?.toLowerCase() === role);
    return match?.hex || colors[0]?.hex || "#111111";
  }, [vault]);

  // ── Resolve placeholders and inline images ──
  useEffect(() => {
    if (!template.svgTemplate) return;
    let cancelled = false;

    async function resolve() {
      let svg = template.svgTemplate || "";

      // 1. Replace text/color placeholders
      const textPlaceholders: Record<string, string> = {
        "{{HEADLINE}}": escapeXml(asset?.headline || asset?.title || ""),
        "{{SUBHEADLINE}}": escapeXml(asset?.subheadline || asset?.caption || asset?.copy || ""),
        "{{CTA}}": escapeXml(asset?.ctaText || asset?.cta || ""),
      };
      const colorPlaceholders: Record<string, string> = {
        "{{PRIMARY_COLOR}}": resolveVaultColor("primary"),
        "{{SECONDARY_COLOR}}": resolveVaultColor("secondary"),
        "{{ACCENT_COLOR}}": resolveVaultColor("accent"),
        "{{BACKGROUND_COLOR}}": resolveVaultColor("background"),
      };
      // Image URL placeholders (will be replaced with data URIs below)
      const imagePlaceholders: Record<string, string> = {
        "{{PHOTO_1}}": asset?.imageUrl || "",
        "{{PHOTO_2}}": asset?.imageUrl2 || asset?.imageUrl || "",
        "{{LOGO_URL}}": brandLogoUrl || vault?.logo_url || "",
      };

      // Replace text and color placeholders
      for (const [token, value] of Object.entries(textPlaceholders)) {
        svg = svg.replaceAll(token, value);
      }
      for (const [token, value] of Object.entries(colorPlaceholders)) {
        svg = svg.replaceAll(token, value);
      }

      // 2. Replace image placeholders with actual URLs first
      for (const [token, url] of Object.entries(imagePlaceholders)) {
        if (url) svg = svg.replaceAll(token, url);
      }

      // 3. Find ALL image hrefs and convert to data URIs (for CORS-safe canvas export)
      const hrefPattern = /href="([^"]+)"/g;
      const urls = new Set<string>();
      let match;
      while ((match = hrefPattern.exec(svg)) !== null) {
        const url = match[1];
        if (url.startsWith("http") || url.startsWith("//")) urls.add(url);
      }

      if (urls.size > 0) {
        const dataUriMap: Record<string, string> = {};
        await Promise.all(
          Array.from(urls).map(async (url) => {
            try {
              const res = await fetch(url, { mode: "cors" });
              if (!res.ok) return;
              const blob = await res.blob();
              dataUriMap[url] = await blobToDataUri(blob);
            } catch {
              // Keep original URL — display works but export may fail
            }
          })
        );
        for (const [url, dataUri] of Object.entries(dataUriMap)) {
          svg = svg.replaceAll(url, dataUri);
        }
      }

      // 4. Sanitize
      svg = sanitizeSvg(svg);

      // 5. Ensure the SVG scales properly
      svg = svg.replace(/width="[^"]*"/, `width="${displayWidth}"`);
      svg = svg.replace(/height="[^"]*"/, `height="${displayHeight}"`);

      if (!cancelled) {
        setResolvedSvg(svg);
        setIsReady(true);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [template.svgTemplate, asset, vault, brandLogoUrl, resolveVaultColor, displayWidth, displayHeight]);

  // ── Export to PNG ──
  const handleExport = useCallback(async () => {
    if (!template.svgTemplate || exporting) return;
    setExporting(true);
    try {
      // Re-resolve at full resolution (not display scale)
      let svg = resolvedSvg;
      // Restore full-res dimensions for export
      svg = svg.replace(/width="[^"]*"/, `width="${template.canvasWidth}"`);
      svg = svg.replace(/height="[^"]*"/, `height="${template.canvasHeight}"`);

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = template.canvasWidth;
        canvas.height = template.canvasHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, template.canvasWidth, template.canvasHeight);
        try {
          const dataUrl = canvas.toDataURL("image/png", 1.0);
          onExport?.(dataUrl);
        } catch (e) {
          console.error("[SVGTemplateEngine] Canvas tainted, export failed:", e);
        }
        URL.revokeObjectURL(url);
        setExporting(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        setExporting(false);
        console.error("[SVGTemplateEngine] Failed to load SVG as image for export");
      };
      img.src = url;
    } catch {
      setExporting(false);
    }
  }, [resolvedSvg, template, onExport, exporting]);

  if (!template.svgTemplate) return null;

  return (
    <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: displayWidth, height: displayHeight, overflow: "hidden", borderRadius: 8 }}
        dangerouslySetInnerHTML={{ __html: resolvedSvg }}
      />
      {showExport && onExport && isReady && (
        <button
          onClick={handleExport}
          disabled={exporting}
          className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
            opacity: exporting ? 0.5 : 1,
            cursor: exporting ? "wait" : "pointer",
          }}
        >
          <Download size={12} />
          {exporting ? "Exporting..." : "Export PNG"}
        </button>
      )}
    </div>
  );
}

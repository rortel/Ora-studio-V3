import { useRef, useEffect, useState, useCallback } from "react";
import { toPng } from "html-to-image";
import type { TemplateDefinition } from "./templates/types";
import { Download } from "lucide-react";

interface HTMLTemplateEngineProps {
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\bon\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\bon\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript\s*:/gi, "blocked:")
    .replace(/<link[^>]*>/gi, "");
}

/**
 * HTML/CSS-based template engine for AI-generated templates (two-pass approach).
 * Replaces placeholders in HTML with actual asset/vault data, inlines images for CORS-safe export.
 */
export function HTMLTemplateEngine({ template, asset, vault, brandLogoUrl, width, onExport, showExport }: HTMLTemplateEngineProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [resolvedHtml, setResolvedHtml] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  const displayWidth = width || 600;
  const scale = displayWidth / template.canvasWidth;
  const displayHeight = template.canvasHeight * scale;

  // ── Resolve vault color by role ──
  const resolveVaultColor = useCallback((role: string): string => {
    const colors = vault?.colors as { hex: string; name: string; role: string }[] | undefined;
    if (!colors?.length) return "#3B4FC4";
    const match = colors.find(c => c.role?.toLowerCase() === role || c.name?.toLowerCase() === role);
    return match?.hex || colors[0]?.hex || "#3B4FC4";
  }, [vault]);

  // ── Resolve placeholders and inline images ──
  useEffect(() => {
    if (!template.htmlTemplate) return;
    let cancelled = false;

    async function resolve() {
      let html = template.htmlTemplate || "";

      // 1. Replace text placeholders
      const textPlaceholders: Record<string, string> = {
        "{{HEADLINE}}": escapeHtml(asset?.headline || asset?.title || ""),
        "{{SUBHEADLINE}}": escapeHtml(asset?.subheadline || asset?.caption || asset?.copy || ""),
        "{{CTA}}": escapeHtml(asset?.ctaText || asset?.cta || ""),
      };
      const colorPlaceholders: Record<string, string> = {
        "{{PRIMARY_COLOR}}": resolveVaultColor("primary"),
        "{{SECONDARY_COLOR}}": resolveVaultColor("secondary"),
        "{{ACCENT_COLOR}}": resolveVaultColor("accent"),
        "{{BACKGROUND_COLOR}}": resolveVaultColor("background"),
      };
      const imagePlaceholders: Record<string, string> = {
        "{{PHOTO_1}}": asset?.imageUrl || "",
        "{{PHOTO_2}}": asset?.imageUrl2 || asset?.imageUrl || "",
        "{{LOGO_URL}}": brandLogoUrl || vault?.logo_url || "",
        "{{REFERENCE_IMAGE}}": template.referenceImageUrl || "",
      };

      // Replace text and color placeholders
      for (const [token, value] of Object.entries(textPlaceholders)) {
        html = html.replaceAll(token, value);
      }
      for (const [token, value] of Object.entries(colorPlaceholders)) {
        html = html.replaceAll(token, value);
      }

      // 2. Replace image placeholders with actual URLs first
      for (const [token, url] of Object.entries(imagePlaceholders)) {
        if (url) html = html.replaceAll(token, url);
      }

      // 3. Find ALL image src URLs and convert to data URIs (for CORS-safe export)
      const srcPattern = /src="([^"]+)"/g;
      const urls = new Set<string>();
      let match;
      while ((match = srcPattern.exec(html)) !== null) {
        const url = match[1];
        if (url.startsWith("http") || url.startsWith("//")) urls.add(url);
      }
      // Also check url() in inline styles (for background-image)
      const urlPattern = /url\(['"]?([^'")\s]+)['"]?\)/g;
      while ((match = urlPattern.exec(html)) !== null) {
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
              // Keep original URL — display works but export may taint
            }
          })
        );
        for (const [url, dataUri] of Object.entries(dataUriMap)) {
          html = html.replaceAll(url, dataUri);
        }
      }

      // 4. Sanitize
      html = sanitizeHtml(html);

      if (!cancelled) {
        setResolvedHtml(html);
        setIsReady(true);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [template.htmlTemplate, asset, vault, brandLogoUrl, resolveVaultColor]);

  // ── Export to PNG using html-to-image ──
  const handleExport = useCallback(async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        width: template.canvasWidth,
        height: template.canvasHeight,
        pixelRatio: 1,
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight,
      });
      onExport?.(dataUrl);
    } catch (e) {
      console.error("[HTMLTemplateEngine] Export failed:", e);
    } finally {
      setExporting(false);
    }
  }, [template, onExport, exporting]);

  if (!template.htmlTemplate) return null;

  return (
    <div className="relative" style={{ width: displayWidth, height: displayHeight }}>
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <div
        style={{
          width: displayWidth,
          height: displayHeight,
          overflow: "hidden",
          borderRadius: 8,
        }}
      >
        <div
          ref={contentRef}
          style={{
            width: template.canvasWidth,
            height: template.canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          dangerouslySetInnerHTML={{ __html: resolvedHtml }}
        />
      </div>
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

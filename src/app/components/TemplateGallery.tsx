import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { LayoutGrid, Check } from "lucide-react";
import { getTemplatesForFormat } from "./templates";
import type { TemplateDefinition } from "./templates/types";

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatId: string;
  currentTemplateId: string | undefined;
  onSelect: (templateId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  minimal: "Minimal",
  bold: "Bold",
  editorial: "Editorial",
  gradient: "Gradient",
  magazine: "Magazine",
  corporate: "Corporate",
  neon: "Neon",
  vintage: "Vintage",
  playful: "Playful",
  complex: "Complex",
  "ai-generated": "AI Generated",
};

export function TemplateGallery({ open, onOpenChange, formatId, currentTemplateId, onSelect }: TemplateGalleryProps) {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const templates = useMemo(() => getTemplatesForFormat(formatId), [formatId]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of templates) cats.add(t.category);
    return Array.from(cats);
  }, [templates]);

  const filtered = filterCategory ? templates.filter(t => t.category === filterCategory) : templates;

  // Simple preview: show colored rectangles to represent template layout
  const renderPreview = (tmpl: TemplateDefinition) => {
    const isSelected = tmpl.id === currentTemplateId;
    return (
      <button
        key={tmpl.id}
        onClick={() => { onSelect(tmpl.id); onOpenChange(false); }}
        className="relative group rounded-lg overflow-hidden cursor-pointer transition-all"
        style={{
          aspectRatio: tmpl.aspectRatio.replace(":", "/"),
          border: isSelected ? "2px solid var(--ora-signal)" : "2px solid var(--border)",
          background: "var(--secondary)",
        }}
      >
        {/* Mini template visualization */}
        <div className="w-full h-full relative" style={{ overflow: "hidden" }}>
          {/* Background placeholder */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #333 0%, #1a1a1a 100%)" }} />
          {/* Render shapes from template layers */}
          {tmpl.layers.filter(l => l.type === "shape" || l.type === "gradient-overlay").map(layer => (
            <div
              key={layer.id}
              className="absolute"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height}%`,
                background: layer.type === "gradient-overlay"
                  ? "linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))"
                  : layer.style?.fill === "vault:primary"
                    ? "var(--ora-signal)"
                    : layer.style?.fill || "rgba(255,255,255,0.1)",
                opacity: layer.style?.opacity || 1,
                borderRadius: layer.style?.cornerRadius ? `${layer.style.cornerRadius}%` : undefined,
              }}
            />
          ))}
          {/* Text placeholder lines */}
          {tmpl.layers.filter(l => l.type === "text").map(layer => (
            <div
              key={layer.id}
              className="absolute flex flex-col gap-0.5 justify-center"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height}%`,
                padding: "2px",
              }}
            >
              {layer.id === "headline" ? (
                <>
                  <div className="rounded-sm" style={{ height: "3px", width: "80%", background: "rgba(255,255,255,0.7)" }} />
                  <div className="rounded-sm" style={{ height: "3px", width: "55%", background: "rgba(255,255,255,0.5)" }} />
                </>
              ) : (
                <div className="rounded-sm" style={{ height: "2px", width: "60%", background: "rgba(255,255,255,0.4)" }} />
              )}
            </div>
          ))}
          {/* Logo placeholder */}
          {tmpl.layers.filter(l => l.type === "logo").map(layer => (
            <div
              key={layer.id}
              className="absolute rounded"
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.width}%`,
                height: `${layer.height}%`,
                background: "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--ora-signal)" }}>
            <Check size={10} color="#fff" />
          </div>
        )}

        {/* Name overlay on hover */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <p style={{ fontSize: "10px", fontWeight: 600, color: "#fff" }}>{tmpl.name}</p>
        </div>
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" style={{ background: "#201F23", border: "1px solid rgba(26,23,20,0.04)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "var(--foreground)", fontSize: "16px" }}>
            <LayoutGrid size={14} className="inline mr-2" style={{ color: "var(--ora-signal)" }} />
            Template Gallery
          </DialogTitle>
          <DialogDescription style={{ color: "#7A7572", fontSize: "12px" }}>
            {templates.length} templates available for {formatId.replace(/-/g, " ")}
          </DialogDescription>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setFilterCategory(null)}
            className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all"
            style={{
              background: !filterCategory ? "var(--ora-signal)" : "rgba(26,23,20,0.03)",
              color: !filterCategory ? "#fff" : "var(--text-tertiary)",
              border: `1px solid ${!filterCategory ? "var(--ora-signal)" : "var(--border)"}`,
            }}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all"
              style={{
                background: filterCategory === cat ? "var(--ora-signal)" : "rgba(26,23,20,0.03)",
                color: filterCategory === cat ? "#fff" : "var(--text-tertiary)",
                border: `1px solid ${filterCategory === cat ? "var(--ora-signal)" : "var(--border)"}`,
              }}
            >{CATEGORY_LABELS[cat] || cat}</button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {/* Raw option (no template) */}
          <button
            onClick={() => { onSelect(""); onOpenChange(false); }}
            className="relative rounded-lg overflow-hidden cursor-pointer transition-all flex items-center justify-center"
            style={{
              aspectRatio: "16/9",
              border: !currentTemplateId ? "2px solid var(--ora-signal)" : "2px solid var(--border)",
              background: "var(--secondary)",
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#7A7572" }}>Raw</span>
            {!currentTemplateId && (
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--ora-signal)" }}>
                <Check size={10} color="#fff" />
              </div>
            )}
          </button>
          {filtered.map(renderPreview)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

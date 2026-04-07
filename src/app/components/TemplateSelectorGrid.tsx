import React, { useState, useMemo, useCallback } from "react";
import { LayoutGrid, Check, ArrowRight, Shuffle, X, Columns2 } from "lucide-react";
import { getTemplatesForFormat } from "./templates";
import type { TemplateDefinition } from "./templates/types";

interface TemplateSelectorGridProps {
  formatIds: string[];
  onConfirm: (selections: Record<string, string>) => void;
  onSkip: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  minimal: "Minimal", bold: "Bold", editorial: "Editorial", gradient: "Gradient",
  magazine: "Magazine", corporate: "Corporate", neon: "Neon", vintage: "Vintage",
  playful: "Playful", complex: "Complex", "ai-generated": "AI",
};

const FORMAT_LABELS: Record<string, string> = {
  "linkedin-post": "LinkedIn Post", "instagram-post": "Instagram Post",
  "instagram-story": "Instagram Story", "facebook-post": "Facebook Post",
  "facebook-ad": "Facebook Ad", "youtube-thumbnail": "YouTube Thumbnail",
  "pinterest-pin": "Pinterest Pin", "x-post": "X Post",
  "instagram-carousel": "Instagram Carousel", "tiktok-image": "TikTok",
};

// ── CSS-based template preview (lightweight, no Konva) ──
function TemplatePreviewCard({
  tmpl, isSelected, isCompared, onSelect, onCompare, showCompareBtn,
}: {
  tmpl: TemplateDefinition;
  isSelected: boolean;
  isCompared: boolean;
  onSelect: () => void;
  onCompare: () => void;
  showCompareBtn: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className="relative group rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg"
      style={{
        aspectRatio: tmpl.aspectRatio.replace(":", "/"),
        border: isSelected ? "2px solid var(--ora-signal)" : isCompared ? "2px solid #FFD700" : "2px solid rgba(255,255,255,0.06)",
        background: "#1a1a1a",
        boxShadow: isSelected ? "0 0 20px rgba(var(--ora-signal-rgb, 168,131,98), 0.25)" : "none",
      }}
    >
      {/* Mini template visualization */}
      <div className="w-full h-full relative" style={{ overflow: "hidden" }}>
        {/* Solid bg layers */}
        {tmpl.layers.filter(l => l.type === "shape" && l.style?.fill && !l.style.fill.startsWith("vault")).slice(0, 1).map(layer => (
          <div key={layer.id} className="absolute inset-0" style={{
            background: layer.style?.fill || "#1a1a1a",
            opacity: layer.style?.opacity ?? 1,
          }} />
        ))}
        {/* Default dark gradient bg */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)", zIndex: 0 }} />

        {/* Shape layers */}
        {tmpl.layers.filter(l => l.type === "shape" || l.type === "gradient-overlay" || l.type === "circle").map(layer => (
          <div
            key={layer.id}
            className="absolute"
            style={{
              left: `${layer.x}%`, top: `${layer.y}%`,
              width: `${layer.width}%`, height: `${layer.height}%`,
              background: layer.type === "gradient-overlay"
                ? "linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))"
                : layer.type === "circle"
                  ? (layer.style?.fill === "vault:primary" ? "var(--ora-signal)" : layer.style?.fill || "rgba(255,255,255,0.1)")
                  : layer.style?.fill === "vault:primary"
                    ? "var(--ora-signal)"
                    : layer.style?.fill || "rgba(255,255,255,0.08)",
              opacity: layer.style?.opacity ?? 1,
              borderRadius: layer.type === "circle" ? "50%"
                : layer.style?.cornerRadius ? `${layer.style.cornerRadius}px` : undefined,
              transform: layer.style?.rotation ? `rotate(${layer.style.rotation}deg)` : undefined,
              zIndex: layer.zIndex,
            }}
          />
        ))}

        {/* Background image placeholder */}
        {tmpl.layers.filter(l => l.type === "background-image" || l.type === "image").map(layer => (
          <div
            key={layer.id}
            className="absolute"
            style={{
              left: `${layer.x}%`, top: `${layer.y}%`,
              width: `${layer.width}%`, height: `${layer.height}%`,
              background: "linear-gradient(135deg, rgba(168,131,98,0.3), rgba(168,131,98,0.1))",
              borderRadius: layer.style?.cornerRadius ? `${layer.style.cornerRadius}px`
                : layer.style?.clipType === "circle" ? "50%" : undefined,
              zIndex: layer.zIndex,
            }}
          />
        ))}

        {/* Text placeholder lines */}
        {tmpl.layers.filter(l => l.type === "text").map(layer => {
          const isHeadline = layer.id === "headline" || layer.id === "keyword";
          const isPrice = layer.id === "price" || layer.id === "number";
          const textColor = layer.style?.color || "rgba(255,255,255,0.7)";
          const barColor = textColor.startsWith("#") && textColor !== "#FFFFFF" && textColor !== "#ffffff"
            ? textColor : "rgba(255,255,255,0.6)";
          return (
            <div
              key={layer.id}
              className="absolute flex flex-col gap-[2px] justify-center"
              style={{
                left: `${layer.x}%`, top: `${layer.y}%`,
                width: `${layer.width}%`, height: `${layer.height}%`,
                padding: "2px",
                zIndex: layer.zIndex,
              }}
            >
              {isPrice ? (
                <div className="rounded-sm" style={{ height: "5px", width: "50%", background: barColor, opacity: 0.9 }} />
              ) : isHeadline ? (
                <>
                  <div className="rounded-sm" style={{ height: "3px", width: "85%", background: barColor, opacity: 0.8 }} />
                  <div className="rounded-sm" style={{ height: "3px", width: "60%", background: barColor, opacity: 0.6 }} />
                </>
              ) : (
                <>
                  <div className="rounded-sm" style={{ height: "2px", width: "70%", background: barColor, opacity: 0.4 }} />
                  <div className="rounded-sm" style={{ height: "2px", width: "45%", background: barColor, opacity: 0.3 }} />
                </>
              )}
            </div>
          );
        })}

        {/* Logo placeholder */}
        {tmpl.layers.filter(l => l.type === "logo").map(layer => (
          <div
            key={layer.id}
            className="absolute rounded"
            style={{
              left: `${layer.x}%`, top: `${layer.y}%`,
              width: `${layer.width}%`, height: `${layer.height}%`,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.08)",
              zIndex: layer.zIndex,
            }}
          />
        ))}
      </div>

      {/* Selection checkmark */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--ora-signal)" }}>
          <Check size={12} color="#fff" strokeWidth={3} />
        </div>
      )}

      {/* Compare badge */}
      {isCompared && (
        <div className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#FFD700" }}>
          <Columns2 size={12} color="#000" strokeWidth={3} />
        </div>
      )}

      {/* Hover overlay with name + compare button */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-end justify-between">
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{tmpl.name}</p>
            <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>{CATEGORY_LABELS[tmpl.category] || tmpl.category}</p>
          </div>
          {showCompareBtn && (
            <button
              onClick={(e) => { e.stopPropagation(); onCompare(); }}
              className="px-2 py-1 rounded text-xs font-medium transition-all hover:bg-white/20"
              style={{ color: "#FFD700", fontSize: "9px" }}
            >
              Compare
            </button>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Side-by-side comparison view ──
function CompareView({
  templates, onSelect, onClose,
}: {
  templates: TemplateDefinition[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  if (templates.length < 2) return null;
  const [a, b] = templates;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="relative w-full max-w-3xl mx-4">
        <button onClick={onClose} className="absolute -top-10 right-0 p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={20} color="#fff" />
        </button>
        <div className="flex gap-6 items-start">
          {[a, b].map(tmpl => (
            <div key={tmpl.id} className="flex-1 flex flex-col items-center gap-3">
              <div className="w-full rounded-xl overflow-hidden" style={{
                aspectRatio: tmpl.aspectRatio.replace(":", "/"),
                border: "2px solid rgba(255,255,255,0.1)", background: "#1a1a1a",
              }}>
                <TemplatePreviewCard
                  tmpl={tmpl} isSelected={false} isCompared={false}
                  onSelect={() => onSelect(tmpl.id)} onCompare={() => {}} showCompareBtn={false}
                />
              </div>
              <div className="text-center">
                <p style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>{tmpl.name}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{CATEGORY_LABELS[tmpl.category]}</p>
              </div>
              <button
                onClick={() => onSelect(tmpl.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: "var(--ora-signal)", color: "#fff" }}
              >
                Choose this one
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main selector grid ──
export function TemplateSelectorGrid({ formatIds, onConfirm, onSkip }: TemplateSelectorGridProps) {
  const [activeFormat, setActiveFormat] = useState(formatIds[0] || "instagram-post");
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const templates = useMemo(() => getTemplatesForFormat(activeFormat), [activeFormat]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const t of templates) cats.add(t.category);
    return Array.from(cats);
  }, [templates]);

  const filtered = filterCategory ? templates.filter(t => t.category === filterCategory) : templates;

  const handleSelect = useCallback((templateId: string) => {
    setSelections(prev => ({ ...prev, [activeFormat]: templateId }));
  }, [activeFormat]);

  const handleCompare = useCallback((templateId: string) => {
    setCompareIds(prev => {
      if (prev.includes(templateId)) return prev.filter(id => id !== templateId);
      if (prev.length >= 2) return [prev[1], templateId];
      return [...prev, templateId];
    });
  }, []);

  const compareTemplates = useMemo(() =>
    compareIds.map(id => templates.find(t => t.id === id)).filter(Boolean) as TemplateDefinition[],
    [compareIds, templates]
  );

  const totalSelected = Object.keys(selections).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: "#1C1B1F",
      border: "1px solid rgba(255,255,255,0.06)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} style={{ color: "var(--ora-signal)" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fff" }}>Choose your templates</h3>
          </div>
          <button
            onClick={onSkip}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            <Shuffle size={12} className="inline mr-1" />
            Auto-select
          </button>
        </div>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
          {templates.length} templates available — click to select, hover to compare
        </p>
      </div>

      {/* Format tabs */}
      {formatIds.length > 1 && (
        <div className="px-5 flex gap-1 overflow-x-auto pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {formatIds.map(fid => {
            const count = getTemplatesForFormat(fid).length;
            const isActive = fid === activeFormat;
            const hasSelection = !!selections[fid];
            return (
              <button
                key={fid}
                onClick={() => { setActiveFormat(fid); setFilterCategory(null); setCompareIds([]); }}
                className="px-3 py-2 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5"
                style={{
                  color: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                  background: isActive ? "rgba(255,255,255,0.06)" : "transparent",
                  borderBottom: isActive ? "2px solid var(--ora-signal)" : "2px solid transparent",
                }}
              >
                {FORMAT_LABELS[fid] || fid}
                <span style={{
                  fontSize: "9px", padding: "1px 5px", borderRadius: "8px",
                  background: hasSelection ? "var(--ora-signal)" : "rgba(255,255,255,0.08)",
                  color: hasSelection ? "#fff" : "rgba(255,255,255,0.4)",
                }}>
                  {hasSelection ? "✓" : count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category filter */}
      <div className="px-5 pt-3 flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterCategory(null)}
          className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all"
          style={{
            background: !filterCategory ? "var(--ora-signal)" : "rgba(255,255,255,0.04)",
            color: !filterCategory ? "#fff" : "rgba(255,255,255,0.4)",
            border: `1px solid ${!filterCategory ? "var(--ora-signal)" : "rgba(255,255,255,0.08)"}`,
          }}
        >All ({templates.length})</button>
        {categories.map(cat => {
          const catCount = templates.filter(t => t.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all"
              style={{
                background: filterCategory === cat ? "var(--ora-signal)" : "rgba(255,255,255,0.04)",
                color: filterCategory === cat ? "#fff" : "rgba(255,255,255,0.4)",
                border: `1px solid ${filterCategory === cat ? "var(--ora-signal)" : "rgba(255,255,255,0.08)"}`,
              }}
            >{CATEGORY_LABELS[cat] || cat} ({catCount})</button>
          );
        })}
      </div>

      {/* Template grid */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1" style={{
          scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}>
          {filtered.map(tmpl => (
            <TemplatePreviewCard
              key={tmpl.id}
              tmpl={tmpl}
              isSelected={selections[activeFormat] === tmpl.id}
              isCompared={compareIds.includes(tmpl.id)}
              onSelect={() => handleSelect(tmpl.id)}
              onCompare={() => handleCompare(tmpl.id)}
              showCompareBtn={true}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-8" style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>
            No templates in this category
          </p>
        )}
      </div>

      {/* Compare button (when 2 selected for comparison) */}
      {compareIds.length === 2 && (
        <div className="px-5 pb-3 flex justify-center">
          <button
            onClick={() => setShowCompare(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 flex items-center gap-2"
            style={{ background: "#FFD700", color: "#000" }}
          >
            <Columns2 size={14} />
            Compare side by side
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
          {totalSelected}/{formatIds.length} formats configured
        </p>
        <button
          onClick={() => onConfirm(selections)}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center gap-2"
          style={{ background: "var(--ora-signal)", color: "#fff" }}
        >
          Generate with {totalSelected > 0 ? "selected" : "auto"} templates
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Compare overlay */}
      {showCompare && compareTemplates.length === 2 && (
        <CompareView
          templates={compareTemplates}
          onSelect={(id) => { handleSelect(id); setShowCompare(false); setCompareIds([]); }}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

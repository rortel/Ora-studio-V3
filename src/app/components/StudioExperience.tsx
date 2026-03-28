import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4 PILLARS — faithful to real app screens:
   Studio · Edit · Brand Vault · Campaign Lab
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const f: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

/* ── Pillar 1: Studio (Hub) — faithful to /hub screen ── */
function StudioMockup() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAFA", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-6 md:p-8">
        {/* Top bar — matches real header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/></svg>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#111", ...f }}>Studio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "#111" }} />
            <span style={{ fontSize: "12px", color: "#666", ...f }}>4 models</span>
          </div>
        </div>

        {/* Center area — sparkle icon + heading */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#F0F0F0" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/></svg>
          </div>
          <h3 style={{ fontSize: "22px", fontWeight: 400, color: "#111", letterSpacing: "-0.02em", ...f }}>Generate anything</h3>
          <p style={{ fontSize: "12px", color: "#999", lineHeight: 1.5, maxWidth: 340, margin: "8px auto 0", ...f }}>
            Type what you need below. Select models to compare, then hit Enter. ORA generates from <b style={{ color: "#111" }}>4 models</b> — you pick the best.
          </p>
        </div>

        {/* Quick prompts — matches real suggestions */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          {["Brand pattern", "Abstract header", "Social visual", "Ad creative"].map((s) => (
            <span key={s} className="px-3 py-1.5 rounded-full" style={{ border: "1px solid #E5E5E5", fontSize: "11px", color: "#666", ...f }}>{s}</span>
          ))}
        </div>

        {/* Content type tabs — matches real tabs with icons */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { label: "Campaign", icon: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z", active: false },
            { label: "Image", icon: "M3 3h18v18H3zM8.5 8.5a1 1 0 11-2 0 1 1 0 012 0M21 15l-5-5L5 21", active: true },
            { label: "Text", icon: "M4 7V4h16v3M9 20h6M12 4v16", active: false },
            { label: "Film", icon: "M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16", active: false },
            { label: "Sound", icon: "M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z", active: false },
          ].map((t) => (
            <span key={t.label} className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ background: t.active ? "#111" : "#F5F5F5", color: t.active ? "#fff" : "#999", fontSize: "12px", fontWeight: 500, ...f }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={t.icon}/></svg>
              {t.label}
            </span>
          ))}
        </div>

        {/* Prompt bar — matches real input */}
        <div className="rounded-2xl p-1" style={{ background: "#F0F0F0" }}>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: "13px", color: "#BBB", flex: 1, ...f }}>Describe the image you want to create...</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4"/></svg>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "10px", color: "#BBB", ...f }}>Drop image for Visual Lab</span>
            <span style={{ fontSize: "10px", color: "#BBB", ...f }}>4 models selected</span>
          </div>
        </div>

        {/* Bottom nav — matches real nav */}
        <div className="flex items-center justify-around mt-6 pt-4" style={{ borderTop: "1px solid #EBEBEB" }}>
          {[
            { label: "Home", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", active: true },
            { label: "Calendar", icon: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18", active: false },
            { label: "Content", icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", active: false },
            { label: "Brand", icon: "M12 2a10 10 0 100 20 10 10 0 000-20z", active: false },
          ].map((n) => (
            <div key={n.label} className="flex flex-col items-center gap-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={n.active ? "#111" : "#CCC"} strokeWidth="1.5"><path d={n.icon}/></svg>
              <span style={{ fontSize: "9px", fontWeight: n.active ? 600 : 400, color: n.active ? "#111" : "#CCC", ...f }}>{n.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Pillar 2: Edit (TemplateEditor) — faithful to real editor ── */
function EditMockup() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#18171A", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Top toolbar — matches real editor toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#FAFAFA", ...f }}>Sourdough bread — Hero</span>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", ...f }}>1200×628</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/></svg>
            </div>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016.69 3L21 13"/></svg>
            </div>
          </div>
          {/* Zoom */}
          <span className="px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.06)", fontSize: "10px", color: "rgba(255,255,255,0.5)", ...f }}>75%</span>
          {/* Export */}
          <span className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", fontSize: "10px", color: "rgba(255,255,255,0.5)", ...f }}>Export PNG</span>
          <span className="px-3 py-1.5 rounded-lg" style={{ background: "#FAFAFA", fontSize: "10px", fontWeight: 500, color: "#111", ...f }}>Save</span>
        </div>
      </div>

      <div className="flex" style={{ height: 340 }}>
        {/* Left panel — Layers */}
        <div className="w-[160px] p-3 flex-shrink-0" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="mb-3">
            <span style={{ fontSize: "9px", fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>Add element</span>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {["T", "□", "○", "▓", "—", "🖼"].map((icon) => (
                <div key={icon} className="h-7 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{icon}</div>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <span style={{ fontSize: "9px", fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>Layers</span>
            <div className="mt-2 space-y-1">
              {[
                { name: "Headline text", icon: "📝", selected: true },
                { name: "Logo overlay", icon: "✦", selected: false },
                { name: "Dark gradient", icon: "▓", selected: false },
                { name: "Background", icon: "📷", selected: false },
              ].map((l) => (
                <div key={l.name} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: l.selected ? "rgba(255,255,255,0.08)" : "transparent" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span style={{ fontSize: "10px", color: l.selected ? "#FAFAFA" : "rgba(255,255,255,0.4)", ...f }}>{l.name}</span>
                  <span style={{ fontSize: "9px", marginLeft: "auto" }}>{l.icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center — Canvas */}
        <div className="flex-1 flex items-center justify-center p-4" style={{ background: "#111" }}>
          <div className="relative rounded-lg overflow-hidden" style={{ width: "100%", maxWidth: 420, aspectRatio: "1200/628" }}>
            <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=85" alt="Canvas" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
            {/* Text layer with selection handles */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="relative inline-block" style={{ border: "1px solid rgba(100,150,255,0.6)", padding: "2px 4px" }}>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#fff", ...f }}>Handcrafted sourdough bread</span>
                {/* Selection handles */}
                {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((pos) => (
                  <div key={pos} className={`absolute ${pos} w-2 h-2 rounded-sm`} style={{ background: "#fff", border: "1px solid rgba(100,150,255,0.8)" }} />
                ))}
              </div>
              <div className="mt-1">
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", ...f }}>Maison Dupain — Handmade, every day</span>
              </div>
            </div>
            {/* Logo in corner */}
            <div className="absolute top-3 right-3 w-8 h-8 rounded flex items-center justify-center" style={{ background: "rgba(255,255,255,0.9)" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111", ...f }}>M</span>
            </div>
          </div>
        </div>

        {/* Right panel — Properties */}
        <div className="w-[180px] p-3 flex-shrink-0 overflow-y-auto" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: "9px", fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>Properties</span>
          <div className="mt-3 space-y-3">
            {/* Position */}
            <div>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", ...f }}>Position</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {[{ l: "X", v: "5.0" }, { l: "Y", v: "72.0" }, { l: "W", v: "90.0" }, { l: "H", v: "12.0" }].map((p) => (
                  <div key={p.l} className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", ...f }}>{p.l}</span>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", ...f }}>{p.v}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Text properties */}
            <div>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", ...f }}>Text</span>
              <div className="mt-1.5 space-y-2">
                <div className="px-2 py-1.5 rounded" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", ...f }}>Handcrafted sourdough bread</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", ...f }}>Size</span>
                  <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ background: "rgba(255,255,255,0.4)", width: "55%" }} />
                  </div>
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", ...f }}>5.5%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", ...f }}>Font</span>
                  <span className="px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", fontSize: "9px", color: "rgba(255,255,255,0.5)", ...f }}>Inter</span>
                  <span className="px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", fontSize: "9px", color: "rgba(255,255,255,0.5)", ...f }}>600</span>
                </div>
                <div className="flex items-center gap-1">
                  {["Left", "Center", "Right"].map((a, i) => (
                    <div key={a} className="flex-1 py-1 rounded text-center" style={{ background: i === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)", fontSize: "9px", color: "rgba(255,255,255,0.4)", ...f }}>{a}</div>
                  ))}
                </div>
              </div>
            </div>
            {/* Color */}
            <div>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", ...f }}>Color</span>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-6 h-6 rounded" style={{ background: "#FFFFFF", border: "1px solid rgba(255,255,255,0.1)" }} />
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", ...f }}>#FFFFFF</span>
              </div>
            </div>
            {/* Opacity */}
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", ...f }}>Opacity</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ background: "rgba(255,255,255,0.4)", width: "100%" }} />
              </div>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", ...f }}>100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Pillar 3: Brand Vault — faithful to /hub/vault screen ── */
function BrandVaultMockup() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAFA", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-6 md:p-8">
        {/* Header — matches real Brand Vault header */}
        <div className="mb-2">
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#111", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>Brand Intelligence</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <h3 style={{ fontSize: "24px", fontWeight: 700, color: "#111", ...f }}>Brand Vault</h3>
          <span className="px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ background: "#F5F5F5", fontSize: "12px", fontWeight: 500, color: "#111", ...f }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
            Save
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "#999", lineHeight: 1.5, marginBottom: 20, ...f }}>
          Your brand DNA, extracted and structured. Drop a URL, a PDF, or an image.
        </p>

        {/* URL scanner — matches real input */}
        <div className="rounded-2xl p-4 mb-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: "#F5F5F5" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span style={{ fontSize: "12px", color: "#333", ...f }}>https://maisondupain.fr/</span>
            </div>
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl" style={{ background: "#111", color: "#fff", fontSize: "12px", fontWeight: 500, ...f }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></svg>
              Scan
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ border: "1px dashed #DDD" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span style={{ fontSize: "11px", color: "#CCC", ...f }}>Drop or click — PDF, PPT, DOCX, images (max 20 MB)</span>
          </div>
        </div>

        {/* Brand Identity card — matches real output */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "#2C1810" }}>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#F5E6D3", ...f }}>M</span>
            </div>
            <div className="flex-1">
              <span style={{ fontSize: "18px", fontWeight: 600, color: "#111", ...f, display: "block" }}>Maison Dupain</span>
              <span style={{ fontSize: "12px", color: "#999", ...f }}>Artisan bakery · Sourdough bread</span>
              <span style={{ fontSize: "11px", color: "#BBB", fontStyle: "italic", ...f, display: "block" }}>"The taste of handmade"</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ border: "2px solid #EBEBEB" }}>
                <div>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#111", ...f, display: "block", lineHeight: 1 }}>92</span>
                  <span style={{ fontSize: "8px", color: "#999", ...f }}>/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Brand Colors — matches real color section */}
          <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>Brand Colors</span>
              <span className="px-1.5 py-0.5 rounded" style={{ background: "#F5F5F5", fontSize: "10px", color: "#999", ...f }}>5</span>
            </div>
            {/* Color strip */}
            <div className="flex rounded-lg overflow-hidden mb-3" style={{ height: 32 }}>
              {["#2C1810", "#D4A574", "#F5E6D3", "#8B6914", "#FAFAF5"].map((c) => (
                <div key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            {/* Color list */}
            <div className="space-y-1.5">
              {[
                { hex: "#2C1810", name: "Espresso" },
                { hex: "#D4A574", name: "Wheat Gold" },
                { hex: "#F5E6D3", name: "Cream" },
              ].map((c) => (
                <div key={c.hex} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: c.hex }} />
                  <span style={{ fontSize: "10px", color: "#666", ...f }}>{c.hex}</span>
                  <span style={{ fontSize: "10px", color: "#999", ...f }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tone of Voice — matches real tone section */}
          <div className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>Tone of Voice</span>
            </div>
            <span className="inline-block px-2.5 py-1 rounded-lg mb-3" style={{ background: "#111", color: "#fff", fontSize: "11px", fontWeight: 500, ...f }}>Warm</span>
            {/* Bars — matches FORMALITY / CONFIDENCE / WARMTH / HUMOR */}
            <div className="space-y-2.5">
              {[
                { label: "FORMALITY", value: 4 },
                { label: "CONFIDENCE", value: 7 },
                { label: "WARMTH", value: 9 },
                { label: "HUMOR", value: 3 },
              ].map((t) => (
                <div key={t.label}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: "9px", fontWeight: 500, color: "#999", letterSpacing: "0.04em", ...f }}>{t.label}</span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#111", ...f }}>{t.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "#F0F0F0" }}>
                    <div className="h-full rounded-full" style={{ background: "#111", width: `${t.value * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-3">
              {["artisanal", "authentic", "warm", "passionate"].map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full" style={{ border: "1px solid #E5E5E5", fontSize: "9px", color: "#666", ...f }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Pillar 4: Campaign Lab — faithful to real Campaign mode ── */
function CampaignLabMockup() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAFA", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-6 md:p-8">
        {/* Header — matches real Campaign Lab header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F0F0F0" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/></svg>
          </div>
          <div>
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#111", ...f, display: "block" }}>Campaign Lab</span>
            <span style={{ fontSize: "12px", color: "#999", ...f }}>One brief. Every format. Brand-compliant.</span>
          </div>
        </div>

        {/* Brief textarea — matches real input */}
        <div className="rounded-2xl p-5 mt-5 mb-4" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
          <p style={{ fontSize: "13px", color: "#333", lineHeight: 1.6, ...f }}>
            Fresh batch of sourdough bread — showcase our artisan craftsmanship and invite customers to stop by this weekend.
          </p>
        </div>

        {/* Inspire me + reference — matches real buttons */}
        <div className="flex items-center gap-3 mb-5">
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ border: "1px solid #E5E5E5", fontSize: "12px", color: "#666", ...f }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            Inspire me
          </span>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ border: "1px dashed #DDD" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: "11px", color: "#CCC", ...f }}>Drop reference photos or click to upload</span>
          </div>
        </div>

        {/* Content type tabs — matches real bottom tabs */}
        <div className="flex items-center gap-2 mb-5">
          {[
            { label: "Campaign", active: true },
            { label: "Image", active: false },
            { label: "Text", active: false },
            { label: "Film", active: false },
            { label: "Sound", active: false },
          ].map((t) => (
            <span key={t.label} className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ background: t.active ? "#111" : "#F5F5F5", color: t.active ? "#fff" : "#999", fontSize: "12px", fontWeight: 500, ...f }}>
              {t.label}
            </span>
          ))}
        </div>

        {/* Generated outputs — multi-platform results */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { platform: "Instagram", ratio: "4/5", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=85", copy: "Sourdough, time, and love. Our loaves are ready — are you?", status: "Scheduled · Sat 9 AM", color: "#2D7A2D" },
            { platform: "Facebook", ratio: "16/9", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&q=85", copy: "Discover our latest batch, handmade with organic local flour.", status: "Scheduled · Sat 10 AM", color: "#2D7A2D" },
            { platform: "LinkedIn", ratio: "1/1", img: "https://images.unsplash.com/photo-1556471013-0001958d2f12?w=400&q=85", copy: "Behind every loaf, 48 hours of fermentation and 3 generations of craft.", status: "Scheduled · Mon 8 AM", color: "#2D7A2D" },
            { platform: "TikTok", ratio: "9/16", img: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&q=85", copy: "POV: you walk into the bakery at 6 AM...", status: "Draft", color: "#E5C100" },
          ].map((p) => (
            <div key={p.platform} className="rounded-xl overflow-hidden" style={{ border: "1px solid #EBEBEB" }}>
              <div style={{ aspectRatio: p.ratio, background: "#1A1A1A", position: "relative", maxHeight: 140 }}>
                <img src={p.img} alt={p.platform} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", fontSize: "9px", fontWeight: 500, color: "#fff", ...f }}>{p.platform}</div>
              </div>
              <div className="p-2.5 space-y-1" style={{ background: "#fff" }}>
                <p style={{ fontSize: "9px", color: "#333", lineHeight: 1.4, ...f }}>{p.copy}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  <span style={{ fontSize: "8px", color: "#999", ...f }}>{p.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const pillars = [
  {
    num: "01",
    label: "Studio",
    title: "Generate from one place",
    desc: "One prompt, 4 AI models in parallel. Images, text, video, audio — all in a single interface.",
    Mockup: StudioMockup,
  },
  {
    num: "02",
    label: "Edit",
    title: "Retouchez sans quitter Ora",
    desc: "Built-in editor with layers, typography, logo, and brand assets. Refine every creation before you publish.",
    Mockup: EditMockup,
  },
  {
    num: "03",
    label: "Brand Vault",
    title: "Always true to your brand",
    desc: "Scan your website or drop a PDF. Ora extracts your logo, colors, and tone — every piece of content stays on brand.",
    Mockup: BrandVaultMockup,
  },
  {
    num: "04",
    label: "Campaign Lab",
    title: "One brief, every channel",
    desc: "Describe your campaign. Ora generates the visuals and copy tailored for Instagram, Facebook, LinkedIn, TikTok — ready to publish.",
    Mockup: CampaignLabMockup,
  },
];

export function StudioExperience() {
  return (
    <section className="py-28 md:py-40" style={{ background: "#111111" }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 md:mb-28 text-center"
        >
          <p style={{ fontSize: "12px", fontWeight: 500, color: "rgba(250,250,250,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16, ...f }}>
            Beyond generation
          </p>
          <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#FAFAFA", ...f }}>
            Create. Brand. Publish.
          </h2>
        </motion.div>

        {/* 4 Pillars */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(100px, 14vw, 160px)" }}>
          {pillars.map((p) => {
            const Mockup = p.Mockup;
            return (
              <motion.div
                key={p.num}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
              >
                {/* Step header */}
                <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6 mb-8 md:mb-12">
                  <div className="flex items-baseline gap-3">
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(250,250,250,0.2)", letterSpacing: "0.04em", ...f }}>{p.num}</span>
                    <h3 style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)", fontWeight: 300, color: "#FAFAFA", letterSpacing: "-0.03em", lineHeight: 1.1, ...f }}>{p.label}</h3>
                  </div>
                  <p className="md:ml-auto" style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(250,250,250,0.4)", fontWeight: 400, maxWidth: 380, ...f }}>{p.desc}</p>
                </div>

                {/* Mockup */}
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.97 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 1, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
                >
                  <Mockup />
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mt-20"
        >
          <Link
            to="/hub"
            className="group inline-flex items-center gap-2 transition-all duration-300 hover:gap-3"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "#FAFAFA", fontSize: "14px", fontWeight: 500, padding: "12px 24px", borderRadius: 9999, ...f }}
          >
            Try it free
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

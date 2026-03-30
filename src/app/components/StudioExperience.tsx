import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useI18n } from "../lib/i18n";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4 PILLARS — faithful to real app screens:
   Studio · Edit · Brand Vault · Campaign Lab
   Animated mockups — elements stagger in on scroll
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const EASE = [0.23, 1, 0.32, 1];
const f: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

/* ── Pillar 1: Studio (Hub) — faithful to /hub screen ── */
function StudioMockup() {
  const { t } = useI18n();
  const prompts = [t("studioExperience.promptBrandPattern"), t("studioExperience.promptAbstractHeader"), t("studioExperience.promptSocialVisual"), t("studioExperience.promptAdCreative")];
  const contentTabs = [
    { label: t("studioExperience.tabCampaign"), icon: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z", active: false },
    { label: t("studioExperience.tabImage"), icon: "M3 3h18v18H3zM8.5 8.5a1 1 0 11-2 0 1 1 0 012 0M21 15l-5-5L5 21", active: true },
    { label: t("studioExperience.tabText"), icon: "M4 7V4h16v3M9 20h6M12 4v16", active: false },
    { label: t("studioExperience.tabFilm"), icon: "M4 4h16v16H4zM4 9h16M4 15h16M9 4v16M15 4v16", active: false },
    { label: t("studioExperience.tabSound"), icon: "M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z", active: false },
  ];
  const navItems = [
    { label: t("studioExperience.navHome"), icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", active: true },
    { label: t("studioExperience.navCalendar"), icon: "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18", active: false },
    { label: t("studioExperience.navContent"), icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", active: false },
    { label: t("studioExperience.navBrand"), icon: "M12 2a10 10 0 100 20 10 10 0 000-20z", active: false },
  ];
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAFA", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-6 md:p-8">
        {/* Top bar */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/></svg>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#111", ...f }}>{t("studioExperience.mStudioTitle")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "#111" }} />
            <span style={{ fontSize: "12px", color: "#666", ...f }}>{t("studioExperience.mStudioModels")}</span>
          </div>
        </motion.div>

        {/* Center area — sparkle + heading */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
        >
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "#F0F0F0" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M18 14l.75 2.25L21 17l-2.25.75L18 20l-.75-2.25L15 17l2.25-.75z"/></svg>
          </div>
          <h3 style={{ fontSize: "22px", fontWeight: 400, color: "#111", letterSpacing: "-0.02em", ...f }}>{t("studioExperience.mStudioHeading")}</h3>
          <p style={{ fontSize: "12px", color: "#999", lineHeight: 1.5, maxWidth: 340, margin: "8px auto 0", ...f }}>
            {t("studioExperience.mStudioSubtitle")}
          </p>
        </motion.div>

        {/* Quick prompts — pop in */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
          {prompts.map((s, i) => (
            <motion.span
              key={s}
              className="px-3 py-1.5 rounded-full"
              style={{ border: "1px solid #E5E5E5", fontSize: "11px", color: "#666", ...f }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
            >
              {s}
            </motion.span>
          ))}
        </div>

        {/* Content type tabs — stagger in */}
        <div className="flex items-center gap-2 mb-4">
          {contentTabs.map((tab, i) => (
            <motion.span
              key={tab.label}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full"
              style={{ background: tab.active ? "#111" : "#F5F5F5", color: tab.active ? "#fff" : "#999", fontSize: "12px", fontWeight: 500, ...f }}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.4 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={tab.icon}/></svg>
              {tab.label}
            </motion.span>
          ))}
        </div>

        {/* Prompt bar — slides up */}
        <motion.div
          className="rounded-2xl p-1"
          style={{ background: "#F0F0F0" }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: "13px", color: "#BBB", flex: 1, ...f }}>{t("studioExperience.mStudioPlaceholder")}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4"/></svg>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "10px", color: "#BBB", ...f }}>{t("studioExperience.mStudioDropzone")}</span>
            <span style={{ fontSize: "10px", color: "#BBB", ...f }}>{t("studioExperience.mStudioModelsSelected")}</span>
          </div>
        </motion.div>

        {/* Bottom nav */}
        <motion.div
          className="flex items-center justify-around mt-6 pt-4"
          style={{ borderTop: "1px solid #EBEBEB" }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          {navItems.map((n) => (
            <div key={n.label} className="flex flex-col items-center gap-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={n.active ? "#111" : "#CCC"} strokeWidth="1.5"><path d={n.icon}/></svg>
              <span style={{ fontSize: "9px", fontWeight: n.active ? 600 : 400, color: n.active ? "#111" : "#CCC", ...f }}>{n.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ── Pillar 2: Edit (TemplateEditor) — faithful to real editor ── */
function EditMockup() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#18171A", border: "1px solid rgba(255,255,255,0.06)" }}>
      {/* Top toolbar */}
      <motion.div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#FAFAFA", ...f }}>{t("studioExperience.mEditTitle")}</span>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", ...f }}>1200×628</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/></svg>
            </div>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016.69 3L21 13"/></svg>
            </div>
          </div>
          <span className="px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.06)", fontSize: "10px", color: "rgba(255,255,255,0.5)", ...f }}>75%</span>
          <span className="px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", fontSize: "10px", color: "rgba(255,255,255,0.5)", ...f }}>{t("studioExperience.mEditExport")}</span>
          <span className="px-3 py-1.5 rounded-lg" style={{ background: "#FAFAFA", fontSize: "10px", fontWeight: 500, color: "#111", ...f }}>{t("studioExperience.mEditSave")}</span>
        </div>
      </motion.div>

      <div className="flex" style={{ height: 340 }}>
        {/* Left panel — Layers */}
        <motion.div
          className="w-[160px] p-3 flex-shrink-0"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
        >
          <div className="mb-3">
            <span style={{ fontSize: "9px", fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>{t("studioExperience.mEditAddElement")}</span>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {["T", "□", "○", "▓", "—", "🖼"].map((icon, i) => (
                <motion.div
                  key={icon}
                  className="h-7 rounded flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.35 + i * 0.04, duration: 0.3 }}
                >
                  {icon}
                </motion.div>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <span style={{ fontSize: "9px", fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>{t("studioExperience.mEditLayers")}</span>
            <div className="mt-2 space-y-1">
              {[
                { name: "Headline text", icon: "📝", selected: true },
                { name: "Logo overlay", icon: "✦", selected: false },
                { name: "Dark gradient", icon: "▓", selected: false },
                { name: "Background", icon: "📷", selected: false },
              ].map((l, i) => (
                <motion.div
                  key={l.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded"
                  style={{ background: l.selected ? "rgba(255,255,255,0.08)" : "transparent" }}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.4 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  <span style={{ fontSize: "10px", color: l.selected ? "#FAFAFA" : "rgba(255,255,255,0.4)", ...f }}>{l.name}</span>
                  <span style={{ fontSize: "9px", marginLeft: "auto" }}>{l.icon}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Center — Canvas */}
        <motion.div
          className="flex-1 flex items-center justify-center p-4"
          style={{ background: "#111" }}
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
        >
          <div className="relative rounded-lg overflow-hidden" style={{ width: "100%", maxWidth: 420, aspectRatio: "1200/628" }}>
            <img src="https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=85" alt="Canvas" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
            {/* Text layer with selection handles */}
            <motion.div
              className="absolute bottom-4 left-4 right-4"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <div className="relative inline-block" style={{ border: "1px solid rgba(100,150,255,0.6)", padding: "2px 4px" }}>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#fff", ...f }}>Handcrafted sourdough bread</span>
                {["-top-1 -left-1", "-top-1 -right-1", "-bottom-1 -left-1", "-bottom-1 -right-1"].map((pos) => (
                  <motion.div
                    key={pos}
                    className={`absolute ${pos} w-2 h-2 rounded-sm`}
                    style={{ background: "#fff", border: "1px solid rgba(100,150,255,0.8)" }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9, type: "spring", stiffness: 400 }}
                  />
                ))}
              </div>
              <div className="mt-1">
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)", ...f }}>Maison Dupain · Handmade, every day</span>
              </div>
            </motion.div>
            {/* Logo in corner */}
            <motion.div
              className="absolute top-3 right-3 w-8 h-8 rounded flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.9)" }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#111", ...f }}>M</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Right panel — Properties */}
        <motion.div
          className="w-[180px] p-3 flex-shrink-0 overflow-y-auto"
          style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6, ease: EASE }}
        >
          <span style={{ fontSize: "9px", fontWeight: 500, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>{t("studioExperience.mEditProperties")}</span>
          <div className="mt-3 space-y-3">
            {/* Position */}
            <div>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", ...f }}>{t("studioExperience.mEditPosition")}</span>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {[{ l: "X", v: "5.0" }, { l: "Y", v: "72.0" }, { l: "W", v: "90.0" }, { l: "H", v: "12.0" }].map((p, i) => (
                  <motion.div
                    key={p.l}
                    className="flex items-center gap-1 px-2 py-1 rounded"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + i * 0.06 }}
                  >
                    <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", ...f }}>{p.l}</span>
                    <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", ...f }}>{p.v}</span>
                  </motion.div>
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
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "rgba(255,255,255,0.4)" }}
                      initial={{ width: 0 }}
                      whileInView={{ width: "55%" }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.8, duration: 0.7, ease: EASE }}
                    />
                  </div>
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", ...f }}>5.5%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", ...f }}>{t("studioExperience.mEditFont")}</span>
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
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", ...f }}>{t("studioExperience.mEditColor")}</span>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-6 h-6 rounded" style={{ background: "#FFFFFF", border: "1px solid rgba(255,255,255,0.1)" }} />
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", ...f }}>#FFFFFF</span>
              </div>
            </div>
            {/* Opacity */}
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", ...f }}>{t("studioExperience.mEditOpacity")}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "rgba(255,255,255,0.4)" }}
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9, duration: 0.7, ease: EASE }}
                />
              </div>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", ...f }}>100%</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ── Pillar 3: Brand Vault — animated ── */
function BrandVaultMockup() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAFA", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-6 md:p-8">
        {/* Header */}
        <motion.div
          className="mb-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontSize: "10px", fontWeight: 600, color: "#111", textTransform: "uppercase", letterSpacing: "0.08em", ...f }}>{t("studioExperience.mBrandTitle")}</span>
        </motion.div>
        <motion.div
          className="flex items-center justify-between mb-2"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h3 style={{ fontSize: "24px", fontWeight: 700, color: "#111", ...f }}>Brand Vault</h3>
          <span className="px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{ background: "#F5F5F5", fontSize: "12px", fontWeight: 500, color: "#111", ...f }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
            Save
          </span>
        </motion.div>
        <motion.p
          style={{ fontSize: "13px", color: "#999", lineHeight: 1.5, marginBottom: 20, ...f }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          {t("studioExperience.mBrandSubtitle")}
        </motion.p>

        {/* URL scanner */}
        <motion.div
          className="rounded-2xl p-4 mb-6"
          style={{ background: "#fff", border: "1px solid #EBEBEB" }}
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.6, ease: EASE }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-xl" style={{ background: "#F5F5F5" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
              <span style={{ fontSize: "12px", color: "#333", ...f }}>https://maisondupain.fr/</span>
            </div>
            <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl" style={{ background: "#111", color: "#fff", fontSize: "12px", fontWeight: 500, ...f }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></svg>
              {t("studioExperience.mBrandScan")}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ border: "1px dashed #DDD" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <span style={{ fontSize: "11px", color: "#CCC", ...f }}>{t("studioExperience.mBrandDropzone")}</span>
          </div>
        </motion.div>

        {/* Brand Identity card — pops in */}
        <motion.div
          className="rounded-2xl p-5 mb-4"
          style={{ background: "#fff", border: "1px solid #EBEBEB" }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.6, ease: EASE }}
        >
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: "#2C1810" }}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
            >
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#F5E6D3", ...f }}>M</span>
            </motion.div>
            <div className="flex-1">
              <span style={{ fontSize: "18px", fontWeight: 600, color: "#111", ...f, display: "block" }}>Maison Dupain</span>
              <span style={{ fontSize: "12px", color: "#999", ...f }}>Artisan bakery · Sourdough bread</span>
              <span style={{ fontSize: "11px", color: "#BBB", fontStyle: "italic", ...f, display: "block" }}>"The taste of handmade"</span>
            </div>
            <motion.div
              className="flex items-center justify-center w-12 h-12 rounded-xl"
              style={{ border: "2px solid #EBEBEB" }}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.75, type: "spring", stiffness: 300 }}
            >
              <div>
                <span style={{ fontSize: "16px", fontWeight: 700, color: "#111", ...f, display: "block", lineHeight: 1 }}>92</span>
                <span style={{ fontSize: "8px", color: "#999", ...f }}>/100</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          {/* Brand Colors */}
          <motion.div
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #EBEBEB" }}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.6, ease: EASE }}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{t("studioExperience.mBrandColors")}</span>
              <span className="px-1.5 py-0.5 rounded" style={{ background: "#F5F5F5", fontSize: "10px", color: "#999", ...f }}>5</span>
            </div>
            {/* Color strip — bars grow */}
            <div className="flex rounded-lg overflow-hidden mb-3" style={{ height: 32 }}>
              {["#2C1810", "#D4A574", "#F5E6D3", "#8B6914", "#FAFAF5"].map((c, i) => (
                <motion.div
                  key={c}
                  className="flex-1"
                  style={{ background: c }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + i * 0.06, duration: 0.4 }}
                />
              ))}
            </div>
            <div className="space-y-1.5">
              {[
                { hex: "#2C1810", name: "Espresso" },
                { hex: "#D4A574", name: "Wheat Gold" },
                { hex: "#F5E6D3", name: "Cream" },
              ].map((c, i) => (
                <motion.div
                  key={c.hex}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.0 + i * 0.08 }}
                >
                  <div className="w-3.5 h-3.5 rounded-full" style={{ background: c.hex }} />
                  <span style={{ fontSize: "10px", color: "#666", ...f }}>{c.hex}</span>
                  <span style={{ fontSize: "10px", color: "#999", ...f }}>{c.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tone of Voice */}
          <motion.div
            className="rounded-2xl p-4"
            style={{ background: "#fff", border: "1px solid #EBEBEB" }}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
          >
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{t("studioExperience.mBrandTone")}</span>
            </div>
            <motion.span
              className="inline-block px-2.5 py-1 rounded-lg mb-3"
              style={{ background: "#111", color: "#fff", fontSize: "11px", fontWeight: 500, ...f }}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.85, type: "spring", stiffness: 300 }}
            >
              Warm
            </motion.span>
            {/* Bars animate width */}
            <div className="space-y-2.5">
              {[
                { label: "FORMALITY", value: 4 },
                { label: "CONFIDENCE", value: 7 },
                { label: "WARMTH", value: 9 },
                { label: "HUMOR", value: 3 },
              ].map((t, i) => (
                <div key={t.label}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: "9px", fontWeight: 500, color: "#999", letterSpacing: "0.04em", ...f }}>{t.label}</span>
                    <motion.span
                      style={{ fontSize: "10px", fontWeight: 600, color: "#111", ...f }}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.1 + i * 0.08 }}
                    >
                      {t.value}
                    </motion.span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "#F0F0F0" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: "#111" }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${t.value * 10}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.95 + i * 0.1, duration: 0.7, ease: EASE }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-3">
              {["artisanal", "authentic", "warm", "passionate"].map((tag, i) => (
                <motion.span
                  key={tag}
                  className="px-2 py-0.5 rounded-full"
                  style={{ border: "1px solid #E5E5E5", fontSize: "9px", color: "#666", ...f }}
                  initial={{ opacity: 0, scale: 0.7 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.3 + i * 0.06 }}
                >
                  {tag}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ── Pillar 4: Publish — multi-platform distribution dashboard ── */
function PublishMockup() {
  const { t } = useI18n();
  const platforms = [
    { name: "Instagram", handle: "@maisondupainstudio", posts: 3, status: t("studioExperience.statusScheduled"), statusKey: "Scheduled", time: "Mon 10:00", color: "#E1306C" },
    { name: "LinkedIn", handle: "Maison du Pain", posts: 2, status: t("studioExperience.statusScheduled"), statusKey: "Scheduled", time: "Mon 11:30", color: "#0A66C2" },
    { name: "Facebook", handle: "Maison du Pain Bakery", posts: 2, status: t("studioExperience.statusPublished"), statusKey: "Published", time: "Today 09:00", color: "#1877F2" },
    { name: "X (Twitter)", handle: "@maisonpain", posts: 1, status: t("studioExperience.statusDraft"), statusKey: "Draft", time: "—", color: "#111" },
  ];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#FAFAFA", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="p-6 md:p-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#111" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
            </div>
            <div>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111", ...f, display: "block" }}>{t("studioExperience.mPublishTitle")}</span>
              <span style={{ fontSize: "11px", color: "#999", ...f }}>Summer Collection 2025</span>
            </div>
          </div>
          <motion.span
            className="px-3.5 py-1.5 rounded-full flex items-center gap-1.5"
            style={{ background: "#111", color: "#fff", fontSize: "11px", fontWeight: 500, ...f }}
            initial={{ scale: 0.8 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
            {t("studioExperience.mPublishAll")}
          </motion.span>
        </motion.div>

        {/* Platform cards */}
        <div className="space-y-3">
          {platforms.map((p, i) => (
            <motion.div
              key={p.name}
              className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
              style={{ background: "#fff", border: "1px solid #EBEBEB" }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: EASE }}
            >
              {/* Platform dot */}
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />

              {/* Platform info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{p.name}</span>
                  <span style={{ fontSize: "10px", color: "#BBB", ...f }}>{p.handle}</span>
                </div>
                <span style={{ fontSize: "11px", color: "#999", ...f }}>{p.posts} post{p.posts > 1 ? "s" : ""} · {p.time}</span>
              </div>

              {/* Status badge */}
              <span
                className="px-2.5 py-1 rounded-full flex-shrink-0"
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  ...f,
                  background: p.statusKey === "Published" ? "#E8F5E9" : p.statusKey === "Scheduled" ? "#F5F5F5" : "#FFF8E1",
                  color: p.statusKey === "Published" ? "#2E7D32" : p.statusKey === "Scheduled" ? "#666" : "#F57F17",
                }}
              >
                {p.status}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Summary bar */}
        <motion.div
          className="mt-5 flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: "#F5F5F5" }}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <span style={{ fontSize: "11px", color: "#999", ...f }}>{t("studioExperience.mPublishTotal")}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#111", ...f }}>{t("studioExperience.mPublishPosts")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "11px", color: "#999", ...f }}>{t("studioExperience.mPublishPlatforms")}</span>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2E7D32" }} />
            <span style={{ fontSize: "11px", color: "#2E7D32", fontWeight: 500, ...f }}>{t("studioExperience.mPublishPublished")}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function StudioExperience() {
  const { t } = useI18n();
  const pillars = [
    { num: "01", label: t("studioExperience.p1Label"), title: t("studioExperience.p1Title"), desc: t("studioExperience.p1Desc"), Mockup: StudioMockup },
    { num: "02", label: t("studioExperience.p2Label"), title: t("studioExperience.p2Title"), desc: t("studioExperience.p2Desc"), Mockup: EditMockup },
    { num: "03", label: t("studioExperience.p3Label"), title: t("studioExperience.p3Title"), desc: t("studioExperience.p3Desc"), Mockup: BrandVaultMockup },
    { num: "04", label: t("studioExperience.p4Label"), title: t("studioExperience.p4Title"), desc: t("studioExperience.p4Desc"), Mockup: PublishMockup },
  ];
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
            {t("studioExperience.label")}
          </p>
          <h2 style={{ fontSize: "clamp(2.5rem, 5vw, 4.5rem)", fontWeight: 300, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#FAFAFA", ...f }}>
            {t("studioExperience.title")}
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
                transition={{ duration: 0.9, ease: EASE }}
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
                  transition={{ duration: 1, delay: 0.15, ease: EASE }}
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
            {t("studioExperience.tryItFree")}
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

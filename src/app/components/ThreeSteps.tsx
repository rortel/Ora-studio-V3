import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useI18n } from "../lib/i18n";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WORKFLOW — Animated mockups showing the pipeline:
   Generate → Compare → Choose
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const EASE = [0.23, 1, 0.32, 1];
const f: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

function BrowserChrome({ children, url = "ora-studio.app" }: { children: React.ReactNode; url?: string }) {
  return (
    <div className="rounded-2xl md:rounded-3xl overflow-hidden" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)" }}>
      {/* Title bar */}
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ background: "#1A1A1A", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: "#3D3D3D" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#3D3D3D" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#3D3D3D" }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", fontSize: "11px", color: "rgba(255,255,255,0.4)", ...f }}>
            {url}
          </div>
        </div>
        <div className="w-16" />
      </div>
      {/* Content */}
      <div style={{ background: "#FAFAFA" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Shared stagger helper ── */
const stagger = (i: number, base = 0.15) => ({ delay: base + i * 0.12, duration: 0.7, ease: EASE });

/* ── Step 1: Generate mockup — conversational SMS-like chat ── */
function GenerateMockup() {
  const { t } = useI18n();
  return (
    <BrowserChrome url="ora-studio.app/hub">
      <div className="flex flex-col" style={{ minHeight: 420 }}>
        {/* Chat area */}
        <div className="flex-1 px-6 md:px-10 py-6 space-y-4">
          {/* User bubble */}
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={stagger(0)}
          >
            <div className="px-4 py-2.5 rounded-2xl rounded-br-md max-w-[75%]" style={{ background: "#111", color: "#fff", fontSize: "13px", lineHeight: 1.5, ...f }}>
              {t("threeSteps.m1UserBubble")}
            </div>
          </motion.div>

          {/* Assistant reply */}
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={stagger(1)}
          >
            <div className="max-w-[85%] space-y-3">
              <div className="px-4 py-2.5 rounded-2xl rounded-bl-md" style={{ background: "#F5F5F5", fontSize: "13px", lineHeight: 1.6, color: "#333", ...f }}>
                {t("threeSteps.m1AssistantReply")}
              </div>

              {/* Config panel inline — like it appears in the chat */}
              <motion.div
                className="rounded-xl p-4 space-y-3"
                style={{ background: "#fff", border: "1px solid #EBEBEB", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {/* Formats */}
                <div>
                  <span style={{ fontSize: "9px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", ...f }}>{t("threeSteps.m1Formats")}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {["Instagram Post", "Story", "LinkedIn", "Facebook"].map((fmt, i) => (
                      <motion.span
                        key={fmt}
                        className="px-2.5 py-1 rounded-lg"
                        style={{ background: "#111", color: "#fff", fontSize: "10px", fontWeight: 500, ...f }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.04, duration: 0.3 }}
                      >
                        {fmt}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* AI Models */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span style={{ fontSize: "9px", color: "#BBB", ...f }}>{t("threeSteps.m1TextModels")}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {["GPT-4o", "Claude Sonnet"].map((m) => (
                        <span key={m} className="px-2 py-0.5 rounded" style={{ background: "#111", color: "#fff", fontSize: "9px", fontWeight: 500, ...f }}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "9px", color: "#BBB", ...f }}>{t("threeSteps.m1ImageModels")}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {["Photon", "Flux Pro"].map((m) => (
                        <span key={m} className="px-2 py-0.5 rounded" style={{ background: "#111", color: "#fff", fontSize: "9px", fontWeight: 500, ...f }}>{m}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tone + CTA */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-1.5">
                    {["Professional", "Warm"].map((tone, i) => (
                      <span key={tone} className="px-2 py-0.5 rounded-full" style={{ background: i === 0 ? "#111" : "#F5F5F5", color: i === 0 ? "#fff" : "#BBB", fontSize: "9px", fontWeight: 500, ...f }}>{tone}</span>
                    ))}
                  </div>
                  <motion.span
                    className="px-4 py-2 rounded-xl flex items-center gap-1.5"
                    style={{ background: "#111", color: "#fff", fontSize: "11px", fontWeight: 500, ...f }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></svg>
                    {t("threeSteps.m1Generate")}
                  </motion.span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Input bar */}
        <motion.div
          className="px-6 md:px-10 pb-5 pt-2"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#F5F5F5" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></svg>
            <span style={{ fontSize: "13px", color: "#CCC", flex: 1, ...f }}>{t("threeSteps.m1Placeholder")}</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "transparent" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DDD" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>
            </div>
          </div>
        </motion.div>
      </div>
    </BrowserChrome>
  );
}

/* ── Step 2: Compare mockup — faithful CampaignCarousel in chat ── */
function CompareMockup() {
  const { t } = useI18n();
  return (
    <BrowserChrome url="ora-studio.app/hub">
      <div className="flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex-1 px-6 md:px-10 py-6 space-y-4">
          {/* Previous user bubble (context) */}
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.5 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-3 py-2 rounded-2xl rounded-br-md" style={{ background: "#111", color: "rgba(255,255,255,0.6)", fontSize: "11px", ...f }}>
              {t("threeSteps.m2UserBubble")}
            </div>
          </motion.div>

          {/* Assistant reply */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={stagger(0)}
          >
            <div className="px-4 py-2.5 rounded-2xl rounded-bl-md max-w-[85%]" style={{ background: "#F5F5F5", fontSize: "13px", lineHeight: 1.5, color: "#333", ...f }}>
              {t("threeSteps.m2AssistantReply")}
            </div>

            {/* ── CampaignCarousel mockup (faithful to real component) ── */}
            <motion.div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#000" }}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
            >
              {/* Visual area — full width image */}
              <div style={{ position: "relative" }}>
                <img src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=85" alt="Summer" className="w-full" style={{ maxHeight: 220, objectFit: "cover" }} loading="lazy" />
                {/* Platform badge — top left */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <motion.span
                    className="px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "#fff", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", ...f }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  >
                    Instagram
                  </motion.span>
                  <span className="px-2 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.8)", fontSize: "11px", ...f }}>
                    Post
                  </span>
                </div>
                {/* Download button — top right */}
                <div className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                </div>
                {/* Image model badge — bottom left */}
                <motion.div
                  className="absolute bottom-3 left-3 px-2 py-1 rounded-lg"
                  style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.8)", fontSize: "10px", fontWeight: 500, ...f }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                >
                  Luma Photon
                </motion.div>
              </div>

              {/* Variant tabs — faithful to real: Columns2 icon + model buttons */}
              <motion.div
                className="flex items-center gap-1 px-4 py-2.5"
                style={{ background: "#FAFAFA", borderBottom: "1px solid #EBEBEB" }}
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" style={{ marginRight: 4 }}><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
                {["Luma Photon", "Flux Pro"].map((m, i) => (
                  <motion.span
                    key={m}
                    className="px-2.5 py-1 rounded-lg"
                    style={{
                      background: i === 0 ? "#111" : "#F5F5F5",
                      color: i === 0 ? "#fff" : "#333",
                      fontSize: "10px", fontWeight: 600,
                      border: "1px solid",
                      borderColor: i === 0 ? "#111" : "#EBEBEB",
                      ...f,
                    }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                  >
                    {m}
                  </motion.span>
                ))}
              </motion.div>

              {/* Text content */}
              <motion.div
                className="p-5 space-y-2"
                style={{ background: "#FAFAFA" }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.65, duration: 0.4 }}
              >
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#111", lineHeight: 1.3, ...f }}>{t("threeSteps.m2Headline")}</div>
                <div style={{ fontSize: "12px", color: "#333", lineHeight: 1.6, ...f }}>
                  {t("threeSteps.m2Body")}
                </div>
                <div style={{ fontSize: "11px", color: "#888", fontWeight: 500, ...f }}>{t("threeSteps.m2Hashtags")}</div>
                <div className="flex items-center gap-1.5 pt-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#111", ...f }}>{t("threeSteps.m2Cta")}</span>
                </div>
                <div style={{ fontSize: "9px", color: "#BBB", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 4, ...f }}>{t("threeSteps.m2TextLabel")}</div>
              </motion.div>

              {/* Navigation bar — prev/dots/next */}
              <motion.div
                className="flex items-center justify-between px-4 py-3"
                style={{ background: "#FAFAFA", borderTop: "1px solid #EBEBEB" }}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F5F5F5" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </div>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-full" style={{ width: i === 0 ? 20 : 6, height: 6, background: i === 0 ? "#111" : "#DDD" }} />
                  ))}
                </div>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#F5F5F5" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </motion.div>
            </motion.div>

            {/* Suggestion pills */}
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9 }}
            >
              {[t("threeSteps.m2Pill1"), t("threeSteps.m2Pill2")].map((s) => (
                <span key={s} className="px-3 py-1.5 rounded-full" style={{ background: "#FAFAFA", border: "1px solid #EBEBEB", fontSize: "11px", color: "#666", ...f }}>{s}</span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Input bar — faithful to real */}
        <motion.div
          className="px-6 md:px-10 pb-5 pt-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.0 }}
        >
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#F5F5F5", border: "1px solid #EBEBEB" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BBB" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></svg>
            <span style={{ fontSize: "13px", color: "#CCC", flex: 1, ...f }}>{t("threeSteps.m1Placeholder")}</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DDD" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></div>
          </div>
        </motion.div>
      </div>
    </BrowserChrome>
  );
}

/* ── Step 3: Finalize — tunnel overlay within chat ── */
function ChooseMockup() {
  const { t } = useI18n();
  return (
    <BrowserChrome url="ora-studio.app/hub">
      <div className="flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex-1 px-6 md:px-10 py-6">
          {/* Finalizer tunnel — overlays in the chat */}
          <motion.div
            className="rounded-xl overflow-hidden"
            style={{ background: "#fff", border: "1px solid #EBEBEB", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            {/* Header + stepper */}
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #F0F0F0" }}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: "14px", fontWeight: 600, color: "#111", ...f }}>{t("threeSteps.m3Title")}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CCC" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { label: t("threeSteps.m3StepReview"), done: true },
                  { label: t("threeSteps.m3StepSchedule"), done: true },
                  { label: t("threeSteps.m3StepSave"), done: false },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-1.5">
                    <motion.div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: step.done ? "#111" : i === 2 ? "#F0F0F0" : "#111", color: step.done ? "#fff" : "#CCC", fontSize: "9px", fontWeight: 600, ...f }}
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 400 }}
                    >
                      {step.done ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg> : i + 1}
                    </motion.div>
                    <span style={{ fontSize: "10px", fontWeight: step.done ? 500 : 400, color: step.done ? "#111" : "#CCC", ...f }}>{step.label}</span>
                    {i < 2 && <div className="w-6 h-px" style={{ background: step.done ? "#111" : "#EBEBEB" }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Save step content */}
            <div className="px-5 py-4 space-y-4">
              {/* Campaign name */}
              <div>
                <span style={{ fontSize: "9px", fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", ...f }}>{t("threeSteps.m3CampaignNameLabel")}</span>
                <div className="px-3 py-2 rounded-lg mt-1.5" style={{ background: "#F5F5F5" }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#111", ...f }}>{t("threeSteps.m3CampaignName")}</span>
                </div>
              </div>

              {/* Summary grid */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { fmt: "IG Post", time: "Sat 9:00", img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&q=85" },
                  { fmt: "Story", time: "Sat 10:00", img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=300&q=85" },
                  { fmt: "LinkedIn", time: "Mon 8:00", img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=300&q=85" },
                  { fmt: "Facebook", time: "Sat 11:00", img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&q=85" },
                ].map((item, i) => (
                  <motion.div
                    key={item.fmt}
                    className="rounded-lg overflow-hidden"
                    style={{ border: "1px solid #EBEBEB" }}
                    initial={{ opacity: 0, y: 12, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5, ease: EASE }}
                  >
                    <div style={{ aspectRatio: "1", position: "relative" }}>
                      <img src={item.img} alt={item.fmt} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", fontSize: "7px", fontWeight: 500, color: "#fff", ...f }}>{item.fmt}</div>
                    </div>
                    <div className="p-1.5" style={{ background: "#fff" }}>
                      <div className="flex items-center gap-1">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        <span style={{ fontSize: "8px", color: "#999", ...f }}>{item.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Save CTA */}
              <motion.div
                className="flex items-center justify-between pt-2"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                <span style={{ fontSize: "10px", color: "#999", ...f }}>{t("threeSteps.m3Summary")}</span>
                <motion.span
                  className="px-5 py-2.5 rounded-xl flex items-center gap-2"
                  style={{ background: "#111", color: "#fff", fontSize: "12px", fontWeight: 500, ...f }}
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9, type: "spring", stiffness: 300 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
                  {t("threeSteps.m3SaveBtn")}
                </motion.span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Input bar (dimmed — tunnel is active) */}
        <motion.div
          className="px-6 md:px-10 pb-5 pt-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.4 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#F5F5F5" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DDD" strokeWidth="2"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/></svg>
            <span style={{ fontSize: "13px", color: "#DDD", flex: 1, ...f }}>{t("threeSteps.m1Placeholder")}</span>
          </div>
        </motion.div>
      </div>
    </BrowserChrome>
  );
}

export function ThreeSteps() {
  const { t } = useI18n();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const steps = [
    { num: "01", title: t("threeSteps.step1Title"), subtitle: t("threeSteps.step1Subtitle"), desc: t("threeSteps.step1Desc"), Mockup: GenerateMockup },
    { num: "02", title: t("threeSteps.step2Title"), subtitle: t("threeSteps.step2Subtitle"), desc: t("threeSteps.step2Desc"), Mockup: CompareMockup },
    { num: "03", title: t("threeSteps.step3Title"), subtitle: t("threeSteps.step3Subtitle"), desc: t("threeSteps.step3Desc"), Mockup: ChooseMockup },
  ];

  return (
    <section ref={sectionRef} id="how-it-works" className="py-28 md:py-40" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 md:mb-28 text-center"
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#999",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 16,
              ...f,
            }}
          >
            {t("threeSteps.label")}
          </p>
          <h2
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: "#111111",
              ...f,
            }}
          >
            {t("threeSteps.title")}
          </h2>
        </motion.div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(100px, 14vw, 180px)" }}>
          {steps.map((s, i) => {
            const Mockup = s.Mockup;
            return (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.9, ease: EASE }}
              >
                {/* Step header */}
                <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6 mb-8 md:mb-12">
                  <div className="flex items-baseline gap-3">
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#BBB", letterSpacing: "0.04em", ...f }}>
                      {s.num}
                    </span>
                    <h3 style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)", fontWeight: 300, color: "#111", letterSpacing: "-0.03em", lineHeight: 1.1, ...f }}>
                      {s.title}
                    </h3>
                  </div>
                  <p className="md:ml-auto" style={{ fontSize: "15px", lineHeight: 1.6, color: "#999", fontWeight: 400, maxWidth: 380, ...f }}>
                    {s.desc}
                  </p>
                </div>

                {/* Mockup — photo-realistic browser */}
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
      </div>
    </section>
  );
}

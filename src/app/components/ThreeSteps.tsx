import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

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

/* ── Step 1: Generate mockup — animated sequence ── */
function GenerateMockup() {
  return (
    <BrowserChrome url="ora-studio.app/studio">
      <div className="p-6 md:p-10" style={{ minHeight: 360 }}>
        {/* Top bar */}
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={stagger(0, 0)}
        >
          <div className="w-5 h-5 rounded" style={{ background: "#EBEBEB" }} />
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#111", ...f }}>Studio</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="px-3 py-1 rounded-full" style={{ background: "#F5F5F5", fontSize: "11px", color: "#999", ...f }}>4 models</div>
          </div>
        </motion.div>

        {/* Prompt bar — appears first, like typing a prompt */}
        <motion.div
          className="rounded-2xl p-5 mb-8"
          style={{ background: "#FFFFFF", border: "1px solid #EBEBEB", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={stagger(0)}
        >
          <div className="flex items-center gap-3 mb-4">
            {["Campaign", "Image", "Text", "Film", "Sound"].map((t, i) => (
              <motion.span
                key={t}
                className="px-3 py-1.5 rounded-lg"
                style={{ background: i === 1 ? "#111" : "#F5F5F5", color: i === 1 ? "#fff" : "#999", fontSize: "11px", fontWeight: 500, ...f }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
              >
                {t}
              </motion.span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              className="flex-1 px-4 py-3 rounded-xl"
              style={{ background: "#F5F5F5", fontSize: "13px", color: "#999", ...f }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Photo of fresh sourdough bread on a wooden table, warm bakery light...
            </motion.div>
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#111" }}
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.4, type: "spring", stiffness: 300 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Results grid — images pop in one by one */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { model: "FLUX Pro", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=85" },
            { model: "Midjourney", img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=85" },
            { model: "DALL-E 3", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&q=85" },
            { model: "Ideogram", img: "https://images.unsplash.com/photo-1556471013-0001958d2f12?w=600&q=85" },
          ].map((m, i) => (
            <motion.div
              key={m.model}
              className="rounded-xl overflow-hidden"
              style={{ aspectRatio: "1", background: "#E8E8E8", position: "relative" }}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.9 + i * 0.15, duration: 0.6, ease: EASE }}
            >
              <img src={m.img} alt={m.model} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <motion.div
                className="absolute bottom-0 left-0 right-0 p-2.5"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 1.1 + i * 0.15, duration: 0.4 }}
              >
                <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.8)", ...f }}>{m.model}</span>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Status text */}
        <motion.p
          className="text-center mt-4"
          style={{ fontSize: "11px", color: "#BBB", ...f }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          4 models generated in 12s
        </motion.p>
      </div>
    </BrowserChrome>
  );
}

/* ── Step 2: Compare mockup — animated sequence ── */
function CompareMockup() {
  return (
    <BrowserChrome url="ora-studio.app/studio — Compare">
      <div className="p-6 md:p-10" style={{ minHeight: 360 }}>
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={stagger(0, 0)}
        >
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#111", ...f }}>Compare results</span>
          <span style={{ fontSize: "11px", color: "#999", ...f }}>Side by side · Same prompt</span>
        </motion.div>

        {/* Two images slide in from sides */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { model: "FLUX Pro", score: "94", selected: true, img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=85" },
            { model: "Midjourney", score: "87", selected: false, img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=85" },
          ].map((m, i) => (
            <motion.div
              key={m.model}
              className="rounded-xl overflow-hidden"
              style={{ border: m.selected ? "2px solid #111" : "2px solid #EBEBEB", position: "relative" }}
              initial={{ opacity: 0, x: i === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.7, ease: EASE }}
            >
              <div style={{ aspectRatio: "4/3", background: "#1A1A1A", position: "relative" }}>
                <img src={m.img} alt={m.model} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3 flex items-center justify-between" style={{ background: "#FAFAFA" }}>
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#111", display: "block", ...f }}>{m.model}</span>
                  <span style={{ fontSize: "10px", color: "#999", ...f }}>Score: {m.score}/100</span>
                </div>
                {m.selected && (
                  <motion.div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "#111" }}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7, duration: 0.4, type: "spring", stiffness: 400 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Metrics — bars animate width */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {["Resolution", "Prompt fidelity", "Aesthetics"].map((label, i) => (
            <motion.div
              key={label}
              className="rounded-lg p-3"
              style={{ background: "#F5F5F5" }}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
            >
              <span style={{ fontSize: "10px", color: "#999", display: "block", marginBottom: 4, ...f }}>{label}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "#EBEBEB" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "#111" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${85 + i * 5}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 + i * 0.12, duration: 0.8, ease: EASE }}
                  />
                </div>
                <motion.span
                  style={{ fontSize: "10px", fontWeight: 600, color: "#111", ...f }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                >
                  {85 + i * 5}%
                </motion.span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </BrowserChrome>
  );
}

/* ── Step 3: Choose / Save mockup — animated sequence ── */
function ChooseMockup() {
  return (
    <BrowserChrome url="ora-studio.app/library">
      <div className="p-6 md:p-10" style={{ minHeight: 360 }}>
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={stagger(0, 0)}
        >
          <div>
            <span style={{ fontSize: "20px", fontWeight: 300, color: "#111", letterSpacing: "-0.03em", display: "block", ...f }}>Library</span>
            <span style={{ fontSize: "12px", color: "#999", ...f }}>3 assets saved · Ready to publish</span>
          </div>
          <motion.div
            className="px-4 py-2 rounded-full"
            style={{ background: "#111", color: "#fff", fontSize: "12px", fontWeight: 500, ...f }}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            + Export all
          </motion.div>
        </motion.div>

        {/* Saved asset cards — stagger in */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { type: "IMAGE", label: "Bakery hero shot", model: "FLUX Pro", badge: "Best pick", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=85" },
            { type: "VIDEO", label: "Morning routine 15s", model: "Veo 3", badge: "", img: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600&q=85" },
            { type: "TEXT", label: "Instagram caption", model: "Claude", badge: "", img: "" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid #EBEBEB" }}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.18, duration: 0.7, ease: EASE }}
            >
              {item.type === "TEXT" ? (
                <div className="p-4" style={{ aspectRatio: "4/3", background: "#FAFAFA" }}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <div className="px-1.5 py-0.5 rounded" style={{ background: "#F5F5F5", fontSize: "9px", fontWeight: 600, color: "#999", ...f }}>TXT</div>
                  </div>
                  <div className="space-y-2" style={{ fontSize: "11px", lineHeight: 1.5, color: "#666", ...f }}>
                    <p style={{ fontWeight: 500, color: "#333" }}>Sourdough, patience, craftsmanship.</p>
                    <p>Every morning, our breads are handmade with locally sourced flour. Stop by before 10 AM!</p>
                    <p style={{ color: "#999" }}>#artisan #bakery #handmade</p>
                  </div>
                </div>
              ) : (
                <div style={{ aspectRatio: "4/3", background: "#1A1A1A", position: "relative" }}>
                  <img src={item.img} alt={item.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", fontSize: "9px", fontWeight: 600, color: "#fff", ...f }}>
                    {item.type}
                  </div>
                  {item.badge && (
                    <motion.div
                      className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full"
                      style={{ background: "#111", fontSize: "9px", fontWeight: 500, color: "#fff", ...f }}
                      initial={{ opacity: 0, scale: 0 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.0, duration: 0.4, type: "spring", stiffness: 400 }}
                    >
                      {item.badge}
                    </motion.div>
                  )}
                  {item.type === "VIDEO" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                      </motion.div>
                    </div>
                  )}
                </div>
              )}
              <div className="p-3">
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#111", display: "block", ...f }}>{item.label}</span>
                <span style={{ fontSize: "10px", color: "#999", ...f }}>via {item.model}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom status — slides up last */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-2 py-3 rounded-xl"
          style={{ background: "#F5F5F5" }}
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.3, type: "spring", stiffness: 400 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
          </motion.div>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#111", ...f }}>Your selection is ready — always the best output.</span>
        </motion.div>
      </div>
    </BrowserChrome>
  );
}

const steps = [
  {
    num: "01",
    title: "Generate",
    subtitle: "One prompt, multiple AI models",
    desc: "Type one brief. Ora sends it to FLUX, Midjourney, DALL-E, Veo and more — simultaneously. Images, videos, text, audio.",
    Mockup: GenerateMockup,
  },
  {
    num: "02",
    title: "Compare",
    subtitle: "Side by side, pixel by pixel",
    desc: "Every result lands in a visual grid. Compare quality, style and fidelity. Metrics help you judge objectively.",
    Mockup: CompareMockup,
  },
  {
    num: "03",
    title: "Choose",
    subtitle: "Your pick is always the best",
    desc: "Save the winners to your library. Export, schedule, publish. No wasted credits on the wrong model.",
    Mockup: ChooseMockup,
  },
];

export function ThreeSteps() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

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
            How it works
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
            Generate. Compare. Choose.
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

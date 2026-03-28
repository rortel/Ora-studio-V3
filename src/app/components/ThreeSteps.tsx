import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WORKFLOW — Animated mockups showing the pipeline:
   Generate → Compare → Choose
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

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
          <div className="px-4 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.06)", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
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

/* ── Step 1: Generate mockup ── */
function GenerateMockup() {
  return (
    <BrowserChrome url="ora-studio.app/studio">
      <div className="p-6 md:p-10" style={{ minHeight: 360 }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-5 h-5 rounded" style={{ background: "#EBEBEB" }} />
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#111" }}>Studio</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="px-3 py-1 rounded-full" style={{ background: "#F5F5F5", fontSize: "11px", color: "#999" }}>4 models</div>
          </div>
        </div>

        {/* Prompt bar */}
        <div className="rounded-2xl p-5 mb-8" style={{ background: "#FFFFFF", border: "1px solid #EBEBEB", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3 mb-4">
            {["Campaign", "Image", "Text", "Film", "Sound"].map((t, i) => (
              <span key={t} className="px-3 py-1.5 rounded-lg" style={{ background: i === 1 ? "#111" : "#F5F5F5", color: i === 1 ? "#fff" : "#999", fontSize: "11px", fontWeight: 500 }}>{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3 rounded-xl" style={{ background: "#F5F5F5", fontSize: "13px", color: "#999" }}>
              Photo of fresh sourdough bread on a wooden table, warm bakery light...
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#111" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </div>
          </div>
        </div>

        {/* Results grid — 4 AI-generated images */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { model: "FLUX Pro", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=85" },
            { model: "Midjourney", img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&q=85" },
            { model: "DALL-E 3", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&q=85" },
            { model: "Ideogram", img: "https://images.unsplash.com/photo-1556471013-0001958d2f12?w=600&q=85" },
          ].map((m) => (
            <div key={m.model} className="rounded-xl overflow-hidden" style={{ aspectRatio: "1", background: "#1A1A1A", position: "relative" }}>
              <img src={m.img} alt={m.model} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
                <span style={{ fontSize: "10px", fontWeight: 500, color: "rgba(255,255,255,0.8)" }}>{m.model}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-4" style={{ fontSize: "11px", color: "#BBB" }}>4 models generated in 12s</p>
      </div>
    </BrowserChrome>
  );
}

/* ── Step 2: Compare mockup ── */
function CompareMockup() {
  return (
    <BrowserChrome url="ora-studio.app/studio — Compare">
      <div className="p-6 md:p-10" style={{ minHeight: 360 }}>
        <div className="flex items-center justify-between mb-6">
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#111" }}>Compare results</span>
          <span style={{ fontSize: "11px", color: "#999" }}>Side by side · Same prompt</span>
        </div>

        {/* Two images side by side with comparison UI */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { model: "FLUX Pro", score: "94", selected: true, img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=85" },
            { model: "Midjourney", score: "87", selected: false, img: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&q=85" },
          ].map((m) => (
            <div key={m.model} className="rounded-xl overflow-hidden" style={{ border: m.selected ? "2px solid #111" : "2px solid #EBEBEB", position: "relative" }}>
              <div style={{ aspectRatio: "4/3", background: "#1A1A1A", position: "relative" }}>
                <img src={m.img} alt={m.model} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3 flex items-center justify-between" style={{ background: "#FAFAFA" }}>
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "#111", display: "block" }}>{m.model}</span>
                  <span style={{ fontSize: "10px", color: "#999" }}>Score: {m.score}/100</span>
                </div>
                {m.selected && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#111" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Metrics comparison */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {["Resolution", "Prompt fidelity", "Aesthetics"].map((label, i) => (
            <div key={label} className="rounded-lg p-3" style={{ background: "#F5F5F5" }}>
              <span style={{ fontSize: "10px", color: "#999", display: "block", marginBottom: 4 }}>{label}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full" style={{ background: "#EBEBEB" }}>
                  <div className="h-full rounded-full" style={{ background: "#111", width: `${85 + i * 5}%` }} />
                </div>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#111" }}>{85 + i * 5}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrowserChrome>
  );
}

/* ── Step 3: Choose / Save mockup ── */
function ChooseMockup() {
  return (
    <BrowserChrome url="ora-studio.app/library">
      <div className="p-6 md:p-10" style={{ minHeight: 360 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <span style={{ fontSize: "20px", fontWeight: 300, color: "#111", letterSpacing: "-0.03em", display: "block" }}>Library</span>
            <span style={{ fontSize: "12px", color: "#999" }}>3 assets saved · Ready to publish</span>
          </div>
          <div className="px-4 py-2 rounded-full" style={{ background: "#111", color: "#fff", fontSize: "12px", fontWeight: 500 }}>
            + Export all
          </div>
        </div>

        {/* Saved asset cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { type: "IMAGE", label: "Bakery hero shot", model: "FLUX Pro", badge: "Best pick", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=85" },
            { type: "VIDEO", label: "Morning routine 15s", model: "Veo 3", badge: "", img: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600&q=85" },
            { type: "TEXT", label: "Instagram caption", model: "Claude", badge: "", img: "" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl overflow-hidden" style={{ border: "1px solid #EBEBEB" }}>
              {item.type === "TEXT" ? (
                <div className="p-4" style={{ aspectRatio: "4/3", background: "#FAFAFA" }}>
                  <div className="mb-2 flex items-center gap-1.5">
                    <div className="px-1.5 py-0.5 rounded" style={{ background: "#F5F5F5", fontSize: "9px", fontWeight: 600, color: "#999" }}>TXT</div>
                  </div>
                  <div className="space-y-2" style={{ fontSize: "11px", lineHeight: 1.5, color: "#666", fontFamily: "'Inter', sans-serif" }}>
                    <p style={{ fontWeight: 500, color: "#333" }}>Sourdough, patience, craftsmanship.</p>
                    <p>Every morning, our breads are handmade with locally sourced flour. Stop by before 10 AM!</p>
                    <p style={{ color: "#999" }}>#artisan #bakery #handmade</p>
                  </div>
                </div>
              ) : (
                <div style={{ aspectRatio: "4/3", background: "#1A1A1A", position: "relative" }}>
                  <img src={item.img} alt={item.label} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", fontSize: "9px", fontWeight: 600, color: "#fff" }}>
                    {item.type}
                  </div>
                  {item.badge && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full" style={{ background: "#111", fontSize: "9px", fontWeight: 500, color: "#fff" }}>
                      {item.badge}
                    </div>
                  )}
                  {item.type === "VIDEO" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="p-3">
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#111", display: "block" }}>{item.label}</span>
                <span style={{ fontSize: "10px", color: "#999" }}>via {item.model}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom status */}
        <div className="mt-6 flex items-center justify-center gap-2 py-3 rounded-xl" style={{ background: "#F5F5F5" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M20 6 9 17l-5-5"/></svg>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "#111" }}>Your selection is ready — always the best output.</span>
        </div>
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
              fontFamily: "'Inter', sans-serif",
              color: "#999",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 16,
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
              fontFamily: "'Inter', sans-serif",
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
                transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
              >
                {/* Step header */}
                <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-6 mb-8 md:mb-12">
                  <div className="flex items-baseline gap-3">
                    <span style={{ fontSize: "12px", fontWeight: 500, color: "#BBB", letterSpacing: "0.04em", fontFamily: "'Inter', sans-serif" }}>
                      {s.num}
                    </span>
                    <h3 style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)", fontWeight: 300, color: "#111", letterSpacing: "-0.03em", lineHeight: 1.1, fontFamily: "'Inter', sans-serif" }}>
                      {s.title}
                    </h3>
                  </div>
                  <p className="md:ml-auto" style={{ fontSize: "15px", lineHeight: 1.6, color: "#999", fontWeight: 400, maxWidth: 380, fontFamily: "'Inter', sans-serif" }}>
                    {s.desc}
                  </p>
                </div>

                {/* Mockup — photo-realistic browser */}
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
      </div>
    </section>
  );
}

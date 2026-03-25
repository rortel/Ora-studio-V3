import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { ArrowUp, ImageIcon, Film, FileText, Music, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const mockResults = [
  {
    model: "Photon 1",
    provider: "Luma AI",
    img: "https://images.unsplash.com/photo-1611930021698-a55ec4d5fe6e?w=800&q=90",
    time: "3.2s",
    badge: "⚡ Fastest",
  },
  {
    model: "Flux Pro 2",
    provider: "Black Forest Labs",
    img: "https://images.unsplash.com/photo-1662972580899-b64ac990c9e9?w=800&q=90",
    time: "5.1s",
    badge: "✦ Most realistic",
  },
  {
    model: "DALL-E 3",
    provider: "OpenAI",
    img: "https://images.unsplash.com/photo-1769122489832-465d4e408895?w=800&q=90",
    time: "4.8s",
    badge: null,
  },
  {
    model: "Seedream V4",
    provider: "ByteDance",
    img: "https://images.unsplash.com/photo-1741745978060-9add161ba2c2?w=800&q=90",
    time: "2.9s",
    badge: null,
  },
];

export function StudioExperience() {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !fired.current) {
          fired.current = true;
          setPhase(1);
        }
      },
      { threshold: 0.15 }
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);

  useEffect(() => {
    if (phase < 1) return;
    const timers = [
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  return (
    <section
      id="studio"
      ref={ref}
      className="py-16 md:py-36"
      style={{ background: "#111111", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-[1400px] mx-auto px-5 md:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10 md:mb-16"
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              marginBottom: 16,
            }}
          >
            The Studio
          </p>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 5vw, 3.8rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.045em",
              color: "#F0EDE8",
              marginBottom: 14,
            }}
          >
            Your prompt.{" "}
            <span style={{ color: "#FFFFFF" }}>38 responses.</span>
          </h2>
          <p
            style={{
              fontSize: "16px",
              lineHeight: 1.6,
              color: "rgba(240,237,232,0.40)",
              maxWidth: 500,
              margin: "0 auto",
            }}
          >
            Type once. Compare every model side by side.
            Pick the best in seconds.
          </p>
        </motion.div>

        {/* Browser mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl md:rounded-3xl overflow-hidden"
          style={{
            background: "#141414",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 32px 100px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-3 px-4 md:px-5 py-3"
            style={{
              background: "#1A1A1A",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#E05A4F" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#E0A84C" }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#5FBF6A" }} />
            </div>
            <div
              className="flex-1 max-w-[200px] md:max-w-xs mx-auto flex items-center justify-center py-1 px-3 rounded-md"
              style={{
                background: "#242424",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", fontWeight: 400 }}>
                ora-studio.app/hub
              </span>
            </div>
          </div>

          {/* Prompt bar */}
          <div
            className="px-4 md:px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3"
            style={{
              background: "#141414",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Format tabs — scrollable on mobile */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
              {[
                { icon: ImageIcon, label: "Image", active: true },
                { icon: Film, label: "Video" },
                { icon: FileText, label: "Text" },
                { icon: Music, label: "Audio" },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <div
                    key={t.label}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg flex-shrink-0"
                    style={{
                      background: t.active ? "rgba(255,255,255,0.10)" : "transparent",
                    }}
                  >
                    <Icon size={11} style={{ color: t.active ? "#FFFFFF" : "rgba(255,255,255,0.25)" }} />
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: t.active ? 600 : 400,
                        color: t.active ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                      }}
                    >
                      {t.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Prompt input */}
            <div
              className="flex-1 w-full flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "#1E1E1E",
                border: "1px solid rgba(255,255,255,0.08)",
                minWidth: 0,
              }}
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={phase >= 1 ? { opacity: 1 } : {}}
                transition={{ duration: 0.5 }}
                className="truncate"
                style={{ fontSize: "12px", color: "#F0EDE8" }}
              >
                {phase >= 1
                  ? "luxury perfume bottle on marble, cinematic lighting, photorealistic"
                  : ""}
              </motion.span>
              {phase < 1 && (
                <span className="truncate" style={{ fontSize: "12px", color: "rgba(255,255,255,0.20)" }}>
                  Describe what you want to create...
                </span>
              )}
            </div>

            {/* Send */}
            <motion.div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              animate={{
                background:
                  phase >= 2
                    ? "#FFFFFF"
                    : "rgba(255,255,255,0.06)",
              }}
            >
              <ArrowUp
                size={13}
                style={{ color: phase >= 2 ? "#0A0A0A" : "rgba(255,255,255,0.25)" }}
              />
            </motion.div>
          </div>

          {/* Results grid */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 p-3 md:p-5"
            style={{ background: "#141414" }}
          >
            {mockResults.map((r, i) => (
              <motion.div
                key={r.model}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={phase >= 3 ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-xl md:rounded-2xl overflow-hidden relative"
                style={{
                  border: "1px solid rgba(255,255,255,0.07)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                }}
              >
                <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                  <ImageWithFallback
                    src={r.img}
                    alt={r.model}
                    className="w-full h-full object-cover"
                  />

                  {phase < 3 && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: "rgba(14,14,14,0.92)" }}
                    >
                      <motion.div
                        className="w-5 h-5 rounded-full border-2"
                        style={{
                          borderColor: "rgba(255,255,255,0.10)",
                          borderTopColor: "rgba(255,255,255,0.70)",
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear", delay: i * 0.15 }}
                      />
                    </div>
                  )}

                  {phase >= 4 && r.badge && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-2 left-2 md:top-3 md:left-3 px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(4px)",
                        border: "1px solid rgba(255,255,255,0.20)",
                        fontSize: "9px",
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {r.badge}
                    </motion.div>
                  )}
                </div>

                <div className="px-3 py-2.5" style={{ background: "#1A1A1A" }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#F0EDE8",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {r.model}
                    </span>
                    {phase >= 4 && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", fontWeight: 500 }}
                      >
                        {r.time}
                      </motion.span>
                    )}
                  </div>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                    {r.provider}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            className="flex items-center justify-between px-4 md:px-5 py-2.5"
            style={{
              background: "#1A1A1A",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
              {phase >= 3 ? "4 results · 38 models available" : "Generating..."}
            </span>
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: phase >= 3 ? "#5FBF6A" : "#E0A84C" }}
              />
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
                {phase >= 3 ? "Ready" : "..."}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex justify-center mt-10 md:mt-14"
        >
          <Link
            to="/login?mode=signup"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "#FFFFFF",
              color: "#0A0A0A",
              fontSize: "15px",
              fontWeight: 700,
              boxShadow: "0 4px 24px rgba(255,255,255,0.12)",
            }}
          >
            Try the studio for free
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform duration-300"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const mockResults = [
  {
    platform: "Instagram",
    ratio: "4 / 5",
    copy: "Elevate your evening with notes of amber and oud...",
    img: "https://images.unsplash.com/photo-1611930021698-a55ec4d5fe6e?w=800&q=90",
  },
  {
    platform: "Facebook",
    ratio: "16 / 9",
    copy: "Introducing our new signature scent for autumn...",
    img: "https://images.unsplash.com/photo-1662972580899-b64ac990c9e9?w=800&q=90",
  },
  {
    platform: "LinkedIn",
    ratio: "1 / 1",
    copy: "Behind the craft: how we designed our latest fragrance...",
    img: "https://images.unsplash.com/photo-1769122489832-465d4e408895?w=800&q=90",
  },
  {
    platform: "TikTok",
    ratio: "9 / 16",
    copy: "POV: unboxing the most anticipated perfume of 2026...",
    img: "https://images.unsplash.com/photo-1741745978060-9add161ba2c2?w=800&q=90",
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
      { threshold: 0.2 }
    );
    o.observe(el);
    return () => o.disconnect();
  }, []);

  useEffect(() => {
    if (phase < 1) return;
    const timers = [
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  return (
    <section ref={ref} className="py-28 md:py-40" style={{ background: "#111111" }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 md:mb-20 text-center"
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              color: "#111111",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            The studio
          </p>
          <h2
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.5rem)",
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              color: "#FAFAFA",
              fontFamily: "'Inter', sans-serif",
              marginBottom: 16,
            }}
          >
            One brief, every platform
          </h2>
          <p
            style={{
              fontSize: "15px",
              lineHeight: 1.6,
              fontFamily: "'Inter', sans-serif",
              color: "rgba(250,250,250,0.35)",
              maxWidth: 400,
              margin: "0 auto",
            }}
          >
            Images, copy, video — adapted for each channel. Ready to review and publish.
          </p>
        </motion.div>

        {/* Massive content grid — mixed aspect ratios like real outputs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-start"
        >
          {mockResults.map((r, i) => (
            <motion.div
              key={r.platform}
              initial={{ opacity: 0, y: 24 }}
              animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: i * 0.15,
                duration: 0.7,
                ease: [0.23, 1, 0.32, 1],
              }}
              className="overflow-hidden rounded-xl md:rounded-2xl relative group"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              {/* Full-bleed image */}
              <div className="relative overflow-hidden" style={{ aspectRatio: r.ratio }}>
                <ImageWithFallback
                  src={r.img}
                  alt={r.platform}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {phase < 2 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "rgba(17,17,17,0.85)" }}
                  >
                    <motion.div
                      className="w-5 h-5 rounded-full"
                      style={{
                        border: "1.5px solid rgba(255,255,255,0.1)",
                        borderTopColor: "#111111",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}
                {/* Platform badge — bottom left, glass */}
                <div
                  className="absolute bottom-3 left-3"
                  style={{
                    background: "rgba(0,0,0,0.5)",
                    backdropFilter: "blur(12px)",
                    borderRadius: 8,
                    padding: "4px 10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      fontFamily: "'Inter', sans-serif",
                      color: "#fff",
                    }}
                  >
                    {r.platform}
                  </span>
                </div>
              </div>

              {/* Copy preview */}
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3.5 py-3"
                >
                  <p
                    style={{
                      fontSize: "12px",
                      lineHeight: 1.5,
                      fontFamily: "'Inter', sans-serif",
                      color: "rgba(250,250,250,0.4)",
                    }}
                  >
                    {r.copy}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center mt-14"
        >
          <Link
            to="/hub"
            className="group inline-flex items-center gap-2 transition-all duration-300 hover:gap-3"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#FAFAFA",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              padding: "12px 24px",
              borderRadius: 9999,
            }}
          >
            Open the studio
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

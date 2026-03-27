import { motion } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const steps = [
  {
    num: "01",
    title: "Describe",
    desc: "Tell us what you need — a product launch, a campaign, a weekly series. Ora understands your brand.",
    img: "https://images.unsplash.com/photo-1611930021698-a55ec4d5fe6e?w=1200&q=90",
  },
  {
    num: "02",
    title: "Generate",
    desc: "AI creates visuals, copy, and video for every platform — all at once, always on brand.",
    img: "https://images.unsplash.com/photo-1662972580899-b64ac990c9e9?w=1200&q=90",
  },
  {
    num: "03",
    title: "Publish",
    desc: "Review, schedule, publish across all channels. Your content calendar, done in minutes.",
    img: "https://images.unsplash.com/photo-1744148621897-5fb0b6323543?w=1200&q=90",
  },
];

export function ThreeSteps() {
  return (
    <section id="how-it-works" className="py-28 md:py-40" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6">
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
              color: "#9A9590",
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
            Three steps to launch
          </h2>
        </motion.div>

        {/* Steps — huge visuals with minimal text */}
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(80px, 12vw, 160px)" }}>
          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Step label + title inline */}
              <div className="flex items-baseline gap-4 mb-6 md:mb-8 px-1">
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    color: "#111111",
                    letterSpacing: "0.04em",
                  }}
                >
                  {s.num}
                </span>
                <h3
                  style={{
                    fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                    fontWeight: 300,
                    fontFamily: "'Inter', sans-serif",
                    color: "#111111",
                    letterSpacing: "-0.03em",
                    lineHeight: 1.15,
                  }}
                >
                  {s.title}
                </h3>
                <p
                  className="hidden md:block"
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.5,
                    fontFamily: "'Inter', sans-serif",
                    color: "#9A9590",
                    fontWeight: 400,
                    maxWidth: 360,
                    marginLeft: "auto",
                  }}
                >
                  {s.desc}
                </p>
              </div>

              {/* Mobile description */}
              <p
                className="md:hidden mb-5 px-1"
                style={{
                  fontSize: "14px",
                  lineHeight: 1.6,
                  fontFamily: "'Inter', sans-serif",
                  color: "#9A9590",
                }}
              >
                {s.desc}
              </p>

              {/* MASSIVE visual — full width, big aspect ratio */}
              <div
                className="overflow-hidden rounded-2xl md:rounded-3xl"
              >
                <ImageWithFallback
                  src={s.img}
                  alt={s.title}
                  className="w-full block"
                  style={{
                    width: "100%",
                    aspectRatio: "21 / 9",
                    objectFit: "cover",
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

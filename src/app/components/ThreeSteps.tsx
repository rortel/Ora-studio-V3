import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

const features = [
  {
    num: "01",
    tag: "AI Aggregator",
    title: "One prompt.\nEvery model.",
    desc: "Describe your vision once. ORA sends it simultaneously to 38+ models — GPT-5, Claude, Flux, DALL-E, Sora and many more. Each returns its best result. You choose.",
    cta: "Explore models",
    href: "/models",
    img: "https://images.unsplash.com/photo-1767089261452-1245afe371af?w=900&q=90",
    imgAlt: "Brand campaign AI output",
    reverse: false,
  },
  {
    num: "02",
    tag: "Arena",
    title: "Compare.\nChoose the best.",
    desc: "The Arena shows every result side by side. Quality, speed, cost — all visible at a glance. Iterate in seconds. Save the winner.",
    cta: "Open the Arena",
    href: "/hub",
    img: "https://images.unsplash.com/photo-1662972580899-b64ac990c9e9?w=900&q=90",
    imgAlt: "AI comparison grid",
    reverse: true,
  },
  {
    num: "03",
    tag: "Campaign Lab",
    title: "One brief.\nEvery channel.",
    desc: "LinkedIn, Instagram, TikTok, email — Campaign Lab generates every format at once. Images adapted, copy adjusted, brand identity maintained. Automatically.",
    cta: "See Campaign Lab",
    href: "/hub",
    img: "https://images.unsplash.com/photo-1688377051459-aebb99b42bff?w=900&q=90",
    imgAlt: "Multi-platform campaign",
    reverse: false,
  },
];

export function ThreeSteps() {
  return (
    <section id="how-it-works" style={{ background: "#0A0A0A" }}>
      {features.map((f, idx) => (
        <div
          key={f.num}
          style={{
            background: idx % 2 === 0 ? "#0A0A0A" : "#0E0E0E",
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="max-w-[1200px] mx-auto px-5 md:px-6 py-16 md:py-32">
            <div
              className={`flex flex-col ${f.reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-10 md:gap-20 items-center`}
            >
              {/* Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, x: f.reverse ? 32 : -32 }}
                whileInView={{ opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="w-full md:flex-1"
              >
                <div
                  className="rounded-2xl md:rounded-3xl overflow-hidden w-full"
                  style={{
                    aspectRatio: "4/3",
                    boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <img
                    src={f.img}
                    alt={f.imgAlt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="w-full md:flex-1 flex flex-col gap-5 md:gap-6"
                style={{ maxWidth: 480 }}
              >
                {/* Tag + number */}
                <div className="flex items-center gap-3">
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.50)",
                    }}
                  >
                    {f.tag}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.15)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    — {f.num}
                  </span>
                </div>

                {/* Title */}
                <h2
                  style={{
                    fontSize: "clamp(1.9rem, 4.5vw, 3.2rem)",
                    fontWeight: 300,
                    lineHeight: 1.1,
                    letterSpacing: "-0.045em",
                    color: "#F0EDE8",
                    whiteSpace: "pre-line",
                  }}
                >
                  {f.title}
                </h2>

                {/* Description */}
                <p
                  style={{
                    fontSize: "15px",
                    lineHeight: 1.7,
                    color: "rgba(240,237,232,0.45)",
                    fontWeight: 400,
                  }}
                >
                  {f.desc}
                </p>

                {/* CTA */}
                <Link
                  to={f.href}
                  className="group inline-flex items-center gap-2 self-start"
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.80)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.cta}
                  <ArrowRight
                    size={14}
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

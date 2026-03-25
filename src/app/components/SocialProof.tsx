import { motion } from "motion/react";

const stats = [
  { value: "38+", label: "AI models" },
  { value: "4", label: "creative formats" },
  { value: "1", label: "prompt is all it takes" },
  { value: "∞", label: "credits roll over" },
];

const models = [
  "GPT-5", "Claude 4.5", "Gemini 2.5 Pro", "Flux Pro 2", "DALL-E 3",
  "Luma Ray 2", "Photon 1", "Sora 2", "Mistral Large", "Kling 2.1",
  "DeepSeek V3", "Veo 3.1", "Seedream V4", "Leonardo AI", "Pika 2.0", "Runway Gen-3",
];

export function SocialProof() {
  const doubled = [...models, ...models];

  return (
    <section style={{ background: "#0A0A0A" }}>
      {/* Stats strip */}
      <div
        className="max-w-[1200px] mx-auto px-6 py-20"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-center"
            >
              <p
                style={{
                  fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
                  fontWeight: 300,
                  letterSpacing: "-0.05em",
                  lineHeight: 1,
                  color: "#FFFFFF",
                  marginBottom: 8,
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.32)",
                  letterSpacing: "0.01em",
                }}
              >
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Model marquee */}
      <div
        className="overflow-hidden py-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-24 z-10"
            style={{ background: "linear-gradient(90deg, #0A0A0A 0%, transparent 100%)" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-24 z-10"
            style={{ background: "linear-gradient(270deg, #0A0A0A 0%, transparent 100%)" }}
          />
          <div
            className="flex items-center whitespace-nowrap"
            style={{ animation: "ora-marquee 55s linear infinite" }}
          >
            {doubled.map((name, i) => (
              <span key={`${name}-${i}`} className="flex items-center">
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.28)",
                    letterSpacing: "-0.01em",
                    padding: "0 22px",
                  }}
                >
                  {name}
                </span>
                <span style={{ color: "rgba(255,255,255,0.10)", fontSize: "18px", lineHeight: 1 }}>
                  ·
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

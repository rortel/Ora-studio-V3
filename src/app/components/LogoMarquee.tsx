import { motion } from "motion/react";
import { useI18n } from "../lib/i18n";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   LOGO MARQUEE — Infinite horizontal scroll of AI model logos
   Adds dynamism + social proof between landing sections
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const f: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

const models = [
  { name: "GPT-5", color: "#10A37F" },
  { name: "Claude", color: "#D97706" },
  { name: "Gemini", color: "#4285F4" },
  { name: "Flux", color: "#8B5CF6" },
  { name: "DALL-E", color: "#10A37F" },
  { name: "Luma", color: "#3B82F6" },
  { name: "Kling", color: "#EC4899" },
  { name: "Sora", color: "#10A37F" },
  { name: "Suno", color: "#F59E0B" },
  { name: "DeepSeek", color: "#6366F1" },
  { name: "Runway", color: "#EF4444" },
  { name: "Pika", color: "#14B8A6" },
  { name: "Leonardo", color: "#8B5CF6" },
  { name: "Ideogram", color: "#F97316" },
];

function LogoChip({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-5 py-2.5 rounded-full flex-shrink-0"
      style={{ background: `${color}0A`, border: `1px solid ${color}20` }}
    >
      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: color }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#fff", ...f }}>{name[0]}</span>
      </div>
      <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151", whiteSpace: "nowrap", ...f }}>{name}</span>
    </div>
  );
}

export function LogoMarquee() {
  const { t } = useI18n();
  const duplicated = [...models, ...models]; // Double for infinite loop

  return (
    <section className="py-16 md:py-20 overflow-hidden" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[1200px] mx-auto px-6 mb-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ fontSize: "12px", fontWeight: 500, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", ...f }}
        >
          {t("marquee.label")}
        </motion.p>
      </div>
      {/* Marquee track */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10" style={{ background: "linear-gradient(to right, #FAFAFA, transparent)" }} />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10" style={{ background: "linear-gradient(to left, #FAFAFA, transparent)" }} />
        {/* Scrolling row */}
        <motion.div
          className="flex gap-4"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {duplicated.map((m, i) => (
            <LogoChip key={`${m.name}-${i}`} name={m.name} color={m.color} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

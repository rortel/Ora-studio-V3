import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  { q: "What makes ORA different from ChatGPT or Midjourney?", a: "With ChatGPT you only get GPT. With Midjourney you only get Midjourney. ORA gives you 38+ models in one studio. Plus Arena to compare outputs side by side, Campaign Lab for multi-platform generation, and Brand Vault for automatic compliance." },
  { q: "Which AI models are supported?", a: "GPT-5, GPT-4o, Claude 4.5, Gemini 2.5, DeepSeek V3, Mistral, Flux Pro 2, DALL-E 3, Photon 1, Leonardo AI, Luma Ray 2, Sora 2, Kling 2.1, Veo 3.1, Seedream V4, and many more. New models added monthly." },
  { q: "How does Campaign Lab work?", a: "Write a brief. Choose your platforms. Campaign Lab generates images, videos, and copy adapted for each platform - all at once." },
  { q: "What does one credit get?", a: "Text: 1 credit. Image: 4 credits. Audio: 4 credits. Code: 2 credits. Video (~10s): 100 credits. Credits never expire." },
  { q: "Do unused credits roll over?", a: "Yes, always. Monthly credits and purchased packs roll over indefinitely." },
  { q: "Is my content private?", a: "Yes. We don't train on your data. Full GDPR compliance." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-28 md:py-36" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[680px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
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
            FAQ
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "#111111",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Questions & answers
          </h2>
        </motion.div>

        <div>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left cursor-pointer"
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 400,
                      fontFamily: "'Inter', sans-serif",
                      color: "#111111",
                      paddingRight: "1rem",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: isOpen ? "rgba(0,0,0,0.04)" : "transparent" }}
                  >
                    {isOpen ? (
                      <Minus size={13} style={{ color: "#111111" }} strokeWidth={1.5} />
                    ) : (
                      <Plus size={13} style={{ color: "#9A9590" }} strokeWidth={1.5} />
                    )}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p
                        className="pb-5"
                        style={{
                          fontSize: "14px",
                          lineHeight: 1.65,
                          fontFamily: "'Inter', sans-serif",
                          color: "#9A9590",
                        }}
                      >
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

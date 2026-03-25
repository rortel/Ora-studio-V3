import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "How is ORA different from ChatGPT or Midjourney?",
    a: "With ChatGPT you only get GPT. With Midjourney you only get Midjourney. ORA gives you 38+ models in one studio — plus the Arena to compare outputs side by side, Campaign Lab for multi-platform generation, and Brand Vault for automatic brand compliance.",
  },
  {
    q: "Which AI models are available?",
    a: "GPT-5, GPT-4o, Claude 4.5, Gemini 2.5, DeepSeek V3, Mistral, Flux Pro 2, DALL-E 3, Photon 1, Leonardo AI, Luma Ray 2, Sora 2, Kling 2.1, Veo 3.1, Seedream V4, and many more. New models are added every month.",
  },
  {
    q: "How does Campaign Lab work?",
    a: "Write a brief. Choose your platforms. Campaign Lab generates images, videos and text tailored to each channel — all at the same time.",
  },
  {
    q: "What is a credit?",
    a: "Text: 1 credit. Image: 4 credits. Audio: 4 credits. Code: 2 credits. Video (~10s): 100 credits. Credits never expire.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Yes, always. Monthly credits and purchased credit packs roll over indefinitely.",
  },
  {
    q: "Is my content private?",
    a: "Yes. We never train our models on your data. Full GDPR compliance.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="py-16 md:py-32"
      style={{ background: "#111111", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-[720px] mx-auto px-5 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 md:mb-12"
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.45)",
              marginBottom: 16,
            }}
          >
            Frequently asked questions
          </p>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "#F0EDE8",
            }}
          >
            Everything you need to know.
          </h2>
        </motion.div>

        <div>
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left cursor-pointer"
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 500,
                      color: isOpen ? "#FFFFFF" : "rgba(240,237,232,0.75)",
                      paddingRight: "1.5rem",
                      letterSpacing: "-0.01em",
                      transition: "color 200ms ease",
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: isOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                      transition: "background 200ms ease",
                    }}
                  >
                    {isOpen ? (
                      <Minus size={11} style={{ color: "#FFFFFF" }} />
                    ) : (
                      <Plus size={11} style={{ color: "rgba(255,255,255,0.40)" }} />
                    )}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p
                        className="pb-5"
                        style={{
                          fontSize: "14px",
                          lineHeight: 1.7,
                          color: "rgba(240,237,232,0.45)",
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

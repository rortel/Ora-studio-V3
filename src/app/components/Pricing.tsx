import { Link } from "react-router";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

const plans = [
  {
    name: "Starter",
    price: "29",
    period: "/month",
    desc: "For creatives just starting out.",
    credits: "200 credits / month",
    features: ["200 credits/month", "10 AI models", "Text + image"],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "79",
    period: "/month",
    desc: "Every model. Every format.",
    credits: "1,500 credits / month",
    features: [
      "1,500 credits/month",
      "38+ AI models",
      "Image, video, text, audio",
      "Arena (side-by-side comparison)",
      "Priority queue",
      "Credit top-ups",
    ],
    cta: "Get started with Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "149",
    period: "/month",
    desc: "Brand-safe content at scale.",
    credits: "5,000 credits / month",
    features: [
      "5,000 credits/month",
      "Everything in Pro",
      "Brand Vault",
      "Campaign Lab",
      "Auto content calendar",
      "Publishing & scheduling",
      "Brand Score",
      "Priority support",
    ],
    cta: "Get started with Business",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="py-16 md:py-36"
      style={{ background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-[1080px] mx-auto px-5 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 md:mb-14"
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
            Pricing
          </p>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "#F0EDE8",
              marginBottom: 12,
            }}
          >
            Simple and transparent.
          </h2>
          <p style={{ fontSize: "15px", lineHeight: 1.6, color: "rgba(240,237,232,0.40)", maxWidth: 360 }}>
            Pay in credits. Use any model. Credits never expire.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-3 md:gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl p-6 md:p-7 flex flex-col relative"
              style={{
                background: p.highlighted ? "#161616" : "#111111",
                border: p.highlighted
                  ? "1px solid rgba(255,255,255,0.20)"
                  : "1px solid rgba(255,255,255,0.07)",
                minHeight: 400,
              }}
            >
              {p.highlighted && (
                <span
                  className="absolute top-5 right-5 px-3 py-1 rounded-full"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.70)",
                    letterSpacing: "0.06em",
                  }}
                >
                  POPULAR
                </span>
              )}

              <div>
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "#F0EDE8",
                    marginBottom: 4,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {p.name}
                </h3>
                <p style={{ fontSize: "13px", color: "rgba(240,237,232,0.32)", marginBottom: 20 }}>
                  {p.desc}
                </p>

                <div className="flex items-baseline gap-1 mb-1">
                  <span style={{ fontSize: "12px", color: "rgba(240,237,232,0.30)", fontWeight: 500 }}>EUR</span>
                  <span
                    style={{
                      fontSize: "42px",
                      fontWeight: 300,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "#FFFFFF",
                    }}
                  >
                    {p.price}
                  </span>
                  <span style={{ fontSize: "13px", color: "rgba(240,237,232,0.30)" }}>{p.period}</span>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "rgba(240,237,232,0.35)",
                    marginBottom: 24,
                  }}
                >
                  {p.credits}
                </p>
              </div>

              <ul className="space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check
                      size={12}
                      style={{
                        color: p.highlighted ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.25)",
                        marginTop: 3,
                        flexShrink: 0,
                      }}
                      strokeWidth={2.5}
                    />
                    <span style={{ fontSize: "13px", color: "rgba(240,237,232,0.50)", lineHeight: 1.5 }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login?mode=signup"
                className="group mt-8 flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: p.highlighted ? "#FFFFFF" : "rgba(255,255,255,0.06)",
                  color: p.highlighted ? "#0A0A0A" : "rgba(240,237,232,0.60)",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: p.highlighted ? "none" : "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {p.cta}
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 md:mt-10"
          style={{ fontSize: "12px", color: "rgba(255,255,255,0.18)" }}
        >
          No card required · Credits never expire · Cancel anytime
        </motion.p>
      </div>
    </section>
  );
}

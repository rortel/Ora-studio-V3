import { Link } from "react-router";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

const plans = [
  {
    name: "Starter",
    price: "29",
    period: "/mo",
    desc: "For individuals getting started.",
    credits: "200 credits/mo",
    features: [
      "200 credits/month",
      "10 AI models",
      "Text + image generation",
    ],
    cta: "Start Starter",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "79",
    period: "/mo",
    desc: "Every model. Every format.",
    credits: "1,500 credits/mo",
    features: [
      "1,500 credits/month",
      "All 38+ models",
      "Text, image, video, audio",
      "Full Arena",
      "Priority queue",
      "Credit packs",
    ],
    cta: "Start Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "149",
    period: "/mo",
    desc: "Brand-safe content at scale.",
    credits: "5,000 credits/mo",
    features: [
      "5,000 credits/month",
      "Everything in Pro",
      "Brand Vault",
      "Campaign Lab",
      "Auto Content Calendar",
      "Auto-publish & scheduling",
      "Brand Score",
      "Priority support",
    ],
    cta: "Start Business",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-28 md:py-36" style={{ background: "#F5F5F5" }}>
      <div className="max-w-[1080px] mx-auto px-6">
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
            Pricing
          </p>
          <h2
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "#111111",
              fontFamily: "'Inter', sans-serif",
              marginBottom: 12,
            }}
          >
            Simple, transparent pricing
          </h2>
          <p style={{
            fontSize: "15px",
            lineHeight: 1.55,
            color: "#9A9590",
            fontFamily: "'Inter', sans-serif",
            maxWidth: 380,
            margin: "0 auto",
          }}>
            Pay for credits. Use any model. Credits never expire.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl p-7 flex flex-col relative"
              style={{
                background: "#FFFFFF",
                border: p.highlighted
                  ? "1.5px solid #111111"
                  : "1px solid rgba(0,0,0,0.06)",
                minHeight: 420,
              }}
            >
              {p.highlighted && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full"
                  style={{
                    background: "#111111",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#FFFFFF",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Popular
                </span>
              )}

              <div>
                <h3
                  style={{
                    fontSize: "15px",
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    color: "#111111",
                    marginBottom: 4,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {p.name}
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    color: "#9A9590",
                    fontFamily: "'Inter', sans-serif",
                    marginBottom: 20,
                  }}
                >
                  {p.desc}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span style={{ fontSize: "11px", color: "#9A9590", fontFamily: "'Inter', sans-serif" }}>EUR</span>
                  <span
                    style={{
                      fontSize: "44px",
                      fontWeight: 300,
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                      color: "#111111",
                    }}
                  >
                    {p.price}
                  </span>
                  {p.period && (
                    <span style={{ fontSize: "13px", color: "#9A9590", fontFamily: "'Inter', sans-serif" }}>{p.period}</span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#111111",
                    fontFamily: "'Inter', sans-serif",
                    marginBottom: 24,
                  }}
                >
                  {p.credits}
                </p>
              </div>

              <ul className="space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check size={13} style={{ color: "#111111" }} strokeWidth={2} />
                    <span style={{ fontSize: "13px", color: "#666666", fontFamily: "'Inter', sans-serif" }}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/login?mode=signup"
                className="group mt-8 flex items-center justify-center gap-2 py-3 rounded-full transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                style={{
                  background: p.highlighted ? "#111111" : "transparent",
                  border: p.highlighted ? "none" : "1px solid rgba(0,0,0,0.12)",
                  color: p.highlighted ? "#FFFFFF" : "#111111",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {p.cta}
                <ArrowRight
                  size={13}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

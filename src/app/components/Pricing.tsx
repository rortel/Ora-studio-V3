import { Link } from "react-router";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { useI18n } from "../lib/i18n";

export function Pricing() {
  const { t } = useI18n();

  const plans = [
    {
      name: t("pricing.starter"),
      price: "29",
      period: "/mo",
      desc: t("pricing.starterDesc"),
      credits: t("pricing.starterCredits"),
      features: [t("pricing.starterF1"), t("pricing.starterF2"), t("pricing.starterF3")],
      cta: t("pricing.starterCta"),
      highlighted: false,
    },
    {
      name: t("pricing.pro"),
      price: "79",
      period: "/mo",
      desc: t("pricing.proDesc"),
      credits: t("pricing.proCredits"),
      features: [t("pricing.proF1"), t("pricing.proF2"), t("pricing.proF3"), t("pricing.proF4"), t("pricing.proF5"), t("pricing.proF6")],
      cta: t("pricing.proCta"),
      highlighted: true,
    },
    {
      name: t("pricing.business"),
      price: "149",
      period: "/mo",
      desc: t("pricing.businessDesc"),
      credits: t("pricing.businessCredits"),
      features: [t("pricing.businessF1"), t("pricing.businessF2"), t("pricing.businessF3"), t("pricing.businessF4"), t("pricing.businessF5"), t("pricing.businessF6"), t("pricing.businessF7"), t("pricing.businessF8")],
      cta: t("pricing.businessCta"),
      highlighted: false,
    },
  ];

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
            {t("pricing.label")}
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
            {t("pricing.title")}
          </h2>
          <p style={{
            fontSize: "15px",
            lineHeight: 1.55,
            color: "#9A9590",
            fontFamily: "'Inter', sans-serif",
            maxWidth: 380,
            margin: "0 auto",
          }}>
            {t("pricing.subtitle")}
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
                  {t("pricing.popular")}
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

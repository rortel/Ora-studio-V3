import { motion } from "motion/react";
import { Check, Minus, ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router";
import { FAQ } from "../components/FAQ";
import { useI18n } from "../lib/i18n";

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={14} className="text-ora-signal mx-auto" />
    ) : (
      <Minus size={14} className="text-muted-foreground/30 mx-auto" />
    );
  }
  return (
    <span className="text-foreground/70" style={{ fontSize: "13px" }}>
      {value}
    </span>
  );
}

export function PricingPage() {
  const { t } = useI18n();

  const plans = [
    {
      name: t("pricingPage.starterName"),
      price: t("pricingPage.starterPrice"),
      period: t("pricingPage.starterPeriod"),
      audience: t("pricingPage.starterAudience"),
      credits: t("pricingPage.starterCredits"),
      features: [
        t("pricingPage.starterF1"),
        t("pricingPage.starterF2"),
        t("pricingPage.starterF3"),
        t("pricingPage.starterF4"),
        t("pricingPage.starterF5"),
      ],
      cta: t("pricingPage.starterCta"),
      ctaHref: "/login?mode=signup",
      highlighted: false,
    },
    {
      name: t("pricingPage.proName"),
      price: t("pricingPage.proPrice"),
      period: t("pricingPage.proPeriod"),
      audience: t("pricingPage.proAudience"),
      credits: t("pricingPage.proCredits"),
      features: [
        t("pricingPage.proF1"),
        t("pricingPage.proF2"),
        t("pricingPage.proF3"),
        t("pricingPage.proF4"),
        t("pricingPage.proF5"),
        t("pricingPage.proF6"),
      ],
      cta: t("pricingPage.proCta"),
      ctaHref: "/login?mode=signup",
      highlighted: true,
    },
    {
      name: t("pricingPage.businessName"),
      price: t("pricingPage.businessPrice"),
      period: t("pricingPage.businessPeriod"),
      audience: t("pricingPage.businessAudience"),
      credits: t("pricingPage.businessCredits"),
      features: [
        t("pricingPage.businessF1"),
        t("pricingPage.businessF2"),
        t("pricingPage.businessF3"),
        t("pricingPage.businessF4"),
        t("pricingPage.businessF5"),
        t("pricingPage.businessF6"),
      ],
      cta: t("pricingPage.businessCta"),
      ctaHref: "/login?mode=signup",
      highlighted: false,
    },
  ];

  const creditPacks = [
    { name: t("pricingPage.packSName"), price: "\u20AC9", credits: t("pricingPage.packSCredits"), rate: t("pricingPage.packSRate") },
    { name: t("pricingPage.packMName"), price: "\u20AC19", credits: t("pricingPage.packMCredits"), rate: t("pricingPage.packMRate") },
    { name: t("pricingPage.packLName"), price: "\u20AC39", credits: t("pricingPage.packLCredits"), rate: t("pricingPage.packLRate") },
  ];

  const comparisonFeatures: { name: string; starter: boolean | string; pro: boolean | string; business: boolean | string }[] = [
    { name: t("pricingPage.compAiCredits"), starter: t("pricingPage.comp100cr"), pro: t("pricingPage.comp500cr"), business: t("pricingPage.comp2000cr") },
    { name: t("pricingPage.compPublications"), starter: t("pricingPage.comp15pub"), pro: t("pricingPage.comp60pub"), business: t("pricingPage.comp200pub") },
    { name: t("pricingPage.compAiModels"), starter: t("pricingPage.comp10models"), pro: t("pricingPage.comp25models"), business: t("pricingPage.compAllModels") },
    { name: t("pricingPage.compProducts"), starter: t("pricingPage.comp1product"), pro: t("pricingPage.comp5products"), business: t("pricingPage.comp20products") },
    { name: t("pricingPage.compBrandVault"), starter: true, pro: true, business: true },
    { name: t("pricingPage.compLibrary"), starter: true, pro: true, business: true },
    { name: t("pricingPage.compCampaignLab"), starter: true, pro: true, business: true },
    { name: t("pricingPage.compCalendar"), starter: true, pro: true, business: true },
    { name: t("pricingPage.compTeam"), starter: t("pricingPage.comp1member"), pro: t("pricingPage.comp3members"), business: t("pricingPage.comp10members") },
    { name: t("pricingPage.compCreditPacks"), starter: true, pro: true, business: true },
    { name: t("pricingPage.compSupport"), starter: t("pricingPage.compCommunity"), pro: t("pricingPage.compEmail"), business: t("pricingPage.compPriority") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <span
              className="inline-block px-3 py-1 rounded-full"
              style={{
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                background: "rgba(26,23,20,0.03)",
                border: "1px solid var(--border)",
              }}
            >
              {t("pricingPage.badge")}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
              fontWeight: 300,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              color: "var(--foreground)",
            }}
            className="mb-5"
          >
            {t("pricingPage.heroTitle1")}{" "}
            <span className="text-muted-foreground">{t("pricingPage.heroTitle2")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="max-w-[520px] mx-auto mb-4"
            style={{ fontSize: "16px", lineHeight: 1.55, color: "var(--text-tertiary)" }}
          >
            {t("pricingPage.heroSubtitle")}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="text-muted-foreground/60"
            style={{ fontSize: "13px", color: "var(--text-secondary)" }}
          >
            {t("pricingPage.heroNote")}
          </motion.p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-6 md:pb-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`relative flex flex-col bg-card rounded-xl border ${
                  plan.highlighted ? "border-border-accent" : "border-border"
                }`}
                style={{
                  boxShadow: plan.highlighted
                    ? "0 1px 3px rgba(0,0,0,0.1), 0 16px 48px rgba(0,0,0,0.03)"
                    : "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-6">
                    <span
                      className="text-white px-3 py-1 rounded-full"
                      style={{
                        background: "var(--border-strong)",
                        color: "var(--foreground)",
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.05em",
                      }}
                    >
                      {t("pricingPage.mostPopular")}
                    </span>
                  </div>
                )}

                <div className="p-7 pb-0">
                  <h3
                    className="text-foreground mb-1"
                    style={{ fontSize: "18px", fontWeight: 500 }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className="text-muted-foreground mb-5"
                    style={{ fontSize: "13px" }}
                  >
                    {plan.audience}
                  </p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      className="text-foreground"
                      style={{
                        fontSize: "40px",
                        fontWeight: 300,
                        letterSpacing: "-0.04em",
                        lineHeight: 1,
                      }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span
                        className="text-muted-foreground"
                        style={{ fontSize: "15px" }}
                      >
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p
                    className="mb-6 pb-6 border-b"
                    style={{
                      borderColor: "var(--border)",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--ora-signal)",
                    }}
                  >
                    {plan.credits}
                  </p>
                </div>

                <ul className="px-7 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0"
                        style={{
                          background: plan.highlighted
                            ? "var(--ora-signal-light)"
                            : "var(--secondary)",
                        }}
                      >
                        <Check
                          size={9}
                          style={{
                            color: plan.highlighted
                              ? "var(--ora-signal)"
                              : "var(--muted-foreground)",
                          }}
                          strokeWidth={2.5}
                        />
                      </div>
                      <span
                        className="text-foreground/75"
                        style={{ fontSize: "13px", lineHeight: 1.5 }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="p-7 pt-8">
                  <Link
                    to={plan.ctaHref}
                    className={`group flex items-center justify-center gap-2 w-full py-3 rounded-full transition-all ${
                      plan.highlighted
                        ? "hover:opacity-90"
                        : "bg-secondary text-foreground hover:bg-muted border border-border"
                    }`}
                    style={{
                      background: plan.highlighted
                        ? "var(--foreground)"
                        : undefined,
                      color: plan.highlighted ? "var(--background)" : undefined,
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {plan.cta}
                    {plan.highlighted && (
                      <ArrowRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    )}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Credit packs */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Zap size={14} style={{ color: "var(--ora-signal)" }} />
              <h3
                className="text-foreground"
                style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.02em" }}
              >
                {t("pricingPage.creditPacksTitle")}
              </h3>
            </div>
            <p
              className="text-muted-foreground"
              style={{ fontSize: "14px", lineHeight: 1.55 }}
            >
              {t("pricingPage.creditPacksSubtitle")}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4">
            {creditPacks.map((pack, i) => (
              <motion.div
                key={pack.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="bg-card border border-border rounded-xl px-6 py-5 flex items-center justify-between hover:border-border-strong transition-colors"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
              >
                <div>
                  <span style={{ fontSize: "15px", fontWeight: 500, color: "var(--foreground)" }}>
                    {pack.name}
                  </span>
                  <span
                    className="block mt-0.5"
                    style={{ fontSize: "12px", color: "var(--muted-foreground)" }}
                  >
                    {pack.credits}
                  </span>
                  <span
                    className="block mt-0.5"
                    style={{ fontSize: "11px", color: "var(--ora-signal)", fontWeight: 500 }}
                  >
                    {pack.rate}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 500,
                    color: "var(--foreground)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {pack.price}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise callout */}
      <section className="pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-xl px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
          >
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
                {t("pricingPage.enterpriseTitle")}
              </h3>
              <p className="mt-1" style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.55 }}>
                {t("pricingPage.enterpriseDesc")}
              </p>
            </div>
            <Link
              to="#"
              className="inline-flex items-center gap-2 border px-6 py-3 rounded-xl hover:bg-secondary transition-colors flex-shrink-0"
              style={{
                borderColor: "var(--border-strong)",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--foreground)",
              }}
            >
              {t("pricingPage.enterpriseCta")}
              <ArrowRight size={14} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-20 md:py-28" style={{ background: "rgba(18,18,30,0.5)" }}>
        <div className="max-w-[960px] mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-foreground mb-10"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
            }}
          >
            {t("pricingPage.compareTitle")}
          </motion.h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className="text-left py-3 pr-4"
                    style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)" }}
                  >
                    {t("pricingPage.featureLabel")}
                  </th>
                  {[t("pricingPage.starterName"), t("pricingPage.proName"), t("pricingPage.businessName")].map((h) => (
                    <th
                      key={h}
                      className="text-center py-3 px-3"
                      style={{ fontSize: "13px", fontWeight: 600, minWidth: "100px" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-foreground" style={{ fontSize: "14px" }}>
                      {row.name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.starter} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.pro} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.business} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <FAQ />
    </>
  );
}

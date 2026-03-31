import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Zap,
  Sparkles,
  Crown,
  Check,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { PulseIcon } from "../components/PulseMotif";
import { useAuth } from "../lib/auth-context";
import { API_BASE, publicAnonKey } from "../lib/supabase";
import { useI18n } from "../lib/i18n";

export function SubscribePage() {
  const navigate = useNavigate();
  const { user, profile, accessToken, isLoading: authLoading, refreshProfile } = useAuth();
  const { t } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plans = [
    {
      id: "free" as const,
      name: t("subscribe.freeName"),
      price: "0",
      priceLabel: t("subscribe.freePrice"),
      period: "",
      credits: t("subscribe.freeCredits"),
      description: t("subscribe.freeDesc"),
      features: [
        t("subscribe.freeF1"),
        t("subscribe.freeF2"),
        t("subscribe.freeF3"),
        t("subscribe.freeF4"),
        t("subscribe.freeF5"),
      ],
      icon: Zap,
      highlighted: false,
      cta: t("subscribe.freeCta"),
    },
    {
      id: "generate" as const,
      name: t("subscribe.proName"),
      price: t("subscribe.proPrice"),
      priceLabel: t("subscribe.proPrice"),
      period: t("subscribe.proPeriod"),
      credits: t("subscribe.proCredits"),
      description: t("subscribe.proDesc"),
      features: [
        t("subscribe.proF1"),
        t("subscribe.proF2"),
        t("subscribe.proF3"),
        t("subscribe.proF4"),
        t("subscribe.proF5"),
        t("subscribe.proF6"),
      ],
      icon: Sparkles,
      highlighted: true,
      cta: t("subscribe.proCta"),
    },
    {
      id: "studio" as const,
      name: t("subscribe.businessName"),
      price: t("subscribe.businessPrice"),
      priceLabel: t("subscribe.businessPrice"),
      period: t("subscribe.businessPeriod"),
      credits: t("subscribe.businessCredits"),
      description: t("subscribe.businessDesc"),
      features: [
        t("subscribe.businessF1"),
        t("subscribe.businessF2"),
        t("subscribe.businessF3"),
        t("subscribe.businessF4"),
        t("subscribe.businessF5"),
        t("subscribe.businessF6"),
        t("subscribe.businessF7"),
      ],
      icon: Crown,
      highlighted: false,
      cta: t("subscribe.businessCta"),
    },
  ];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?mode=signup");
    }
  }, [authLoading, user, navigate]);

  const handleChoosePlan = async (planId: string) => {
    setSelectedPlan(planId);
    setLoading(true);
    setError("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      };
      if (accessToken) headers["X-User-Token"] = accessToken;

      const res = await fetch(`${API_BASE}/auth/choose-plan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();

      if (data.error) {
        console.error("Choose plan error:", data.error);
        setError(data.error);
        setLoading(false);
        return;
      }

      console.log("Plan chosen:", planId, data.profile);
      // Refresh profile in auth context then redirect
      await refreshProfile();
      navigate("/profile");
    } catch (err) {
      console.error("Choose plan exception:", err);
      setError(t("subscribe.errorActivation"));
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[960px] mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <PulseIcon size={28} />
            <span
              className="text-foreground"
              style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              ORA
            </span>
          </div>
          <h1
            className="text-foreground mb-3"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            {t("subscribe.welcomePrefix")}{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}. {t("subscribe.heading")}
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "15px", lineHeight: 1.5 }}>
            {t("subscribe.subtitle")}
          </p>
        </motion.div>

        {/* Error */}
        {error && (
          <div
            className="max-w-[400px] mx-auto mb-8 p-3 rounded-lg text-center"
            style={{
              background: "rgba(212,24,61,0.06)",
              border: "1px solid rgba(212,24,61,0.1)",
              fontSize: "13px",
              color: "var(--destructive)",
            }}
          >
            {error}
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            const isLoading = isSelected && loading;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative border rounded-xl bg-card p-6 flex flex-col ${
                  plan.highlighted ? "border-ora-signal" : "border-border"
                }`}
                style={{
                  boxShadow: plan.highlighted
                    ? "0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(17,17,17,0.08)"
                    : "0 1px 2px rgba(0,0,0,0.02)",
                }}
              >
                {/* Popular badge */}
                {plan.highlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-white"
                    style={{
                      background: "var(--ora-signal)",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {t("subscribe.popular")}
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: plan.highlighted
                          ? "var(--ora-signal-light)"
                          : "var(--secondary)",
                      }}
                    >
                      <Icon
                        size={15}
                        style={{
                          color: plan.highlighted
                            ? "var(--ora-signal)"
                            : "var(--muted-foreground)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {plan.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      style={{
                        fontSize: "32px",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        letterSpacing: "-0.03em",
                        lineHeight: 1,
                      }}
                    >
                      {plan.price === "0" ? plan.priceLabel : plan.price}
                    </span>
                    {plan.period && (
                      <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2"
                    style={{
                      background: plan.highlighted
                        ? "var(--ora-signal-light)"
                        : "var(--secondary)",
                      fontSize: "12px",
                      fontWeight: 500,
                      color: plan.highlighted
                        ? "var(--ora-signal)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    <Zap size={10} />
                    {plan.credits}
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.45 }}>
                    {plan.description}
                  </p>
                </div>

                {/* Features */}
                <div className="flex-1 space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check
                        size={13}
                        className="flex-shrink-0 mt-0.5"
                        style={{
                          color: plan.highlighted
                            ? "var(--ora-signal)"
                            : "var(--muted-foreground)",
                        }}
                      />
                      <span style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: 1.4 }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleChoosePlan(plan.id)}
                  disabled={loading}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-all cursor-pointer disabled:opacity-60 ${
                    plan.highlighted
                      ? "text-white hover:opacity-90"
                      : "border border-border-strong text-foreground hover:bg-secondary"
                  }`}
                  style={{
                    background: plan.highlighted ? "var(--ora-signal)" : undefined,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      {t("subscribe.activating")}
                    </>
                  ) : (
                    <>
                      {plan.cta}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 text-muted-foreground"
          style={{ fontSize: "12px" }}
        >
          {t("subscribe.footerNote")}
        </motion.p>
      </div>
    </div>
  );
}

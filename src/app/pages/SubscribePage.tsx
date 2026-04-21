import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import {
  Zap,
  Sparkles,
  Crown,
  Check,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  CreditCard,
} from "lucide-react";
import { PulseIcon } from "../components/PulseMotif";
import { useAuth } from "../lib/auth-context";
import { apiUrl } from "../lib/supabase";
import { useI18n } from "../lib/i18n";

export function SubscribePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, accessToken, isLoading: authLoading, refreshProfile, plan: currentPlan, remainingCredits } = useAuth();
  const { t } = useI18n();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Map public plan codes (creator / studio / agency) to the internal Stripe
  // plan codes (starter / pro / business) that the server + card list use.
  const normalizePlanCode = (raw: string | null | undefined): "starter" | "pro" | "business" | null => {
    const s = String(raw || "").toLowerCase();
    if (s === "studio" || s === "pro") return "pro";
    if (s === "agency" || s === "business") return "business";
    if (s === "creator" || s === "starter") return "starter";
    return null;
  };

  // Pre-select the card that matches the URL ?plan= coming from /pricing.
  useEffect(() => {
    const fromUrl = normalizePlanCode(searchParams.get("plan"));
    if (fromUrl && searchParams.get("success") !== "true") {
      setSelectedPlan(fromUrl);
    }
  }, [searchParams]);

  // Handle Stripe redirect results
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      const plan = normalizePlanCode(searchParams.get("plan"));
      const pack = searchParams.get("pack") || "";
      if (pack) {
        setSuccessMessage(t("subscribe.successPack"));
      } else if (plan === "business") {
        setSuccessMessage(t("subscribe.successBusiness"));
      } else if (plan === "pro") {
        setSuccessMessage(t("subscribe.successPro"));
      } else {
        setSuccessMessage(t("subscribe.successStarter"));
      }
      refreshProfile();
    }
    if (searchParams.get("canceled") === "true") {
      setError(t("subscribe.paymentCanceled"));
    }
  }, [searchParams]);

  const plans = [
    {
      id: "starter" as const,
      serverPlan: "starter",
      name: t("subscribe.starterName"),
      price: t("subscribe.starterPrice"),
      priceLabel: t("subscribe.starterPrice"),
      period: t("subscribe.starterPeriod"),
      credits: t("subscribe.starterCredits"),
      description: t("subscribe.starterDesc"),
      features: [
        t("subscribe.starterF1"),
        t("subscribe.starterF2"),
        t("subscribe.starterF3"),
        t("subscribe.starterF4"),
        t("subscribe.starterF5"),
      ],
      icon: Zap,
      highlighted: false,
      cta: t("subscribe.starterCta"),
      requiresStripe: true,
    },
    {
      id: "pro" as const,
      serverPlan: "pro",
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
      requiresStripe: true,
    },
    {
      id: "business" as const,
      serverPlan: "business",
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
      ],
      icon: Crown,
      highlighted: false,
      cta: t("subscribe.businessCta"),
      requiresStripe: true,
    },
  ];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?mode=signup");
    }
  }, [authLoading, user, navigate]);

  const handleChoosePlan = async (planId: string, requiresStripe: boolean) => {
    setSelectedPlan(planId);
    setLoading(true);
    setError("");

    try {
      // CORS-safe: text/plain + no Authorization header = no preflight
      // apikey goes in URL query string, user token in body as _token
      const headers = { "Content-Type": "text/plain" };

      if (requiresStripe) {
        // Paid plan → Create Stripe Checkout Session
        const res = await fetch(apiUrl("/stripe/create-checkout-session"), {
          method: "POST",
          headers,
          body: JSON.stringify({ _token: accessToken, plan: planId }),
        });
        const data = await res.json();

        if (data.error) {
          console.error("Stripe checkout error:", data.error);
          setError(data.error);
          setLoading(false);
          return;
        }

        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
          return; // Don't setLoading(false) — user is leaving
        }
      } else {
        // Free plan → Direct activation
        const res = await fetch(apiUrl("/auth/choose-plan"), {
          method: "POST",
          headers,
          body: JSON.stringify({ _token: accessToken, plan: planId }),
        });
        const data = await res.json();

        if (data.error) {
          console.error("Choose plan error:", data.error);
          setError(data.error);
          setLoading(false);
          return;
        }

        console.log("Plan chosen:", planId, data.profile);
        await refreshProfile();
        navigate("/hub");
      }
    } catch (err) {
      console.error("Choose plan exception:", err);
      setError(t("subscribe.errorActivation"));
      setLoading(false);
    }
  };

  const [packLoading, setPackLoading] = useState<string | null>(null);

  const handleBuyPack = async (packId: string) => {
    setPackLoading(packId);
    setError("");
    try {
      const res = await fetch(apiUrl("/stripe/buy-pack"), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: accessToken, pack: packId }),
      });
      const data = await res.json();

      if (data.error) {
        console.error("Pack checkout error:", data.error);
        setError(data.error);
        setPackLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error("Buy pack exception:", err);
      setError(t("subscribe.errorActivation"));
      setPackLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/stripe/portal"), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: accessToken }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.error) setError(data.error);
    } catch (err) {
      setError("Could not open subscription management");
    }
    setLoading(false);
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

        {/* Success message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-[500px] mx-auto mb-8 p-4 rounded-xl flex items-center gap-3"
            style={{
              background: "rgba(16, 185, 129, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.15)",
            }}
          >
            <CheckCircle2 size={20} style={{ color: "#10b981", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)" }}>
                {successMessage}
              </p>
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>
                {t("subscribe.successRedirect")}
              </p>
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-[500px] mx-auto mb-8 p-4 rounded-xl flex items-center gap-3"
            style={{
              background: "rgba(212,24,61,0.06)",
              border: "1px solid rgba(212,24,61,0.1)",
            }}
          >
            <XCircle size={20} style={{ color: "var(--destructive)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", color: "var(--destructive)" }}>{error}</p>
          </motion.div>
        )}

        {/* Current plan indicator */}
        {currentPlan && currentPlan !== "free" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-[500px] mx-auto mb-8 p-4 rounded-xl flex items-center justify-between"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <CreditCard size={18} style={{ color: "var(--accent)" }} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                  {t("subscribe.currentPlan")}: {currentPlan === "starter" ? "Starter" : currentPlan === "pro" ? "Pro" : "Business"}
                </p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                  {remainingCredits.toLocaleString()} {t("subscribe.creditsRemaining")}
                </p>
              </div>
            </div>
            <button
              onClick={handleManageSubscription}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              {t("subscribe.manageSubscription")}
            </button>
          </motion.div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            const isLoading = isSelected && loading;
            const isCurrentPlan = currentPlan === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative border rounded-xl bg-card p-6 flex flex-col ${
                  plan.highlighted ? "border-ora-signal" : "border-border"
                } ${isCurrentPlan ? "ring-2 ring-accent/20" : ""}`}
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

                {/* Current plan badge */}
                {isCurrentPlan && (
                  <div
                    className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full"
                    style={{
                      background: "var(--accent)",
                      color: "#fff",
                      fontSize: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {t("subscribe.currentBadge")}
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
                  onClick={() => handleChoosePlan(plan.id, plan.requiresStripe)}
                  disabled={loading || isCurrentPlan}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
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
                      {plan.requiresStripe ? t("subscribe.redirecting") : t("subscribe.activating")}
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <Check size={15} />
                      {t("subscribe.currentBadge")}
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

        {/* ═══ Credit Packs Section ═══ */}
        {currentPlan && currentPlan !== "free" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-20 relative"
          >
            {/* Gradient banner background */}
            <div
              className="absolute inset-0 -mx-6 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #7C3AED08, #EC489908, #7C3AED04)",
                border: "1px solid rgba(124, 58, 237, 0.08)",
                margin: "-24px -24px",
                padding: "24px",
                borderRadius: "20px",
              }}
            />

            <div className="relative">
              {/* Header with icon */}
              <div className="text-center mb-10">
                <div
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                    boxShadow: "0 4px 16px rgba(124, 58, 237, 0.25)",
                  }}
                >
                  <Zap size={20} style={{ color: "#FFFFFF" }} strokeWidth={2} />
                </div>
                <h2
                  className="text-foreground mb-2"
                  style={{
                    fontSize: "clamp(1.3rem, 2.5vw, 1.6rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.2,
                  }}
                >
                  {t("subscribe.creditPacksTitle")}
                </h2>
                <p className="text-muted-foreground" style={{ fontSize: "14px", lineHeight: 1.5 }}>
                  {t("subscribe.creditPacksSubtitle")}
                </p>
              </div>

              {/* Pack cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[760px] mx-auto">
                {[
                  {
                    id: "pack_s",
                    name: t("subscribe.packSName"),
                    credits: t("subscribe.packSCredits"),
                    price: t("subscribe.packSPrice"),
                    rate: t("subscribe.packSRate"),
                    gradient: "linear-gradient(135deg, #818CF8, #7C3AED)",
                    iconBg: "rgba(129, 140, 248, 0.1)",
                    highlighted: false,
                  },
                  {
                    id: "pack_m",
                    name: t("subscribe.packMName"),
                    credits: t("subscribe.packMCredits"),
                    price: t("subscribe.packMPrice"),
                    rate: t("subscribe.packMRate"),
                    gradient: "linear-gradient(135deg, #7C3AED, #EC4899)",
                    iconBg: "rgba(124, 58, 237, 0.1)",
                    highlighted: true,
                    badge: t("subscribe.packMBadge"),
                  },
                  {
                    id: "pack_l",
                    name: t("subscribe.packLName"),
                    credits: t("subscribe.packLCredits"),
                    price: t("subscribe.packLPrice"),
                    rate: t("subscribe.packLRate"),
                    gradient: "linear-gradient(135deg, #EC4899, #F97316)",
                    iconBg: "rgba(236, 72, 153, 0.1)",
                    highlighted: false,
                  },
                ].map((pack, i) => (
                  <motion.div
                    key={pack.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.07 }}
                    className="relative rounded-2xl bg-card flex flex-col overflow-hidden"
                    style={{
                      border: pack.highlighted
                        ? "1.5px solid rgba(124, 58, 237, 0.3)"
                        : "1px solid var(--border)",
                      boxShadow: pack.highlighted
                        ? "0 4px 24px rgba(124, 58, 237, 0.12), 0 1px 3px rgba(0,0,0,0.04)"
                        : "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    {/* Badge for best value */}
                    {pack.badge && (
                      <div
                        className="absolute -top-px left-1/2 -translate-x-1/2 px-3 py-1 rounded-b-lg"
                        style={{
                          background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "#FFFFFF",
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                        }}
                      >
                        {pack.badge}
                      </div>
                    )}

                    {/* Top gradient strip */}
                    <div
                      style={{
                        height: 3,
                        background: pack.gradient,
                      }}
                    />

                    <div className={`p-6 flex flex-col items-center text-center flex-1 ${pack.badge ? "pt-8" : ""}`}>
                      {/* Credit count — big and bold */}
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#7C3AED",
                          letterSpacing: "0.02em",
                          textTransform: "uppercase",
                        }}
                      >
                        {pack.name}
                      </span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "var(--muted-foreground)",
                          marginTop: 4,
                        }}
                      >
                        {pack.credits}
                      </span>

                      {/* Price */}
                      <div className="my-4">
                        <span
                          style={{
                            fontSize: "36px",
                            fontWeight: 600,
                            color: "var(--foreground)",
                            letterSpacing: "-0.03em",
                            lineHeight: 1,
                          }}
                        >
                          {pack.price}
                        </span>
                      </div>

                      {/* Rate */}
                      <span
                        className="px-2.5 py-1 rounded-full mb-5"
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "var(--muted-foreground)",
                          background: "var(--secondary)",
                        }}
                      >
                        {pack.rate}
                      </span>

                      {/* CTA button */}
                      <button
                        onClick={() => handleBuyPack(pack.id)}
                        disabled={!!packLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-auto"
                        style={{
                          background: pack.highlighted
                            ? "linear-gradient(135deg, #7C3AED, #EC4899)"
                            : "var(--foreground)",
                          color: "#FFFFFF",
                          fontSize: "13px",
                          fontWeight: 600,
                          boxShadow: pack.highlighted
                            ? "0 4px 12px rgba(124, 58, 237, 0.3)"
                            : "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-1px)";
                          e.currentTarget.style.boxShadow = pack.highlighted
                            ? "0 6px 20px rgba(124, 58, 237, 0.35)"
                            : "0 4px 12px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = pack.highlighted
                            ? "0 4px 12px rgba(124, 58, 237, 0.3)"
                            : "0 2px 8px rgba(0,0,0,0.1)";
                        }}
                      >
                        {packLoading === pack.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            {t("subscribe.redirecting")}
                          </>
                        ) : (
                          <>
                            <Zap size={13} />
                            {t("subscribe.buyPack")}
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

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

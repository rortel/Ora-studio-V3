import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Check, CreditCard, Loader2, Sparkles, XCircle } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { apiUrl } from "../lib/supabase";
import { Button } from "../components/ora/Button";
import { Badge } from "../components/ora/Badge";
import { Surface } from "../components/ora/Surface";
import { bagel, COLORS, type Tone } from "../components/ora/tokens";

type Billing = "monthly" | "yearly";
type PublicPlan = "creator" | "studio" | "agency";

interface PlanDef {
  code: PublicPlan;
  /** Maps to the legacy server code + Stripe dashboard. */
  serverCode: "starter" | "pro" | "business";
  name: string;
  tone: Tone;
  priceMonthly: number;
  priceYearly: number;
  assets: number;
  tagline: string;
  features: string[];
}

const PLANS: Record<PublicPlan, PlanDef> = {
  creator: {
    code: "creator", serverCode: "starter",
    name: "Creator", tone: "warm",
    priceMonthly: 19, priceYearly: 15, assets: 60,
    tagline: "Solo creators shipping brand content weekly.",
    features: [
      "60 assets / month",
      "Images + 5s films + captions",
      "Instagram · LinkedIn · Facebook · TikTok",
      "Publish + schedule — one click to every network",
      "Library + HD downloads (ZIP)",
      "Editor to add logo, text, overlays",
    ],
  },
  studio: {
    code: "studio", serverCode: "pro",
    name: "Studio", tone: "butter",
    priceMonthly: 49, priceYearly: 39, assets: 200,
    tagline: "Brand-locked creative at real production volume.",
    features: [
      "200 assets / month",
      "Brand Vault — palette, tone, photo style, voice",
      "Paste your site URL, Ora extracts your brand",
      "Logo + image bank on every shot",
      "Images, films and captions — every platform",
      "Publish + schedule — one click",
      "Priority generation queue",
    ],
  },
  agency: {
    code: "agency", serverCode: "business",
    name: "Agency", tone: "violet",
    priceMonthly: 199, priceYearly: 159, assets: 1000,
    tagline: "Multi-brand studios and in-house creative teams.",
    features: [
      "1 000 assets / month",
      "Multi-brand Brand Vault (up to 5 brands)",
      "3 team seats",
      "Publish + schedule — one click",
      "API access",
      "White-label ZIP delivery",
      "Priority support",
    ],
  },
};

/** Map any plan string (URL param, legacy profile) → canonical public code. */
function normalizePlan(raw: string | null | undefined): PublicPlan {
  const s = String(raw || "").toLowerCase();
  if (s === "studio"  || s === "pro")      return "studio";
  if (s === "agency"  || s === "business") return "agency";
  return "creator";
}

export function SubscribePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, accessToken, isLoading: authLoading, refreshProfile } = useAuth();

  const urlPlan    = normalizePlan(searchParams.get("plan"));
  const urlBilling = (searchParams.get("billing") as Billing) === "yearly" ? "yearly" : "monthly";

  const [planCode, setPlanCode]       = useState<PublicPlan>(urlPlan);
  const [billing,  setBilling]        = useState<Billing>(urlBilling);
  const [loading,  setLoading]        = useState(false);
  const [error,    setError]          = useState<string>("");
  const [successPlan, setSuccessPlan] = useState<PublicPlan | null>(null);

  // Keep state in sync when URL changes.
  useEffect(() => {
    const next = normalizePlan(searchParams.get("plan"));
    if (searchParams.get("success") !== "true") setPlanCode(next);
  }, [searchParams]);

  // Handle Stripe redirect outcomes.
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessPlan(normalizePlan(searchParams.get("plan")));
      refreshProfile();
    } else if (searchParams.get("canceled") === "true") {
      setError("Payment cancelled. You can try again whenever you're ready.");
    }
  }, [searchParams, refreshProfile]);

  // Gate: require auth.
  useEffect(() => {
    if (!authLoading && !user) navigate("/login?next=" + encodeURIComponent(location.pathname + location.search));
  }, [authLoading, user, navigate]);

  const plan  = PLANS[planCode];
  const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
  const currentServerPlan = normalizePlan(profile?.plan);
  const isCurrent = currentServerPlan === planCode;

  const handleCheckout = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/stripe/create-checkout-session"), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: accessToken, plan: plan.serverCode, billing }),
      });
      const data = await res.json();
      if (data.error) {
        setError(String(data.error));
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Unexpected response from checkout.");
      setLoading(false);
    } catch (err: any) {
      setError(String(err?.message || err));
      setLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/stripe/portal"), {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ _token: accessToken }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch { setLoading(false); }
  };

  // ────────────────────────────────────────────────────────────────
  // Success screen
  // ────────────────────────────────────────────────────────────────
  if (successPlan) {
    const p = PLANS[successPlan];
    return (
      <div style={{ background: COLORS.cream, color: COLORS.ink, minHeight: "100vh" }}>
        <SubscribeHeader />
        <section className="max-w-[880px] mx-auto px-5 md:px-10 pt-24 md:pt-32 pb-20 text-center">
          <Badge tone="coral">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#fff" }} />
            Welcome aboard
          </Badge>
          <motion.h1
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="mt-6 leading-[0.95]"
            style={{ ...bagel, fontSize: "clamp(48px, 8vw, 120px)" }}
          >
            You're <span style={{ color: COLORS.coral }}>{p.name}.</span>
          </motion.h1>
          <p className="mt-5 text-[17px] md:text-[19px]" style={{ color: COLORS.muted, maxWidth: 540, margin: "0 auto" }}>
            {p.assets} assets land in your library every month. Go make your first pack.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link to="/hub/surprise"><Button variant="accent" size="lg"><Sparkles size={18} /> Open Ora <ArrowRight size={16} /></Button></Link>
            <Button variant="ghost" size="md" onClick={handleOpenPortal}>
              <CreditCard size={14} /> Manage billing
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────
  // Checkout confirmation screen
  // ────────────────────────────────────────────────────────────────
  const isLight = plan.tone === "warm" || plan.tone === "butter";
  const checkBg = isLight ? COLORS.ink : "#FFFFFF";
  const checkFg = isLight ? "#FFFFFF" : COLORS.ink;

  return (
    <div style={{ background: COLORS.cream, color: COLORS.ink, minHeight: "100vh" }}>
      <SubscribeHeader />

      <section className="max-w-[900px] mx-auto px-5 md:px-10 pt-20 md:pt-24 pb-10">
        <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-4" style={{ color: COLORS.subtle }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: COLORS.coral }} />
          Checkout
        </div>
        <h1 className="leading-[0.95]" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 96px)" }}>
          Start <span style={{ color: COLORS.coral }}>{plan.name}.</span>
        </h1>
        <p className="mt-4 text-[17px]" style={{ color: COLORS.muted, maxWidth: 560 }}>
          {plan.tagline} Change billing cycle or switch tiers anytime — nothing is locked in.
        </p>
      </section>

      <section className="max-w-[900px] mx-auto px-5 md:px-10 pb-16">
        <Surface tone={plan.tone} pad="lg" radius="2xl" className="md:p-10">
          {/* Head: tier + price */}
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-2" style={{ opacity: 0.75 }}>
                Plan {isCurrent ? "· current" : ""}
              </div>
              <h2 className="leading-none" style={{ ...bagel, fontSize: "clamp(40px, 4.8vw, 64px)" }}>
                {plan.name}
              </h2>
              <p className="mt-3 text-[14.5px]" style={{ opacity: 0.75, maxWidth: 440 }}>
                {plan.assets} assets / month · brand DA locked
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-1 justify-end">
                <span style={{ ...bagel, fontSize: "clamp(40px, 4.8vw, 64px)", lineHeight: 1 }}>€{price}</span>
                <span className="text-[13px]" style={{ opacity: 0.7 }}>/mo</span>
              </div>
              {billing === "yearly" && (
                <div className="text-[11.5px] mt-1" style={{ opacity: 0.7 }}>billed yearly</div>
              )}
              {/* Billing toggle */}
              <div className="mt-3 inline-flex items-center p-1 rounded-full"
                   style={{ background: checkFg, border: `1px solid ${checkBg}20` }}>
                {(["monthly", "yearly"] as Billing[]).map((b) => {
                  const on = billing === b;
                  return (
                    <button
                      key={b}
                      onClick={() => setBilling(b)}
                      className="inline-flex items-center px-3 h-7 rounded-full text-[12px]"
                      style={{
                        background: on ? checkBg : "transparent",
                        color: on ? checkFg : checkBg,
                        fontWeight: 600,
                      }}
                    >
                      {b === "monthly" ? "Monthly" : "Yearly −20%"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Features */}
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-[14px]">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 w-4 h-4 rounded-full mt-[2px] flex items-center justify-center"
                      style={{ background: checkBg, color: checkFg }}>
                  <Check size={10} strokeWidth={3} />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="mt-6 inline-flex items-start gap-2 px-3 py-2 rounded-xl text-[13px]"
                 style={{ background: "rgba(255,255,255,0.95)", color: "#B91C1C" }}>
              <XCircle size={14} className="mt-[2px]" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
            <div className="text-[12.5px]" style={{ opacity: 0.7 }}>
              Secure checkout via Stripe · Cancel anytime
            </div>
            {isCurrent ? (
              <Button variant="ink" size="lg" onClick={handleOpenPortal} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                Manage billing
              </Button>
            ) : (
              <Button variant="accent" size="lg" onClick={handleCheckout} disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Pay €{price}/mo · Start {plan.name}
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </Surface>

        {/* Switch plan */}
        <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
          <div className="text-[13px]" style={{ color: COLORS.muted }}>
            Looking for another tier?
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(PLANS) as PublicPlan[]).filter((p) => p !== planCode).map((p) => (
              <button
                key={p}
                onClick={() => setPlanCode(p)}
                className="inline-flex items-center h-9 px-4 rounded-full text-[13px] hover:bg-black/5"
                style={{ border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.ink, fontWeight: 500 }}
              >
                Switch to {PLANS[p].name} — €{billing === "monthly" ? PLANS[p].priceMonthly : PLANS[p].priceYearly}/mo
              </button>
            ))}
            <Link to="/pricing"
                  className="inline-flex items-center h-9 px-4 rounded-full text-[13px] hover:bg-black/5"
                  style={{ color: COLORS.muted }}>
              See all plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── Minimal header — wordmark only, matches the landing ─── */
function SubscribeHeader() {
  return (
    <header className="px-5 md:px-10 h-14 flex items-center justify-between sticky top-0 z-30"
            style={{ background: `${COLORS.cream}CC`, backdropFilter: "blur(18px) saturate(180%)", borderBottom: `1px solid ${COLORS.line}` }}>
      <Link to="/" className="flex items-center" aria-label="Ora">
        <span className="text-[24px] leading-none" style={bagel}>Ora</span>
      </Link>
      <div className="flex items-center gap-2 text-[13px]" style={{ color: COLORS.muted }}>
        <Link to="/pricing" className="hover:text-black">Pricing</Link>
        <span>·</span>
        <Link to="/hub/surprise" className="hover:text-black">Open app</Link>
      </div>
    </header>
  );
}

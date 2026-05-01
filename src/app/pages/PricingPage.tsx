import { useState, useEffect } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ora/Button";
import { bagel, COLORS } from "../components/ora/tokens";
import { trackEvent } from "../lib/analytics";

type Billing = "monthly" | "yearly";

interface PlanDef {
  code: "creator" | "studio" | "agency";
  name: string;
  priceMonthly: number;
  priceYearly: number;        // per-month when paid yearly
  assets: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
}

const PLANS: PlanDef[] = [
  {
    code: "creator",
    name: "Creator",
priceMonthly: 19,
    priceYearly: 15,
    assets: 60,
    tagline: "You sell things on the side. We post for you.",
    features: [
      "60 posts / month",
      "Images + 5s videos",
      "Captions written for you",
      "Instagram · LinkedIn · Facebook · TikTok",
      "Auto-publish, one click",
      "Logo + text overlay editor",
    ],
  },
  {
    code: "studio",
    name: "Studio",
priceMonthly: 49,
    priceYearly: 39,
    assets: 200,
    tagline: "You sell things every day. We keep up.",
    highlight: true,
    features: [
      "200 posts / month",
      "Brand Vault — palette, tone, voice, photo style",
      "Paste your URL, we read your brand",
      "Logo baked into every post",
      "Auto-publish, one click",
      "Priority queue",
    ],
  },
  {
    code: "agency",
    name: "Agency",
priceMonthly: 199,
    priceYearly: 159,
    assets: 1000,
    tagline: "You sell things for other people. We scale.",
    features: [
      "1 000 posts / month",
      "Up to 5 brands in one account",
      "3 team seats",
      "Auto-publish, one click",
      "API access",
      "Priority support",
    ],
  },
];

export function PricingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");

  // Funnel signal: someone reached the pricing page. Combined with
  // the auto page_view, this lets the dashboard distinguish "just
  // landed on /pricing" from "actually engaged with billing toggle".
  useEffect(() => {
    trackEvent("pricing_view", { authed: !!user });
  }, [user]);

  return (
    <div style={{ background: COLORS.cream, color: COLORS.ink }}>
      {/* ═══ Hero ═══ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-10 pt-24 md:pt-32 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mono-label mb-6 flex items-center justify-center gap-2"
          style={{ color: COLORS.muted }}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
          <span>One price per brand · all platforms included</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="leading-[0.95] mb-6"
          style={{ ...bagel, fontSize: "clamp(56px, 9vw, 128px)" }}
        >
          Pricing, <span style={{ color: COLORS.coral }}>simple.</span>
        </motion.h1>

        <p className="max-w-[540px] mx-auto text-[17px] md:text-[19px]" style={{ color: COLORS.muted }}>
          One click. Full pack. Every platform. Pick the volume that matches
          your output — every plan ships direct to every network.
        </p>

        {/* Billing toggle */}
        <div className="mt-10 inline-flex items-center p-1 rounded-full" style={{ background: "#FFFFFF", border: `1px solid ${COLORS.line}` }}>
          {(["monthly", "yearly"] as Billing[]).map((b) => {
            const on = billing === b;
            return (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] transition"
                style={{
                  background: on ? COLORS.ink : "transparent",
                  color: on ? "#FFFFFF" : COLORS.ink,
                  fontWeight: 600,
                }}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && <span className="text-[10.5px] opacity-70">−20%</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ Plans ═══ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p, i) => (
            <PlanCard
              key={p.code}
              plan={p}
              billing={billing}
              authed={!!user}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* ═══ Comparator — 3 cols hairline-divided ═══ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-10 pb-24 border-t" style={{ borderColor: COLORS.line }}>
        <div className="mono-label pt-16 mb-10 flex items-center gap-2" style={{ color: COLORS.muted }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
          What differs
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {[
            { title: "Brand Vault", body: "Studio and Agency learn your colours, your tone, your voice. Every post comes back on-brand. Creator works from a one-line brief." },
            { title: "What you get", body: "60 / 200 / 1 000 posts a month, ready to publish. Image or 5s video, captions written, sized for every platform." },
            { title: "Team & API",  body: "Agency unlocks 3 seats, up to 5 brands in one account, and API access. Every plan posts straight to Instagram, LinkedIn, Facebook, TikTok." },
          ].map((c, i) => (
            <div
              key={c.title}
              className={`py-8 md:py-10 ${i > 0 ? "md:pl-8 md:border-l" : ""} ${i < 2 ? "md:pr-8" : ""}`}
              style={{ borderColor: COLORS.line }}
            >
              <h4 className="leading-none mb-4" style={{ ...bagel, fontSize: "clamp(28px, 3vw, 40px)" }}>
                {c.title}
              </h4>
              <p className="body-tight text-[15px] leading-relaxed" style={{ color: COLORS.muted }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Final CTA — open, cream, aligned left (no ink box) ═══ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-10 py-24 border-t" style={{ borderColor: COLORS.line }}>
        <div className="mono-label mb-5 flex items-center gap-2" style={{ color: COLORS.muted }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
          Ready?
        </div>
        <h2 className="leading-[0.92] max-w-[14ch] mb-8" style={{ ...bagel, fontSize: "clamp(56px, 9vw, 140px)" }}>
          Start with <span style={{ color: COLORS.coral }}>Studio.</span>
        </h2>
        <p className="body-tight text-[17px] md:text-[19px] max-w-xl mb-10" style={{ color: COLORS.muted }}>
          If you're serious about your brand, Studio is the tier most teams
          land on. Swap plans anytime.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Link to={user ? "/subscribe?plan=studio" : "/login?next=/subscribe?plan=studio"} onClick={() => trackEvent("pricing_plan_clicked", { plan: "studio", authed: !!user })}>
            <Button variant="accent" size="lg">
              Get Studio — €49/mo <ArrowRight size={16} />
            </Button>
          </Link>
          <span className="mono-label" style={{ color: COLORS.subtle }}>
            Cancel anytime · no setup fees
          </span>
        </div>
      </section>
    </div>
  );
}

/* Plan card — white surface, hairline border, coral outline on the
 * highlight tier. Mirrors the PricingPanel on the landing so visitors
 * see the same design language whether they scroll on `/` or navigate
 * to `/pricing`. */
function PlanCard({ plan, billing, authed, index }: { plan: PlanDef; billing: Billing; authed: boolean; index: number }) {
  const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
  const href = authed
    ? `/subscribe?plan=${plan.code}&billing=${billing}`
    : `/login?next=/subscribe?plan=${plan.code}&billing=${billing}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl p-8 md:p-10 flex flex-col h-full"
      style={{
        background: "#FFFFFF",
        border: plan.highlight ? `1px solid ${COLORS.coral}` : `1px solid ${COLORS.line}`,
        boxShadow: plan.highlight ? "0 30px 80px -30px rgba(255,92,57,0.25)" : "0 1px 2px rgba(17,17,17,0.03)",
      }}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-8 mono-label px-3 py-1 rounded-full" style={{ background: COLORS.coral, color: "#FFFFFF" }}>
          Most picked
        </div>
      )}

      {/* Head */}
      <div className="mono-label mb-3" style={{ color: plan.highlight ? COLORS.coral : COLORS.muted }}>
        {plan.name}
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="tabular-nums" style={{ ...bagel, fontSize: "clamp(56px, 6vw, 84px)", lineHeight: 1, color: COLORS.ink }}>€{price}</span>
        <span className="mono-label" style={{ color: COLORS.muted }}>/ month</span>
      </div>
      {billing === "yearly" && (
        <div className="mono-label mb-2" style={{ color: COLORS.subtle }}>billed yearly</div>
      )}
      <p className="body-tight text-[14px] leading-relaxed mb-5" style={{ color: COLORS.muted }}>
        {plan.tagline}
      </p>
      <div className="mono-label mb-6 flex items-center gap-2 tabular-nums" style={{ color: COLORS.ink }}>
        <span className="text-[14px]" style={{ fontWeight: 700, letterSpacing: 0, textTransform: "none" }}>{plan.assets}</span>
        <span style={{ color: COLORS.muted }}>posts / month</span>
      </div>

      {/* Features */}
      <ul className="body-tight text-[14px] space-y-2.5 mb-8 flex-1" style={{ color: COLORS.ink }}>
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mono-data mt-0.5" style={{ color: COLORS.coral, fontSize: 12 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link to={href} onClick={() => trackEvent("pricing_plan_clicked", { plan: plan.code, billing, authed })}>
        <Button
          variant={plan.highlight ? "accent" : "ink"}
          size="lg"
          className="w-full justify-center"
        >
          Start {plan.name} <ArrowRight size={16} />
        </Button>
      </Link>
    </motion.div>
  );
}


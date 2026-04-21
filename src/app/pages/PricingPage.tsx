import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { Button } from "../components/ora/Button";
import { Badge } from "../components/ora/Badge";
import { Surface } from "../components/ora/Surface";
import { bagel, COLORS, type Tone } from "../components/ora/tokens";

type Billing = "monthly" | "yearly";

interface PlanDef {
  code: "creator" | "studio" | "agency";
  name: string;
  tone: Tone;
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
    tone: "warm",
    priceMonthly: 19,
    priceYearly: 15,
    assets: 60,
    tagline: "Solo creators shipping brand content weekly.",
    features: [
      "60 assets / month",
      "Images + 5s films",
      "AI-written captions per platform",
      "Instagram · LinkedIn · Facebook · TikTok",
      "Publish + schedule — one click to every network",
      "Library + HD downloads (ZIP)",
      "Editor to add logo, text, overlays",
    ],
  },
  {
    code: "studio",
    name: "Studio",
    tone: "butter",
    priceMonthly: 49,
    priceYearly: 39,
    assets: 200,
    tagline: "Brand-locked creative at real production volume.",
    highlight: true,
    features: [
      "200 assets / month",
      "Brand Vault — palette, tone, photo style, audience, voice",
      "Paste your site URL, Ora extracts your brand",
      "Logo + image bank baked into every shot",
      "Every film + image, every platform",
      "Publish + schedule — one click to every network",
      "Priority generation queue",
    ],
  },
  {
    code: "agency",
    name: "Agency",
    tone: "violet",
    priceMonthly: 199,
    priceYearly: 159,
    assets: 1000,
    tagline: "Multi-brand studios and in-house creative teams.",
    features: [
      "1 000 assets / month",
      "Multi-brand Brand Vault (up to 5 brands)",
      "3 team seats",
      "Publish + schedule — one click to every network",
      "API access",
      "White-label ZIP delivery",
      "Priority support",
    ],
  },
];

export function PricingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div style={{ background: COLORS.cream, color: COLORS.ink }}>
      {/* ═══ Hero ═══ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-10 pt-24 md:pt-32 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex mb-7"
        >
          <Badge tone="cream">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: COLORS.coral }} />
            one price per brand · all platforms included
          </Badge>
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

      {/* ═══ Comparator — tiny, editorial, no checkmarks blob ═══ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-10 pb-24">
        <div className="text-[13px] uppercase tracking-[0.18em] mb-6 text-center" style={{ color: COLORS.subtle, fontWeight: 600 }}>
          What differs
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Comparator
            title="Brand Vault"
            body="Studio and Agency lock your palette, tone, photo style, voice and image bank into every shot. Creator works from a text brief."
            tone="butter"
          />
          <Comparator
            title="Volume"
            body="60 / 200 / 1 000 assets a month. Each asset = one image + its paired 5s film when you pick the film pipeline."
            tone="warm"
          />
          <Comparator
            title="Team & API"
            body="Agency unlocks 3 seats, multi-brand vaults (×5) and API access for automation. Every plan ships direct to Instagram, LinkedIn, Facebook and TikTok."
            tone="violet"
          />
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="max-w-[1200px] mx-auto px-5 md:px-10 pb-24">
        <Surface tone="ink" pad="lg" radius="2xl" className="md:p-16 text-center">
          <div className="text-[13px] mb-4" style={{ color: "rgba(255,255,255,0.55)" }}>Ready?</div>
          <h2 className="leading-[0.95] mb-6" style={{ ...bagel, fontSize: "clamp(44px, 7vw, 104px)" }}>
            Start with <span style={{ color: COLORS.butter }}>Studio.</span>
          </h2>
          <p className="text-[16px] md:text-[18px] max-w-xl mx-auto mb-8" style={{ color: "rgba(255,255,255,0.72)" }}>
            If you're serious about your brand, Studio is the tier most teams
            land on. Swap plans anytime.
          </p>
          <Link to={user ? "/subscribe?plan=studio" : "/login?next=/subscribe?plan=studio"}>
            <Button variant="accent" size="lg">
              Get Studio — €49/mo <ArrowRight size={16} />
            </Button>
          </Link>
          <div className="text-[13px] mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>
            Cancel anytime · No setup fees
          </div>
        </Surface>
      </section>
    </div>
  );
}

/* ═══ Plan card — Surface-based, tone per tier ═══ */
function PlanCard({ plan, billing, authed, index }: { plan: PlanDef; billing: Billing; authed: boolean; index: number }) {
  const price = billing === "monthly" ? plan.priceMonthly : plan.priceYearly;
  const href = authed
    ? `/subscribe?plan=${plan.code}&billing=${billing}`
    : `/login?next=/subscribe?plan=${plan.code}&billing=${billing}`;
  const isLight = plan.tone === "warm" || plan.tone === "butter";
  const mutedOnTone = isLight ? "rgba(17,17,17,0.65)" : "rgba(255,255,255,0.72)";
  const checkBg = isLight ? COLORS.ink : "#FFFFFF";
  const checkFg = isLight ? "#FFFFFF" : COLORS.ink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="relative"
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge tone="coral">Most teams pick this</Badge>
        </div>
      )}
      <Surface tone={plan.tone} pad="lg" radius="2xl" className="md:p-10 h-full flex flex-col">
        {/* Head */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] mb-2" style={{ opacity: 0.75 }}>
              Plan
            </div>
            <h3 className="leading-none" style={{ ...bagel, fontSize: "clamp(36px, 4.2vw, 56px)" }}>
              {plan.name}
            </h3>
          </div>
          <div className="text-right">
            <div className="flex items-baseline gap-1">
              <span style={{ ...bagel, fontSize: "clamp(36px, 4.2vw, 56px)", lineHeight: 1 }}>€{price}</span>
              <span className="text-[13px]" style={{ opacity: 0.7 }}>/mo</span>
            </div>
            {billing === "yearly" && (
              <div className="text-[11.5px] mt-1" style={{ opacity: 0.7 }}>billed yearly</div>
            )}
          </div>
        </div>

        <p className="text-[15px] leading-relaxed mb-5" style={{ color: mutedOnTone }}>
          {plan.tagline}
        </p>

        <div className="flex items-baseline gap-1 mb-6">
          <span style={{ ...bagel, fontSize: "clamp(28px, 3.2vw, 42px)", lineHeight: 1 }}>{plan.assets}</span>
          <span className="text-[13.5px]" style={{ opacity: 0.7 }}>assets / month</span>
        </div>

        {/* Features */}
        <ul className="flex flex-col gap-2.5 text-[14px] mb-8">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="shrink-0 w-4 h-4 rounded-full mt-[2px] flex items-center justify-center"
                style={{ background: checkBg, color: checkFg }}
              >
                <Check size={10} strokeWidth={3} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto">
          <Link to={href}>
            <Button
              variant={plan.highlight ? "accent" : isLight ? "ink" : "cream"}
              size="lg"
              className="w-full justify-center"
            >
              Start {plan.name} <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </Surface>
    </motion.div>
  );
}

/* ═══ Small differentiator block — NOT a card, just tinted surface with copy ═══ */
function Comparator({ title, body, tone }: { title: string; body: string; tone: Tone }) {
  return (
    <Surface tone={tone} pad="lg" radius="2xl" className="md:p-8">
      <h4 className="leading-none mb-3" style={{ ...bagel, fontSize: "clamp(26px, 3vw, 36px)" }}>
        {title}
      </h4>
      <p className="text-[14.5px] leading-relaxed" style={{ opacity: 0.8 }}>
        {body}
      </p>
    </Surface>
  );
}

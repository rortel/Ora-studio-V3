import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";

/* ═══════════════════════════════════════════════════════════
   PRICING — 4 tiers: Scan (free) / Creator €19 / Pro €49 / Agency €199
   ═══════════════════════════════════════════════════════════ */

const BLUE = "#1D4ED8";
const BLACK = "#0A0A0A";

type Billing = "monthly" | "yearly";

export function PricingPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";
  const [billing, setBilling] = useState<Billing>("monthly");

  const plans = buildPlans(isFr, billing);

  return (
    <div style={{ background: "#FFFFFF", color: BLACK }}>
      {/* HEADER */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontSize: "clamp(2.25rem, 4.5vw, 3.75rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
          className="mb-5"
        >
          {isFr ? "Des prix simples.\nDes engagements simples." : "Simple pricing.\nSimple terms."}
        </motion.h1>
        <p
          className="max-w-xl mx-auto mb-8"
          style={{ fontSize: "1.1rem", color: "#52525B", lineHeight: 1.5 }}
        >
          {isFr
            ? "Commence gratuit. Passe à un plan payant quand tu veux. Annule à tout moment."
            : "Start free. Upgrade when you're ready. Cancel anytime."}
        </p>

        {/* Billing toggle */}
        <div
          className="inline-flex items-center p-1 rounded-full"
          style={{ background: "#F4F4F5" }}
        >
          {[
            { k: "monthly" as Billing, label: isFr ? "Mensuel" : "Monthly" },
            { k: "yearly" as Billing, label: isFr ? "Annuel" : "Yearly", badge: "−20%" },
          ].map((opt) => (
            <button
              key={opt.k}
              onClick={() => setBilling(opt.k)}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2"
              style={{
                background: billing === opt.k ? "#FFFFFF" : "transparent",
                color: billing === opt.k ? BLACK : "#71717A",
                boxShadow: billing === opt.k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {opt.label}
              {opt.badge && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: billing === opt.k ? "#DCFCE7" : "#E4E4E7", color: "#15803D" }}
                >
                  {opt.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="relative p-7 rounded-3xl flex flex-col"
              style={{
                background: p.highlight ? BLACK : "#FFFFFF",
                color: p.highlight ? "#FFFFFF" : BLACK,
                border: p.highlight ? "none" : "1px solid #E4E4E7",
                boxShadow: p.highlight ? "0 20px 40px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {p.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: BLUE, color: "#FFFFFF" }}
                >
                  {p.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                <p className="text-sm" style={{ color: p.highlight ? "#A1A1AA" : "#71717A" }}>
                  {p.sub}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-black tracking-tight">{p.price}</span>
                  {p.suffix && (
                    <span
                      className="text-sm"
                      style={{ color: p.highlight ? "#A1A1AA" : "#71717A" }}
                    >
                      {p.suffix}
                    </span>
                  )}
                </div>
                {p.priceNote && (
                  <p className="text-xs mt-1" style={{ color: p.highlight ? "#A1A1AA" : "#71717A" }}>
                    {p.priceNote}
                  </p>
                )}
              </div>

              <Link
                to={p.ctaHref}
                className="block text-center py-3 rounded-full text-sm font-semibold mb-6 transition-opacity hover:opacity-90"
                style={{
                  background: p.highlight ? "#FFFFFF" : p.id === "scan" ? "#F4F4F5" : BLUE,
                  color: p.highlight ? BLACK : p.id === "scan" ? BLACK : "#FFFFFF",
                }}
              >
                {p.cta}
              </Link>

              <ul className="space-y-2.5 text-sm flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      size={15}
                      style={{ color: p.highlight ? "#FFFFFF" : BLUE }}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Tiny disclaimer */}
        <p className="text-center text-xs mt-10" style={{ color: "#71717A" }}>
          {isFr
            ? "Prix HT. TVA appliquée selon pays. Paiement par carte, annulation à tout moment."
            : "Excl. VAT. Card payment. Cancel anytime."}
        </p>
      </section>

      {/* COMPARE TABLE */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-16">
        <h2
          className="text-center mb-10"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          {isFr ? "Comparer les fonctionnalités" : "Compare features"}
        </h2>

        <div className="overflow-x-auto -mx-5 md:mx-0">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "#71717A" }}>
                <th className="py-3 pl-5 md:pl-0 font-semibold"></th>
                {plans.map((p) => (
                  <th key={p.id} className="py-3 px-4 text-center font-bold" style={{ color: BLACK }}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {buildCompareRows(isFr).map((row, i) => (
                <tr key={i} className="border-t" style={{ borderColor: "#E4E4E7" }}>
                  <td className="py-3.5 pl-5 md:pl-0 font-medium">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className="py-3.5 px-4 text-center" style={{ color: v === "—" ? "#A1A1AA" : BLACK }}>
                      {v === true ? <Check size={16} style={{ color: BLUE, margin: "0 auto" }} /> : v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <h2
          className="text-center mb-10"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          {isFr ? "Questions sur les offres" : "Pricing FAQ"}
        </h2>
        <div className="space-y-2">
          {(isFr
            ? [
                { q: "Que se passe-t-il après mes 5 scans gratuits ?", a: "Tu peux attendre le mois suivant (compteur mensuel) ou passer au plan Creator pour scanner en illimité." },
                { q: "Puis-je changer de plan à tout moment ?", a: "Oui. Upgrade/downgrade immédiat, prorata automatique." },
                { q: "Le plan annuel, c'est vraiment −20 % ?", a: "Oui, 10 mois facturés au lieu de 12. Remboursable au prorata si tu arrêtes." },
                { q: "Vous faites des tarifs entreprise ?", a: "Pour les équipes de +5 personnes ou les besoins custom (SSO, audit log signé, SLA), contacte-nous via la page À propos." },
                { q: "Les scans sont-ils vraiment illimités sur Creator ?", a: "Oui — pas de quota caché. Fair use : on coupe si on détecte un bot ou usage abusif (>1000/jour)." },
              ]
            : [
                { q: "What happens after my 5 free scans?", a: "Wait until next month (monthly counter) or upgrade to Creator for unlimited scans." },
                { q: "Can I change plans anytime?", a: "Yes. Immediate upgrade/downgrade, automatic proration." },
                { q: "Is the yearly plan really −20%?", a: "Yes — 10 months billed instead of 12. Prorated refund if you cancel." },
                { q: "Do you offer enterprise pricing?", a: "For teams >5 or custom needs (SSO, signed audit log, SLA), contact us via the About page." },
                { q: "Are scans really unlimited on Creator?", a: "Yes — no hidden quota. Fair use: we throttle bots and abusive usage (>1000/day)." },
              ]
          ).map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <div
          className="rounded-3xl p-10 md:p-14 text-center"
          style={{ background: "#F4F4F5" }}
        >
          <h2
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}
            className="mb-3"
          >
            {isFr ? "Pas sûr du bon plan ?" : "Not sure which plan?"}
          </h2>
          <p className="mb-6 text-base" style={{ color: "#52525B" }}>
            {isFr ? "Commence en gratuit, tu ajustes plus tard." : "Start free, adjust later."}
          </p>
          <Link
            to={user ? "/hub/analyze" : "/login"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all hover:opacity-90"
            style={{ background: BLACK, color: "#FFFFFF" }}
          >
            {isFr ? "Scanner gratuitement" : "Scan for free"} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
}

/* ─── Plans config ─── */
interface Plan {
  id: "scan" | "creator" | "pro" | "agency";
  name: string;
  sub: string;
  price: string;
  suffix?: string;
  priceNote?: string;
  badge?: string;
  highlight?: boolean;
  cta: string;
  ctaHref: string;
  features: string[];
}

function buildPlans(isFr: boolean, billing: Billing): Plan[] {
  const priceYearly = (monthly: number) => Math.round(monthly * 0.8); // −20%
  const m = (n: number) => (billing === "yearly" ? priceYearly(n) : n);
  const suffix = isFr ? (billing === "yearly" ? "/mois, facturé annuellement" : "/mois") : billing === "yearly" ? "/mo, billed yearly" : "/mo";

  return [
    {
      id: "scan",
      name: "Scan",
      sub: isFr ? "Pour tester" : "To test it out",
      price: "€0",
      cta: isFr ? "Commencer" : "Start",
      ctaHref: "/login",
      features: isFr
        ? [
            "5 scans / mois",
            "Verdict (publier / retoucher / bloquer)",
            "Conseil principal",
            "Pas de compte requis",
          ]
        : [
            "5 scans / month",
            "Verdict (publish / revise / block)",
            "Top recommendation",
            "No account required",
          ],
    },
    {
      id: "creator",
      name: "Creator",
      sub: isFr ? "Freelances & créateurs" : "Freelancers & creators",
      price: `€${m(19)}`,
      suffix,
      badge: isFr ? "Populaire" : "Popular",
      highlight: true,
      cta: isFr ? "Choisir Creator" : "Choose Creator",
      ctaHref: "/subscribe?plan=creator",
      features: isFr
        ? [
            "Scans illimités",
            "Régénération 1-clic",
            "Toutes les recommandations",
            "Historique 30 jours",
            "Export PDF basique",
          ]
        : [
            "Unlimited scans",
            "One-click regeneration",
            "All recommendations",
            "30-day history",
            "Basic PDF export",
          ],
    },
    {
      id: "pro",
      name: "Pro",
      sub: isFr ? "Créateurs de contenu pro" : "Pro content teams",
      price: `€${m(49)}`,
      suffix,
      cta: isFr ? "Choisir Pro" : "Choose Pro",
      ctaHref: "/subscribe?plan=pro",
      features: isFr
        ? [
            "Tout Creator, plus :",
            "Brand Vault complet (logo, palette, ton)",
            "Briefs & objectifs par scan",
            "Rapports PDF brandés",
            "Historique illimité",
            "Priorité sur les régénérations",
          ]
        : [
            "Everything in Creator, plus:",
            "Full Brand Vault (logo, palette, tone)",
            "Briefs & objectives per scan",
            "Branded PDF reports",
            "Unlimited history",
            "Priority regeneration queue",
          ],
    },
    {
      id: "agency",
      name: "Agency",
      sub: isFr ? "Agences & équipes" : "Agencies & teams",
      price: `€${m(199)}`,
      suffix,
      cta: isFr ? "Choisir Agency" : "Choose Agency",
      ctaHref: "/subscribe?plan=agency",
      features: isFr
        ? [
            "Tout Pro, plus :",
            "Multi-clients & multi-vaults",
            "5 sièges équipe inclus",
            "Audit log horodaté",
            "Export batch & API",
            "Support prioritaire",
          ]
        : [
            "Everything in Pro, plus:",
            "Multi-client & multi-vault",
            "5 team seats included",
            "Timestamped audit log",
            "Batch export & API",
            "Priority support",
          ],
    },
  ];
}

function buildCompareRows(isFr: boolean): { label: string; values: (string | boolean)[] }[] {
  return [
    { label: isFr ? "Scans / mois" : "Scans / month", values: ["5", isFr ? "Illimité" : "Unlimited", isFr ? "Illimité" : "Unlimited", isFr ? "Illimité" : "Unlimited"] },
    { label: isFr ? "Verdict 3 KPIs" : "3-KPI verdict", values: [true, true, true, true] },
    { label: isFr ? "Régénération 1-clic" : "One-click regeneration", values: ["—", true, true, true] },
    { label: isFr ? "Historique" : "History", values: ["—", "30j", "∞", "∞"] },
    { label: "Brand Vault", values: ["—", "—", true, true] },
    { label: isFr ? "Briefs & objectifs" : "Briefs & objectives", values: ["—", "—", true, true] },
    { label: isFr ? "Rapports PDF" : "PDF reports", values: ["—", isFr ? "Basique" : "Basic", isFr ? "Brandés" : "Branded", isFr ? "Brandés" : "Branded"] },
    { label: isFr ? "Multi-clients" : "Multi-client", values: ["—", "—", "—", true] },
    { label: isFr ? "Sièges équipe" : "Team seats", values: ["1", "1", "1", "5"] },
    { label: isFr ? "Audit log" : "Audit log", values: ["—", "—", "—", true] },
    { label: "API", values: ["—", "—", "—", true] },
  ];
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl"
      style={{ background: open ? "#FAFAFA" : "#FFFFFF", border: "1px solid #E4E4E7" }}
    >
      <button
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-sm md:text-base">{q}</span>
        <ChevronDown
          size={18}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "#52525B" }}>
          {a}
        </div>
      )}
    </div>
  );
}

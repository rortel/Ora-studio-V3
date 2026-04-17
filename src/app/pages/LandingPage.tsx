import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Shield, Palette, Sparkles, ArrowRight, Check, Upload,
  Eye, RefreshCw, ChevronDown,
} from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";

const BLUE = "#1D4ED8";
const BLACK = "#0A0A0A";

/**
 * Coherent visual theme: high-end fashion/beauty portraits.
 * All images from Unsplash (known-stable IDs). Each <img> has a gradient
 * fallback via onError so a broken URL never shows a broken icon.
 */
const HERO_IMG = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1000&h=1250&fit=crop&q=90";

const GALLERY: { img: string; verdict: "safe" | "revise" | "block"; score: number; tag: string }[] = [
  { img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1200&h=900&fit=crop&q=90",  verdict: "safe",   score: 91, tag: "Campagne beauté" },
  { img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&h=1100&fit=crop&q=90",  verdict: "revise", score: 68, tag: "Portrait studio" },
  { img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&h=1100&fit=crop&q=90",  verdict: "safe",   score: 86, tag: "Éditorial mode" },
  { img: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&h=1100&fit=crop&q=90",  verdict: "safe",   score: 88, tag: "Lookbook" },
  { img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=1100&fit=crop&q=90",  verdict: "revise", score: 72, tag: "Portrait brand" },
  { img: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=800&h=1100&fit=crop&q=90",  verdict: "block",  score: 42, tag: "Logo visible" },
];

// Same image for before/after — filter applied to BEFORE simulates AI artefacts.
const BEFORE_AFTER_IMG = "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900&h=1100&fit=crop&q=90";

/** Inline SVG gradient fallback — used by onError to guarantee no broken images. */
function fallbackDataUri(seed: number): string {
  const hues = [220, 210, 200, 230, 240, 250];
  const h = hues[seed % hues.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='hsl(${h}, 40%, 88%)'/>
        <stop offset='100%' stop-color='hsl(${h}, 35%, 65%)'/>
      </linearGradient>
    </defs>
    <rect width='800' height='1000' fill='url(#g)'/>
    <circle cx='400' cy='400' r='180' fill='hsl(${h}, 30%, 50%)' opacity='0.35'/>
    <rect x='250' y='580' width='300' height='320' rx='150' fill='hsl(${h}, 30%, 45%)' opacity='0.45'/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function handleImgError(seed: number) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.fallback === "1") return;
    img.dataset.fallback = "1";
    img.src = fallbackDataUri(seed);
  };
}

function verdictColor(v: "safe" | "revise" | "block") {
  if (v === "safe") return { bg: "#DCFCE7", fg: "#15803D", label: { fr: "Publier", en: "Publish" } };
  if (v === "block") return { bg: "#FEE2E2", fg: "#B91C1C", label: { fr: "Bloquer", en: "Block" } };
  return { bg: "#FEF3C7", fg: "#C2410C", label: { fr: "Retoucher", en: "Revise" } };
}

export function LandingPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";

  return (
    <div style={{ background: "#FFFFFF", color: BLACK }}>
      {/* ─── HERO ─── */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ background: "#EFF6FF", color: BLUE }}>
              <OraLogo size={16} variant="mark" animate={false} color={BLUE} />
              {isFr ? "Audit · Marque · Risques" : "Audit · Brand · Risks"}
            </div>
            <h1 className="mb-6 whitespace-pre-line" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.035em" }}>
              {isFr ? "Tes visuels IA,\npublie-les\nsans stress." : "Your AI visuals,\npublished\nwith confidence."}
            </h1>
            <p className="mb-8 max-w-lg" style={{ fontSize: "clamp(1.05rem, 1.5vw, 1.25rem)", lineHeight: 1.5, color: "#52525B" }}>
              {isFr
                ? "Dépose un visuel IA. Ora l'audite, repère les risques légaux, note la cohérence avec ta marque, juge le créatif. Verdict clair, prompt optimisé, régénération en un clic."
                : "Drop an AI visual. Ora audits it, flags legal risks, scores brand fit, judges the creative. Clear verdict, optimized prompt, one-click regeneration."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={user ? "/hub/analyze" : "/login"} className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-semibold hover:opacity-90 transition-all" style={{ background: BLUE, color: "#FFFFFF" }}>
                {isFr ? "Scanner un visuel" : "Scan a visual"} <ArrowRight size={16} />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full text-sm font-semibold" style={{ background: "#F4F4F5", color: BLACK }}>
                {isFr ? "Voir les offres" : "See pricing"}
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs" style={{ color: "#71717A" }}>
              <span className="flex items-center gap-1.5"><Check size={13} style={{ color: "#15803D" }} /> {isFr ? "5 scans gratuits" : "5 free scans"}</span>
              <span className="flex items-center gap-1.5"><Check size={13} style={{ color: "#15803D" }} /> {isFr ? "Sans carte" : "No card"}</span>
              <span className="flex items-center gap-1.5"><Check size={13} style={{ color: "#15803D" }} /> {isFr ? "En 30 secondes" : "30 seconds"}</span>
            </div>
          </motion.div>

          {/* Big visual showcase in hero */}
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.15 }} className="relative">
            <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: "4 / 5", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.25)" }}>
              <img src={HERO_IMG} alt="" className="w-full h-full object-cover" onError={handleImgError(0)} />
              {/* Score overlay top */}
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="absolute top-5 left-5 right-5 flex items-center justify-between">
                <div className="px-3 py-2 rounded-full flex items-center gap-2" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}>
                  <OraLogo size={20} variant="mark" animate={false} color={BLACK} />
                  <span className="text-xs font-bold">Ora</span>
                </div>
                <div className="px-3 py-2 rounded-full flex items-center gap-2" style={{ background: "#DCFCE7", color: "#15803D" }}>
                  <Check size={14} />
                  <span className="text-xs font-bold">{isFr ? "Publier" : "Publish"}</span>
                </div>
              </motion.div>
              {/* KPI overlay bottom */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="absolute left-5 right-5 bottom-5 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(14px)" }}>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#71717A" }}>{isFr ? "Score global" : "Overall"}</span>
                  <span className="text-3xl font-black" style={{ color: "#15803D" }}>89<span className="text-sm" style={{ color: "#71717A" }}>/100</span></span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: isFr ? "Risques" : "Legal", score: 95, color: "#15803D" },
                    { label: isFr ? "Marque" : "Brand", score: 84, color: "#1D4ED8" },
                    { label: isFr ? "Créatif" : "Creative", score: 88, color: "#15803D" },
                  ].map((k) => (
                    <div key={k.label}>
                      <div className="text-[10px] font-medium mb-1" style={{ color: "#71717A" }}>{k.label}</div>
                      <div className="text-lg font-bold" style={{ color: k.color }}>{k.score}</div>
                      <div className="h-1 rounded-full mt-1" style={{ background: "#F4F4F5" }}>
                        <div className="h-full rounded-full" style={{ width: `${k.score}%`, background: k.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
            {/* Floating mascot peek */}
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2 }} className="absolute -bottom-8 -left-8 hidden md:block">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "#FFFFFF", boxShadow: "0 10px 30px rgba(0,0,0,0.12)" }}>
                <OraLogo size={80} variant="mascot" animate={true} color={BLACK} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── GALLERY — editorial full-bleed ─── */}
      <section style={{ background: "#0A0A0A", color: "#FFFFFF" }}>
        {/* Intro */}
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="grid md:grid-cols-[1fr_auto] gap-5 items-end mb-10 md:mb-16">
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: "#60A5FA" }}>{isFr ? "Exemples d'audits" : "Real audits"}</p>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {isFr ? "Des visuels." : "Visuals."}<br />
                <span style={{ color: "#71717A" }}>{isFr ? "Des verdicts." : "Verdicts."}</span>
              </h2>
            </div>
            <p className="max-w-xs text-base md:text-right" style={{ color: "#A1A1AA" }}>
              {isFr
                ? "Pour chaque visuel IA : trois scores, un verdict, des conseils actionnables."
                : "For each AI visual: three scores, a verdict, actionable advice."}
            </p>
          </div>
        </div>

        {/* Full-bleed editorial grid: 1 big + 2 medium + 3 tall, full width */}
        <div className="grid grid-cols-6 gap-1 md:gap-2">
          {GALLERY.map((g, i) => {
            const v = verdictColor(g.verdict);
            // Layout: big first, then 2 square-ish, then 3 tall. Responsive.
            const spans = [
              "col-span-6 md:col-span-4 md:row-span-2",   // hero image
              "col-span-3 md:col-span-2",
              "col-span-3 md:col-span-2",
              "col-span-2",
              "col-span-2",
              "col-span-2",
            ];
            const aspects = [
              "aspect-[16/10] md:aspect-[16/11]",
              "aspect-square md:aspect-[5/4]",
              "aspect-square md:aspect-[5/4]",
              "aspect-[3/4]",
              "aspect-[3/4]",
              "aspect-[3/4]",
            ];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className={`relative overflow-hidden group ${spans[i]} ${aspects[i]}`}
                style={{ background: "#1A1A1A" }}
              >
                <img
                  src={g.img}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onError={handleImgError(i + 1)}
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 40%, transparent 60%)" }} />
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5" style={{ background: v.bg, color: v.fg }}>
                  {g.verdict === "safe" && <Check size={11} />}
                  {isFr ? v.label.fr : v.label.en}
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                  <span className="text-xs md:text-sm font-medium opacity-90">{g.tag}</span>
                  <span className="text-3xl md:text-5xl font-black leading-none tracking-tight">{g.score}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="max-w-7xl mx-auto px-5 md:px-8 py-16 text-center">
          <Link to={user ? "/hub/analyze" : "/login"} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold" style={{ background: "#FFFFFF", color: BLACK }}>
            {isFr ? "Scanner mon premier visuel" : "Scan my first visual"} <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ─── BEFORE / AFTER REGEN ─── */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold mb-2" style={{ color: BLUE }}>{isFr ? "Régénération 1-clic" : "One-click regeneration"}</p>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }} className="mb-4">
            {isFr ? "Un mauvais visuel devient bon." : "A weak visual becomes strong."}
          </h2>
          <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: "#52525B" }}>
            {isFr
              ? "Ora propose un prompt optimisé avec ton contexte, ta marque, ta cible. Un clic, un nouveau visuel scoré."
              : "Ora builds an optimized prompt with your context, brand, and audience. One click, one newly scored visual."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5 md:gap-8 items-stretch">
          {[
            { label: isFr ? "Avant" : "Before", score: 58, verdict: "revise" as const, issues: isFr ? ["Palette désaturée", "Grain/artefacts IA visibles", "Contraste plat"] : ["Desaturated palette", "Visible AI grain", "Flat contrast"], isBefore: true },
            { label: isFr ? "Après" : "After",  score: 91, verdict: "safe"   as const, issues: isFr ? ["Palette respectée", "Netteté propre", "Impact visuel fort"] : ["On-palette", "Clean sharpness", "Strong visual impact"], isBefore: false },
          ].map((side, i) => {
            const v = verdictColor(side.verdict);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative rounded-3xl overflow-hidden"
                style={{ aspectRatio: "4 / 5" }}
              >
                <img
                  src={BEFORE_AFTER_IMG}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={handleImgError(side.isBefore ? 10 : 11)}
                  style={side.isBefore ? { filter: "grayscale(0.35) saturate(0.6) contrast(0.82) brightness(0.92)" } : undefined}
                />
                {side.isBefore && (
                  /* Subtle noise overlay to simulate AI artefacts */
                  <div
                    className="absolute inset-0 pointer-events-none mix-blend-overlay"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.08), transparent 35%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.12), transparent 40%)",
                    }}
                  />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)" }} />
                <div className="absolute top-5 left-5 flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide" style={{ background: "rgba(255,255,255,0.95)", color: BLACK }}>{side.label}</span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: v.bg, color: v.fg }}>
                    {isFr ? v.label.fr : v.label.en}
                  </span>
                </div>
                <div className="absolute bottom-5 left-5 right-5 text-white">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-5xl font-black leading-none">{side.score}</span>
                    <span className="text-sm opacity-75">/100</span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {side.issues.map((iss) => (
                      <li key={iss} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-white" />
                        <span className="opacity-90">{iss}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold mb-2" style={{ color: BLUE }}>{isFr ? "Comment ça marche" : "How it works"}</p>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              {isFr ? "3 étapes. 30 secondes." : "3 steps. 30 seconds."}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Upload, step: "01", title: isFr ? "Dépose" : "Drop", body: isFr ? "Glisse ton visuel — image ou vidéo, 20 Mo max." : "Drop your visual — image or video, 20 MB max." },
              { icon: Eye,    step: "02", title: isFr ? "Audite" : "Audit", body: isFr ? "3 KPIs, recommandations taguées, verdict clair." : "3 KPIs, tagged recommendations, clear verdict." },
              { icon: RefreshCw, step: "03", title: isFr ? "Régénère" : "Regenerate", body: isFr ? "Un clic pour une meilleure version scorée." : "One click for a better, freshly scored version." },
            ].map(({ icon: Icon, step, title, body }, i) => (
              <motion.div key={step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.4 }} className="p-7 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF", color: BLUE }}>
                    <Icon size={22} />
                  </div>
                  <span className="text-3xl font-black" style={{ color: "#E4E4E7" }}>{step}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{title}</h3>
                <p className="text-base leading-relaxed" style={{ color: "#52525B" }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3 KPIs ─── */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold mb-2" style={{ color: BLUE }}>{isFr ? "Ce qu'Ora vérifie" : "What Ora checks"}</p>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            {isFr ? "3 questions. Une réponse nette." : "3 questions. One clear answer."}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Shield, color: "#B91C1C", bg: "#FEF2F2", title: isFr ? "Risques" : "Legal flags", q: isFr ? "Puis-je publier sans risque ?" : "Can I publish safely?", body: isFr ? "Logos déposés, célébrités, allégations régulées, biais — détection heuristique." : "Trademarks, celebrity likenesses, regulated claims, bias — heuristic detection." },
            { icon: Palette, color: BLUE, bg: "#EFF6FF", title: isFr ? "Cohérence marque" : "Brand fit", q: isFr ? "Ça ressemble à ma marque ?" : "Does this match my brand?", body: isFr ? "Palette, ton, style photo, messages, audience — contre ton Brand Vault." : "Palette, tone, style, messages, audience — against your Brand Vault." },
            { icon: Sparkles, color: "#15803D", bg: "#F0FDF4", title: isFr ? "Créatif" : "Creative", q: isFr ? "Est-ce que ça tape ?" : "Is it actually good?", body: isFr ? "Composition, impact, artefacts IA, originalité, potentiel campagne." : "Composition, impact, AI artefacts, originality, campaign potential." },
          ].map(({ icon: Icon, color, bg, title, q, body }) => (
            <div key={title} className="p-6 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: bg, color }}>
                <Icon size={22} />
              </div>
              <h3 className="font-bold text-lg mb-1">{title}</h3>
              <p className="text-xs font-medium mb-3" style={{ color: "#A1A1AA" }}>{q}</p>
              <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOR WHO ─── */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="max-w-7xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold mb-2" style={{ color: BLUE }}>{isFr ? "Pour qui" : "For whom"}</p>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              {isFr ? "Du freelance à l'agence." : "From freelance to agency."}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              { title: isFr ? "Créateurs & freelances" : "Creators & freelancers", sub: isFr ? "Scan rapide, verdict clair" : "Fast scan, clear verdict", points: isFr ? ["Check en 30 s avant de livrer", "Régénération 1-clic", "Historique 30 jours"] : ["30 s check before delivery", "1-click regeneration", "30-day history"], cta: isFr ? "Essayer gratuit" : "Try free", price: isFr ? "Dès €0" : "From €0" },
              { title: isFr ? "Agences & brands" : "Agencies & brands", sub: isFr ? "Brand Vault, rapports, équipe" : "Brand Vault, reports, team", points: isFr ? ["Brand Vault complet (logo, palette, ton)", "Rapports PDF par client", "Multi-comptes équipe & audit log"] : ["Full Brand Vault (logo, palette, tone)", "PDF reports per client", "Team seats & audit log"], cta: isFr ? "Voir Agency" : "See Agency", price: "€199/mo" },
            ].map((p) => (
              <div key={p.title} className="p-8 rounded-2xl" style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}>
                <h3 className="text-xl font-bold mb-1">{p.title}</h3>
                <p className="text-sm mb-6" style={{ color: "#71717A" }}>{p.sub}</p>
                <ul className="space-y-2.5 mb-6">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm">
                      <Check size={16} style={{ color: BLUE }} className="mt-0.5 shrink-0" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: "#E4E4E7" }}>
                  <span className="font-semibold text-sm">{p.price}</span>
                  <Link to="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: BLUE }}>
                    {p.cta} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-10">
          <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            {isFr ? "Questions fréquentes" : "Frequently asked"}
          </h2>
        </div>
        <div className="space-y-2">
          {(isFr ? [
            { q: "Ora est-il un conseil juridique ?", a: "Non. Le score \"Risques\" est une détection heuristique, pas un avis juridique. Pour les campagnes à fort enjeu, consulte un conseil." },
            { q: "Ora génère-t-il les visuels ?", a: "Non, Ora audite. On ne remplace pas MidJourney ou Flux. On te dit si ce que tu as généré est bon, on-brand, publiable, et on propose un prompt amélioré + une régénération avec ton contexte." },
            { q: "Mes images sont-elles stockées ?", a: "Les scans gratuits sont éphémères. Les plans payants persistent tes analyses pour l'historique. Tu peux supprimer à tout moment." },
            { q: "Ça marche sur mobile ?", a: "Oui, l'app est mobile-first." },
            { q: "Puis-je annuler ?", a: "Oui, à tout moment, sans engagement." },
          ] : [
            { q: "Is Ora legal advice?", a: "No. The \"Risks\" score is heuristic detection, not legal advice. For high-stakes campaigns, consult counsel." },
            { q: "Does Ora generate visuals?", a: "No — Ora audits. We don't replace MidJourney or Flux. We tell you if what you generated is good, on-brand, publishable, propose an improved prompt, and regenerate with your context." },
            { q: "Are my images stored?", a: "Free scans are ephemeral. Paid plans persist analyses for history. You can delete anytime." },
            { q: "Does it work on mobile?", a: "Yes, the app is mobile-first." },
            { q: "Can I cancel?", a: "Yes, anytime, no commitment." },
          ]).map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-7xl mx-auto px-5 md:px-8 pb-20">
        <div className="rounded-3xl p-10 md:p-16 text-center relative overflow-hidden" style={{ background: BLACK, color: "#FFFFFF" }}>
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <OraLogo size={72} variant="mascot" animate={true} color="#FFFFFF" />
            </div>
            <h2 className="mb-4" style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              {isFr ? "Publie mieux. Publie sereinement." : "Publish better. Publish with peace of mind."}
            </h2>
            <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "#A1A1AA" }}>
              {isFr ? "5 scans gratuits par mois. Sans carte." : "5 free scans per month. No card."}
            </p>
            <Link to={user ? "/hub/analyze" : "/login"} className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-bold hover:opacity-90 transition-all" style={{ background: BLUE, color: "#FFFFFF" }}>
              {isFr ? "Commencer maintenant" : "Start now"} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl" style={{ background: open ? "#FAFAFA" : "#FFFFFF", border: "1px solid #E4E4E7" }}>
      <button className="w-full flex items-center justify-between gap-4 p-5 text-left" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-sm md:text-base">{q}</span>
        <ChevronDown size={18} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "#52525B" }}>{a}</div>}
    </div>
  );
}

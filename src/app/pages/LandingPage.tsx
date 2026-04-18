import { useState, useRef } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "motion/react";
import {
  Shield, Palette, Sparkles, ArrowRight, Check, Upload,
  Eye, RefreshCw, ChevronDown, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";
import heroNissan from "../../assets/b545abf4495677ce6104da79f57e7f15edcba5a0.png";
import serviceNissan from "../../assets/fd1a1304c95304459d525edabe5b548965b73ee0.png";
import sunsetNissan from "../../assets/e770a4caf934a7f0a280cbbe70316b0d298cff32.png";

const BLUE = "#1D4ED8";
const BLACK = "#0A0A0A";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function LandingPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";

  return (
    <div style={{ background: "#FFFFFF", color: BLACK }}>
      {/* ═══ HERO ═══ */}
      <section className="relative max-w-6xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-20 md:pb-32 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #1D4ED8 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-center">
          {/* Left: copy */}
          <motion.div variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-7"
                 style={{ background: "#EFF6FF", color: BLUE, border: "1px solid #DBEAFE" }}>
              <OraLogo size={16} variant="mark" animate={false} color={BLUE} />
              {isFr ? "Le copilote qualité pour tes visuels IA" : "The quality copilot for AI visuals"}
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="mb-6 whitespace-pre-line"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5.25rem)",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                background: "linear-gradient(135deg, #0A0A0A 0%, #1D4ED8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {isFr ? "Tes visuels IA,\npublie-les\nsans stress." : "Your AI visuals,\npublished\nwith confidence."}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mb-9 max-w-lg"
              style={{ fontSize: "1.15rem", lineHeight: 1.6, color: "#52525B" }}
            >
              {isFr
                ? "Tu génères avec MidJourney, Flux, DALL-E. Ora audite, repère les risques légaux, juge la cohérence avec ta marque, note le créatif — et régénère en mieux."
                : "You generate with MidJourney, Flux, DALL-E. Ora audits, flags legal risks, judges brand fit, grades the creative — and regenerates better."}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-7">
              <Link to={user ? "/hub/analyze" : "/login"}
                    className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-sm font-bold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ background: BLUE, color: "#FFFFFF", outlineColor: BLUE }}>
                {isFr ? "Scanner un visuel" : "Scan a visual"} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/pricing"
                    className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-sm font-semibold transition-all duration-200 hover:bg-[#E4E4E7]"
                    style={{ background: "#F4F4F5", color: BLACK }}>
                {isFr ? "Voir les offres" : "See pricing"}
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs" style={{ color: "#71717A" }}>
              <span className="flex items-center gap-1.5"><Check size={13} style={{ color: "#15803D" }} />{isFr ? "5 scans gratuits / mois" : "5 free scans / month"}</span>
              <span className="flex items-center gap-1.5"><Check size={13} style={{ color: "#15803D" }} />{isFr ? "Sans carte" : "No card"}</span>
              <span className="flex items-center gap-1.5"><Check size={13} style={{ color: "#15803D" }} />{isFr ? "30 secondes" : "30 seconds"}</span>
            </motion.div>
          </motion.div>

          {/* Right: Ora UI mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ScanMockup isFr={isFr} />
          </motion.div>
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-20 md:py-28 text-center">
          <p className="text-sm font-semibold mb-3" style={{ color: BLUE }}>{isFr ? "Le problème" : "The problem"}</p>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }} className="mb-5 md:mb-6">
            {isFr ? "Tu générés. Mais c'est publiable ?" : "You generate. But is it publishable?"}
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: "#52525B" }}>
            {isFr
              ? "Un logo Nike qui traîne. Une main à six doigts. Un ton qui ne ressemble pas à ta marque. Tu ne le vois pas toujours — Ora oui."
              : "A stray Nike logo. A six-fingered hand. A tone that doesn't match your brand. You don't always catch it — Ora does."}
          </p>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-3 gap-4 mt-12 text-left"
          >
            {[
              { icon: AlertTriangle, title: isFr ? "Risques cachés" : "Hidden risks", body: isFr ? "Logos déposés, ressemblances, claims régulés — des procès à venir." : "Trademarks, likenesses, regulated claims — lawsuits waiting." },
              { icon: Palette, title: isFr ? "Hors-marque" : "Off-brand", body: isFr ? "Palette flottante, ton incohérent, mood à côté." : "Floating palette, incoherent tone, mood drift." },
              { icon: Eye, title: isFr ? "Moyen, pas bon" : "Mediocre, not good", body: isFr ? "Stock photo générique. Personne ne scroll pour ça." : "Generic stock feel. Nobody scrolls for that." },
            ].map(({ icon: Icon, title, body }, i) => (
              <motion.div key={i} variants={fadeUp} className="group p-6 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-1" style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "#FFF7ED" }}>
                  <Icon size={20} style={{ color: "#C2410C" }} />
                </div>
                <h3 className="font-bold text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>{body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold mb-3" style={{ color: BLUE }}>{isFr ? "Comment ça marche" : "How it works"}</p>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
            {isFr ? "3 étapes. 30 secondes." : "3 steps. 30 seconds."}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5 md:gap-6">
          {/* Step 1: Drop */}
          <StepCard
            n="01"
            title={isFr ? "Dépose ton visuel" : "Drop your visual"}
            body={isFr ? "Glisse une image IA. Image ou vidéo, jusqu'à 20 Mo." : "Drag an AI image. Image or video, up to 20 MB."}
          >
            <div
              className="aspect-[4/3] rounded-2xl flex items-center justify-center border-2 border-dashed"
              style={{ background: "#FAFAFA", borderColor: "#D4D4D8" }}
            >
              <div className="text-center">
                <Upload size={28} style={{ color: "#71717A", margin: "0 auto 8px" }} />
                <span className="text-xs font-medium" style={{ color: "#71717A" }}>
                  {isFr ? "Déposer ici" : "Drop here"}
                </span>
              </div>
            </div>
          </StepCard>

          {/* Step 2: Score */}
          <StepCard
            n="02"
            title={isFr ? "Ora audite" : "Ora audits"}
            body={isFr ? "3 KPIs. Verdict clair : publier, retoucher, bloquer." : "3 KPIs. Clear verdict: publish, revise, block."}
          >
            <div className="aspect-[4/3] rounded-2xl p-4 flex flex-col justify-center gap-2"
                 style={{ background: "#FAFAFA", border: "1px solid #E4E4E7" }}>
              <ScoreRow label="Legal" score={88} color="#15803D" />
              <ScoreRow label="Brand" score={76} color={BLUE} />
              <ScoreRow label="Creative" score={82} color="#15803D" />
            </div>
          </StepCard>

          {/* Step 3: Regen */}
          <StepCard
            n="03"
            title={isFr ? "Régénère mieux" : "Regenerate better"}
            body={isFr ? "Un clic. Nouveau visuel, contexte préservé." : "One click. New visual, context preserved."}
          >
            <div className="aspect-[4/3] rounded-2xl flex items-center justify-center gap-3 p-3"
                 style={{ background: "#FAFAFA", border: "1px solid #E4E4E7" }}>
              <img src={serviceNissan} alt="" className="w-24 h-28 rounded-lg object-cover" style={{ filter: "grayscale(0.6) contrast(0.85)" }} />
              <RefreshCw size={22} style={{ color: BLUE }} />
              <img src={sunsetNissan} alt="" className="w-24 h-28 rounded-lg object-cover" />
            </div>
          </StepCard>
        </div>
      </section>

      {/* ═══ GALLERY — real audits ═══ */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14">
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: BLUE }}>{isFr ? "Audits récents" : "Recent audits"}</p>
              <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
                {isFr ? "Chaque visuel. Un verdict." : "Every visual. A verdict."}
              </h2>
            </div>
            <p className="text-sm md:text-base max-w-sm" style={{ color: "#52525B" }}>
              {isFr
                ? "Ora regarde ce que tu publies. Score, drapeau, reco. Toujours une action concrète."
                : "Ora looks at what you publish. Score, flag, reco. Always a concrete action."}
            </p>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5"
          >
            {[
              { src: "/templates/figma-igp-01.png",            score: 62, verdict: "block",  kpi: "LEGAL",    note: isFr ? "Marque Nike reconnaissable" : "Recognizable Nike brand" },
              { src: "/templates/figma-skincare-01.png",       score: 91, verdict: "safe",   kpi: "CREATIVE", note: isFr ? "Composition produit forte" : "Strong product shot" },
              { src: "/templates/figma-fashion-post-01.png",   score: 78, verdict: "revise", kpi: "BRAND",    note: isFr ? "Palette hors charte" : "Palette off-brand" },
              { src: "/templates/figma-flyer-food.png",        score: 84, verdict: "safe",   kpi: "CREATIVE", note: isFr ? "Lisible, claim net" : "Readable, clear claim" },
              { src: "/templates/figma-flyer-fitness.png",     score: 71, verdict: "revise", kpi: "BRAND",    note: isFr ? "Contraste logo faible" : "Weak logo contrast" },
              { src: "/templates/figma-igp-02.png",            score: 88, verdict: "safe",   kpi: "CREATIVE", note: isFr ? "Impact visuel élevé" : "High visual impact" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/8 hover:-translate-y-1"
                style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}
              >
                <div className="aspect-square overflow-hidden" style={{ background: "#F4F4F5" }}>
                  <img src={item.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                </div>
                {/* Score pill over image */}
                <div
                  className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg"
                  style={{
                    background: "rgba(255,255,255,0.96)",
                    color: item.verdict === "block" ? "#B91C1C" : item.verdict === "revise" ? "#B45309" : "#15803D",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: item.verdict === "block" ? "#B91C1C" : item.verdict === "revise" ? "#B45309" : "#15803D" }}
                  />
                  <span className="tabular-nums">{item.score}/100</span>
                </div>
                {/* Reco bar */}
                <div className="px-4 py-3 flex items-start gap-2 text-xs md:text-[13px] leading-snug">
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
                    style={{
                      background:
                        item.kpi === "LEGAL" ? "#FEF2F2" : item.kpi === "BRAND" ? "#EFF6FF" : "#F0FDF4",
                      color:
                        item.kpi === "LEGAL" ? "#B91C1C" : item.kpi === "BRAND" ? BLUE : "#15803D",
                    }}
                  >
                    {item.kpi}
                  </span>
                  <span style={{ color: "#27272A" }}>{item.note}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ 3 KPIs EXPLAINED ═══ */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: BLACK, color: "#FFFFFF" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="max-w-2xl mb-12 md:mb-16">
            <p className="text-sm font-semibold mb-3" style={{ color: "#60A5FA" }}>{isFr ? "Ce qu'Ora vérifie" : "What Ora checks"}</p>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
              {isFr ? "3 questions. Une réponse nette." : "3 questions. One clear answer."}
            </h2>
          </div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="space-y-4"
          >
            {[
              {
                icon: Shield,
                title: "Legal",
                q: isFr ? "Puis-je publier sans risque ?" : "Can I publish safely?",
                body: isFr
                  ? "Logos déposés, ressemblances célébrités, allégations régulées, biais. Détection heuristique — pas un avis juridique."
                  : "Trademarks, celebrity likenesses, regulated claims, bias. Heuristic detection — not legal advice.",
                weight: "30%",
                gradient: "linear-gradient(135deg, #1E3A5F 0%, #171717 100%)",
              },
              {
                icon: Palette,
                title: "Brand fit",
                q: isFr ? "Est-ce que ça ressemble à ma marque ?" : "Does this match my brand?",
                body: isFr
                  ? "Palette, ton, style photo, messages clés, audience cible. Scoré contre ton Brand Vault."
                  : "Palette, tone, photo style, key messages, target audience. Scored against your Brand Vault.",
                weight: "35%",
                gradient: "linear-gradient(135deg, #1D2B5E 0%, #171717 100%)",
              },
              {
                icon: Sparkles,
                title: "Creative",
                q: isFr ? "Est-ce que ça tape vraiment ?" : "Is it actually good?",
                body: isFr
                  ? "Composition, impact visuel, artefacts IA, originalité, potentiel campagne."
                  : "Composition, visual impact, AI artefacts, originality, campaign potential.",
                weight: "35%",
                gradient: "linear-gradient(135deg, #1A2E4A 0%, #171717 100%)",
              },
            ].map(({ icon: Icon, title, q, body, weight, gradient }, i) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="group grid md:grid-cols-[auto_1fr_auto] gap-5 md:gap-8 items-start md:items-center py-8 border-t transition-colors duration-300"
                style={{ borderColor: "#27272A" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-blue-500/10"
                  style={{ background: gradient, border: "1px solid #27272A" }}
                >
                  <Icon size={22} style={{ color: "#60A5FA" }} />
                </div>
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="text-2xl md:text-3xl font-bold" style={{ letterSpacing: "-0.01em" }}>{title}</h3>
                    <span className="text-sm" style={{ color: "#71717A" }}>— {q}</span>
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: "#A1A1AA", maxWidth: "50ch" }}>{body}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wide" style={{ color: "#71717A" }}>{isFr ? "Poids" : "Weight"}</span>
                  <div className="text-3xl font-black tabular-nums" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #60A5FA 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{weight}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ FOR WHO ═══ */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold mb-3" style={{ color: BLUE }}>{isFr ? "Pour qui" : "For whom"}</p>
          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.05 }}>
            {isFr ? "Du freelance à l'agence." : "From freelance to agency."}
          </h2>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid md:grid-cols-2 gap-5"
        >
          {[
            {
              title: isFr ? "Créateurs & freelances" : "Creators & freelancers",
              sub: isFr ? "Scan rapide, verdict clair" : "Fast scan, clear verdict",
              points: isFr
                ? ["Check en 30 s avant de livrer", "Régénération 1-clic", "Historique 30 jours"]
                : ["30-second check before delivery", "One-click regeneration", "30-day history"],
              price: isFr ? "À partir de €0" : "From €0",
              featured: false,
            },
            {
              title: isFr ? "Agences & brands" : "Agencies & brands",
              sub: isFr ? "Brand Vault, rapports, équipe" : "Brand Vault, reports, team",
              points: isFr
                ? ["Brand Vault complet (logo, palette, ton)", "Rapports PDF brandés", "Audit log horodaté, multi-comptes"]
                : ["Full Brand Vault (logo, palette, tone)", "Branded PDF reports", "Timestamped audit log, team seats"],
              price: "€199/mo",
              featured: true,
            },
          ].map((p) => (
            <motion.div
              key={p.title}
              variants={fadeUp}
              className="group p-8 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1"
              style={{
                background: p.featured ? "linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)" : "#FFFFFF",
                border: p.featured ? "1px solid #BFDBFE" : "1px solid #E4E4E7",
              }}
            >
              {p.featured && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-4" style={{ background: "#EFF6FF", color: BLUE }}>
                  <Sparkles size={10} /> {isFr ? "Populaire" : "Popular"}
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{p.title}</h3>
              <p className="text-sm mb-6" style={{ color: "#71717A" }}>{p.sub}</p>
              <ul className="space-y-2.5 mb-6">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 size={16} style={{ color: BLUE }} className="mt-0.5 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-5 border-t" style={{ borderColor: "#E4E4E7" }}>
                <span className="font-bold text-lg tabular-nums">{p.price}</span>
                <Link to="/pricing" className="group/link inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: BLUE }}>
                  {isFr ? "Voir les offres" : "See pricing"} <ArrowRight size={14} className="transition-transform group-hover/link:translate-x-0.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-20">
        <h2 className="text-center mb-10" style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}>
          {isFr ? "Questions fréquentes" : "Frequently asked"}
        </h2>
        <div className="space-y-2">
          {(isFr
            ? [
                { q: "Ora est-il un conseil juridique ?", a: "Non. Le score Legal est une détection heuristique. Pour les campagnes à fort enjeu, consulte un conseil." },
                { q: "Ora génère-t-il les visuels ?", a: "Non, Ora audite. On ne remplace pas MidJourney ou Flux. On peut régénérer une version améliorée avec ton contexte." },
                { q: "Mes images sont-elles stockées ?", a: "Les scans gratuits sont éphémères. Les plans payants persistent tes analyses pour l'historique. Tu peux supprimer à tout moment." },
                { q: "Ça marche sur mobile ?", a: "Oui. L'app est mobile-first." },
              ]
            : [
                { q: "Is Ora legal advice?", a: "No. The Legal score is heuristic detection. For high-stakes campaigns, consult counsel." },
                { q: "Does Ora generate visuals?", a: "No — Ora audits. We don't replace MidJourney or Flux. We can regenerate an improved version with your context." },
                { q: "Are my images stored?", a: "Free scans are ephemeral. Paid plans persist analyses for history. Delete anytime." },
                { q: "Does it work on mobile?", a: "Yes. The app is mobile-first." },
              ]
          ).map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl p-10 md:p-16 text-center overflow-hidden"
          style={{ background: BLACK, color: "#FFFFFF" }}
        >
          {/* Subtle radial glow */}
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 50% 0%, #1D4ED8 0%, transparent 60%)" }} />
          <div className="relative">
            <div className="flex justify-center mb-6">
              <OraLogo size={56} variant="mascot" animate={true} color="#FFFFFF" />
            </div>
            <h2 className="mb-4" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {isFr ? "Publie mieux. Publie sereinement." : "Publish better. Publish with peace of mind."}
            </h2>
            <p className="text-base md:text-lg mb-8 max-w-xl mx-auto" style={{ color: "#A1A1AA" }}>
              {isFr ? "5 scans gratuits par mois. Sans carte." : "5 free scans per month. No card required."}
            </p>
            <Link to={user ? "/hub/analyze" : "/login"}
                  className="group inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-bold transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ background: BLUE, color: "#FFFFFF", outlineColor: BLUE }}>
              {isFr ? "Commencer maintenant" : "Start now"} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/* ─── Components ─── */

function ScanMockup({ isFr }: { isFr: boolean }) {
  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E4E4E7", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03)" }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: "linear-gradient(180deg, #FAFAFA 0%, #F4F4F5 100%)", borderColor: "#E4E4E7" }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#EF4444" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#F59E0B" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#22C55E" }} />
        </div>
        <div className="flex-1 text-center text-xs font-medium" style={{ color: "#71717A" }}>ora.studio/analyze</div>
      </div>

      {/* App content */}
      <div className="p-5 md:p-6 grid grid-cols-[1.2fr_1fr] gap-5">
        {/* Real audited visual with overlay flags */}
        <div className="relative rounded-xl overflow-hidden" style={{ background: "#0A0A0A" }}>
          <img src={heroNissan} alt="" className="w-full h-full object-cover" />
          {/* Flag 1: trademark (top-left of car) */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold shadow-lg"
               style={{ background: "rgba(255,255,255,0.96)", color: "#B91C1C", backdropFilter: "blur(8px)" }}>
            <AlertTriangle size={11} /> {isFr ? "Marque visible" : "Trademark"}
          </div>
          {/* Flag 2: brand-match hint (bottom-right) */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold shadow-lg"
               style={{ background: "rgba(29,78,216,0.96)", color: "#FFFFFF", backdropFilter: "blur(8px)" }}>
            <Palette size={11} /> {isFr ? "Ton OK" : "Tone OK"}
          </div>
        </div>

        {/* Right panel: score + KPIs + verdict */}
        <div className="flex flex-col gap-3">
          {/* Big score */}
          <div>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "#71717A" }}>
              {isFr ? "Score global" : "Overall"}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl md:text-6xl font-black leading-none tabular-nums" style={{ color: BLACK, letterSpacing: "-0.03em" }}>74</span>
              <span className="text-sm" style={{ color: "#71717A" }}>/100</span>
            </div>
          </div>

          {/* Verdict badge */}
          <div className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full text-xs font-bold"
               style={{ background: "#FEF3C7", color: "#B45309" }}>
            <AlertTriangle size={13} />
            {isFr ? "À retoucher" : "Revise"}
          </div>

          {/* 3 KPIs */}
          <div className="space-y-2 mt-1">
            <ScoreRow label="Legal" score={58} color="#B91C1C" compact />
            <ScoreRow label="Brand" score={82} color={BLUE} compact />
            <ScoreRow label="Creative" score={84} color="#15803D" compact />
          </div>
        </div>
      </div>

      {/* Bottom: recommendations */}
      <div className="border-t px-5 md:px-6 py-4 space-y-2" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "#71717A" }}>
          <Sparkles size={12} /> {isFr ? "Recommandations" : "Recommendations"}
        </div>
        <div className="text-xs md:text-sm flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "#FEF2F2", color: "#B91C1C" }}>LEGAL</span>
          <span>{isFr ? "Logo Nissan reconnaissable à retirer ou flouter" : "Recognizable Nissan logo — remove or blur"}</span>
        </div>
        <div className="text-xs md:text-sm flex items-start gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: "#F0FDF4", color: "#15803D" }}>CREATIVE</span>
          <span>{isFr ? "Resserrer le cadrage sur le sujet principal" : "Tighten the framing on the main subject"}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ label, score, color, compact = false }: { label: string; score: number; color: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`${compact ? "text-xs w-14" : "text-sm w-20"} font-semibold`} style={{ color: "#52525B" }}>{label}</span>
      <div className={`flex-1 ${compact ? "h-1.5" : "h-2"} rounded-full overflow-hidden`} style={{ background: "#E4E4E7" }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${score}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", background: color }}
        />
      </div>
      <span className={`${compact ? "text-xs w-7" : "text-sm w-8"} font-bold text-right tabular-nums`} style={{ color }}>{score}</span>
    </div>
  );
}

function StepCard({ n, title, body, children }: { n: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="p-6 rounded-3xl"
      style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}
    >
      {children}
      <div className="mt-5 flex items-baseline gap-3 mb-2">
        <span className="text-xs font-black" style={{ color: "#A1A1AA" }}>{n}</span>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>{body}</p>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl transition-colors duration-200" style={{ background: open ? "#FAFAFA" : "#FFFFFF", border: "1px solid #E4E4E7" }}>
      <button className="w-full flex items-center justify-between gap-4 p-5 text-left" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-sm md:text-base">{q}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
          <ChevronDown size={18} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "#52525B" }}>{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

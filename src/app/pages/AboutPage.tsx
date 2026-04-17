import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Shield, Palette, Sparkles, ArrowRight, Mail, Menu, X } from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";

/* ═══════════════════════════════════════════════════════════
   ABOUT — Positioning, honest scope, team/contact
   ═══════════════════════════════════════════════════════════ */

const BLUE = "#1D4ED8";
const BLACK = "#0A0A0A";

export function AboutPage() {
  const { locale, setLocale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ background: "#FFFFFF", color: BLACK, minHeight: "100vh" }}>
      {/* NAV */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E4E4E7",
        }}
      >
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <OraLogo size={32} variant="full" animate={false} color={BLACK} />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/pricing" className="hover:opacity-60">{isFr ? "Tarifs" : "Pricing"}</Link>
            <Link to="/about" className="font-semibold" style={{ color: BLUE }}>
              {isFr ? "À propos" : "About"}
            </Link>
            <button onClick={() => setLocale(isFr ? "en" : "fr")} className="hover:opacity-60">
              {isFr ? "EN" : "FR"}
            </button>
            {user ? (
              <Link to="/hub/analyze" className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: BLACK, color: "#FFFFFF" }}>
                {isFr ? "Ouvrir l'app" : "Open app"}
              </Link>
            ) : (
              <Link to="/login" className="px-4 py-2 rounded-full text-sm font-semibold" style={{ background: BLUE, color: "#FFFFFF" }}>
                {isFr ? "Commencer" : "Get started"}
              </Link>
            )}
          </div>
          <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden px-5 pb-5 space-y-3 border-t" style={{ borderColor: "#E4E4E7" }}>
            <Link to="/pricing" className="block py-2" onClick={() => setMenuOpen(false)}>{isFr ? "Tarifs" : "Pricing"}</Link>
            <button onClick={() => { setLocale(isFr ? "en" : "fr"); setMenuOpen(false); }} className="block py-2">
              {isFr ? "English" : "Français"}
            </button>
            <Link to={user ? "/hub/analyze" : "/login"} className="block py-3 text-center rounded-full font-semibold" style={{ background: BLUE, color: "#FFFFFF" }} onClick={() => setMenuOpen(false)}>
              {user ? (isFr ? "Ouvrir l'app" : "Open app") : (isFr ? "Commencer" : "Get started")}
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <OraLogo size={88} variant="mascot" animate={true} color={BLACK} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}
          className="mb-5"
        >
          {isFr ? "Le copilote qualité\npour tes visuels IA." : "The quality copilot\nfor AI visuals."}
        </motion.h1>
        <p className="text-lg leading-relaxed" style={{ color: "#52525B" }}>
          {isFr
            ? "Ora aide les créateurs, marques et agences à publier des visuels IA sans stress : on-brand, sans risque, et vraiment bons."
            : "Ora helps creators, brands, and agencies publish AI visuals with confidence: on-brand, risk-free, and genuinely good."}
        </p>
      </section>

      {/* MISSION */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <div className="space-y-6 text-lg leading-relaxed" style={{ color: "#27272A" }}>
          <p>
            {isFr
              ? "Depuis l'explosion des modèles génératifs, tout le monde peut produire un visuel en 30 secondes. Mais publier un visuel IA reste risqué : logos qui traînent, célébrités reconnaissables, artefacts grossiers, ambiance à côté de la marque."
              : "Since generative models exploded, anyone can produce a visual in 30 seconds. But publishing AI visuals stays risky: stray logos, recognizable celebrities, clumsy artefacts, off-brand mood."}
          </p>
          <p>
            {isFr
              ? "Les seuls outils qui auditent les créations existent — mais sont réservés aux gros annonceurs à $50k/an. Le freelance, la PME, l'agence indé n'ont rien."
              : "Tools that audit creative work exist — but are reserved for big advertisers at $50k/year. Freelancers, SMBs, and indie agencies have nothing."}
          </p>
          <p className="font-semibold" style={{ color: BLACK }}>
            {isFr
              ? "Ora comble ce vide : un audit de qualité, accessible, rapide, honnête."
              : "Ora fills that gap: a quality audit — accessible, fast, honest."}
          </p>
        </div>
      </section>

      {/* APPROACH */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-20">
          <h2
            className="text-center mb-14"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {isFr ? "Notre approche" : "Our approach"}
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: Shield, color: "#B91C1C", bg: "#FEF2F2",
                title: isFr ? "Risques" : "Legal flags",
                body: isFr
                  ? "Détection heuristique des drapeaux rouges : logos déposés, ressemblances célébrités, allégations régulées, biais."
                  : "Heuristic red-flag detection: visible trademarks, celebrity likenesses, regulated claims, bias.",
              },
              {
                icon: Palette, color: BLUE, bg: "#EFF6FF",
                title: isFr ? "Cohérence marque" : "Brand fit",
                body: isFr
                  ? "Score d'alignement avec ta marque : palette, ton, style photo, messages clés, audience cible."
                  : "Alignment score with your brand: palette, tone, photo style, key messages, target audience.",
              },
              {
                icon: Sparkles, color: "#15803D", bg: "#F0FDF4",
                title: isFr ? "Créatif" : "Creative",
                body: isFr
                  ? "Qualité artistique et technique : composition, impact, artefacts IA, originalité, potentiel campagne."
                  : "Artistic and technical quality: composition, impact, AI artefacts, originality, campaign potential.",
              },
            ].map(({ icon: Icon, color, bg, title, body }) => (
              <div
                key={title}
                className="p-6 rounded-2xl"
                style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: bg, color }}>
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-base mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HONEST DISCLOSURE */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-20">
        <div
          className="p-8 md:p-10 rounded-3xl"
          style={{ background: "#0A0A0A", color: "#FAFAFA" }}
        >
          <h2
            className="mb-4"
            style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            {isFr ? "Ce qu'Ora n'est PAS." : "What Ora is NOT."}
          </h2>
          <ul className="space-y-3 text-sm md:text-base" style={{ color: "#D4D4D8" }}>
            <li>
              <span className="font-semibold" style={{ color: "#FFFFFF" }}>
                {isFr ? "Pas un avis juridique." : "Not legal advice."}
              </span>{" "}
              {isFr
                ? "Notre score « Risques » est une détection heuristique. Pour les campagnes à fort enjeu, consulte un conseil."
                : "Our \"Risks\" score is heuristic detection. For high-stakes campaigns, consult counsel."}
            </li>
            <li>
              <span className="font-semibold" style={{ color: "#FFFFFF" }}>
                {isFr ? "Pas un générateur." : "Not a generator."}
              </span>{" "}
              {isFr
                ? "On audite ce que tu produis ailleurs (MidJourney, Flux, DALL-E…). On peut régénérer une version améliorée avec ton contexte."
                : "We audit what you produce elsewhere (MidJourney, Flux, DALL-E…). We can regenerate an improved version with your context."}
            </li>
            <li>
              <span className="font-semibold" style={{ color: "#FFFFFF" }}>
                {isFr ? "Pas une oracle." : "Not an oracle."}
              </span>{" "}
              {isFr
                ? "Les scores sont des opinions de modèles vision qualifiés. Ton jugement humain reste la dernière étape."
                : "Scores are opinions from qualified vision models. Your human judgement is the final step."}
            </li>
          </ul>
        </div>
      </section>

      {/* CONTACT */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-20 text-center">
        <h2
          className="mb-4"
          style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          {isFr ? "Une question ? Un besoin custom ?" : "A question? Custom needs?"}
        </h2>
        <p className="text-base mb-7" style={{ color: "#52525B" }}>
          {isFr
            ? "Équipes de +5, SSO, audit log signé, SLA, intégration API — parlons-en."
            : "Teams of 5+, SSO, signed audit log, SLA, API integration — let's talk."}
        </p>
        <a
          href="mailto:hello@ora.studio"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: BLACK, color: "#FFFFFF" }}
        >
          <Mail size={15} /> hello@ora.studio
        </a>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div
          className="rounded-3xl p-10 md:p-14 text-center"
          style={{ background: "#F4F4F5" }}
        >
          <h2
            style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}
            className="mb-3"
          >
            {isFr ? "Essaie Ora sur un visuel." : "Try Ora on a visual."}
          </h2>
          <p className="mb-6" style={{ color: "#52525B" }}>
            {isFr ? "5 scans gratuits par mois. Sans carte." : "5 free scans per month. No card."}
          </p>
          <Link
            to={user ? "/hub/analyze" : "/login"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: BLUE, color: "#FFFFFF" }}
          >
            {isFr ? "Scanner maintenant" : "Scan now"} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t" style={{ borderColor: "#E4E4E7" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <OraLogo size={24} variant="mark" animate={false} color={BLACK} />
            <span className="text-sm font-medium">© {new Date().getFullYear()} Ora</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: "#71717A" }}>
            <Link to="/about" className="hover:opacity-70">{isFr ? "À propos" : "About"}</Link>
            <Link to="/pricing" className="hover:opacity-70">{isFr ? "Tarifs" : "Pricing"}</Link>
            <Link to="/privacy" className="hover:opacity-70">{isFr ? "Confidentialité" : "Privacy"}</Link>
            <Link to="/terms" className="hover:opacity-70">{isFr ? "CGU" : "Terms"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

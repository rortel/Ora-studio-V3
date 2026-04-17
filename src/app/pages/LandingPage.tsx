import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Shield, Palette, Sparkles, ArrowRight, Check, Upload,
  Eye, RefreshCw, Menu, X, ChevronDown,
} from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";

/* ═══════════════════════════════════════════════════════════
   LANDING — Ora copilote qualité pour visuels IA
   3 KPIs (Legal, Brand, Creative) · Mascotte Border Collie
   ═══════════════════════════════════════════════════════════ */

const BLUE = "#1D4ED8";
const BLACK = "#0A0A0A";

export function LandingPage() {
  const { locale, setLocale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";
  const [menuOpen, setMenuOpen] = useState(false);

  const headline = isFr
    ? "Publie tes visuels IA\nsans stress."
    : "Publish AI visuals\nwith confidence.";

  const sub = isFr
    ? "Ora est ton copilote qualité. Dépose un visuel IA, il l'audite en 30 secondes et te dit comment le rendre meilleur — on-brand, sans risque."
    : "Ora is your quality copilot. Drop an AI visual, get an audit in 30 seconds, and know exactly how to make it better — on-brand, risk-free.";

  return (
    <div style={{ background: "#FFFFFF", color: BLACK, minHeight: "100vh" }}>
      {/* ─── NAV ─── */}
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
            <Link to="/pricing" className="hover:opacity-60 transition-opacity">
              {isFr ? "Tarifs" : "Pricing"}
            </Link>
            <Link to="/about" className="hover:opacity-60 transition-opacity">
              {isFr ? "À propos" : "About"}
            </Link>
            <button
              onClick={() => setLocale(isFr ? "en" : "fr")}
              className="hover:opacity-60 transition-opacity"
              aria-label="Toggle language"
            >
              {isFr ? "EN" : "FR"}
            </button>
            {user ? (
              <Link
                to="/hub/analyze"
                className="px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: BLACK, color: "#FFFFFF" }}
              >
                {isFr ? "Ouvrir l'app" : "Open app"}
              </Link>
            ) : (
              <>
                <Link to="/login" className="hover:opacity-60 transition-opacity">
                  {isFr ? "Connexion" : "Sign in"}
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: BLUE, color: "#FFFFFF" }}
                >
                  {isFr ? "Commencer" : "Get started"}
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-5 pb-5 space-y-3 border-t" style={{ borderColor: "#E4E4E7" }}>
            <Link to="/pricing" className="block py-2" onClick={() => setMenuOpen(false)}>
              {isFr ? "Tarifs" : "Pricing"}
            </Link>
            <Link to="/about" className="block py-2" onClick={() => setMenuOpen(false)}>
              {isFr ? "À propos" : "About"}
            </Link>
            <button onClick={() => { setLocale(isFr ? "en" : "fr"); setMenuOpen(false); }} className="block py-2">
              {isFr ? "English" : "Français"}
            </button>
            {user ? (
              <Link
                to="/hub/analyze"
                className="block py-3 text-center rounded-full font-semibold"
                style={{ background: BLACK, color: "#FFFFFF" }}
                onClick={() => setMenuOpen(false)}
              >
                {isFr ? "Ouvrir l'app" : "Open app"}
              </Link>
            ) : (
              <Link
                to="/login"
                className="block py-3 text-center rounded-full font-semibold"
                style={{ background: BLUE, color: "#FFFFFF" }}
                onClick={() => setMenuOpen(false)}
              >
                {isFr ? "Commencer" : "Get started"}
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-20 md:pb-32">
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
              style={{ background: "#EFF6FF", color: BLUE }}
            >
              <Sparkles size={12} />
              {isFr ? "Audit IA · Cohérence marque · Risques" : "AI audit · Brand · Risks"}
            </div>
            <h1
              className="mb-6 whitespace-pre-line"
              style={{
                fontSize: "clamp(2.25rem, 5vw, 4.25rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              {headline}
            </h1>
            <p
              className="mb-8 max-w-xl"
              style={{
                fontSize: "clamp(1rem, 1.5vw, 1.15rem)",
                lineHeight: 1.55,
                color: "#52525B",
              }}
            >
              {sub}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={user ? "/hub/analyze" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: BLUE, color: "#FFFFFF" }}
              >
                {isFr ? "Scanner un visuel" : "Scan a visual"} <ArrowRight size={16} />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-semibold transition-colors"
                style={{ background: "#F4F4F5", color: BLACK }}
              >
                {isFr ? "Voir les offres" : "See pricing"}
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-5 text-xs" style={{ color: "#71717A" }}>
              <span className="flex items-center gap-1.5">
                <Check size={13} style={{ color: "#15803D" }} /> {isFr ? "5 scans gratuits / mois" : "5 free scans / month"}
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} style={{ color: "#15803D" }} /> {isFr ? "Sans carte" : "No card required"}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center"
          >
            <div
              className="relative flex items-center justify-center w-full aspect-square max-w-md rounded-3xl"
              style={{
                background: "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)",
                border: "1px solid #E4E4E7",
              }}
            >
              <OraLogo size={280} variant="mascot" animate={true} color={BLACK} />
              <motion.div
                className="absolute top-8 left-6 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
                style={{ background: "#FFFFFF", color: "#15803D", border: "1px solid #DCFCE7" }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                ✓ Legal OK
              </motion.div>
              <motion.div
                className="absolute top-24 right-4 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
                style={{ background: "#FFFFFF", color: BLUE, border: "1px solid #DBEAFE" }}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
              >
                Brand fit 92
              </motion.div>
              <motion.div
                className="absolute bottom-10 left-8 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
                style={{ background: "#FFFFFF", color: "#C2410C", border: "1px solid #FED7AA" }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                {isFr ? "À peaufiner" : "Needs polish"}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold mb-3" style={{ color: BLUE }}>
              {isFr ? "Comment ça marche" : "How it works"}
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {isFr ? "3 étapes. 30 secondes." : "3 steps. 30 seconds."}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Upload, step: "01", title: isFr ? "Dépose" : "Drop", body: isFr ? "Glisse ton visuel IA — image ou vidéo, jusqu'à 20 Mo." : "Drop your AI visual — image or video, up to 20 MB." },
              { icon: Eye, step: "02", title: isFr ? "Ora audite" : "Ora audits", body: isFr ? "3 KPIs : risques, cohérence marque, qualité créative. Verdict clair." : "3 KPIs: risks, brand fit, creative quality. Clear verdict." },
              { icon: RefreshCw, step: "03", title: isFr ? "Régénère" : "Regenerate", body: isFr ? "Un clic pour régénérer une version meilleure, avec ton contexte." : "One click to regenerate a better version, with your context." },
            ].map(({ icon: Icon, step, title, body }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-7 rounded-2xl"
                style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: "#EFF6FF", color: BLUE }}
                  >
                    <Icon size={20} />
                  </div>
                  <span className="text-2xl font-black" style={{ color: "#E4E4E7" }}>
                    {step}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3 KPIs ─── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="grid md:grid-cols-[1fr_1.3fr] gap-12 items-center">
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: BLUE }}>
              {isFr ? "Ce qu'Ora vérifie" : "What Ora checks"}
            </p>
            <h2
              className="mb-5"
              style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              {isFr ? "3 questions. Une réponse nette." : "3 questions. One clear answer."}
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: "#52525B" }}>
              {isFr
                ? "Pas de rapport de 40 pages. 3 KPIs ciblés, un verdict (publier, retoucher, bloquer), et des conseils concrets par axe."
                : "No 40-page report. 3 sharp KPIs, a verdict (publish, revise, block), and concrete advice per axis."}
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: Shield,
                color: "#B91C1C",
                bg: "#FEF2F2",
                title: isFr ? "Risques" : "Legal flags",
                q: isFr ? "Puis-je publier sans risque ?" : "Can I publish safely?",
                body: isFr ? "Logos déposés visibles, célébrités reconnaissables, allégations régulées, biais — détection heuristique." : "Visible trademarks, celebrity likenesses, regulated claims, bias — heuristic detection.",
              },
              {
                icon: Palette,
                color: BLUE,
                bg: "#EFF6FF",
                title: isFr ? "Cohérence marque" : "Brand fit",
                q: isFr ? "Est-ce que ça ressemble à ma marque ?" : "Does this match my brand?",
                body: isFr ? "Palette, ton, style photo, messages clés, audience cible — scoré contre ton Brand Vault." : "Palette, tone, photo style, key messages, target audience — scored against your Brand Vault.",
              },
              {
                icon: Sparkles,
                color: "#15803D",
                bg: "#F0FDF4",
                title: isFr ? "Créatif" : "Creative",
                q: isFr ? "Est-ce que ça tape vraiment ?" : "Is this actually good?",
                body: isFr ? "Composition, impact visuel, artefacts IA, originalité, potentiel campagne." : "Composition, visual impact, AI artefacts, originality, campaign potential.",
              },
            ].map(({ icon: Icon, color, bg, title, q, body }) => (
              <div
                key={title}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: bg, color }}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                    <h3 className="font-bold text-base">{title}</h3>
                    <span className="text-xs font-medium" style={{ color: "#A1A1AA" }}>— {q}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#52525B" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOR WHO ─── */}
      <section className="border-t" style={{ borderColor: "#E4E4E7", background: "#FAFAFA" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold mb-3" style={{ color: BLUE }}>
              {isFr ? "Pour qui" : "For whom"}
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
              {isFr ? "Du freelance à l'agence." : "From freelance to agency."}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                title: isFr ? "Créateurs & freelances" : "Creators & freelancers",
                sub: isFr ? "Scan rapide, verdict clair" : "Fast scan, clear verdict",
                points: isFr
                  ? ["Check en 30 s avant de livrer", "Régénération 1-clic", "Historique 30 jours"]
                  : ["30-second check before delivery", "One-click regeneration", "30-day history"],
                cta: isFr ? "Essayer gratuit" : "Try free",
                price: isFr ? "À partir de €0" : "Starting at €0",
              },
              {
                title: isFr ? "Agences & brands" : "Agencies & brands",
                sub: isFr ? "Brand Vault, rapports, équipe" : "Brand Vault, reports, team",
                points: isFr
                  ? ["Brand Vault complet (logo, palette, ton)", "Rapports PDF par client", "Multi-comptes équipe & audit log"]
                  : ["Full Brand Vault (logo, palette, tone)", "PDF reports per client", "Team seats & audit log"],
                cta: isFr ? "Voir l'offre Agency" : "See Agency plan",
                price: isFr ? "€199/mois" : "€199/mo",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="p-8 rounded-2xl"
                style={{ background: "#FFFFFF", border: "1px solid #E4E4E7" }}
              >
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
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold"
                    style={{ color: BLUE }}
                  >
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
        <div className="text-center mb-12">
          <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            {isFr ? "Questions fréquentes" : "Frequently asked"}
          </h2>
        </div>

        <div className="space-y-2">
          {(isFr
            ? [
                { q: "Ora est-il un conseil juridique ?", a: "Non. Le score \"Risques\" est une détection heuristique, pas un avis juridique. Pour les campagnes à fort enjeu, consulte un conseil." },
                { q: "Ora génère-t-il les visuels ?", a: "Non, Ora audite. On ne remplace pas MidJourney ou Flux — on te dit si ce que tu as généré est bon, on-brand, et publiable. On propose un prompt amélioré et une régénération avec ton contexte." },
                { q: "Mes images sont-elles stockées ?", a: "Les scans gratuits sont éphémères. Les plans payants persistent tes analyses pour l'historique. Tu peux supprimer à tout moment." },
                { q: "Ça marche sur mobile ?", a: "Oui. L'app est mobile-first. Tu peux scanner depuis ton téléphone, partager le verdict, régénérer." },
                { q: "Puis-je annuler ?", a: "Oui, à tout moment. Pas d'engagement." },
              ]
            : [
                { q: "Is Ora legal advice?", a: "No. The \"Risks\" score is heuristic detection, not legal advice. For high-stakes campaigns, consult counsel." },
                { q: "Does Ora generate visuals?", a: "No — Ora audits. We don't replace MidJourney or Flux. We tell you if what you generated is good, on-brand, and publishable, propose an improved prompt, and can regenerate with your context." },
                { q: "Are my images stored?", a: "Free scans are ephemeral. Paid plans persist analyses for history. You can delete anytime." },
                { q: "Does it work on mobile?", a: "Yes. The app is mobile-first. Scan from your phone, share the verdict, regenerate." },
                { q: "Can I cancel?", a: "Yes, anytime. No commitment." },
              ]
          ).map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div
          className="rounded-3xl p-10 md:p-16 text-center"
          style={{ background: BLACK, color: "#FFFFFF" }}
        >
          <div className="flex justify-center mb-6">
            <OraLogo size={64} variant="mark" animate={false} color="#FFFFFF" />
          </div>
          <h2
            className="mb-4"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {isFr ? "Publie mieux. Publie sereinement." : "Publish better. Publish with peace of mind."}
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: "#A1A1AA" }}>
            {isFr ? "5 scans gratuits par mois. Sans carte." : "5 free scans per month. No card required."}
          </p>
          <Link
            to={user ? "/hub/analyze" : "/login"}
            className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-bold transition-all hover:opacity-90"
            style={{ background: BLUE, color: "#FFFFFF" }}
          >
            {isFr ? "Commencer maintenant" : "Start now"} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
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

/* ─── FAQ item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl transition-all"
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

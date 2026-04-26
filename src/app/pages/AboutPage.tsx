import { Link } from "react-router";
import { motion } from "motion/react";
import { Shield, Palette, Sparkles, ArrowRight, Mail } from "lucide-react";
import { OraLogo } from "../components/OraLogo";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth-context";
import { bagel, COLORS } from "../components/ora/tokens";

/* ═══════════════════════════════════════════════════════════
   ABOUT — Positioning, honest scope, team/contact.
   Palette aligned with landing (cream / ink / coral). Legacy
   blue + red accents dropped.
   ═══════════════════════════════════════════════════════════ */

export function AboutPage() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const isFr = locale === "fr";

  return (
    <div style={{ background: COLORS.cream, color: COLORS.ink }}>
      {/* HERO */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8"
        >
          <OraLogo size={88} variant="mascot" animate={true} color={COLORS.ink} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05 }}
          className="mb-5"
        >
          {isFr ? "Pour les gens qui vendent.\nPas les gens qui postent." : "For people who sell things.\nNot people who post things."}
        </motion.h1>
        <p className="text-lg leading-relaxed" style={{ color: "#52525B" }}>
          {isFr
            ? "Ora prend une photo de ce que tu vends, fait 6 posts pour toutes tes plateformes, et les publie. Tu fais autre chose."
            : "Ora takes a photo of what you sell, makes 6 posts for every platform, and publishes them. You do something else."}
        </p>
      </section>

      {/* MISSION */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
        <div className="space-y-6 text-lg leading-relaxed" style={{ color: "#27272A" }}>
          <p>
            {isFr
              ? "Tout le monde dit que tu dois être sur les réseaux. Personne ne te dit comment tu trouves le temps. Tu vends des bijoux, des bougies, du linge, des cours de yoga — pas des contenus."
              : "Everyone tells you you should be on social. Nobody tells you when you're supposed to find the time. You sell jewellery, candles, soap, yoga classes — not content."}
          </p>
          <p>
            {isFr
              ? "Les outils existants demandent que tu sois designer (Canva), copywriter (ChatGPT), planificateur (Buffer). Trois métiers en plus du tien. Pour la plupart des marques, c'est juste pas tenable."
              : "The tools out there assume you're a designer (Canva), a copywriter (ChatGPT), and a scheduler (Buffer). That's three extra jobs on top of yours. For most brands, that's just not sustainable."}
          </p>
          <p className="font-semibold" style={{ color: COLORS.ink}}>
            {isFr
              ? "Ora fait les trois pour toi. Tu envoies ta photo. Tu publies en un clic. Voilà."
              : "Ora does all three for you. You upload a photo. You publish in one click. That's it."}
          </p>
        </div>
      </section>

      {/* APPROACH */}
      <section className="border-t" style={{ borderColor: COLORS.line, background: "#FFFFFF" }}>
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
                icon: Palette, color: COLORS.coral, bg: "#FFF1ED",
                title: isFr ? "On lit ta marque" : "We read your brand",
                body: isFr
                  ? "Tu colles l'adresse de ton site. En 30 secondes, on apprend tes couleurs, ta typo, ton ton, ton style photo. Tu ne fais ça qu'une fois."
                  : "You paste your website URL. In 30 seconds, we learn your colours, your fonts, your tone, your photo style. You only do this once.",
              },
              {
                icon: Sparkles, color: "#0F766E", bg: "#F0FDFA",
                title: isFr ? "On garde ton produit" : "We keep your product",
                body: isFr
                  ? "Ton produit, c'est tes pixels. On ne le régénère pas, on ne l'invente pas, on ne le déforme pas. On compose la scène autour."
                  : "Your product is your pixels. We don't regenerate it, we don't reinvent it, we don't drift. We build the scene around it.",
              },
              {
                icon: Shield, color: "#1D4ED8", bg: "#EEF2FF",
                title: isFr ? "On poste pour toi" : "We post for you",
                body: isFr
                  ? "Instagram, LinkedIn, Facebook, TikTok — un clic et c'est en ligne. Pas de copier-coller, pas d'app à ouvrir l'une après l'autre."
                  : "Instagram, LinkedIn, Facebook, TikTok — one click and it's live. No copy-paste, no flipping between apps.",
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
                {isFr ? "Pas un Canva." : "Not a Canva."}
              </span>{" "}
              {isFr
                ? "On ne te donne pas un outil pour designer. On fait le design pour toi. Tu ne touches à rien."
                : "We don't give you a tool to design with. We do the design for you. You don't touch anything."}
            </li>
            <li>
              <span className="font-semibold" style={{ color: "#FFFFFF" }}>
                {isFr ? "Pas un ChatGPT pour images." : "Not a ChatGPT for images."}
              </span>{" "}
              {isFr
                ? "Tu n'écris rien. Tu uploads une photo. C'est tout. Aucun talent technique requis."
                : "You don't write anything. You upload a photo. That's it. No tech skills required."}
            </li>
            <li>
              <span className="font-semibold" style={{ color: "#FFFFFF" }}>
                {isFr ? "Pas une agence." : "Not an agency."}
              </span>{" "}
              {isFr
                ? "À €19/mois, on n'a pas le luxe d'un account manager. On a le luxe d'un produit qui marche tout seul."
                : "At €19/month, we don't have the luxury of an account manager. We have the luxury of a product that works on its own."}
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
          style={{ background: COLORS.ink, color: "#FFFFFF" }}
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
            {isFr ? "Drop ta photo. On poste." : "Drop your photo. We post."}
          </h2>
          <p className="mb-6" style={{ color: "#52525B" }}>
            {isFr ? "6 posts offerts pour essayer. Sans carte." : "6 free posts to try. No card."}
          </p>
          <Link
            to={user ? "/hub/surprise" : "/login?mode=signup&next=/hub/surprise"}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: COLORS.coral, color: "#FFFFFF" }}
          >
            {isFr ? "Essayer maintenant" : "Try it now"} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </div>
  );
}

import { Link } from "react-router";

const sections = [
  {
    title: "1. Objet et acceptation des CGU",
    content: `Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions d'utilisation de la plateforme ORA Studio (ci-après « le Service »), accessible à l'adresse ora-studio.app.

En accédant au Service ou en créant un compte, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Service.`,
  },
  {
    title: "2. Description du Service",
    content: `ORA Studio est une plateforme de création de contenu professionnel propulsée par l'intelligence artificielle. Le Service permet de :

• Générer des contenus texte, image, vidéo et audio à partir de prompts
• Accéder à plus de 38 modèles d'IA de dernière génération
• Comparer les résultats de plusieurs modèles en parallèle
• Gérer une identité de marque (Brand Vault) connectée à chaque création
• Planifier et organiser des campagnes de contenu`,
  },
  {
    title: "3. Conditions d'inscription et de compte",
    content: `Pour utiliser le Service, vous devez créer un compte en fournissant une adresse e-mail valide. Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toute activité effectuée depuis votre compte.

Vous devez être âgé d'au moins 16 ans pour utiliser le Service. En créant un compte, vous déclarez que les informations fournies sont exactes et à jour.`,
  },
  {
    title: "4. Plans et tarification",
    content: `ORA Studio propose les plans suivants :

• Starter — 29 €/mois : accès aux modèles essentiels, 500 crédits mensuels
• Pro — 79 €/mois : accès à tous les modèles, 2 000 crédits mensuels, Brand Vault
• Business — 149 €/mois : crédits illimités, accès prioritaire, analytics avancés, support dédié

Un plan gratuit avec 50 crédits est disponible pour découvrir le Service. Les crédits non utilisés sont reportés indéfiniment. Les tarifs peuvent évoluer avec un préavis de 30 jours.`,
  },
  {
    title: "5. Propriété intellectuelle",
    content: `Les contenus générés via ORA Studio à l'aide de l'intelligence artificielle appartiennent intégralement à l'utilisateur qui les a créés. Vous êtes libre d'utiliser, modifier, publier et commercialiser vos créations sans restriction.

La marque ORA Studio, son logo, son interface et ses éléments graphiques sont la propriété exclusive d'ORA Studio et ne peuvent être reproduits sans autorisation écrite.`,
  },
  {
    title: "6. Utilisation des IA tierces",
    content: `Le Service intègre des modèles d'intelligence artificielle développés par des tiers, notamment Luma, Flux, DALL-E, Stable Diffusion, Midjourney, Kling, Sora, Gemini, Claude et d'autres. L'utilisation de ces modèles est soumise aux conditions d'utilisation respectives de chaque fournisseur.

ORA Studio agit en tant qu'intermédiaire technique et ne saurait être tenu responsable des résultats produits par ces modèles tiers.`,
  },
  {
    title: "7. Responsabilités et limitations",
    content: `ORA Studio s'engage à fournir un service de qualité avec une disponibilité optimale. Toutefois, le Service est fourni « en l'état » et ORA Studio ne garantit pas :

• L'absence d'interruptions ou d'erreurs
• L'adéquation des résultats générés à un usage spécifique
• La disponibilité permanente de l'ensemble des modèles d'IA

L'utilisateur est seul responsable de l'utilisation qu'il fait des contenus générés et s'engage à ne pas utiliser le Service à des fins illicites, diffamatoires, ou portant atteinte aux droits de tiers.`,
  },
  {
    title: "8. Données personnelles",
    content: `ORA Studio collecte et traite des données personnelles dans le respect du Règlement Général sur la Protection des Données (RGPD). Pour en savoir plus sur la collecte, le traitement et la protection de vos données, veuillez consulter notre Politique de Confidentialité.`,
    link: { label: "Consulter la Politique de Confidentialité", href: "/privacy" },
  },
  {
    title: "9. Résiliation",
    content: `Vous pouvez résilier votre compte à tout moment depuis les paramètres de votre profil. La résiliation prend effet à la fin de la période de facturation en cours. Les crédits restants ne sont pas remboursables.

ORA Studio se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU, sans préavis ni indemnité.`,
  },
  {
    title: "10. Modification des CGU",
    content: `ORA Studio se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle par e-mail ou notification dans l'application. La poursuite de l'utilisation du Service après modification vaut acceptation des nouvelles CGU.`,
  },
  {
    title: "11. Droit applicable et juridiction",
    content: `Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux compétents de Paris seront seuls compétents.`,
  },
  {
    title: "12. Contact",
    content: `Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse suivante :`,
    email: "hello@ora-studio.app",
  },
];

export function TermsPage() {
  return (
    <div style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="pt-20 pb-12 px-6" style={{ background: "#111111" }}>
        <div className="max-w-[760px] mx-auto">
          <p
            className="mb-3"
            style={{
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Légal
          </p>
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            Conditions Générales d'Utilisation
          </h1>
          <p
            className="mt-4"
            style={{
              fontSize: "15px",
              fontFamily: "'Inter', sans-serif",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.6,
            }}
          >
            Dernière mise à jour : 31 mars 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[760px] mx-auto px-6 py-16">
        <div className="flex flex-col gap-12">
          {sections.map((section) => (
            <div key={section.title}>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  color: "var(--foreground)",
                  letterSpacing: "-0.02em",
                  marginBottom: 12,
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  fontFamily: "'Inter', sans-serif",
                  color: "var(--muted-foreground)",
                  lineHeight: 1.75,
                  whiteSpace: "pre-line",
                }}
              >
                {section.content}
              </p>
              {section.link && (
                <Link
                  to={section.link.href}
                  className="inline-block mt-3 transition-opacity hover:opacity-70"
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--foreground)",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  {section.link.label}
                </Link>
              )}
              {section.email && (
                <a
                  href={`mailto:${section.email}`}
                  className="inline-block mt-2 transition-opacity hover:opacity-70"
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--foreground)",
                  }}
                >
                  {section.email}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

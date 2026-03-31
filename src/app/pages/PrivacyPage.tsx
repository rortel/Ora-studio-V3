import { Link } from "react-router";

const sections = [
  {
    title: "1. Identité du responsable de traitement",
    content: `Le responsable du traitement des données personnelles collectées via la plateforme ORA Studio (accessible à l'adresse ora-studio.app) est la société ORA Studio.

Pour toute question relative à la protection de vos données, vous pouvez contacter notre Délégué à la Protection des Données (DPO) à l'adresse : privacy@ora-studio.app`,
  },
  {
    title: "2. Données collectées",
    content: `Dans le cadre de l'utilisation du Service, nous collectons les catégories de données suivantes :

• Données d'identification : adresse e-mail, nom et prénom (le cas échéant)
• Données de compte : plan souscrit, historique de crédits, préférences
• Contenus créés : prompts, images, vidéos, textes et fichiers audio générés via le Service
• Données de navigation : adresse IP, type de navigateur, pages consultées, durée de session
• Données de paiement : traitées par notre prestataire de paiement (Stripe), nous ne stockons pas vos informations bancaires`,
  },
  {
    title: "3. Finalités du traitement",
    content: `Vos données sont traitées pour les finalités suivantes :

• Fourniture et gestion du Service (création de compte, génération de contenus, gestion des crédits)
• Amélioration du Service (analyse d'usage anonymisée, performances techniques)
• Communication (notifications de service, mises à jour, newsletter avec votre consentement)
• Facturation et gestion des abonnements
• Respect des obligations légales et réglementaires
• Sécurité et prévention des abus`,
  },
  {
    title: "4. Base juridique (RGPD)",
    content: `Conformément au Règlement Général sur la Protection des Données (RGPD), le traitement de vos données repose sur les bases juridiques suivantes :

• Exécution du contrat : traitement nécessaire à la fourniture du Service auquel vous avez souscrit
• Consentement : pour l'envoi de communications marketing et l'utilisation de certains cookies
• Intérêt légitime : amélioration du Service, sécurité, prévention de la fraude
• Obligation légale : conservation de données à des fins comptables et fiscales`,
  },
  {
    title: "5. Hébergement des données",
    content: `Vos données sont hébergées par les prestataires suivants :

• Supabase (base de données et authentification) — serveurs situés dans l'Union européenne
• Vercel (hébergement de l'application web) — réseau mondial avec nœuds européens
• Stripe (paiements) — certifié PCI DSS niveau 1

Nous veillons à ce que l'ensemble de nos prestataires respectent les exigences du RGPD et offrent des garanties appropriées en matière de protection des données.`,
  },
  {
    title: "6. Durée de conservation",
    content: `Vos données sont conservées selon les durées suivantes :

• Données de compte : pendant toute la durée de votre inscription, puis 3 ans après la suppression du compte
• Contenus générés : pendant toute la durée de votre inscription, supprimés dans les 30 jours suivant la clôture du compte
• Données de navigation : 13 mois maximum
• Données de facturation : 10 ans conformément aux obligations comptables légales
• Logs de sécurité : 12 mois`,
  },
  {
    title: "7. Cookies et traceurs",
    content: `ORA Studio utilise des cookies pour :

• Cookies essentiels : fonctionnement du Service (authentification, préférences de session). Ces cookies sont nécessaires et ne requièrent pas votre consentement.
• Cookies analytiques : mesure d'audience et amélioration du Service (avec votre consentement)
• Cookies de performance : optimisation des temps de chargement

Vous pouvez gérer vos préférences en matière de cookies à tout moment via les paramètres de votre navigateur ou le bandeau de consentement affiché lors de votre première visite.`,
  },
  {
    title: "8. Droits des utilisateurs",
    content: `Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :

• Droit d'accès : obtenir une copie de l'ensemble de vos données
• Droit de rectification : corriger des données inexactes ou incomplètes
• Droit de suppression : demander l'effacement de vos données (« droit à l'oubli »)
• Droit à la portabilité : recevoir vos données dans un format structuré et réutilisable
• Droit d'opposition : vous opposer au traitement de vos données pour des motifs légitimes
• Droit à la limitation : restreindre le traitement de vos données dans certains cas

Pour exercer vos droits, contactez-nous à : privacy@ora-studio.app. Nous nous engageons à répondre dans un délai de 30 jours.

Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés).`,
  },
  {
    title: "9. Transferts internationaux",
    content: `Certains de nos prestataires peuvent être situés en dehors de l'Espace Économique Européen. Dans ce cas, les transferts de données sont encadrés par :

• Des clauses contractuelles types approuvées par la Commission européenne
• Le cadre UE-US Data Privacy Framework pour les transferts vers les États-Unis
• Des mesures techniques et organisationnelles complémentaires garantissant un niveau de protection adéquat`,
  },
  {
    title: "10. Sécurité des données",
    content: `ORA Studio met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données, notamment :

• Chiffrement des données en transit (TLS) et au repos
• Authentification sécurisée et gestion des accès
• Sauvegardes régulières et redondance des données
• Surveillance continue des systèmes et détection des intrusions`,
  },
  {
    title: "11. Modifications de la politique",
    content: `La présente Politique de Confidentialité peut être modifiée à tout moment. En cas de modification substantielle, nous vous en informerons par e-mail ou notification dans l'application. La date de dernière mise à jour est indiquée en haut de ce document.`,
  },
  {
    title: "12. Contact",
    content: `Pour toute question relative à la protection de vos données personnelles :`,
    contacts: [
      { label: "DPO", email: "privacy@ora-studio.app" },
      { label: "Contact général", email: "hello@ora-studio.app" },
    ],
  },
];

export function PrivacyPage() {
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
            Politique de Confidentialité
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
              {section.contacts && (
                <div className="mt-3 flex flex-col gap-1">
                  {section.contacts.map((c) => (
                    <a
                      key={c.email}
                      href={`mailto:${c.email}`}
                      className="transition-opacity hover:opacity-70"
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        color: "var(--foreground)",
                      }}
                    >
                      {c.label} : {c.email}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Cross-link */}
        <div
          className="mt-16 pt-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            style={{
              fontSize: "14px",
              fontFamily: "'Inter', sans-serif",
              color: "var(--muted-foreground)",
            }}
          >
            Voir aussi :{" "}
            <Link
              to="/terms"
              className="transition-opacity hover:opacity-70"
              style={{
                fontWeight: 600,
                color: "var(--foreground)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Conditions Générales d'Utilisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

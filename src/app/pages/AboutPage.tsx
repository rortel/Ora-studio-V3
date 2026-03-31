import { Link } from "react-router";
import { motion } from "motion/react";
import { OraLogo } from "../components/OraLogo";
import { Layers, GitCompareArrows, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "+38 modèles d'IA",
    description:
      "Texte, image, vidéo, audio — accédez aux meilleurs modèles du marché depuis une seule interface.",
  },
  {
    icon: GitCompareArrows,
    title: "Comparez en un clic",
    description:
      "Envoyez un prompt à plusieurs modèles simultanément et choisissez le meilleur résultat.",
  },
  {
    icon: Shield,
    title: "Brand Vault",
    description:
      "Votre identité de marque connectée à chaque création : charte graphique, ton, logos et assets.",
  },
  {
    icon: Zap,
    title: "De l'idée à la publication",
    description:
      "15 minutes suffisent pour passer d'un brief à un contenu professionnel prêt à publier.",
  },
];

const values = [
  {
    title: "Innovation",
    description: "Nous intégrons les derniers modèles d'IA dès leur sortie pour vous donner une longueur d'avance.",
  },
  {
    title: "Simplicité",
    description: "Une interface pensée pour que la puissance de l'IA reste accessible à tous les créatifs.",
  },
  {
    title: "Qualité",
    description: "Chaque fonctionnalité est conçue pour produire des résultats de niveau professionnel.",
  },
  {
    title: "Transparence",
    description: "Tarifs clairs, données protégées, contenus qui vous appartiennent. Pas de zones grises.",
  },
];

export function AboutPage() {
  return (
    <div>
      {/* Hero — dark */}
      <div
        className="relative overflow-hidden pt-24 pb-20 px-6"
        style={{ background: "#111111" }}
      >
        <div className="max-w-[900px] mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex justify-center mb-8">
              <OraLogo size={40} animate={false} color="rgba(255,255,255,0.6)" />
            </div>
            <h1
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                color: "#FFFFFF",
                letterSpacing: "-0.035em",
                lineHeight: 1.1,
              }}
            >
              Create with every AI.
            </h1>
            <p
              className="mt-2"
              style={{
                fontSize: "clamp(20px, 4vw, 32px)",
                fontWeight: 500,
                fontFamily: "'Inter', sans-serif",
                color: "rgba(255,255,255,0.4)",
                letterSpacing: "-0.02em",
                lineHeight: 1.3,
              }}
            >
              As simple as a message.
            </p>
          </motion.div>

          <motion.p
            className="mt-8 mx-auto"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontSize: "16px",
              fontFamily: "'Inter', sans-serif",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            ORA Studio est la plateforme qui démocratise la création de contenu
            professionnel grâce à l'intelligence artificielle. Une seule interface,
            tous les modèles, des résultats exceptionnels.
          </motion.p>
        </div>

        {/* Subtle gradient orb */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Mission */}
      <div className="py-20 px-6" style={{ background: "var(--background)" }}>
        <div className="max-w-[760px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="mb-3"
              style={{
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                color: "var(--muted-foreground)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Notre mission
            </p>
            <h2
              style={{
                fontSize: "clamp(24px, 4vw, 36px)",
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                color: "var(--foreground)",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
              }}
            >
              Démocratiser la création de contenu professionnel grâce à l'IA
            </h2>
            <p
              className="mt-6"
              style={{
                fontSize: "16px",
                fontFamily: "'Inter', sans-serif",
                color: "var(--muted-foreground)",
                lineHeight: 1.75,
                maxWidth: 600,
              }}
            >
              Nous croyons que chaque créateur, entrepreneur et équipe marketing
              devrait pouvoir produire du contenu de qualité professionnelle — sans
              expertise technique, sans multiplier les outils, sans compromis sur
              la qualité.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features grid */}
      <div className="py-20 px-6" style={{ background: "var(--secondary)" }}>
        <div className="max-w-[960px] mx-auto">
          <motion.p
            className="mb-3 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              color: "var(--muted-foreground)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Ce qui rend ORA différent
          </motion.p>
          <motion.h2
            className="text-center mb-14"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              color: "var(--foreground)",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              marginTop: 8,
            }}
          >
            Tout ce dont vous avez besoin, au même endroit
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl p-8"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "var(--primary)" }}
                >
                  <f.icon size={18} color="var(--primary-foreground)" strokeWidth={2} />
                </div>
                <h3
                  style={{
                    fontSize: "17px",
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--foreground)",
                    letterSpacing: "-0.02em",
                    marginBottom: 8,
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "15px",
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--muted-foreground)",
                    lineHeight: 1.65,
                  }}
                >
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="py-20 px-6" style={{ background: "var(--background)" }}>
        <div className="max-w-[760px] mx-auto">
          <motion.p
            className="mb-3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{
              fontSize: "12px",
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              color: "var(--muted-foreground)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Nos valeurs
          </motion.p>
          <motion.h2
            className="mb-12"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            style={{
              fontSize: "clamp(24px, 4vw, 32px)",
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              color: "var(--foreground)",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}
          >
            Ce en quoi nous croyons
          </motion.h2>

          <div className="flex flex-col gap-8">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="flex gap-6 items-start"
              >
                <div
                  className="w-1 rounded-full shrink-0 mt-1"
                  style={{ height: 40, background: "var(--foreground)" }}
                />
                <div>
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      color: "var(--foreground)",
                      letterSpacing: "-0.02em",
                      marginBottom: 4,
                    }}
                  >
                    {v.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "15px",
                      fontFamily: "'Inter', sans-serif",
                      color: "var(--muted-foreground)",
                      lineHeight: 1.65,
                    }}
                  >
                    {v.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 px-6" style={{ background: "#111111" }}>
        <div className="max-w-[600px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2
              style={{
                fontSize: "clamp(24px, 5vw, 36px)",
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                color: "#FFFFFF",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
              }}
            >
              Rejoignez-nous
            </h2>
            <p
              className="mt-4 mx-auto"
              style={{
                fontSize: "16px",
                fontFamily: "'Inter', sans-serif",
                color: "rgba(255,255,255,0.45)",
                lineHeight: 1.7,
                maxWidth: 440,
              }}
            >
              50 crédits offerts pour découvrir la puissance d'ORA Studio.
              Aucune carte bancaire requise.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login?mode=signup"
                className="px-8 py-3.5 rounded-full transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: "#FFFFFF",
                  color: "#111111",
                  fontSize: "15px",
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                Créer votre compte gratuit
              </Link>
              <a
                href="mailto:hello@ora-studio.app"
                className="px-6 py-3.5 rounded-full transition-opacity hover:opacity-80"
                style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                hello@ora-studio.app
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

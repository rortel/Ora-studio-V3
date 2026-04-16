import { motion } from "motion/react";
import { Link } from "react-router";
import {
  Upload,
  BarChart3,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Layers,
} from "lucide-react";
import { Hero } from "../components/Hero";
import { Pricing } from "../components/Pricing";
import { useI18n } from "../lib/i18n";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Landing Page — Ora Studio V3: AI Content Auditor
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const FONT = "'Inter', sans-serif";

/* ── Animated SVG score gauge ─────────────────── */

function ScoreGauge({
  score,
  size = 120,
  strokeWidth = 8,
  label,
  color,
  delay = 0,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  color: string;
  delay?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay, ease: "easeOut" }}
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
          }}
        />
        {/* Score text */}
        <motion.text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--foreground)"
          style={{ fontFamily: FONT, fontSize: size * 0.26, fontWeight: 600 }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: delay + 0.6 }}
        >
          {score}
        </motion.text>
      </svg>
      <span
        style={{
          fontFamily: FONT,
          fontSize: 13,
          fontWeight: 500,
          color: "var(--muted-foreground)",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── How It Works ─────────────────────────────── */

function HowItWorks() {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  const steps = [
    {
      icon: <Upload size={24} />,
      title: isFr ? "Importez" : "Upload",
      desc: isFr
        ? "Glissez n'importe quel visuel IA dans Ora. PNG, JPG, WebP \u2014 c'est tout."
        : "Drop any AI-generated visual into Ora. PNG, JPG, WebP \u2014 that's it.",
    },
    {
      icon: <BarChart3 size={24} />,
      title: isFr ? "Analysez" : "Score",
      desc: isFr
        ? "Recevez un score sur 4 axes : Technique, Cr\u00e9atif, Brand Fit, Conformit\u00e9."
        : "Get scored across 4 axes: Technical, Creative, Brand Fit, Compliance.",
    },
    {
      icon: <Sparkles size={24} />,
      title: isFr ? "Am\u00e9liorez" : "Improve",
      desc: isFr
        ? "Suivez les recommandations, corrigez vos prompts et reg\u00e9n\u00e9rez en un clic."
        : "Follow actionable recommendations, fix your prompts, and regenerate in one click.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-28 md:py-36"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-[960px] mx-auto px-6">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p
            style={{
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7C3AED",
              marginBottom: 12,
            }}
          >
            {isFr ? "Comment \u00e7a marche" : "How it works"}
          </p>
          <h2
            style={{
              fontFamily: FONT,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "var(--foreground)",
            }}
          >
            {isFr ? "Trois \u00e9tapes. Z\u00e9ro friction." : "Three steps. Zero friction."}
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              {/* Step number + icon */}
              <div
                className="mb-6 flex items-center justify-center"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  color: "#7C3AED",
                }}
              >
                {step.icon}
              </div>
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                  marginBottom: 8,
                }}
              >
                {isFr ? `\u00c9tape ${i + 1}` : `Step ${i + 1}`}
              </span>
              <h3
                style={{
                  fontFamily: FONT,
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--foreground)",
                  marginBottom: 8,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--muted-foreground)",
                  maxWidth: 280,
                }}
              >
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Score Demo ───────────────────────────────── */

function ScoreDemo() {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  const axes = [
    { label: isFr ? "Technique" : "Technical", score: 81, color: "#7C3AED" },
    { label: isFr ? "Cr\u00e9atif" : "Creative", score: 70, color: "#EC4899" },
    { label: "Brand Fit", score: 68, color: "#F59E0B" },
    { label: isFr ? "Conformit\u00e9" : "Compliance", score: 77, color: "#10B981" },
  ];

  const issues = [
    {
      icon: <AlertTriangle size={14} />,
      text: isFr
        ? "R\u00e9solution insuffisante pour l'impression grand format"
        : "Resolution too low for large-format print",
      severity: "warning" as const,
    },
    {
      icon: <AlertTriangle size={14} />,
      text: isFr
        ? "Palette de couleurs hors charte de marque"
        : "Color palette outside brand guidelines",
      severity: "warning" as const,
    },
    {
      icon: <CheckCircle2 size={14} />,
      text: isFr
        ? "Composition respecte la r\u00e8gle des tiers"
        : "Composition follows rule of thirds",
      severity: "ok" as const,
    },
  ];

  const recommendations = [
    isFr
      ? "Ajoutez \u00ab\u2009--quality 2 --upscale 4x\u2009\u00bb \u00e0 votre prompt pour am\u00e9liorer la r\u00e9solution"
      : "Add \"--quality 2 --upscale 4x\" to your prompt to improve resolution",
    isFr
      ? "Sp\u00e9cifiez les codes HEX de votre marque dans le prompt pour corriger la palette"
      : "Specify your brand HEX codes in the prompt to correct the palette",
    isFr
      ? "Essayez Midjourney v6 ou DALL\u00b7E 3 pour un meilleur rendu des textures"
      : "Try Midjourney v6 or DALL\u00b7E 3 for better texture rendering",
  ];

  return (
    <section
      className="py-28 md:py-36"
      style={{ background: "var(--card)" }}
    >
      <div className="max-w-[1080px] mx-auto px-6">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p
            style={{
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7C3AED",
              marginBottom: 12,
            }}
          >
            {isFr ? "Votre score Ora" : "Your Ora Score"}
          </p>
          <h2
            style={{
              fontFamily: FONT,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "var(--foreground)",
            }}
          >
            {isFr
              ? "Chaque visuel, not\u00e9 et expliqu\u00e9"
              : "Every visual, scored and explained"}
          </h2>
        </motion.div>

        {/* Score card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="grid md:grid-cols-[1fr_1.4fr] gap-0">
            {/* Left — image placeholder + overall score */}
            <div
              className="flex flex-col items-center justify-center p-10 md:p-12"
              style={{ borderRight: "1px solid var(--border)" }}
            >
              {/* Sample image placeholder */}
              <div
                className="w-full rounded-xl mb-8 flex items-center justify-center"
                style={{
                  aspectRatio: "4/3",
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.08))",
                  border: "1px solid var(--border)",
                  maxWidth: 320,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT,
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                  }}
                >
                  {isFr ? "visuel_campagne_v3.png" : "campaign_visual_v3.png"}
                </span>
              </div>

              {/* Overall score */}
              <ScoreGauge
                score={74}
                size={140}
                strokeWidth={10}
                label={isFr ? "Score global" : "Overall Score"}
                color="#7C3AED"
              />
            </div>

            {/* Right — axis breakdown + issues + recommendations */}
            <div className="p-10 md:p-12">
              {/* 4 axis gauges */}
              <div className="grid grid-cols-4 gap-4 mb-10">
                {axes.map((axis, i) => (
                  <ScoreGauge
                    key={axis.label}
                    score={axis.score}
                    size={88}
                    strokeWidth={6}
                    label={axis.label}
                    color={axis.color}
                    delay={i * 0.12}
                  />
                ))}
              </div>

              {/* Divider */}
              <div
                className="mb-8"
                style={{ height: 1, background: "var(--border)" }}
              />

              {/* Issues */}
              <div className="mb-8">
                <h4
                  style={{
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--muted-foreground)",
                    marginBottom: 12,
                  }}
                >
                  {isFr ? "Probl\u00e8mes d\u00e9tect\u00e9s" : "Issues detected"}
                </h4>
                <ul className="space-y-3">
                  {issues.map((issue, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className="mt-0.5"
                        style={{
                          color:
                            issue.severity === "warning"
                              ? "#F59E0B"
                              : "#10B981",
                        }}
                      >
                        {issue.icon}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT,
                          fontSize: 14,
                          color: "var(--foreground)",
                          lineHeight: 1.5,
                        }}
                      >
                        {issue.text}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div>
                <h4
                  style={{
                    fontFamily: FONT,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--muted-foreground)",
                    marginBottom: 12,
                  }}
                >
                  {isFr ? "Recommandations" : "Recommendations"}
                </h4>
                <ol className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className="flex-shrink-0 flex items-center justify-center rounded-full"
                        style={{
                          width: 20,
                          height: 20,
                          background: "rgba(124,58,237,0.1)",
                          fontFamily: FONT,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#7C3AED",
                          marginTop: 1,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          fontFamily: FONT,
                          fontSize: 14,
                          color: "var(--foreground)",
                          lineHeight: 1.5,
                        }}
                      >
                        {rec}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Benefits ─────────────────────────────────── */

function Benefits() {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  const cards = [
    {
      icon: <AlertTriangle size={22} />,
      title: isFr ? "Identifiez les probl\u00e8mes" : "Know what's wrong",
      desc: isFr
        ? "Chaque visuel est analys\u00e9 sur 4 axes. Fini les discussions subjectives \u2014 vos d\u00e9cisions sont guid\u00e9es par des donn\u00e9es."
        : "Every visual is analyzed across 4 axes. No more subjective debates \u2014 decisions are backed by data.",
      color: "#7C3AED",
    },
    {
      icon: <Sparkles size={22} />,
      title: isFr ? "Corrigez vos prompts" : "Fix your prompts",
      desc: isFr
        ? "Des recommandations concr\u00e8tes pour am\u00e9liorer vos r\u00e9sultats \u2014 ajustements de prompt, param\u00e8tres, mod\u00e8les sugg\u00e9r\u00e9s."
        : "Actionable recommendations to improve your output \u2014 prompt tweaks, parameter adjustments, suggested models.",
      color: "#EC4899",
    },
    {
      icon: <TrendingUp size={22} />,
      title: isFr ? "Suivez votre progression" : "Track your progress",
      desc: isFr
        ? "Un tableau de bord pour mesurer la qualit\u00e9 de vos cr\u00e9ations dans le temps et identifier les tendances."
        : "A dashboard to measure your creative quality over time and spot trends across your team.",
      color: "#10B981",
    },
    {
      icon: <Layers size={22} />,
      title: isFr ? "Comparez 50+ mod\u00e8les" : "Compare 50+ models",
      desc: isFr
        ? "Testez le m\u00eame prompt sur plusieurs mod\u00e8les IA et comparez les scores pour trouver le meilleur outil."
        : "Test the same prompt across multiple AI models and compare scores to find the best tool for the job.",
      color: "#F59E0B",
    },
  ];

  return (
    <section
      className="py-28 md:py-36"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-[1080px] mx-auto px-6">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <p
            style={{
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7C3AED",
              marginBottom: 12,
            }}
          >
            {isFr ? "Pourquoi Ora" : "Why Ora"}
          </p>
          <h2
            style={{
              fontFamily: FONT,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "var(--foreground)",
            }}
          >
            {isFr
              ? "De meilleurs visuels, \u00e0 chaque it\u00e9ration"
              : "Better visuals, every iteration"}
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl p-8 md:p-10 transition-shadow duration-300 hover:shadow-lg"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl mb-6"
                style={{
                  width: 48,
                  height: 48,
                  background: `${card.color}12`,
                  color: card.color,
                }}
              >
                {card.icon}
              </div>
              <h3
                style={{
                  fontFamily: FONT,
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                  color: "var(--foreground)",
                  marginBottom: 8,
                }}
              >
                {card.title}
              </h3>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "var(--muted-foreground)",
                }}
              >
                {card.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Final CTA ────────────────────────────────── */

function FinalCTA() {
  const { locale } = useI18n();
  const isFr = locale === "fr";

  return (
    <section className="py-28 md:py-36" style={{ background: "var(--background)" }}>
      <div className="max-w-[640px] mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2
            style={{
              fontFamily: FONT,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 300,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "var(--foreground)",
              marginBottom: 16,
            }}
          >
            {isFr
              ? "Analysez votre premier visuel"
              : "Analyze your first visual"}
          </h2>
          <p
            style={{
              fontFamily: FONT,
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--muted-foreground)",
              marginBottom: 32,
            }}
          >
            {isFr
              ? "Gratuit. Sans carte bancaire. R\u00e9sultats en moins de 30 secondes."
              : "Free. No credit card. Results in under 30 seconds."}
          </p>
          <Link
            to="/hub/analyze"
            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              color: "#FFFFFF",
              fontFamily: FONT,
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {isFr
              ? "Analyser un visuel gratuitement"
              : "Analyze a visual for free"}
            <ArrowRight
              size={16}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Landing page composition ─────────────────── */

export function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ScoreDemo />
      <Benefits />
      <Pricing />
      <FinalCTA />
    </>
  );
}

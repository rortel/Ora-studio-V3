import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useI18n } from "../lib/i18n";

export function CTASection() {
  const { t } = useI18n();
  return (
    <section className="py-32 md:py-44" style={{ background: "#FAFAFA" }}>
      <div className="max-w-[900px] mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
          style={{
            fontSize: "clamp(3rem, 6vw, 5.5rem)",
            fontWeight: 300,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#111111",
            fontFamily: "'Inter', sans-serif",
            marginBottom: 24,
          }}
        >
          {t("cta.title")}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          style={{
            fontSize: "16px",
            lineHeight: 1.6,
            fontFamily: "'Inter', sans-serif",
            color: "#9A9590",
            fontWeight: 400,
            marginBottom: 36,
          }}
        >
          {t("cta.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-3"
        >
          <Link
            to="/login?mode=signup"
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #EC4899)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {t("cta.cta")}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 px-5 py-3.5 rounded-full transition-all hover:bg-black/[0.03]"
            style={{
              fontSize: "14px",
              fontWeight: 400,
              fontFamily: "'Inter', sans-serif",
              color: "#9A9590",
            }}
          >
            {t("cta.ctaSecondary")}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

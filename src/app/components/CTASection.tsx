import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section
      className="py-16 md:py-32"
      style={{ background: "#0A0A0A", borderTop: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="max-w-[900px] mx-auto px-5 md:px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.40)",
            marginBottom: 24,
          }}
        >
          Start now
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            fontWeight: 300,
            lineHeight: 1.05,
            letterSpacing: "-0.055em",
            color: "#F0EDE8",
            marginBottom: 24,
          }}
        >
          Create without limits.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.16, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: "16px",
            lineHeight: 1.6,
            color: "rgba(240,237,232,0.40)",
            maxWidth: 420,
            margin: "0 auto 44px",
          }}
        >
          50 free credits. No credit card required.
          <br />
          Your first creation in under a minute.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.24, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/login?mode=signup"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: "#FFFFFF",
              color: "#0A0A0A",
              fontSize: "15px",
              fontWeight: 700,
              boxShadow: "0 4px 28px rgba(255,255,255,0.12)",
              letterSpacing: "-0.01em",
            }}
          >
            Start for free
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform duration-300"
            />
          </Link>

          <Link
            to="/#pricing"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl transition-all hover:bg-white/5"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "rgba(240,237,232,0.50)",
              border: "1px solid rgba(255,255,255,0.10)",
              letterSpacing: "-0.01em",
            }}
          >
            View pricing
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: "12px",
            color: "rgba(255,255,255,0.16)",
            marginTop: 32,
            letterSpacing: "0.02em",
          }}
        >
          No commitment · GDPR compliant · Cancel anytime
        </motion.p>
      </div>
    </section>
  );
}

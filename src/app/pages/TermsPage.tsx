import { Link } from "react-router";
import { useI18n } from "../lib/i18n";

export function TermsPage() {
  const { t } = useI18n();

  const sectionKeys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

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
            {t("terms.headerLabel")}
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
            {t("terms.title")}
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
            {t("terms.lastUpdated")}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[760px] mx-auto px-6 py-16">
        <div className="flex flex-col gap-12">
          {sectionKeys.map((n) => (
            <div key={n}>
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
                {t(`terms.s${n}Title`)}
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
                {t(`terms.s${n}Content`)}
              </p>
              {n === 8 && (
                <Link
                  to="/privacy"
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
                  {t("terms.s8LinkLabel")}
                </Link>
              )}
              {n === 12 && (
                <a
                  href="mailto:hello@ora-studio.app"
                  className="inline-block mt-2 transition-opacity hover:opacity-70"
                  style={{
                    fontSize: "15px",
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--foreground)",
                  }}
                >
                  hello@ora-studio.app
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

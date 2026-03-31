import { Link } from "react-router";
import { useI18n } from "../lib/i18n";

export function PrivacyPage() {
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
            {t("privacy.headerLabel")}
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
            {t("privacy.title")}
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
            {t("privacy.lastUpdated")}
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
                {t(`privacy.s${n}Title`)}
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
                {t(`privacy.s${n}Content`)}
              </p>
              {n === 12 && (
                <div className="mt-3 flex flex-col gap-1">
                  <a
                    href="mailto:privacy@ora-studio.app"
                    className="transition-opacity hover:opacity-70"
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      color: "var(--foreground)",
                    }}
                  >
                    DPO : privacy@ora-studio.app
                  </a>
                  <a
                    href="mailto:hello@ora-studio.app"
                    className="transition-opacity hover:opacity-70"
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      color: "var(--foreground)",
                    }}
                  >
                    Contact : hello@ora-studio.app
                  </a>
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
            {t("privacy.seeAlso")}{" "}
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
              {t("privacy.seeAlsoLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

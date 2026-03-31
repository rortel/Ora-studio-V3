import { Link } from "react-router";
import { useI18n } from "../lib/i18n";
import { OraLogo } from "./OraLogo";


export function Footer() {
  const { t } = useI18n();
  const productLinks = [
    { label: t("footer.models"), href: "/models" },
    { label: t("footer.pricing"), href: "/pricing" },
    { label: t("footer.hub"), href: "/hub" },
  ];
  const companyLinks = [
    { label: t("footer.privacy"), href: "/privacy" },
    { label: t("footer.terms"), href: "/terms" },
    { label: t("footer.about"), href: "/about" },
  ];

  return (
    <footer style={{ background: "#111111" }}>
      <div className="max-w-[1200px] mx-auto px-6 py-14">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
          {/* Logo + tagline */}
          <div>
            <OraLogo size={24} animate={false} color="rgba(250,250,250,0.6)" />
            <p
              className="mt-3"
              style={{
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif",
                color: "rgba(250,250,250,0.3)",
                lineHeight: 1.5,
                maxWidth: 280,
              }}
            >
              {t("footer.tagline")}
            </p>
          </div>

          {/* Link columns */}
          <div className="flex gap-16">
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  color: "rgba(250,250,250,0.3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                {t("footer.product")}
              </p>
              <div className="flex flex-col gap-2.5">
                {productLinks.map((l) => (
                  <Link
                    key={l.label}
                    to={l.href}
                    className="transition-opacity hover:opacity-80"
                    style={{
                      fontSize: "14px",
                      fontFamily: "'Inter', sans-serif",
                      color: "rgba(250,250,250,0.5)",
                      fontWeight: 400,
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  color: "rgba(250,250,250,0.3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                {t("footer.legal")}
              </p>
              <div className="flex flex-col gap-2.5">
                {companyLinks.map((l) => (
                  <Link
                    key={l.label}
                    to={l.href}
                    className="transition-opacity hover:opacity-80"
                    style={{
                      fontSize: "14px",
                      fontFamily: "'Inter', sans-serif",
                      color: "rgba(250,250,250,0.5)",
                      fontWeight: 400,
                    }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="pt-6 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            style={{
              fontSize: "12px",
              fontFamily: "'Inter', sans-serif",
              color: "rgba(250,250,250,0.2)",
            }}
          >
            &copy; 2026 Ora Studio
          </p>
        </div>
      </div>
    </footer>
  );
}

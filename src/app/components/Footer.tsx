import { Link } from "react-router";
import { OraLogo } from "./OraLogo";

export function Footer() {
  const productLinks = [
    { label: "Models", href: "/models" },
    { label: "Pricing", href: "/pricing" },
    { label: "Hub", href: "/hub" },
  ];
  const companyLinks = [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
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
              AI-powered brand content studio. One brief, every format, always on-brand.
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
                Product
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
                Legal
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

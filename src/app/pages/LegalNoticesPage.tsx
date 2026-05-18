import { Link } from "react-router";

/**
 * Mentions légales required by French law (LCEN art. 6-III & art. 19,
 * Loi pour la confiance dans l'économie numérique, 2004). Publishes
 * the editor identity, contact, hosting provider and DPO so that any
 * visitor — and the DGCCRF / CNIL on demand — can identify the entity
 * responsible for the Service.
 *
 * VALUES BELOW ARE PLACEHOLDERS. Update with the real registered
 * company name, SIRET, capital, registered office and director before
 * production launch. The page is wired into routes (/legal-notices)
 * and linked from the Footer.
 */
export function LegalNoticesPage() {
  return (
    <div style={{ background: "var(--background)" }}>
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
            Legal
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
            Legal Notices
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
            Published in application of articles 6-III and 19 of the French Law n° 2004-575 of 21 June 2004 (LCEN).
          </p>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-6 py-16">
        <div className="flex flex-col gap-12">
          <Section title="1. Publisher of the Service">
            <p><strong>ORA Studio</strong> — TBC (company form, capital, SIRET, RCS, VAT number to be filled with the
            real corporate identity before launch).</p>
            <p>Registered office: TBC.</p>
            <p>Director of publication: TBC.</p>
            <p>Contact: <a href="mailto:hello@ora-studio.app" style={linkStyle}>hello@ora-studio.app</a></p>
          </Section>

          <Section title="2. Hosting Provider">
            <p>
              Frontend: <strong>Vercel Inc.</strong>, 440 N Barranca Avenue #4133, Covina, CA 91723, USA —
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={linkStyle}> vercel.com</a>
            </p>
            <p>
              Backend & database: <strong>Supabase Inc.</strong>, 970 Toa Payoh North #07-04, Singapore 318992 (EU region
              for ORA Studio data) — <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>supabase.com</a>
            </p>
          </Section>

          <Section title="3. Data Protection Officer (DPO)">
            <p>Contact: <a href="mailto:privacy@ora-studio.app" style={linkStyle}>privacy@ora-studio.app</a></p>
            <p>
              See our <Link to="/privacy" style={linkStyle}>Privacy Policy</Link> and our{" "}
              <Link to="/subprocessors" style={linkStyle}>Sub-processors list</Link>.
            </p>
          </Section>

          <Section title="4. Intellectual Property">
            <p>
              The ORA Studio interface, source code, logo and brand identity are protected by French and international
              intellectual property law. Any unauthorised reproduction, modification or commercial reuse is prohibited.
              Open-source dependencies are listed in our <Link to="/about" style={linkStyle}>About</Link> page.
            </p>
          </Section>

          <Section title="5. Reporting Illegal Content">
            <p>
              In application of article 6-I-5 of the LCEN, any illegal content generated, hosted or published through
              the Service may be reported to <a href="mailto:abuse@ora-studio.app" style={linkStyle}>abuse@ora-studio.app</a>.
              We commit to reviewing every report and to acting promptly when content is manifestly illegal.
            </p>
          </Section>

          <Section title="6. Accessibility Statement">
            <p>
              ORA Studio targets conformance with WCAG 2.1 level AA in line with the European Accessibility Act (EAA,
              applicable since June 2025). A full third-party audit is scheduled. For accessibility issues, contact
              <a href="mailto:hello@ora-studio.app" style={linkStyle}> hello@ora-studio.app</a> and we will respond within
              5 working days.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
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
        {title}
      </h2>
      <div
        style={{
          fontSize: "15px",
          fontFamily: "'Inter', sans-serif",
          color: "var(--muted-foreground)",
          lineHeight: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const linkStyle: React.CSSProperties = {
  color: "var(--foreground)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

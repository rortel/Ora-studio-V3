import { Link } from "react-router";

/**
 * Public sub-processors registry, required by GDPR Art. 28.4 and by
 * customers' Data Processing Agreements. Lists every third party that
 * processes user data on behalf of ORA Studio, the purpose of the
 * processing, the country of operation and the safeguard relied upon
 * for transfers outside the EEA (SCCs or Data Privacy Framework).
 *
 * Updated whenever a sub-processor is added, removed or changes
 * jurisdiction. Customers are notified by email 30 days before any
 * material change so they can object in line with their DPA.
 */
type Subprocessor = {
  name: string;
  purpose: string;
  country: string;
  transferBasis: string;
};

const PROVIDERS: { category: string; items: Subprocessor[] }[] = [
  {
    category: "Hosting & infrastructure",
    items: [
      { name: "Vercel Inc.", purpose: "Frontend hosting, CDN", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "Supabase Inc.", purpose: "Database, authentication, object storage (EU region)", country: "Singapore (data EU)", transferBasis: "SCCs" },
    ],
  },
  {
    category: "Payments",
    items: [
      { name: "Stripe Payments Europe Ltd.", purpose: "Payment processing, invoicing, dunning", country: "Ireland (EEA)", transferBasis: "Intra-EEA" },
    ],
  },
  {
    category: "Email & communications",
    items: [
      { name: "Resend Inc.", purpose: "Transactional email delivery (welcome, receipts, low-credit, pack-ready)", country: "United States", transferBasis: "SCCs + DPF" },
    ],
  },
  {
    category: "AI generation providers (process user prompts to produce outputs)",
    items: [
      { name: "Together AI Inc.", purpose: "Text generation (insights, captions) and image generation", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "APIPod", purpose: "Text generation gateway routing to OpenAI, Anthropic and Google models", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "OpenAI L.L.C.", purpose: "Text generation (direct fallback for APIPod and image generation in some flows)", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "Google LLC", purpose: "Text generation (Gemini, direct fallback)", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "Luma AI Inc.", purpose: "Image generation (Photon) and video generation fallback (Ray-2, Dream Machine)", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "Pollo AI", purpose: "Video generation gateway routing to 50+ models (Kling, Google Veo, OpenAI Sora, Runway, Pika, PixVerse, Minimax, Alibaba Wan, ByteDance Seedance, Luma Ray, Vidu, Hunyuan, Grok, Midjourney). Webhook-driven.", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "FAL.ai Inc.", purpose: "Image generation, video alternative path, background compositing", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "Photoroom SAS", purpose: "Pixel-perfect product cutout and background removal", country: "France (EEA)", transferBasis: "Intra-EEA" },
      { name: "Ideogram AI Inc.", purpose: "Image generation with legible typography (titles on social posts)", country: "United States", transferBasis: "SCCs + DPF" },
      { name: "Leonardo Interactive Pty Ltd", purpose: "Image generation (alternative)", country: "Australia", transferBasis: "SCCs" },
      { name: "Suno Inc.", purpose: "Background music generation for video assets", country: "United States", transferBasis: "SCCs + DPF" },
    ],
  },
  {
    category: "Web scraping & enrichment (Brand Vault)",
    items: [
      { name: "Jina AI GmbH", purpose: "Reading and indexing public web pages for brand extraction", country: "Germany (EEA)", transferBasis: "Intra-EEA" },
      { name: "ScrapingBee SAS", purpose: "Web scraping fallback when Jina is unavailable", country: "France (EEA)", transferBasis: "Intra-EEA" },
    ],
  },
];

export function SubprocessorsPage() {
  return (
    <div style={{ background: "var(--background)" }}>
      <div className="pt-20 pb-12 px-6" style={{ background: "#111111" }}>
        <div className="max-w-[920px] mx-auto">
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
            Sub-processors
          </h1>
          <p
            className="mt-4"
            style={{
              fontSize: "15px",
              fontFamily: "'Inter', sans-serif",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.65,
              maxWidth: 700,
            }}
          >
            Every third party that processes personal data on behalf of ORA Studio.
            Required by GDPR Art. 28. We notify customers by email at least 30 days before any addition or change of
            jurisdiction. See also our <Link to="/privacy" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
          <p
            className="mt-3"
            style={{
              fontSize: "13px",
              fontFamily: "'JetBrains Mono', monospace",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Last updated: May 18, 2026
          </p>
        </div>
      </div>

      <div className="max-w-[920px] mx-auto px-6 py-16">
        <div className="flex flex-col gap-12">
          {PROVIDERS.map((cat) => (
            <section key={cat.category}>
              <h2
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  fontFamily: "'Inter', sans-serif",
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {cat.category}
              </h2>
              <div
                role="table"
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--card)",
                }}
              >
                <div
                  role="row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 2.2fr 1fr 1fr",
                    gap: 12,
                    padding: "12px 16px",
                    background: "var(--muted)",
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--muted-foreground)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <div role="columnheader">Provider</div>
                  <div role="columnheader">Purpose</div>
                  <div role="columnheader">Country</div>
                  <div role="columnheader">Transfer basis</div>
                </div>
                {cat.items.map((p, i) => (
                  <div
                    key={p.name}
                    role="row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 2.2fr 1fr 1fr",
                      gap: 12,
                      padding: "14px 16px",
                      borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      fontSize: "14px",
                      fontFamily: "'Inter', sans-serif",
                      color: "var(--foreground)",
                      lineHeight: 1.5,
                    }}
                  >
                    <div role="cell" style={{ fontWeight: 500 }}>{p.name}</div>
                    <div role="cell" style={{ color: "var(--muted-foreground)" }}>{p.purpose}</div>
                    <div role="cell" style={{ color: "var(--muted-foreground)" }}>{p.country}</div>
                    <div role="cell" style={{ color: "var(--muted-foreground)" }}>{p.transferBasis}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section>
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
              Transfer safeguards
            </h2>
            <p style={{ fontSize: "15px", fontFamily: "'Inter', sans-serif", color: "var(--muted-foreground)", lineHeight: 1.75 }}>
              For each sub-processor located outside the EEA, ORA Studio signs the European Commission's Standard
              Contractual Clauses (SCCs, decision 2021/914) and, where the provider is certified, relies on the
              EU-US Data Privacy Framework (DPF). A Transfer Impact Assessment (TIA) has been conducted for every
              US-based provider; a summary is available on request to{" "}
              <a href="mailto:privacy@ora-studio.app" style={{ color: "var(--foreground)", textDecoration: "underline" }}>
                privacy@ora-studio.app
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

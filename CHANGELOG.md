# Changelog

All notable changes to ORA Studio. The format is loosely based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); we use
calendar-driven versions (`0.YY.M-patch`) instead of strict semver
because the app is a SaaS and rollbacks happen at the deployment
layer (Vercel + Supabase functions), not the npm version.

## [0.1.0] - 2026-05-18

This is the first tagged release. It bundles the comprehensive audit
remediation work — three deterministic security exploits closed, the
EU-AI-Act / GDPR transparency surface filled in, and the engineering
groundwork (tests, env scaffolding, dependabot) the project was
missing.

### Security
- Drop hardcoded admin email fallback in the client + server JWT
  decode paths (was granting role=admin and 999 999 credits to anyone
  who could set their Supabase Auth email to the literal).
- Drop email-based bypass and self-heal in `deductCredit()` /
  `getOrCreateProfile()` — admin status is now server-only via
  `profile.role === "admin"`.
- Move `POLLO_WEBHOOK_SECRET` to env (was hardcoded; ROTATE before
  re-enabling webhook traffic, the previous value is in git history).
- Harden `isValidScrapeUrl` (RFC1918, link-local, IPv6 loopback /
  ULA / link-local, `.internal` / `.local` TLDs); apply it to
  `/vault/scan-url`, `/products/scrape-url`, `/compare/scrape-urls`
  and `/image-proxy`. The proxy also refuses non-image
  `content-type` to stop being usable as an HTML/JS reflector.
- Single middleware guard puts every `/debug/*` and `/test-*` route
  behind admin auth — they used to call paid AI providers without
  deducting credits.
- CAS-with-retry on credit deduction to mitigate the KV
  read-modify-write race. Every debit/refund appended to
  `credit_ledger:<userId>:<ts>` for audit.
- Strict CSP, HSTS, Referrer-Policy, Permissions-Policy,
  X-Frame-Options, X-Content-Type-Options shipped via `vercel.json`.

### Legal & compliance
- New `/auth/export-data` endpoint streams every per-user record as
  a JSON download (GDPR art. 20). UI button in `/profile`.
- Public sub-processors registry at `/subprocessors` (GDPR art. 28.4)
  listing every AI/infra third party with country and transfer basis.
- Public legal notices at `/legal-notices` (LCEN art. 6-III & 19).
- Terms gain an explicit 14-day right-of-withdrawal clause for
  EU/UK consumers (L.221-18), the L.221-28 carve-out, pro-rata
  refund on cancellation, and the EU AI Act art. 50 transparency
  clause naming the provider registry and prohibiting deepfakes.
- Privacy s5 now lists every sub-processor with location and
  transfer basis (was "available on request").
- Cookie banner: granular consent (Essential / Analytics /
  Marketing), three top-level equal-weight actions per CNIL 2024
  guidance, ARIA dialog semantics.

### Accessibility
- Global `:focus-visible` ring using the brand accent on every
  interactive element. Visible skip-to-content link.
- `prefers-reduced-motion` media query disables animations for
  users who request it.

### SEO
- Title + meta description rewritten with real product keywords.
- `hreflang` en / fr / x-default for the bilingual surface.
- `og:locale:alternate fr_FR`, og:image:alt updated.

### Performance / mobile
- Hero video downgraded from `preload="auto"` to `preload="metadata"`
  to unblock LCP (2.6 MB clip no longer in the critical path).
- PWA scaffolding: `public/manifest.webmanifest` makes ORA Studio
  installable with the cream theme color.
- Cache headers in `vercel.json`: immutable for `/assets/*`, short
  for the service worker.

### Analytics
- Consent gate on `trackEvent()` — refuses to ship anything when
  analytics consent is missing, with a small `ALWAYS_ON` set for
  legal/audit events (subscription_activated, account_deleted,
  data_exported, consent_changed, subscription_cancelled).
- First-touch UTM / gclid / fbclid / referrer attribution captured
  at session start and attached to every subsequent event.
- New `Funnel.*` helpers for the AARRR events the audit flagged
  as missing (signupCompleted, vaultSetupCompleted,
  firstPackGenerated, packPublished, upgradeClicked, etc.).

### Tests / DevOps
- Vitest config + 35 unit tests covering the security regressions
  (SSRF guard, admin email gate, credit ledger CAS invariant,
  cookie consent predicate). `npm test` runs them.
- `.env.example` documents every env var the Edge Function reads.
- `.github/dependabot.yml` weekly Node + GitHub Actions updates.
- Package version bumped to `0.1.0`; `test`, `test:watch`,
  `test:smoke` and `typecheck` scripts added.

### Removed
- `temp_vault_routes.txt`, `CLEAN_VAULT_ROUTE.md`, `tmp/` — leaked
  refactor scratchpads.

### Followup
- See `AUDIT_FOLLOWUP.md` for the remediation items that require
  out-of-code action (DPA contracts, real WCAG audit, real
  watermarking, Shopify integration, etc.).

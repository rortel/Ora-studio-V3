# Audit follow-up — items that need out-of-code action

This document is the receipt for the May 2026 comprehensive audit. The
in-code remediations were shipped in branch `claude/ora-comprehensive-audit-MG75D`
(see `CHANGELOG.md` v0.1.0). What's listed below either depends on
external systems we cannot reach from a code session (provider
contracts, real audit firms, dashboard configuration, business
decisions) or would carry too much regression risk to ship in a single
sprint and deserves a dedicated rollout.

Each item is sized P0 / P1 / P2 with a one-line owner placeholder so
they can be turned straight into tickets.

---

## P0 — must happen before next production deploy

### 1. Rotate `POLLO_WEBHOOK_SECRET`
The previous value was committed in `supabase/functions/server/index.tsx`
at line 14 from the project's inception until commit removing it. It
is in git history forever. Anyone who pulled the repo (including the
public mirror, if any) has it.

- Generate a new secret in the Pollo dashboard.
- Set it in Supabase with `supabase secrets set POLLO_WEBHOOK_SECRET=...`.
- Redeploy the Edge Function.
- Audit Pollo webhook deliveries since the leak — look for unusual
  `status=succeed` payloads with foreign `videoUrl` values.

Owner: ops / founder.

### 2. Provision `ADMIN_EMAIL` in Supabase secrets
The hardcoded fallback `romainortel@gmail.com` was removed from the
codebase. Until you set `ADMIN_EMAIL` in env, no email-based admin
bootstrap exists — promoting the first admin requires editing the KV
table directly.

```sql
update public.kv_store_cad57f79
set value = jsonb_set(value, '{role}', '"admin"')
where key = 'user:<your-user-uuid>';
```

Once promoted via the DB or `/admin/users/:userId/plan`, `ADMIN_EMAIL`
is purely a convenience for new admin signups.

Owner: founder.

### 3. Confirm Supabase Storage signed-URL TTL
Library items still receive 365-day signed URLs in several legacy
paths (`createSignedUrl(path, 365 * 24 * 3600)`). The refresh endpoint
re-signs at the same TTL. RGPD right-to-erasure leaks if a URL is
exfiltrated. Reduce to 7 days for new items + force re-sign on access
for older items. **Defer the change to a dedicated PR**: blindly
shortening the TTL would break currently embedded URLs in scheduled
deployments.

Owner: backend engineer.

### 4. Run `npm audit` and act on the 1 moderate / 2 high vulnerabilities
`npm install` post-Batch-4 reports vulnerabilities. Triage and patch
where possible. Add a `npm audit --omit=dev --audit-level=high` step
to `test.yml` afterwards so future regressions block the merge.

Owner: backend engineer.

---

## P1 — within 30 days

### 5. Sign real DPAs with US-based sub-processors
The sub-processors registry at `/subprocessors` was trimmed to the
providers actually called by the Edge Function (Replicate, Anthropic
direct, Runware, Mistral, ElevenLabs, Higgsfield were removed — they
were code paths that never fired). The remaining providers each need
a DPA executed and stored:

| Provider | Role | DPA URL / contact |
|----------|------|-------------------|
| Together AI | Primary text + image | DPA on request |
| APIPod | Text gateway (routes to OpenAI/Anthropic/Google) | DPA on request |
| OpenAI | Text direct fallback | https://openai.com/policies/data-processing-addendum |
| Google (Gemini) | Text alternative | https://cloud.google.com/terms/data-processing-addendum |
| Luma AI | Photon (image) + Ray-2 (video fallback, direct) | DPA on request |
| Pollo AI | Video gateway (Kling, Veo, Sora, Runway, Pika, Pixverse, Minimax, Wan, Seedance, Luma Ray, Vidu, Hunyuan, Grok, Midjourney — 50+ models) | DPA on request |
| FAL.ai | Image + video alternative | DPA on request |
| Photoroom | Pixel-perfect product cutout | https://www.photoroom.com/legal/dpa |
| Ideogram | Image with typography | privacy@ideogram.ai |
| Leonardo | Image alternative | DPA on request |
| Suno | Audio (BGM video) | https://suno.com/legal |
| Resend | Email | https://resend.com/legal/dpa |
| Vercel | Frontend hosting | https://vercel.com/legal/dpa |
| Supabase | Backend hosting | https://supabase.com/legal/dpa |
| Stripe | Payments | https://stripe.com/legal/dpa |
| Jina AI | Scrape (EEA) | DPA on request — EEA intra-EU |
| ScrapingBee | Scrape fallback (EEA) | DPA on request — EEA intra-EU |

Two gateway providers (APIPod for text, Pollo for video) each route to
multiple upstream models. A single DPA with each gateway is required;
the sub-sub-processors (Kling, Veo, Sora, etc. behind Pollo; OpenAI /
Anthropic / Google behind APIPod) must be named in the gateway DPA.
A Transfer Impact Assessment must accompany each US provider.

Owner: legal / founder.

### 6. Wire credit refund into all generation paths
Batch 1 added the `refundCredit()` helper and `credit_ledger:*` audit
trail, but only one route currently calls it. The audit identified
60+ `deductCredit(...).catch(() => {})` fire-and-forget call sites
in `supabase/functions/server/index.tsx`. They each need to:

1. `await` the deduct
2. wrap the AI call in try/catch
3. call `refundCredit(user.id, amount, { route, refId, reason })` on failure

A repository-wide pass is safer than a single mega-PR — group by
modality (text first, then image, then video, then audio). Each PR
should add a vitest case mocking the provider failure to lock the
refund in.

Owner: backend engineer. Estimate: 2 days per modality.

### 7. Lock down `/auth/delete-account` storage purge
The delete endpoint walks the per-user KV prefixes but does NOT touch
Supabase Storage. Orphaned assets accumulate and remain accessible via
their stale signed URLs. Add a Storage walk:

```typescript
const { data: files } = await sb.storage
  .from(IMAGE_BANK_BUCKET)
  .list(`brand-bank/${user.id}`, { limit: 1000 });
if (files?.length) {
  await sb.storage
    .from(IMAGE_BANK_BUCKET)
    .remove(files.map((f) => `brand-bank/${user.id}/${f.name}`));
}
```

Repeat for every bucket / prefix used in the codebase.

Owner: backend engineer.

### 8. EU AI Act art. 50 — pixel-level watermark on images / videos
The `AIGeneratedBadge` ships UI labelling today. The Act also requires
**machine-readable provenance metadata** for synthetic images & video.
The two options:

- **C2PA manifest** (preferred, industry standard) — embed a signed
  manifest in the file metadata. Requires a code-signing certificate
  (e.g. from Identrust) and integration of `c2pa-rs` or `c2pa-js`.
- **Lightweight EXIF/XMP** — write `XMP-iptcExt:DigitalSourceType` =
  `trainedAlgorithmicMedia` in the saved JPEG/PNG. Works for static
  images, not video. Achievable in Deno with `imagescript` + manual
  XMP packet.

Recommend C2PA. Until then, ship the EXIF fallback for images.

Owner: backend engineer + AI lead. Estimate: 1-2 weeks for C2PA, 2 days
for EXIF fallback.

### 9. Anonymise PII in server logs
`getOrCreateProfile()`, `/auth/delete-account` and a handful of other
handlers log full user emails. Replace with a `safeLog()` helper that
hashes the email (e.g. first 4 chars of SHA-256). Targets:

```bash
grep -n 'email=\${user.email}\|user.email}' supabase/functions/server/index.tsx
```

Owner: backend engineer.

### 10. Real WCAG 2.1 AA audit (EAA, in force since June 2025)
`/legal-notices` commits to WCAG 2.1 AA conformance. We've shipped the
visible-focus / reduced-motion / skip-link / dialog-ARIA fixes the
audit flagged, but a third-party audit (Tanaguru, Atalan, Empreinte
Digitale) is required for the formal Accessibility Statement.

Owner: founder. Budget: ~€4-8k.

### 11. Real cookie audit + GTM consent mode v2
The new banner has the right surface (refuse/customise/accept-all,
granular categories, ARIA dialog). But there's no actual third-party
analytics yet — when GA4 / Mixpanel / etc. ship, gate them by
`hasAnalyticsConsent()` and forward consent state to Google Tag
Manager via the Consent Mode v2 API.

Owner: marketing / analyst.

---

### 20bis. Publishing module is dormant (May 2026 decision)

In-app social publishing (PublishModal + /campaign/deploy* + /zernio/*
+ /webhook/pollo for video status) is hidden behind the
`FEATURES.publish` flag in `src/app/lib/features.ts`. Set to `false`.

Reason: connecting a social account requires a Meta Business Suite /
Pro account on every platform — too much friction for the independent
sellers Ora targets. The download flow is the supported alternative.

Implications:
  - Sub-processors registry already trimmed (Zernio / Post-for-Me are
    out of `/subprocessors` and Privacy s5).
  - Server routes stay in place so flipping the flag back to `true`
    re-enables publishing without restoring deleted code.
  - The publish-funnel analytics roadmap item is dropped; the moat
    shifts to "insights + download quality" (see item 20).

Re-evaluate in 6 months: if a self-publishing audience emerges that
already has Meta Business, the flag can flip back on without code
changes.

Owner: product.

---

## P2 — within 90 days

### 12. Split the 34 537-line monolith into modules
`supabase/functions/server/index.tsx` defines 321 routes across 12
implicit modules (auth, billing, email, text-gen, image-gen, video-gen,
audio-gen, vault, campaign, admin, studio, middleware). The deep-dive
audit produced a proposed split — see the audit notes.

Effort estimate from the audit: 10-14 days of senior engineer time
with module-by-module rollout to control regression risk on the
revenue-critical Surprise Me + generation paths.

Owner: backend engineer.

### 13. Replace the magic KV table with relational schema
The audit flagged `kv_store_cad57f79` as a single JSONB sink that
makes prefix queries O(n), prevents real RLS, blocks transactions
(=> the credit CAS we shipped is best-effort). Migrate to:

- `users`, `vaults`, `library_items`, `campaigns`, `deployments`,
  `credit_ledger`, `cost_ledger` as proper tables
- Foreign keys to `auth.users(id)` with RLS policies
- Per-table TTL via `pg_cron` jobs for ledgers and logs

Plan a phased migration with dual-write + cutover.

Owner: backend engineer. Estimate: 3-4 weeks.

### 14. Rate limiting + per-plan hard caps
The Edge Function has no rate limit. A Studio user can spam Surprise Me
and drive provider cost above their monthly revenue. Two layers:

- Per-user QPS limit (e.g. 5 req/s) in the auth middleware, backed by
  a sliding-window counter in KV.
- Per-plan monthly hard cap (Studio = 200 packs/mo, not 200
  credits/mo). When hit, block until next billing cycle.

Owner: backend engineer.

### 15. Stripe webhook signature verification
The `/stripe/webhook` route reads `STRIPE_WEBHOOK_SECRET` from env but
the actual signature check was not audited in the limited time. Add a
vitest case feeding a forged payload + bad signature; expect 400.

Owner: backend engineer.

### 16. Bake real CI smoke
`tests/e2e-smoke.mjs` already covers 11 workflows. Wire it into the
`deploy-supabase.yml` job (the health-check step we added is a
placeholder) so a deploy that breaks generation blocks the next
release.

Owner: backend engineer.

### 17. Sentry / Datadog for real observability
The in-house `/errors/report` is great for the MVP but it has no
alerting and no source maps. Adopt Sentry (cheap, source-map-aware,
release tracking) and pipe Slack alerts via webhook on error_rate >
5% in 5 min.

Owner: backend engineer + founder.

### 18. Multi-currency Stripe pricing
Pricing is hardcoded EUR (`€19 / €49 / €199`). Users outside the EU
get a poor experience. Configure Stripe with `currency_options` on
each Price object and read the buyer's preferred currency client-side
(via Stripe.js).

Owner: backend engineer + product.

### 19. Lifecycle email — welcome, dunning, J+1 onboarding
Resend is already wired (`emailPackReady`, `emailLowCredits`). Missing
templates:

- Welcome (post-signup, with Vault setup CTA)
- Receipt after Stripe `invoice.paid`
- Dunning after `invoice.payment_failed` (Stripe webhook → 3-mail
  sequence with grace period)
- J+1 onboarding reminder ("did you set up your Brand Vault?") gated
  by `hasMarketingConsent()`
- J+7 reactivation when no Surprise Me run in the past 7 days
- Trial-ending reminder (when we add a real free trial)

Owner: backend engineer + product.

### 20. Real benchmark + verticals strategy
The benchmark concluded ORA has no defensible technical moat past
6-12 months (Canva can copy URL→pack, Predis can add URL scan,
schedulers can plug GPT). Decisions to make:

- Pick a vertical (Shopify recommended) and ship the Shopify App
  Store integration (catalogue → auto packs on new products).
- Build the **analytics post-publication** layer (tracking pixel,
  conversion attribution, Shopify revenue link). Without this the
  "sellers not posters" claim is marketing-only.
- Reprice — current €19/60 posts vs Canva $15/unlimited is the worst
  of both worlds. Either drop entry to €9 or move entry to €49 with
  ROI proof.

Owner: founder / product.

---

## What's now shipped and verified

For traceability, the items below were flagged by the audit and closed
in this branch:

- [x] Admin email hardcoded fallback (frontend + backend) — Batch 1
- [x] POLLO_WEBHOOK_SECRET hardcoded — Batch 1 (env'd, requires rotation)
- [x] SSRF on /image-proxy and scrape routes — Batch 1
- [x] /debug/* and /test-* routes admin-only — Batch 1
- [x] deductCredit CAS + audit ledger — Batch 1
- [x] CSP / HSTS / Referrer-Policy / Permissions-Policy — Batch 1
- [x] Cleanup of temp_vault_routes.txt, CLEAN_VAULT_ROUTE.md, tmp/ — Batch 1
- [x] /auth/export-data (GDPR Art. 20) + UI button — Batch 2
- [x] Public /subprocessors registry — Batch 2
- [x] Public /legal-notices (LCEN) — Batch 2
- [x] 14-day right of withdrawal in Terms — Batch 2
- [x] EU AI Act art. 50 clause in Terms — Batch 2
- [x] Sub-processors detailed in Privacy s5 — Batch 2
- [x] Pro-rata refund of unused credits in Terms — Batch 2
- [x] Last-updated dates bumped — Batch 2
- [x] Footer linked to Sub-processors + Legal notices — Batch 2
- [x] Global :focus-visible ring — Batch 3
- [x] prefers-reduced-motion respected — Batch 3
- [x] Skip-to-content link — Batch 3
- [x] SEO title / description / hreflang / og:locale:alternate — Batch 3
- [x] PWA manifest — Batch 3
- [x] Cookie banner: granular Essential/Analytics/Marketing — Batch 3
- [x] Analytics consent gate + ALWAYS_ON transactional events — Batch 3
- [x] UTM/gclid/fbclid first-touch attribution — Batch 3
- [x] Funnel.* helpers for AARRR events — Batch 3
- [x] Vitest config + 35 unit tests — Batch 4
- [x] AI-generated badge + PublishModal disclosure — Batch 4
- [x] PublishModal role="dialog" + Escape-to-close + aria-* — Batch 4
- [x] Hero video preload="metadata" — Batch 4
- [x] .env.example — Batch 4
- [x] .github/dependabot.yml — Batch 4
- [x] supabase/migrations/0001_initial_schema.sql + RLS deny-all — Batch 4
- [x] Post-deploy health probe in deploy-supabase.yml — Batch 4
- [x] CHANGELOG.md v0.1.0 — Batch 4

---

Generated 2026-05-18 as part of branch `claude/ora-comprehensive-audit-MG75D`.

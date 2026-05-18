-- ============================================================
-- ORA Studio — initial schema snapshot
-- ============================================================
-- This migration documents the current production schema so future
-- changes can be versioned with `supabase db diff` and applied with
-- `supabase db push`. The historical schema was created via the
-- Supabase dashboard before migrations existed, so this file is
-- defensive (CREATE IF NOT EXISTS, idempotent) — running it against
-- an existing project is a no-op.
--
-- The architecture relies on a single magic KV table that stores
-- every per-user blob keyed by `<prefix>:<userId>[:<itemId>]`. A real
-- relational schema is on the roadmap (see AUDIT_FOLLOWUP.md), but
-- locking down the existing structure with RLS is the priority.
-- ============================================================

-- ── KV STORE ────────────────────────────────────────────────
-- Stores: user profiles, vaults, library items, campaigns,
-- deployments, social accounts, costs, errors, credit ledger, etc.
create table if not exists public.kv_store_cad57f79 (
  key   text primary key,
  value jsonb not null
);

-- Helpful indexes for the most common access patterns. Prefix scans
-- still go through a sequential LIKE, but at least the equality
-- lookups (kv.get) and the JSONB containment queries are fast.
create index if not exists kv_store_cad57f79_value_gin
  on public.kv_store_cad57f79 using gin (value);

-- ── ROW-LEVEL SECURITY ──────────────────────────────────────
-- The KV table is accessed exclusively by the Edge Function with the
-- service-role key, which BYPASSES RLS. Enabling RLS with no policy
-- therefore locks out anon and authenticated callers entirely —
-- exactly what we want until the schema is split into proper
-- relational tables with per-row ownership.
alter table public.kv_store_cad57f79 enable row level security;

-- Explicit deny-all policy (RLS would already block, but this is
-- belt-and-suspenders and shows intent in audits).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'kv_store_cad57f79'
      and policyname = 'kv_store_cad57f79_deny_all'
  ) then
    create policy kv_store_cad57f79_deny_all
      on public.kv_store_cad57f79
      as restrictive
      for all
      to authenticated, anon
      using (false)
      with check (false);
  end if;
end $$;

-- ── COMMENTS ────────────────────────────────────────────────
comment on table public.kv_store_cad57f79 is
  'ORA Studio key-value store. All per-user data lives here keyed by prefix. Accessed by the Edge Function with service-role; never exposed to anon/authenticated callers.';

comment on column public.kv_store_cad57f79.key is
  'Format: "<prefix>:<userId>[:<itemId>]". Known prefixes: user, vault, library, campaign, deploy, pfm, zernio, calendar, brand-image, product, credit_ledger, cost_ledger, log, brand-score, analysis, playlist, event.';

comment on column public.kv_store_cad57f79.value is
  'Free-form JSON document. Schema validation lives in the Edge Function (per-prefix). Pruning of credit_ledger / cost_ledger / log entries beyond a retention window is the responsibility of a scheduled cleanup function (TODO).';

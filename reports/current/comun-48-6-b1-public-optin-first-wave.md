# COMUN 48.6-B1 — Public opt-in first wave

## Scope

This slice adds an explicit, holder-controlled opt-in for the existing
Relata wallet flow. It does not activate the public map and does not create a
second queue, collective model, consent model, or matcher.

- Parent/main: `f55b941a7f48d9fb30f4b9ebbd518395d01a4352`
- Branch: `codex/48-6-b1-public-optin-first-wave`
- Production: `https://comunsocial.online`
- Corrective checksum PR: `#405`, merged as `60028f5ccbcca7d146b4fe4fa190c1966c3d1400`
- Current Production main: `60028f5ccbcca7d146b4fe4fa190c1966c3d1400`
- Production map flag: `COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED=OFF|absent`
- Production projection rows before rollout: `0` expected
- Production confirmation rows before rollout: `0` expected

## Reconciled architecture

The implementation reuses the existing chain:

`wallet token → wallet item → Relata case/report → private location → explicit map consent → existing collective/projection primitives`

The browser sends only the existing wallet item identifier. The server
resolves the canonical case from the wallet item and validates the wallet
token hash, item type, active wallet, report/case state, privacy class and
location readiness. An arbitrary case, report, collective or membership ID is
not accepted as authority.

The existing B0 consent root remains the source of truth:
`private.comun_relata_public_projection_consents`, with fixed
`relata-public-projection-v1` / `collective_projection` semantics.

The existing collective matcher remains authoritative. Because the wallet
surface does not expose spatial match material, the first opt-in conservatively
creates an explicit private seed collective rather than guessing a match. No
LLM, embedding, text similarity, or second matcher was introduced.

## Product contract

Opt-in is offered only for:

- `public_lighting`
- `power_distribution`
- `smoke_or_environmental_trace`

The option is absent for emergency, sensitive, withdrawn, health, education,
child-protection, workplace, unknown and other fail-closed cases, and when a
safe location is unavailable. It is off by default and does not reduce any
Relata functionality when declined.

The user-facing copy states that use is anonymous and approximate and that
name, address, original text, photos and protocol are not shown. Granting
consent does not claim that a report is already on the map. DELETE revokes the
consent without deleting the report, forwarding, protocol or legitimate
history. If an already-active consent becomes ineligible after withdrawal or
location change, status remains available for revocation only.

`confirmationRows` remains `0`; public confirmation is not activated.

## Schema and security

The B1 migration adds no tables. It adds holder-owned, service-role-only
functions and a withdrawal recomputation trigger over the existing B0 roots.
The functions use `SECURITY DEFINER` with an explicit `pg_catalog` search path, fixed server
consent values, advisory transaction locking, and idempotent upsert/revoke
behavior. Public/anonymous/authenticated execution grants are revoked; the
server-side wallet client is the only application path that invokes them.

The migration was promoted through the canonical Production pipeline only
after CI and the exact Preview were green. No environment mutation, fixture,
projection, publication, Search write, or business write was performed.

## Files

- `supabase/migrations/20260826120000_comun_denuncias_public_projection_opt_in.sql`
- `app/api/comun/denuncias/public-projection-consent/route.ts`
- `app/comun/minha-participacao/public-projection-consent-panel.tsx`
- `lib/comun-denuncias-public-opt-in.ts`
- `scripts/comun-denuncias-b1-disposable.sql`
- `scripts/48-6-b1-contract.node-test.mjs`
- `.github/workflows/comun-48-6-b1-disposable.yml`

## Production schema rollout

- Preflight run `32968275164`: GREEN on the exact main SHA; the remote plan
  contained exactly `20260826120000_comun_denuncias_public_projection_opt_in.sql`.
- Corrective checksum finding: the first preflight `32967700019` stopped before
  any database mutation because the runner held a stale SHA-256. PR `#405`
  corrected only that constant; no Supabase mutation occurred in the failed run.
- Promotion run `32968358945`: GREEN; applied the B1 migration exactly once.
- Postflight: `migrationCount=1`, consent status/set functions present,
  withdrawal trigger present, forced RLS, anon/authenticated execute closed,
  service-role execute available, `projectionRows=0`, `confirmationRows=0`,
  `businessWrites=0`, `envWrites=0`, `schemaWrites=1_migration_only`, and
  `publicMapProduction=false`.
- The Production map flag remains OFF/absent. No real opt-in, grouping,
  projection, confirmation, fixture, publication, Search write or collection
  write was performed by the schema rollout.
- Disposable proof run `32966549806`: GREEN on the pre-correction B1
  implementation; its focused contract covered ownership, allowlist,
  idempotence, revoke and fail-closed consent behavior without Production data.

## Verification status

- focused contract test: GREEN
- allowlist unit test: GREEN
- explicit database privilege lint: GREEN
- historical lane reconciliation: B1 is explicitly owned by `culture-b1`; unrelated
  P6C and solidarity lanes classify it as not applicable; unknown migrations remain blocked
- B0 remote preflight reconciliation: validates the installed B0 schema and rejects only
  the legacy local public functions, instead of treating the canonical B0 projection tables
  as unexpected local drift
- typecheck: GREEN
- lint: GREEN
- build: GREEN (the correction changes only SQL/CI contracts; the prior successful build remains valid)
- full unit suite: four unrelated pre-existing baseline failures remain in Motorola source line endings, sidewalk migration checksum, and solidarity organization profile exact-string contracts; B1-focused tests are green
- disposable Supabase proof: GREEN in dedicated GitHub Actions run `32966549806`
- remote migration: `1` schema migration only; env/data/business writes: `0`
- real Production opt-in/projection: not attempted in this implementation phase

## Real product pilot status

The schema is ready, but the real wallet-controlled inventory was not claimed
from an admin or SQL session. Browser control could not be initialized in this
execution, so no report was selected and no consent was granted on behalf of a
person. The next safe step is to resume an authenticated COMUN product session
at `/comun/minha-participacao`, inspect only the holder's own allowlisted
reports, and let the person decide the optional consent in the product.

## Required remote proof

The dedicated workflow must emit:

`COMUN_48_6_B1_DISPOSABLE_OPT_IN_GREEN`

with `projectionRows=0`, `confirmationRows=0`, `businessWrites=0` and
`publicMapProduction=false`. A real product pilot, if a holder-controlled
eligible report exists, requires the person to decide the opt-in in the
authenticated COMUN product; no administrator or automation may consent on
their behalf. At most one projection may be materialized, and only after all
existing B0 eligibility and sanitization gates pass.

## Terminal intent

If no eligible real wallet-controlled report is available:

`COMUN_48_6_B1_OPT_IN_GREEN_NO_REAL_ELIGIBLE_REPORT_MAP_OFF`

If a real pilot is authorized and the B0 projection gates pass, the maximum
scope is one collective public projection with `confirmationRows=0`. The map
flag remains OFF until a later, separately authorized release.

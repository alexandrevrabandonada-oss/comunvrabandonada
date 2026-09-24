# COMUN 49.2-A0-R2 — authenticated representation legitimacy

## Base

- R1 PR #431 merged by rebase at `2026-09-05T17:12:10Z`.
- Integrated main SHA: `1387e1bcecdc4147bb5dad41aa7d541ec97b1497`.
- Automatic Git Production deployment `6283638764` was READY for that SHA.
- Read-only Production smokes: `/comun`, `/comun/denuncias`, `/comun/relatar` and
  `/comun/minha-participacao` returned 200; `/comun/denuncias/mapa` returned 404.
- No Production schema, environment, business or manual-deployment write was made.

## R2 boundary

- Runtime actor is derived from the server-validated Supabase session
  (`auth.getUser()`); client and server-action inputs carry no trusted user id.
- The server action is the product boundary. Its four `SECURITY DEFINER`
  bridges are executable only by the server-only `service_role` connection;
  `anon` and `authenticated` cannot invoke them directly. Private tables and
  R1 primitives remain inaccessible directly.
- Create is idempotent through the R1 request id and creates a `declared`
  representation. The owner DTO exposes only that owner's entity state,
  representation state and consent state.
- The pinned version, scope, notice text and SHA-256 remain server-side fixed.

## Legitimacy and consent policy

- No runtime transition to `verified` exists. There is no self-verification and
  no institutional verifier in this slice; `declared` remains the normal result.
- `declared` consent is private recorded intent only. It has no publication,
  projection, candidate, feature-flag or map effect.
- `verified` remains verification only, never publication authority.
- An owner can revoke their own representation. Revocation preserves R1 audit
  events and blocks a new consent; the original consenter retains the R1 exit
  right to withdraw consent even after representation revocation or archiving.
- Contestation is intentionally fail-closed in this slice: no promotion exists;
  the available lifecycle exit is revocation with the existing append-only audit.
  No free-text dispute narrative is stored.

## Privacy and retention

- No reports, protocols, locations, attachments, third-party identities or event
  histories are returned by the DTO.
- R1 append-only lifecycle/consent audit is retained as minimal technical evidence
  after revocation. Future minimization/anonymization policy is out of scope.

## Validation state

- Focused consent unit and R2 auth-boundary contract are green locally.
- `git diff --check` is green.
- Local disposable Supabase/RLS validation remains pending because Docker Desktop
  is unavailable; TLS verification remains enabled and the only retry used system CA.
- Global typecheck is currently blocked by pre-existing sparse-worktree missing
  files outside R2. No R2-specific TypeScript diagnostic was emitted.

## Next

Run disposable Supabase authorization/concurrency proof and the full repository
gates in a complete checkout, then push the exact SHA for automatic Preview and
open the draft R2 PR. No Production mutation is needed.

## Reconciliation against promoted main, 2026-09-24

PR #432 was merged locally with `origin/main` at `8bcefdd915e6352b42fcb48e76ad14a9ed98581f`, preserving its branch history. The historical R2 migration `20260905171646` is removed from the PR diff. The replacement `20260924015511_comun_relata_collective_entity_authenticated_runtime.sql` is later than main's Hardening v2 migration and layers four owner-only server bridges on the unchanged R1 foundation. Its four definers have `search_path=pg_catalog`, explicit `postgres` ownership, and EXECUTE only for `service_role`; `PUBLIC`, `anon`, and `authenticated` are revoked. The migration has explicit `collective-entity-auth-runtime` ownership in the historical lane classifier. R1's fixed consent version, scope and notice hash are not changed.

The Server Action accepts no client identity. The server-only runtime calls `auth.getUser()` and passes that session's `user.id` as the bridge's internal audit attribute. A focused dependency-controlled test rejects unauthenticated calls before creating a service client, proves a forged input identity cannot replace A, and verifies that the owner DTO emits exactly seven allowlisted fields. There is no verification, publication, projection, candidate or map transition in R2.

Local disposable Supabase applied the full main migration chain through R1, Hardening v2 and R2. Two users were created by its Auth service. The R1 SQL proof and R2 SQL proof passed: grants, owner isolation, request replay, cross-actor denial, fixed private consent, withdrawal, representation revocation, append-only audit, and absence of a public R2 object. A second legitimate representative could neither withdraw A's consent nor cause its withdrawal by revoking their own representation. Two independent connections using the same request produced one entity, one representation, one `entity_created` event and one `representation_declared` event. All four bridges were directly denied to `anon` and `authenticated`. The disposable workflow repeats these checks on a fresh runner and includes the canonical zero-security-findings scanner; it has no Production credential mapping or remote migration command.

The focused R1/R2 and classifier tests, four-function definer validator, forward-only SQL validator, explicit-privilege lint, unit suite, solo suite, ESLint, Prettier and whitespace checks passed locally. The subsequent TypeScript run resolved dependencies through a junction into a different, modified checkout and reported maplibre errors outside R2; it is not a valid R2 gate result. Docker Desktop then stopped, so the canonical zero-security-findings scanner could not finish locally after the full-schema proof. These gates require a clean dependency checkout and the new disposable CI run. R1 and R2 remain unapplied in Production in this round. No merge, promotion, release, map enablement or Production write occurred.

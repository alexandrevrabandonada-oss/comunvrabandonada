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

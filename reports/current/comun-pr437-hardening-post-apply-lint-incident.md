# PR #437 — Security Hardening v2 post-apply lint incident

Promotion run `35891520337` at head `ddf71ce17ff1353f486174077c0614bc512733b0` applied the unchanged Hardening v2 migration in Production. The forward-only runner reported POST fingerprint `a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98`, `PRESENT_ACCEPTED` ledger, and security findings `74 → 0`. The manifest and migration are byte-identical to that accepted release. No retry occurred.

The postflight `supabase db lint` failed on one reported finding: `public.comun_sync_public_search_projection`, SQLSTATE `42P01`, `relation "comun_search_candidates" does not exist`, at the update of a temporary table created earlier in that function. This finding predates Hardening v2; see `reports/current/comun-48-1b-p1t-postflight.md` and `reports/current/comun-tijolo-48-0b-relata-durable-local.md`. The function executed successfully in the disposable pre- and post-Hardening databases within rolled-back transactions. This does not substitute for the required pragma-aware static proof.

The same local Supabase Postgres image used for the exact Production-like fixture exposes `plpgsql_check` version `2.8`, but its extension catalog has no `plpgsql_make_pragma` and its `plpgsql_check_function_tb` overloads have no `pragmas` argument. The recovery checker fails closed with `COMUN_SEARCH_LINT_PRAGMA_API_UNAVAILABLE`. The synchronized PR workflow must determine the corresponding Production extension capability by read-only catalog inspection; no Production function invocation is authorized here.

PR #437 remained open/draft and unmerged after the run. Preview validation, merge, deployment, and Production smoke were not executed. The `comun:promover` label was removed. Recovery code uses a PRE/POST state machine and strict one-finding lint gate; it cannot allow the known finding unless the pragma-aware checker returns zero errors on the same database.

This recovery execution performs no Production writes, migration application, merge, or deploy. If Production lacks the required API, the terminal state is `SEARCH_SYNC_RUNTIME_CONTRACT_UNPROVEN`; do not resume promotion by waiving the lint gate.

## Read-only API diagnosis, 2026-09-23

The first synchronized recovery run, [35896837438](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/35896837438), at checkpoint `bd4c6f24d26a13d558146f7d75e375a28ddebb5e` proved `POST_ALREADY_APPLIED`, exact runner and canonical POST fingerprints, `PRESENT_ACCEPTED`, zero canonical findings, and absent consent migration. Its strict lint path reached the exact known temp-table finding, but the pragma-aware proof stopped at `COMUN_SEARCH_LINT_PRAGMA_API_UNAVAILABLE`. The artifact did not distinguish an absent extension from an incompatible overload.

The tagged Supabase CLI 2.109.1 source (`apps/cli/src/legacy/commands/db/lint/lint.handler.ts`, `lint.lint-sql.ts`, and `SIDE_EFFECTS.md`) explains this: `db lint` runs `CREATE EXTENSION IF NOT EXISTS plpgsql_check`, checks functions, and rolls the transaction back. It can therefore lint through a transaction-local extension even when no extension remains installed. This is source inspection, not an assumption that Production has a persistent extension.

The read-only checker now records PostgreSQL version, installed and available extension state, every relevant overload and its call privileges, and the transaction mode before it reports an unavailable API. No credential or function body is included. A further synchronized read-only run is needed to identify the exact Production catalog state.

# PR #437 — Security Hardening v2 post-apply lint incident

Promotion run `35891520337` at head `ddf71ce17ff1353f486174077c0614bc512733b0` applied the unchanged Hardening v2 migration in Production. The forward-only runner reported POST fingerprint `a5fbc31cbac2b54bd877e0221b70dd9a708d83f25ac0083393f1739d46d27d98`, `PRESENT_ACCEPTED` ledger, and security findings `74 → 0`. The manifest and migration are byte-identical to that accepted release. No retry occurred.

The postflight `supabase db lint` failed on one reported finding: `public.comun_sync_public_search_projection`, SQLSTATE `42P01`, `relation "comun_search_candidates" does not exist`, at the update of a temporary table created earlier in that function. This finding predates Hardening v2; see `reports/current/comun-48-1b-p1t-postflight.md` and `reports/current/comun-tijolo-48-0b-relata-durable-local.md`. The function executed successfully in the disposable pre- and post-Hardening databases within rolled-back transactions. This does not substitute for the required pragma-aware static proof.

The same local Supabase Postgres image used for the exact Production-like fixture exposes `plpgsql_check` version `2.8`, but its extension catalog has no `plpgsql_make_pragma` and its `plpgsql_check_function_tb` overloads have no `pragmas` argument. The recovery checker fails closed with `COMUN_SEARCH_LINT_PRAGMA_API_UNAVAILABLE`. The synchronized PR workflow must determine the corresponding Production extension capability by read-only catalog inspection; no Production function invocation is authorized here.

PR #437 remained open/draft and unmerged after the run. Preview validation, merge, deployment, and Production smoke were not executed. The `comun:promover` label was removed. Recovery code uses a PRE/POST state machine and strict one-finding lint gate; it cannot allow the known finding unless the pragma-aware checker returns zero errors on the same database.

This recovery execution performs no Production writes, migration application, merge, or deploy. If Production lacks the required API, the terminal state is `SEARCH_SYNC_RUNTIME_CONTRACT_UNPROVEN`; do not resume promotion by waiving the lint gate.

# COMUN 49.2 — private schema Production promotion

State: **promotion workflow prepared; schema write not yet triggered by this commit**.

The certified Production state before this workflow is
`COMUN_49_2_PRIVATE_RELEASE_MERGED_SCHEMA_STILL_ABSENT` on main
`941c4c3c2728eaddd559fcab9404a15881c815fc`.

This change adds no migration and changes no release manifest. It adds a
main-only, issue-labeled execution path for the already reviewed R1+R2 bundle.
The workflow requires an OWNER-authored issue, the existing `comun:promover`
label, an exact `expected_main_sha`, the explicit authorization string
`COMUN_49_2_PRODUCTION_SCHEMA_WRITE`, an unchanged main ref, bundle tests,
and a fresh read-only PRE before the first write.

The write step calls only
`scripts/49-2-private-release/run-production-promotion.mjs`, which delegates
to the existing state machine, Postgres adapter and promotion runner. On a
certified PRE it must perform exactly `R1,R2,LEDGER`. Each migration remains
forward-only and hash-bound. POST is recaptured read-only and must be exact,
with the logical bundle ledger accepted, zero canonical findings, four private
R1 tables, four service_role-only R2 SECURITY DEFINER bridges, and no public
collective relation.

The Production smoke does not call any collective mutation API and does not
create test users or test entities. Functional owner-isolation, revocation,
consent and concurrency remain proven by the disposable R1+R2 suite over the
exact migration bytes. R3 remains closed.

The promotion itself is intentionally not triggered merely by merging this
workflow. Triggering requires a separate owner-authored issue and label event.

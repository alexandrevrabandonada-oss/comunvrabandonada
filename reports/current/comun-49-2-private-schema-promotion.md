# COMUN 49.2 — private schema Production promotion

State: **`COMUN_49_2_PRIVATE_SCHEMA_PRODUCTION_GREEN` — R1+R2 privados instalados em Production; R3 permanece fechado**.

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

## First authorized Production attempt — recovery required

Run `36032951992` was the first authorized 49.2 Production schema attempt on
main `be31097d0a5fff262e395d92cbb8790e367b3129`. Owner authorization,
immutable-main verification, bundle contracts and a fresh read-only PRE all
passed. The PRE was exact and emitted
`COMUN_49_2_PRIVATE_SCHEMA_PREFLIGHT:PRE`.

The forward-only write step then stopped with
`COMUN_49_2_PRIVATE_RELEASE_DIVERGED`. The promotion label was removed from
issue #441 immediately after the failure; no retry is authorized from this
state.

The original recovery handler also classified before persisting the raw
capture, so its artifact only records `DIVERGED`. Recovery therefore changes
observability only: `inspect` now persists the sanitized raw capture even when
the state machine returns DIVERGED. A separate issue-triggered diagnostic runs
on the exact main SHA with `default_transaction_read_only=on`, without the
schema-write authorization environment variable.

Until that diagnostic establishes the real state, Production must be treated
as `COMUN_49_2_PRIVATE_SCHEMA_PROMOTION_DIVERGED_AFTER_WRITE_ATTEMPT`.
R3 remains closed.


## Recovery concluído — 2026-09-24

A primeira tentativa autorizada, run `36032951992`, aplicou R1 e parou
fail-closed antes de R2/ledger porque o PARTIAL_R1 real tinha fingerprint
canônico `221886f511268f0522d775222039ab15b3eebdcc0ee9555b7209bfabb2042c70`,
diferente do fixture original. O diagnóstico read-only provou que a única
diferença canônica era `postgres:USAGE` no schema `public`; nenhuma
diferença existia para `PUBLIC`, `anon` ou `authenticated`, e os findings
continuaram em zero.

A prova descartável de recuperação, run `36039303960`, reproduziu exatamente
essa ACL e o fingerprint PARTIAL_R1 real. Ela derivou o POST de recuperação com:

- runner fingerprint:
  `7e957c3f154efe87f7104915a5b1e095cc77dc04d488bd4041b4c859f5db1b60`;
- canonical fingerprint:
  `ce98af56622652e9416ed4c535ed8f202a61c36641e2cec8c21d4433f66cbeff`;
- blocking findings: `0`;
- `consentObjectCount=6`;
- ledger ausente antes e linha lógica exata aceita depois.

O recovery-only foi integrado no merge
`7c2c517eca061362ac6e7dda8d652c865b0b4f8e`. O runner não possui superfície
de aplicação de R1: aceita somente
`PARTIAL_R1_RECOVERY`, `POST_PENDING_LEDGER_RECOVERY` e
`POST_RECOVERY`, e sua única migration possível é R2.

A run Production `36067727062`, autorizada pela issue #451 no SHA exato acima,
executou:

1. preflight read-only:
   `COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_PREFLIGHT:PARTIAL_R1_RECOVERY`;
2. recovery mutável:
   `COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_GREEN:R2,LEDGER`;
3. postflight read-only:
   `COMUN_49_2_PRIVATE_SCHEMA_RECOVERY_POSTFLIGHT_GREEN`;
4. smoke público sem mutação coletiva;
5. marcador final:
   `COMUN_49_2_PRIVATE_SCHEMA_PRODUCTION_GREEN`.

O artifact da run, digest
`sha256:b1ad773a6a5d3e3c0af4d778e8f47f5f113296f117e4bd0b280a58cc9e4dedde`,
comprova no POST:

- migrations R1 `20260901000000` e R2 `20260924015511` presentes;
- bundle ledger `PRESENT_ACCEPTED`;
- Hardening ledger `PRESENT_ACCEPTED`;
- zero findings;
- quatro bridges R2;
- `PUBLIC`, `anon` e `authenticated` sem EXECUTE nas bridges;
- `service_role` com EXECUTE;
- zero relação pública coletiva;
- `postgres:USAGE` no schema `public` preservado;
- nenhum `CREATE` exposto;
- `r1Reapplied=false`;
- `r3Opened=false`.

O label de autorização foi removido após o sucesso. R3, candidate pipeline,
projeção pública, mapa e publicação continuam fora deste fechamento.

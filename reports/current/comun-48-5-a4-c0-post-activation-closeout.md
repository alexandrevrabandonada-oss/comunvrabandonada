# COMUN 48.5-A4-C0 — Post-activation closeout and stability baseline

Terminal: `COMUN_48_5_A4_C0_POST_ACTIVATION_BASELINE_GREEN_A4_CLOSED`.

## Canonical provenance

- activation baseline main: `09f18d0948bf28d9694b4994f5385cf17ad748ba`;
- Wave 0 provenance: migration `20260819130000_comun_cultural_progressive_rights.sql` was already registered exactly once, then verified read-only with A4 OFF;
- Wave 1: [run 32570311968](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32570311968), success, runtime commit `09f18d0948bf28d9694b4994f5385cf17ad748ba`;
- canonical Wave 1 deployment: `dpl_3jnrsGkHH4rAzEsdHQ8Le3jGkX5h`, READY;
- C0 verifier was added by the non-runtime merge `636b39a6b4f1886fe1af1fa55be383733156898f`. Its automatic Production deployment `dpl_BdjEKDe8rbMY2bLJfxprEEz9aVkw` is READY and aliases `comunsocial.online`; it contains only the C0 workflow/test/runner, not an A4 product change;
- C0 evidence: [run 32593036170](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/32593036170), success; artifact `9480830306`, `sha256:ccd81d93e2f362e6d324b3fda064efcd131e21c8b802f1a1ab3984f610858a8e`.

The canonical runtime deployment remains a READY historical production deployment. The expected `origin/main` at C0 start was `09f18d09…`; it advanced legitimately to `636b39a6…` only to merge this read-only verifier before GitHub could dispatch it. No runtime A4 code, Vercel configuration, flag, schema, database data or production operation changed in that reconciliation.

## Flag and migration baseline

- A4 `COMUN_CULTURAL_PROGRESSIVE_RIGHTS_ENABLED`: ON, exactly one project-level Production value, encrypted, no shared value, duplicate, branch override or custom-environment override;
- A3 `COMUN_CULTURAL_SPECIALIZED_HANDOFF_ENABLED`: ON, exactly one encrypted Production value;
- migration `20260819130000`: exactly once; source SHA-256 `43b7b966b55c8429f021def0c60b80979a0110de27e39de6dc553ef97e891519`.

## Read-only database result

The C0 runner opened explicit `BEGIN READ ONLY` transactions and verified:

- exact A4 required schema, target RLS enabled, anon/authenticated CRUD closed, and service-role required privileges present;
- legacy records still have no inferred rights declaration/version timestamp;
- História Oral keeps its granular consent roots and has no generic A4 substitute;
- `review_only` remains distinct from publication authorization;
- licensed reuse has no row without an explicit allowed license.

Stable snapshot: contribution intakes `0`, archive submissions `0`, artwork submissions `0`, radio contributions `0`, archive assets `2586`, Search documents `10`, collections `2`, published archive items `3`, storage buckets `7`, storage-policy fingerprint `334c4a4c42fdb79d7ebc3e73b517e6f8`.

## Runtime smoke

GET and HEAD returned HTTP 200 for all eight canonical surfaces:

- `/comun/acervo`, `/comun/acervo/contribuir`;
- `/comun/acervo/arte`, `/comun/acervo/arte/contribuir`;
- `/comun/acervo/historias-orais`, `/comun/acervo/historias-orais/contribuir`;
- `/comun/radio`, `/comun/radio/contribuir`.

The sanitized artifact stores only HTTP codes and body SHA-256 values, never HTML. Its leak scan found no private-rights identifiers, intake tokens, target IDs, SQL traces or secret markers. The runner made no request with a write method and never invokes Supabase migration/data commands, Vercel env mutation, deploy/promote, publication or fixture commands; this is enforced by `scripts/run-48-5-a4-c0-post-activation-readonly.node-test.mjs`.

## Zero-side-effect accounting

`businessWrites=0`  
`schemaWrites=0`  
`envWrites=0`  
`fixtures=0`  
`publications=0`  
`rollback=false`

## Lifecycle and successor boundary

`SCHEMA_APPLIED → FLAG_OFF_VALIDATED → WAVE1_ACTIVATED → PRODUCTION_GREEN → CLOSED_BASELINE`

Final state: `a4=ON`, `a3=ON`, `schemaA4=GREEN`, `rightsContract=GREEN`, `oralHistoryConsent=GREEN`, `autoPublication=false`, `a4Lifecycle=CLOSED_BASELINE`, `a5Started=false`.

This closes A4 operationally. No A5 capability, schema, flag, rollout, fixture, contribution, asset, Search document, collection or publication was started by C0.

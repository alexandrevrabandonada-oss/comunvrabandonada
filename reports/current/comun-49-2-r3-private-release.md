# COMUN 49.2-A0-R3 — private candidate Production release

## Dormant integration

PR #453 merged normally at `c47ee61bb2011dc5139f4b673e94c3557737c6cb` (tree `780c29ba22107f35c57451cd8d113ca8781b0be5`). The merge preserved R3 head `4be7dab1541f9f19b3bd69a21b6816df0b31ef27` and did not apply the R3 migration. Git-linked Vercel Production deployment `dpl_BA9uxq5ktkkB8ToHjNsWndwWZFcN` reached READY on the merge SHA; GitHub deployment `6650858541` reached success. Read-only HTTP smoke returned 200 for `/comun`, `/comun/denuncias`, `/comun/relatar`, and `/comun/minha-participacao`; PMTiles Range returned 206 with bytes 0–127; `www` redirected 308 to the apex. No candidate RPC was called.

## Production PRE — read-only

Run `36076844244`, source main `c47ee61bb2011dc5139f4b673e94c3557737c6cb`, artifact SHA-256 `d66015931f09ea55f33c2305f1d892c9641eebf5f9c89e2ab3d9eb5f7fc10a8b`.

The capture used `BEGIN READ ONLY` with `PGOPTIONS=-c default_transaction_read_only=on`. PostgreSQL 17.6 reported R1/R2 present, their logical bundle ledger `PRESENT_ACCEPTED`, Hardening `PRESENT_ACCEPTED`, four R2 bridges and zero canonical blocking findings. R3 migration, candidate table, bridge, triggers and logical ledger were all absent. No business rows were selected or changed.

PRE runner fingerprint: `7e957c3f154efe87f7104915a5b1e095cc77dc04d488bd4041b4c859f5db1b60`.

PRE canonical fingerprint: `ce98af56622652e9416ed4c535ed8f202a61c36641e2cec8c21d4433f66cbeff`.

State: `COMUN_49_2_R3_PRODUCTION_BASELINE_PRIVATE_GREEN`.

## Disposable POST and forward-only replay

Run `36077121389` recreated the Production-like PRE from the pinned Supabase PostgreSQL image and R1/R2 recovery ACL. PRE fingerprints and migration history matched the live read-only capture exactly. Only migration `20260924225210` was then applied to the disposable database, together with its migration-history row. Migration SHA-256: `873d3a2f6a86ed0225cda1bef77841bc35247630a4708ba2bb2f7c041f7970af`.

POST runner fingerprint: `5172b8ec626eaabd1efdb9c2273bd947867416ae92344d349f5600a0ced2ccd1`.

POST canonical fingerprint: `c5ed6a190103697611314452f5829b12e47521945d373d33b73a355b1bd39f1e`.

Run `36077790057` additionally proved the release runner on a fresh disposable PRE: first pass applied R3, verified POST, recorded the logical ledger, and ended in POST; replay performed no writes. Run `36078536902` repeated the proof with a stricter check that PUBLIC, anon, authenticated and service_role hold no direct candidate-table privileges. The post-schema checker confirmed private RLS/FORCE RLS, twelve allowlisted columns, a unique pending-per-entity index, four invalidation/immutability triggers, a postgres-owned SECURITY DEFINER bridge with `search_path=pg_catalog` and service-role-only EXECUTE, and zero public candidate relations. Existing R3 disposable Auth/Postgres proof from PR #453 covers consent-alone-zero-candidate, owner isolation, races, revocation and immutable snapshots. The release fixture had zero canonical blocking findings.

The forward-only state machine recognizes PRE/`APPLY_R3`, POST_PENDING_LEDGER/`VERIFY_AND_RECORD_LEDGER`, POST/`ALREADY_APPLIED`, and DIVERGED/`BLOCK`. There is no partial submigration. A failed ledger write after schema commit resumes from POST_PENDING_LEDGER without replaying R3. Fingerprint drift blocks instead of being normalized.

Local validation on the release tree passed 1,313 unit tests, 113 solo tests, 58 focal R1/R2/R3 and migration-ownership tests, 26 release-contract tests, explicit SECURITY DEFINER migration validation, privilege lint, TypeScript, ESLint, Next build, Prettier and `git diff --check`. `solo:sql:validate` selects one manifest under `supabase/releases`; it is not applicable to this independent bundle under `supabase/release-bundles`. The R3 manifest validator passed against the captured PRE, derived POST and immutable migration bytes.

## Review boundary

The R3 release manifest is independent of the accepted R1/R2 bundle. Its promotion workflow is prepared but has not been triggered. A future owner-authored issue must name the exact immutable main SHA and the R3-specific authorization `COMUN_49_2_R3_PRODUCTION_SCHEMA_WRITE`. This PR does not apply R3 in Production, write a candidate or other business row, open R4, create a public projection, or add a map effect. Production schema remains R1/R2 only.

## Post-merge certification of release tooling

PR #454 merged normally on 2026-09-25 at `40c111411998da8ea6e2fffc4e682a55af8e6fc2` (tree `bf15df6d951596078a9a2f58fd4a9a39859a1fe0`), preserving reviewed head `f1e47d6e3e1cab42dfe54a69ff7ecdd04ecc0a03`. This merged the dormant R3 release infrastructure only; migration `20260924225210` was not applied. Its bytes still hash to `873d3a2f6a86ed0225cda1bef77841bc35247630a4708ba2bb2f7c041f7970af`, and the release manifest validator passed without changing the migration-set hash `b16573ccc85ebcba3a28fb433cc33c04fd3b61b2d80a25fe4df02a0ab1c4d536` or PRE/POST fingerprints.

Git-linked Production deployment `dpl_EeujnRbDrSLecQJdiu6rJmBrseES` reached READY for that merge SHA, with apex and `www` aliases and no alias error. GitHub Production deployment `6651634251` reported success. Read-only smokes returned 200 for `/comun`, `/comun/denuncias`, `/comun/relatar`, and `/comun/minha-participacao`; PMTiles Range returned 206 (`bytes 0-127/10147678`); `www` redirected 308 to the apex. No candidate RPC was called.

The original PRE capture workflow was intentionally pinned to the pre-merge main, so post-merge proof used the isolated read-only workflow at `d55621ce3906fe1568a3ef1e28e96c2883972ac9`, checking out the exact merge SHA. Run [36081602205](https://github.com/alexandrevrabandonada-oss/comunvrabandonada/actions/runs/36081602205) passed both jobs. The Production job supplied `PGOPTIONS=-c default_transaction_read_only=on`; the adapter enforced `BEGIN READ ONLY`, verified `transaction_read_only=on`, queried the R3 logical ledger directly, and rolled back. Its sanitized capture SHA-256 is `d505355a18364eb10fe2633137c19c1225bd30cb2ce43f3e67c2a2e573d7e74a`.

That capture classified `PRE`: PostgreSQL 17.6, R1/R2 migration history present, R1/R2 bundle ledger and Hardening ledger `PRESENT_ACCEPTED`, zero canonical blocking findings, R3 migration absent, R3 ledger `ABSENT`, candidate table and bridge absent, zero R3 triggers and zero public collective relations. Runner fingerprint remained `7e957c3f154efe87f7104915a5b1e095cc77dc04d488bd4041b4c859f5db1b60`; canonical fingerprint remained `ce98af56622652e9416ed4c535ed8f202a61c36641e2cec8c21d4433f66cbeff`. The R3 ledger state came from a direct SELECT on `public.comun_schema_releases`, not from migration absence.

The same run's credential-free disposable job used the merge SHA and reproduced PRE and POST fingerprints exactly. Its runner artifact SHA-256 is `26a3122b7058a14b026b873e9ee1ac42dc50f9a8805f8e9ef64c78f7da2780d8`: first pass actions `R3, LEDGER`, final state `POST`, replay actions empty. Its structural proof artifact SHA-256 is `21458943dc0f3559ba2b78e6087715736bd49f7e0e5d132709da98f91f91ccff`, confirming private RLS/FORCE RLS, twelve allowlisted columns, unique pending index, four triggers, postgres-owned service-role-only SECURITY DEFINER bridge, and zero public candidate relations. R3 negative controls and state-machine cases remain covered by the passed release contract checks on the reviewed SHA.

No schema or business write was made in Production in this round. The R3 table remains absent, so no Production candidate rows exist; this run created no entity or consent rows. Terminal state: `COMUN_49_2_R3_RELEASE_MERGED_SCHEMA_STILL_ABSENT`. The separate `COMUN_49_2_R3_PRIVATE_SCHEMA_PROMOTION` gate has not been opened.


## Production schema promotion — 2026-09-25

State: `COMUN_49_2_R3_PRIVATE_SCHEMA_PRODUCTION_GREEN`.

The owner-authorized promotion issue #456 was pinned to exact main
`6ea3b4d86d66d99fc174b5b557286740470fc613` with authorization
`COMUN_49_2_R3_PRODUCTION_SCHEMA_WRITE`. The promotion label was removed
after success.

Run `36082196817` completed successfully. The reviewed workflow emitted:

- `COMUN_R3_PREFLIGHT_PRE`;
- `COMUN_R3_PROMOTION_POST:R3,LEDGER`;
- `COMUN_49_2_R3_PRIVATE_SCHEMA_PRODUCTION_GREEN`;
- `COMUN_49_2_R3_PUBLIC_NON_MUTATING_SMOKE_GREEN`.

The preflight was read-only and matched the pinned PRE exactly. The only schema
migration applied was
`20260924225210_comun_relata_collective_entity_private_candidate.sql`,
SHA-256
`873d3a2f6a86ed0225cda1bef77841bc35247630a4708ba2bb2f7c041f7970af`.
The runner then verified exact POST before recording the logical R3 bundle
ledger. Postflight was read-only.

Final runner fingerprint:

`5172b8ec626eaabd1efdb9c2273bd947867416ae92344d349f5600a0ced2ccd1`

Final canonical fingerprint:

`c5ed6a190103697611314452f5829b12e47521945d373d33b73a355b1bd39f1e`

The promotion artifact ID is `10842243111`, digest
`sha256:4149177db1b0529fa0b2165840c7baf3aa68de62f758913b8bc072acfbf4c10e`.

The structural postflight confirmed the private candidate table with
RLS/FORCE RLS, denied direct table access, the service-role-only
`SECURITY DEFINER` prepare bridge, the unique pending-per-entity invariant,
four triggers, accepted R3 logical ledger and zero public candidate relations.
Canonical blocking findings remained zero.

No candidate preparation RPC was called. The migration contains no top-level
candidate seed; its only insert into
`private.comun_relata_collective_entity_candidates` is inside the
`comun_relata_collective_entity_server_candidate_prepare` function body.
Therefore this promotion performed no intentional candidate/entity/consent
business-data write.

The public smoke remained non-mutating and passed the four canonical routes and
PMTiles Range. No public projection, map effect, legitimacy decision or R4
surface was opened.

Terminal state:

`COMUN_49_2_R3_PRIVATE_SCHEMA_PRODUCTION_GREEN`

The next roadmap block is R4 legitimacy/eligibility. R4 remains a separate
functional slice and must not make publication an automatic consequence of
candidate existence.

# COMUN 49.2-A0-R3 — private candidate release preparation

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

Run `36077790057` additionally proved the release runner on a fresh disposable PRE: first pass applied R3, verified POST, recorded the logical ledger, and ended in POST; replay performed no writes. The post-schema checker confirmed private RLS/FORCE RLS, twelve allowlisted columns, a unique pending-per-entity index, four invalidation/immutability triggers, a postgres-owned SECURITY DEFINER bridge with `search_path=pg_catalog` and service-role-only EXECUTE, and zero public candidate relations. Existing R3 disposable Auth/Postgres proof from PR #453 covers consent-alone-zero-candidate, owner isolation, races, revocation and immutable snapshots. The release fixture had zero canonical blocking findings.

The forward-only state machine recognizes PRE/`APPLY_R3`, POST_PENDING_LEDGER/`VERIFY_AND_RECORD_LEDGER`, POST/`ALREADY_APPLIED`, and DIVERGED/`BLOCK`. There is no partial submigration. A failed ledger write after schema commit resumes from POST_PENDING_LEDGER without replaying R3. Fingerprint drift blocks instead of being normalized.

## Review boundary

The R3 release manifest is independent of the accepted R1/R2 bundle. Its promotion workflow is prepared but has not been triggered. A future owner-authored issue must name the exact immutable main SHA and the R3-specific authorization `COMUN_49_2_R3_PRODUCTION_SCHEMA_WRITE`. This PR does not apply R3 in Production, write a candidate or other business row, open R4, create a public projection, or add a map effect. Production schema remains R1/R2 only.

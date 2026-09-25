# COMUN 49.2-A0-R4 — private legitimacy Production release preparation

State: **release tooling under review; R4 schema not applied in Production**.

## Source

Functional R4 PR #458 merged normally at
`7e72a4f943bd882d09119a8e068fb94456048ac4`.

The Git-linked Production deployment for that SHA reached READY and canonical
public routes remained healthy. R4 runtime code is dormant against the still
R3-only Production schema.

## Production PRE — read-only

Run `36194962629` captured Production only inside `BEGIN READ ONLY`, with
`PGOPTIONS=-c default_transaction_read_only=on`.

Sanitized capture SHA-256:

`6f93ff5704762897289984dd8bb3a842630928dbea6f0d33df61d339308a286d`

It confirmed PostgreSQL 17.6, accepted R1/R2/R3 and Hardening ledgers, zero
findings, R4 migration/ledger/table/bridges/trigger absent, R3 candidate
objects intact and zero public collective relations.

PRE runner fingerprint:

`5172b8ec626eaabd1efdb9c2273bd947867416ae92344d349f5600a0ced2ccd1`

PRE canonical fingerprint:

`c5ed6a190103697611314452f5829b12e47521945d373d33b73a355b1bd39f1e`

## Disposable POST

Run `36195239684` reproduced the exact Production PRE in the pinned
Production-like PostgreSQL fixture, including the observed R1 ACL, accepted
R1/R2 ledger and accepted R3 ledger.

Only migration
`20260925014131_comun_relata_collective_entity_legitimacy_eligibility.sql`
was applied.

Migration SHA-256:

`d5e2a7a47689728671c8065ed51f5749bfed4114faca99a4d3e6903ecadacf5c`

Migration-set SHA-256:

`95bb689c46052745e1610105615f6905845686d7ef6b39c38174a72e25289e46`

POST runner fingerprint:

`1a0f10d58073a0677c67bfdd82f58fadfd47be95b1efcc3d0dffd24457093e2c`

POST canonical fingerprint:

`9ed1bb21d0e26797b7b0021fd1e1efd11b313dffeae7cf1b39c0cd95cbc31706`

Blocking findings remained zero. Structural proof confirmed private
RLS/FORCE-RLS review storage, twelve allowlisted columns, monotonic unique
GENERATED ALWAYS `review_order`, append-only trigger, three service-role-only
public bridges, three unexposed private helpers, zero public legitimacy
relations and zero seeded review rows.

The derived artifact SHA-256 is
`33e20a00fede303d9d48a23750a22a4b3c02c26086b9b4644e84cad12cfe975a`.

## Forward-only contract

The release state machine recognizes:

- `PRE / APPLY_R4`;
- `POST_PENDING_LEDGER / VERIFY_AND_RECORD_LEDGER`;
- `POST / ALREADY_APPLIED`;
- `DIVERGED / BLOCK`.

A schema commit followed by a failed ledger write resumes only from
`POST_PENDING_LEDGER`; R4 is never replayed. A complete POST replay performs
zero writes.

Production authorization is distinct:

`COMUN_49_2_R4_PRODUCTION_SCHEMA_WRITE`

and is accepted only from an owner-authored issue titled:

`COMUN 49.2 R4 private legitimacy schema promotion`

bound to the exact immutable `main` SHA.

## Boundaries

This release tooling does not apply R4 in Production, create review/business
rows, call review/candidate RPCs, expose `eligible_for_projection_review`,
open a map, create R5 projection or modify `future_map_eligibility`.

Promotion remains a separate explicit gate.

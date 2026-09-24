# COMUN 49.2-A0-R3 — private sanitized entity candidate

Base: `68ea3a155732bb94d595228e2f9e47d92cf58b93`.

R3 introduces a private snapshot in `private.comun_relata_collective_entity_candidates`. It is created only by an explicit, authenticated Server Action. Active R1 consent alone leaves the candidate count at zero. The bridge reads the persisted entity name and type in the same transaction, verifies the actor's live representation and pinned R1 consent, and starts every candidate at `pending_legitimacy`.

The single new public bridge is executable only by `service_role`. The Server Action accepts only `entityId` and `requestId`; the server gets the actor from `auth.getUser()`. The bridge's null request/entity mode lists only candidates tied to that actor's representation. Its response and the TypeScript owner DTO exclude provenance IDs and all person, report, location, attachment and authentication data.

An active candidate is unique per entity. The generation request is globally unique and replay by the same actor/entity returns the existing row, including an invalidated row. Replay by another actor fails. Consent withdrawal, representation revocation and entity archive invalidate without deleting the row. The first causal invalidation reason is retained: the R2 owner revocation path withdraws consent first, so it records `CONSENT_REVOKED`; a representation-first transaction records `REPRESENTATION_REVOKED`.

Candidates never self-verify, publish, open a map, or authorize a public projection. No public candidate relation is created. The snapshot is not silently refreshed. Any future entity-edit runtime must explicitly invalidate/supersede the prior snapshot and require a new preparation; R3 adds no edit route.

Local validation on the initial R3 tree: 1,313 unit tests, 113 solo tests, TypeScript, ESLint, build, 22 classifier/contract tests, SECURITY DEFINER validator (three functions), explicit privilege lint (52 migrations), Prettier and `git diff --check` passed. The standalone `solo:sql:validate` command requires a release manifest and is not applicable to this code-only PR with no R3 Production release manifest.

The first remote disposable run (`36070994301`, SHA `ee30aa179dbc5f83af65b46e0cd7246da5b142a4`) applied R1/R2/R3 and exposed a real trigger defect when representation revocation referenced the consent-only `OLD.active` field. The trigger now branches by source table before reading table-specific fields. The R2 disposable fixture was also narrowed to prove zero candidate rows and no public candidate relation when R3 is present. Two unrelated historical P6C preflights failed on a remote dry-run despite canonical ownership classifying R3 as not applicable. They now classify ownership before remote inspection and skip only when the lane is not the owner; unknown migrations still block.

Corrected candidate SHA `8d5c643b27b1a8f4e8ef138fa51b13ef9c4bfd68`, tree `dfbe361ca5759010d09c572c49d1fd619824f7b4`, R3 migration SHA-256 `873d3a2f6a86ed0225cda1bef77841bc35247630a4708ba2bb2f7c041f7970af`: R3 disposable run `36071413786` passed both contract and Auth/Postgres jobs. R2 disposable run `36071413822` passed both jobs with R3 installed. P6C-B1 run `36071413689` and P6C-B2 run `36071413825` passed ownership classification and skipped their non-applicable remote preflights. Exact Preview and all PR-wide checks remain to be certified on the checkpoint SHA.

Production is untouched by R3. R4 legitimacy/elegibility and R5 projection are separate future work.

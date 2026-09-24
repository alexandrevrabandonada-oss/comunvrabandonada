# COMUN 49.2-A0-R3 — private sanitized entity candidate

Base: `68ea3a155732bb94d595228e2f9e47d92cf58b93`.

R3 introduces a private snapshot in `private.comun_relata_collective_entity_candidates`. It is created only by an explicit, authenticated Server Action. Active R1 consent alone leaves the candidate count at zero. The bridge reads the persisted entity name and type in the same transaction, verifies the actor's live representation and pinned R1 consent, and starts every candidate at `pending_legitimacy`.

The single new public bridge is executable only by `service_role`. The Server Action accepts only `entityId` and `requestId`; the server gets the actor from `auth.getUser()`. The bridge's null request/entity mode lists only candidates tied to that actor's representation. Its response and the TypeScript owner DTO exclude provenance IDs and all person, report, location, attachment and authentication data.

An active candidate is unique per entity. The generation request is globally unique and replay by the same actor/entity returns the existing row, including an invalidated row. Replay by another actor fails. Consent withdrawal, representation revocation and entity archive invalidate without deleting the row. The first causal invalidation reason is retained: the R2 owner revocation path withdraws consent first, so it records `CONSENT_REVOKED`; a representation-first transaction records `REPRESENTATION_REVOKED`.

Candidates never self-verify, publish, open a map, or authorize a public projection. No public candidate relation is created. The snapshot is not silently refreshed. Any future entity-edit runtime must explicitly invalidate/supersede the prior snapshot and require a new preparation; R3 adds no edit route.

Local validation on the R3 tree: 1,313 unit tests, 113 solo tests, TypeScript, ESLint, build, 22 classifier/contract tests, SECURITY DEFINER validator (three functions), explicit privilege lint (52 migrations), Prettier and `git diff --check` passed. The standalone `solo:sql:validate` command requires a release manifest and is not applicable to this code-only PR with no R3 Production release manifest. The R3 Auth/Postgres proof runs in the dedicated disposable workflow; it requires a working Docker engine and must be evaluated on the PR head before review readiness.

Production is untouched by R3. R4 legitimacy/elegibility and R5 projection are separate future work.

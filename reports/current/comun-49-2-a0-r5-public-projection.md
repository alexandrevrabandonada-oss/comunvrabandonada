# COMUN 49.2-A0-R5 — public collective-entity projection

State: **R5 candidate under disposable review; no Production schema or business write in this slice**.

## Objective

R5 is the first deliberately public surface in the collective-entity chain. It
does not reinterpret R4 eligibility as publication authority.

The chain is now:

1. R1 records private entity/representation/consent;
2. R2 authenticates owner operations;
3. R3 creates a private sanitized candidate only on explicit preparation;
4. R4 requires independent evidence reviews and may derive
   \`eligible_for_projection_review\`;
5. R5 requires a separate publisher decision before a four-field public
   projection exists.

## Public surface

The only new public relation is:

\`public.comun_relata_collective_entity_public_projections\`.

Its columns are exactly:

- \`projection_id\`;
- \`public_name\`;
- \`entity_type\`;
- \`published_at\`.

It contains no private entity/candidate/consent/representation identifier, no
owner identity, no reviewer/publisher identity, no report, evidence, contact,
address, coordinates or geometry.

Anonymous and authenticated clients receive SELECT only. All publication and
withdrawal writes are server-only security-definer operations.

## Publication authority

Publication requires an active canonical admin profile with role:

- \`publisher\`; or
- \`admin\`.

The authenticated publisher identity is derived from the server session and
revalidated in PostgreSQL. Browser input cannot nominate a publisher user or
profile.

The publisher must be distinct from:

- the candidate owner/source representation user;
- the latest R4 entity-existence reviewer;
- the latest R4 representation-legitimacy reviewer.

Therefore the two R4 evidence decisions and the R5 publication decision cannot
collapse into one person's authority.

## Eligibility is live, publication is not automatic

Approval requires the current R4 snapshot to still be
\`eligible_for_projection_review\`.

Regaining R4 eligibility after a correction never republishes automatically.
A new explicit R5 publisher approval is required.

## Retraction and contestability

R5 adds append-only private decision and event ledgers plus a private operational
registry.

A public projection is removed automatically when:

- a later R4 review changes current eligibility away from
  \`eligible_for_projection_review\`; or
- the R3 candidate is invalidated after consent revocation, representation
  revocation or entity archival.

Automatic withdrawal creates a private append-only event. It never erases the
publication history.

A publisher/admin may also withdraw an active projection explicitly with a
private reason.

## Idempotency and concurrency

Decision requests carry a unique request id. Exact replay is idempotent; a
different payload under the same request id blocks.

Candidate and request advisory locks serialize projection decisions. There is
at most one projection registry row per candidate and one public projection id
per registry.

## Boundaries

R5 does not:

- change the R3 candidate into an approved/published state;
- promote a representation to \`verified\`;
- expose R4 evidence or reviewer identities;
- expose publisher identity;
- publish individual reports;
- publish evidence, contacts or locations;
- modify \`future_map_eligibility\`;
- create a map feature or coordinate;
- index Search;
- create a Pauta, Ação or Comunidade;
- connect the entity projection to collective report cases.

A published entity therefore remains **not map-eligible by implication**.

## Runtime surfaces

Publisher/admin only:

- \`comun_relata_collective_entity_server_projection_review_queue\`;
- \`comun_relata_collective_entity_server_projection_decide\`.

Owner only:

- \`comun_relata_entity_server_projection_list_own\`.

All three bridges are service-role-only. Publisher/owner identity is derived
from the authenticated server session.

## Disposable proof

The local proof starts from the complete migration chain and uses no remote
Supabase secret.

It proves:

- R4 eligibility is required;
- a publisher/admin is required;
- the owner cannot self-publish;
- either latest R4 reviewer cannot act as publisher for that candidate;
- a viewer cannot publish;
- approval request replay is idempotent;
- public projection contains exactly four sanitized fields;
- anon/authenticated can read but cannot write the public projection;
- private decision/event audit is append-only;
- a later contested R4 review retracts the public row;
- later restoration of R4 eligibility does not auto-republish;
- a new independent publisher approval can republish;
- manual withdrawal works;
- subsequent approval remains explicit;
- consent revocation invalidates the candidate and retracts the public row;
- an invalidated candidate cannot be republished;
- direct anon/authenticated execution of R5 service bridges is denied;
- canonical security findings remain zero.

## Production boundary

This branch/PR must not apply R5 in Production.

A future R5 release preparation must separately capture the exact R4-post
Production baseline, derive the expected R5 post fingerprint in disposable
Postgres and require an explicit schema-promotion gate.

Public map activation remains a later, independent gate.

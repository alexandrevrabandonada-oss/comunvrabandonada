# COMUN 49.2-A0-R5 — public projection gate

State: **R5 schema promoted in Production; zero decision/projection rows at promotion; publisher desk under review**.

## Objective

R5 converts the R4 terminal state \`eligible_for_projection_review\` into a
separate publication decision. R4 eligibility remains necessary but is never
publication authority by itself.

The projection is deliberately **entity-only and sanitized**. It contains no
report, evidence, attachment, private contact, auth identity, reviewer identity,
consent identifier, representation identifier, location, coordinate or map
authority.

## Separation of duties

R4 factual review roles remain \`admin\`, \`editor\` and
\`factual_reviewer\`. R5 publication uses only an active dedicated
\`publisher\` profile, backed by an active \`comun_admin_users\` access row.

The publisher identity comes from the authenticated server session and is not a
browser input. The database rejects any publisher who still has an active
`declared` or `verified` representation of the candidate's entity, even when
another representative created the candidate.

## Decision history

R5 adds an append-only private decision log with exactly three decisions:

- \`publish\`;
- \`hold\`;
- \`reject\`.

Every decision has an idempotent request id, monotonic decision order, private
rationale and snapshotted publisher authority.

A later decision never rewrites or deletes an earlier decision.

## Public-ready projection

R5 adds one public-schema storage relation, but it is **not directly exposed**:
RLS and FORCE RLS are enabled and all table grants are revoked from PUBLIC,
\`anon\`, \`authenticated\` and \`service_role\`.

The only reader is a server-only service-role bridge returning exactly:

- opaque projection id;
- public name;
- entity type;
- publication timestamp.

The table may be used by a later product surface, but this slice adds no public
page, browser RPC or map link.

## Fail-closed suppression

A projection is automatically suppressed when:

- the R3 candidate becomes invalidated;
- a newer R4 review makes legitimacy contested;
- legitimacy becomes blocked;
- more evidence becomes necessary;
- the R4 review state otherwise stops being exactly
  \`eligible_for_projection_review\`.

Restoring R4 eligibility **does not republish** automatically. A new publisher
decision \`publish\` is required.

A publisher may also explicitly \`hold\` or \`reject\` an active projection,
which suppresses it while preserving the append-only decision history.

## Map boundary

R5 does not read or write \`future_map_eligibility\`, does not set
\`COMUN_DENUNCIAS_PUBLIC_MAP_ENABLED\`, contains no coordinates, does not
materialize a map feature and does not touch PMTiles.

The public map remains a later, separately authorized gate.

## Production boundary

The R5 schema was promoted independently and auditably at checkpoint
\`COMUN_49_2_R5_PRIVATE_SCHEMA_PROMOTED_MAP_CLOSED\`. Promotion created zero
decision rows and zero projection rows.

The publisher-desk slice does not perform an automated Production business
write. A real decision remains an explicit authenticated publisher action.

The public map remains independently closed.

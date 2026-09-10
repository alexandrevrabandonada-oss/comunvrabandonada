# ADR-050 — Serviços Públicos e Controle Popular: fronteira SP-0

- Status: accepted for SP-0 design
- Date: 2026-09-10
- Related: #433
- Scope: architecture and threat-model audit only

## Context

The COMUN already has a protected civic cycle: private intake, editorial review,
sanitized public projections, Pauta, collective action, official follow-up,
results and memory. Issue #433 adds a durable public-services knowledge layer.
It must not become a parallel product, weaken the current V1 delivery scope, or
turn allegations into public facts or mobilization.

The present repository shows reusable foundations:

- private reports and sanitized public projections;
- Pauta as the canonical continuity unit;
- reviewed dossiers and immutable publication snapshots;
- official protocols with private operational detail and public summaries;
- server-side editorial operation, RLS matrix and no-leak testing;
- Relata's private-by-default collective matching, with public map still OFF.

## Decision

SP-0 defines a future **evidence-led civic graph**, not a public allegation
database. It is a design package only: no SQL, runtime, flags, deployment,
Production read/write, backfill or public route is introduced by this ADR.

The future graph has two deliberately separate planes.

1. Canonical/curatorial plane: organizations, public bodies, services,
   facilities, procurement, contracts, payments, source documents, claims,
   occurrences, inspections, information requests and their review history.
   It is server-side and private by default.
2. Public read plane: a narrow, reviewed projection containing only fields
   explicitly selected for publication, the supporting source citation,
   evidence status, time scope and correction/contest status.

A service entity is not a claim. A source document is not a claim. A report is
not an occurrence. An occurrence is not proof of contractual responsibility.
A Pauta or Ação is never created merely because an entity, claim, report or
occurrence exists.

## Invariants

1. **No shortcut from allegation to publication.** Every public statement comes
   from a reviewed claim or a reviewed editorial snapshot, never from raw
   intake, raw document text or a direct table join.
2. **Source and claim are separate.** One source can support, qualify,
   contradict or supersede several claims. Each immutable claim revision has
   a many-to-many association with immutable source versions, recording an
   evidence role and page/section/excerpt locator for every association.
3. **Identity is canonical and cautious.** Company identity uses normalized CNPJ
   when available, but keeps legal name, trade name, source-specific spelling
   and merge/split history. Uncertain identity remains uncertain.
4. **Attribution has its own evidence.** A labour occurrence may be related to
   a company, a service, a facility and/or a contract only with an explicit
   relationship confidence and source; absence of a relationship is not
   evidence against it.
5. **Public data is projection-only.** Public UI, search and map endpoints
   receive DTOs/read models, not base tables, views with `select *`, raw
   evidence, signed URLs, private coordinates or editorial notes.
6. **Correction and contradiction are first-class.** A corrected, contested,
   dismissed or reformed claim retains a visible status/history as appropriate;
   deletion is not the default historical mechanism.
7. **No individual worker directory.** Worker information is aggregate role/post
   data only unless a distinct, reviewed legal basis and future ADR say
   otherwise. SP-0 authorizes no such exception.
8. **No automatic political action.** Links to existing Pauta, Action,
   protocols or community spaces are reviewed links with provenance and a
   human gate.
9. **No reuse of sensitive report geography.** Future facilities may use public
   official addresses or public map geometry. Relata/report locations remain
   private and never seed facility geometry.
10. **Forward-only and auditable.** Any later migration is additive, timestamped,
    transactionally verified, covered by RLS/grant/no-leak tests and can be
    superseded by a corrective migration.

## Consequences

### Independent dimensions and scope

Evidence support (alleged, corroborated, contested, not confirmed), editorial
review/publication, and administrative/judicial status are independent.
The latter records authority, instance, outcome, appeal/reformation and finality
only when verified in a cited source version. Editorial approval never creates
legal finality. A contested claim may remain published as contested after review.

Services, facilities and contracts form scoped relationships, not a rigid tree:
one facility may host several services; one contract may cover several units or
non-point territorial coverage. Responsibility and coverage links carry a period,
source version and locator. Contract validity and last-known supplier do not
prove current execution.

InformationRequest reuses `comun_official_protocols`; CaseFile reuses existing
dossiers, reviews and publication snapshots. Any future extension must document
a missing field and reference the canonical object, never duplicate its workflow.
Cataloguing a public body or company grants no representation, consent or
editorial authority.

The migration inventory is a provisional horizon, not approval for 24 tables.
The next separately authorized proposal must demonstrate one synthetic claim
revision with two source versions and its review boundary, with provenance from
the start; see the [minimal plan](SERVICOS_PUBLICOS_SP0_MINIMAL_MIGRATION_PLAN.md).
Merenda is the first future editorial case; Cuidadores comes later with coverage
and privacy review. Neither requires a second portal, map, form or protocol system.
Research-chat material is a lead, not a primary source. Examples remain explicitly
synthetic until document/version, page or locator, period and scope are available.

The radio audit is independent of SP tables. Its reported local results are not
runtime certification for this documentary package or for Production.

### Positive

- Preserves the current COMUN distinction between private originals and public
  projections.
- Supports a traceable narrative across public procurement, execution,
  inspection, official requests and community response.
- Makes uncertainty, correction and counterstatement visible instead of
  pretending a simple “regular/irregular” label exists.
- Allows Dataset 001 to be ingested offline before any public presentation.

### Costs and limits

- Editorial review is intentional work; no ingestion or alert can publish.
- A document corpus can be large and sensitive, so source metadata and source
  objects must be separated.
- Existing reports, Relata cases and public map projections cannot be treated
  as a ready-made SP dataset.
- V1 remains unchanged. SP-1 is a separate, explicit decision after this ADR.

## Rejected alternatives

### A single public “company irregularity” field

Rejected because it erases time, source, attribution, contradiction and legal
status; it would also create a defamation-prone ranking surface.

### Reusing `comun_reports` as the occurrence database

Rejected because reports may contain personal data, raw allegations, private
locations and confidential operational context. A reviewed occurrence can cite
a report only through a controlled private link.

### Giving the public UI direct select access to the new tables

Rejected because it repeats the exact class of leak that COMUN's
`comun_public_reports`, dossier snapshots and RLS matrix are designed to
prevent.

### Automatically opening a Pauta or sending an official representation

Rejected because evidence collection, editorial judgment and collective
organization have different authorities and consent requirements.

## SP-0 exit criteria

SP-0 is complete when this ADR, the logical ERD, boundary/threat model, reuse
inventory and minimal migration plan are reviewed. It does **not** authorize
schema changes, Production activity, Dataset 001 ingestion, public routes,
maps or automation.

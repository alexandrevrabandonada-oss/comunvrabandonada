# Serviços Públicos e Controle Popular — minimal migration plan

Related: #433 · This is a plan, not SQL. SP-0 performs no migration and no
Production activity.

## Preconditions

SP-1 must not begin until:

- this SP-0 package is reviewed;
- the active V1 delivery work is not blocked or widened by SP;
- the current repository migration baseline is re-read from the canonical
  ledger, not guessed from filenames;
- the open #432 proof/blocker is kept independent of SP work;
- a local disposable or isolated Linux-runner ephemeral Supabase environment
  can run focused RLS and no-leak tests; no real remote environment is a fallback.

Every later migration is forward-only, timestamped after the canonical
baseline, transactional where possible, accompanied by explicit grants/RLS and
a corrective-migration strategy. No data seed, external crawl, backfill, flag
or public route belongs in the schema migration.

## Provisional horizon, not an approved batch

| Step | Purpose | New physical objects (provisional names) | Explicitly excluded | Promotion gate |
| --- | --- | --- | --- | --- |
| SP-1A horizon | canonical civic-service identity | `sp_public_bodies`, `sp_public_services`, `sp_public_facilities`, `sp_companies`, `sp_procurements`, `sp_contracts`, `sp_contract_amendments`, `sp_public_payments`, `sp_work_posts` and justified scoped relations | data import, public select, UI, map geometry from reports | constraints/FKs, separate grants/RLS evidence with populated synthetic fixtures and distinct actors |
| SP-1B horizon | private provenance and claim lifecycle | source/document versions, claims/revisions and N:N revision-source associations; later claim links, counterstatements, occurrences and inspections; InformationRequest/CaseFile reference existing protocols/dossiers | duplicate `sp_information_requests` or `sp_case_files` workflows, source objects, OCR pipeline, public DTO/view, automatic claim creation | lifecycle, source-hash, attribution and RLS/no-leak tests |
| SP-1C | cross-domain audited links | `sp_pauta_links`, `sp_action_links`, `sp_protocol_links`, `sp_report_links`, `sp_territory_links` | mutation of existing COMUN tables; automatic Pauta/Action/protocol effects | foreign-key and human-gate tests; private link isolation |
| SP-2 | offline Dataset 001 ingestion | no Production object required; local ETL/checkpoint only | crawl in Production, automatic publication, live monitoring | idempotence, CNPJ normalization, source hashes, duplicate/conflict report |
| SP-3 | private curation | server-side commands/read APIs and queue adapter only after a focused ADR | public routes, map, ranking, official sends | authorization/IDOR, audit, retry and correction tests |
| SP-4 | public read model | sanitized projection/read model and DTO only | direct table access, raw documents, individual workers, map layer | public no-leak HTTP suite, withdraw/correction cache test |
| SP-5+ | service/company/contract pages, territory, dossiers and monitoring | separately designed thin vertical slices | a broad “portal launch” | per-slice accessibility, provenance and operational evidence |

The former nine identity objects, ten evidence objects and five junctions are
only a planning horizon, not a 24-table implementation commitment. Do not create
the horizon before demonstrating the first case. Physical choices require a
new bounded review; SP-0 starts no SP-1 work.

## Smallest next proposal: one synthetic evidence case

Propose a private synthetic Merenda claim, revision R1, cited by source versions
V1 (`supports`, page 2) and V2 (`qualifies`, section 3). Reuse V1 for revision R2
of a second synthetic claim to demonstrate N:N, then preserve R1 when it becomes
contested. An authorized reviewer may approve contested wording without changing
unknown procedural finality. No real company, worker, contract or source is used.

Strictly necessary logical objects are SourceDocument, SourceDocumentVersion,
EvidenceClaim, ClaimRevision and ClaimRevisionSource, using existing server
identity and audit infrastructure. Publication authorization is exercised as a
private decision/DTO boundary, not a new public route or deployment. A future
proposal must justify physical tables for these five concepts before SQL; source
traceability is present from the first case, never postponed to an identity batch.

Defer company/contract registries, facilities, payments, occurrences, inspections,
new cross-domain junctions, ETL, UI and maps. InformationRequest and CaseFile stay
references to `comun_official_protocols` and canonical dossier/review/snapshot
objects; extensions require a demonstrated missing field, not parallel workflows.
Merenda is the first future editorial case; Cuidadores requires a later coverage
and privacy review. This document does not execute either case.

## Required physical-model constraints

- UUID primary keys; natural identifiers (CNPJ, contract number, process
  number) are nullable when unknown and never fabricated.
- Normalized CNPJ has a uniqueness rule only when present and confirmed enough
  for identity; aliases are a separate relation, not a second Company.
- Contract values, dates and status are historical/versioned; amendments do
  not overwrite originals.
- Claims preserve independent evidence support, editorial review/publication and
  administrative/judicial status (instance, outcome, appeal and sourced finality).
  Public-safe wording remains nullable until approved; contested publication is
  possible without treating review as a definitive judicial decision.
- Claim-to-subject links include relation type, confidence and source support.
- Source document versions include cryptographic hash and retrieval timestamp.
- Revision/source-version associations are N:N and require evidence role and
  locator. Facility/service and contract coverage relations require period and
  provenance, support multiple units and permit explicitly non-point coverage.
- All cross-domain links are junction tables with `linked_by`,
  `linked_at`, review status and no trigger that creates downstream entities.
- Sensitive source object location is stored separately from public metadata.
- All new tables start with RLS enabled and no anon/authenticated direct access.
  `service_role` is granted only where the server-side implementation needs it.

## Future verification gates, selected per proposed slice

1. duplicate CNPJ/alias cannot silently create two “confirmed” companies;
2. contract amendment cannot overwrite original value;
3. anonymous and ordinary authenticated clients cannot read base SP tables;
4. multiple source versions can support/contradict one claim revision and one
   source version can qualify multiple revisions with distinct locators;
5. no claim can link a company or contract without relation provenance;
6. revised/reformed/countered claim preserves history and public state;
7. no public DTO/view can contain raw text, contact, private source URI, signed
   URL, reviewer identity, internal ID or report location;
8. report/Relata references are inaccessible outside the narrow authorized
   server path;
9. inserting service-graph data cannot create a Pauta, Action, protocol,
   notification or public map point;
10. cleanup removes only the owned synthetic fixtures or isolated ephemeral stack.

Use nonempty fixtures and distinct synthetic actors (anonymous, ordinary users A/B,
scoped reviewer and out-of-scope reviewer). Verify table grants separately from
row policies: empty results or a missing GRANT are not proof of RLS. Where base
tables remain service-only, record that denial as grant evidence and test the
privileged application's scope enforcement separately before client creation.
Never grant production access merely to make a test pass.

Adversarial cases must preserve issuer/jurisdiction/modality alongside bidding
number/year; administrative quantities do not become counts of people; an ARP
does not prove expenditure; validity/last-known supplier does not establish
current execution; a public source can contain private data; “not located” records
search date and scope instead of asserting nonexistence. Research-chat leads are
not primary sources. Real examples require document version, locator and scope;
until then all examples are explicitly synthetic.

## Minimal next action after SP-0

After separate authorization, propose only the synthetic evidence slice above,
with a justified object list and local/ephemeral Linux verification plan. Do not
automatically open an implementation task, execute SP-1, import Dataset 001 or
couple this work to the independent radio audit or PR #432.

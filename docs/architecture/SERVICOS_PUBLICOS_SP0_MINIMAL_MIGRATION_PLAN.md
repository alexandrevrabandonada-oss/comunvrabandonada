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
- a local disposable Supabase environment can run focused RLS and no-leak
  tests for the proposed tables.

Every later migration is forward-only, timestamped after the canonical
baseline, transactional where possible, accompanied by explicit grants/RLS and
a corrective-migration strategy. No data seed, external crawl, backfill, flag
or public route belongs in the schema migration.

## Smallest safe sequence

| Step | Purpose | New physical objects (provisional names) | Explicitly excluded | Promotion gate |
| --- | --- | --- | --- | --- |
| SP-1A | canonical civic-service identity | `sp_public_bodies`, `sp_public_services`, `sp_public_facilities`, `sp_companies`, `sp_procurements`, `sp_contracts`, `sp_contract_amendments`, `sp_public_payments`, `sp_work_posts` and narrow junctions | data import, public select, UI, map geometry from reports | constraints/FKs, RLS/grants and empty-table negative tests |
| SP-1B | private provenance and claim lifecycle | `sp_source_documents`, `sp_source_document_versions`, `sp_evidence_claims`, `sp_claim_revisions`, `sp_claim_links`, `sp_counterstatements`, `sp_occurrences`, `sp_inspection_events`, `sp_information_requests`, `sp_case_files` | source objects, OCR pipeline, public DTO/view, automatic claim creation | lifecycle, source-hash, attribution and RLS/no-leak tests |
| SP-1C | cross-domain audited links | `sp_pauta_links`, `sp_action_links`, `sp_protocol_links`, `sp_report_links`, `sp_territory_links` | mutation of existing COMUN tables; automatic Pauta/Action/protocol effects | foreign-key and human-gate tests; private link isolation |
| SP-2 | offline Dataset 001 ingestion | no Production object required; local ETL/checkpoint only | crawl in Production, automatic publication, live monitoring | idempotence, CNPJ normalization, source hashes, duplicate/conflict report |
| SP-3 | private curation | server-side commands/read APIs and queue adapter only after a focused ADR | public routes, map, ranking, official sends | authorization/IDOR, audit, retry and correction tests |
| SP-4 | public read model | sanitized projection/read model and DTO only | direct table access, raw documents, individual workers, map layer | public no-leak HTTP suite, withdraw/correction cache test |
| SP-5+ | service/company/contract pages, territory, dossiers and monitoring | separately designed thin vertical slices | a broad “portal launch” | per-slice accessibility, provenance and operational evidence |

SP-1A through SP-1C may be separate migrations or one carefully bounded
canonical-model change **only** if they can be reviewed as a single coherent
RLS/constraint unit. The default recommendation is three small migrations,
because the threat surfaces differ and none needs public runtime activation.

## Required physical-model constraints

- UUID primary keys; natural identifiers (CNPJ, contract number, process
  number) are nullable when unknown and never fabricated.
- Normalized CNPJ has a uniqueness rule only when present and confirmed enough
  for identity; aliases are a separate relation, not a second Company.
- Contract values, dates and status are historical/versioned; amendments do
  not overwrite originals.
- Claims have a bounded state enum, a public-safe wording field that is nullable
  until approved, a temporal scope and explicit review/publication state.
- Claim-to-subject links include relation type, confidence and source support.
- Source document versions include cryptographic hash and retrieval timestamp.
- All cross-domain links are junction tables with `linked_by`,
  `linked_at`, review status and no trigger that creates downstream entities.
- Sensitive source object location is stored separately from public metadata.
- All new tables start with RLS enabled and no anon/authenticated direct access.
  `service_role` is granted only where the server-side implementation needs it.

## First focused test bundle for SP-1A/B

1. duplicate CNPJ/alias cannot silently create two “confirmed” companies;
2. contract amendment cannot overwrite original value;
3. anonymous and ordinary authenticated clients cannot read base SP tables;
4. a source version can support/contradict multiple claims without data loss;
5. no claim can link a company or contract without relation provenance;
6. revised/reformed/countered claim preserves history and public state;
7. no public DTO/view can contain raw text, contact, private source URI, signed
   URL, reviewer identity, internal ID or report location;
8. report/Relata references are inaccessible outside the narrow authorized
   server path;
9. inserting service-graph data cannot create a Pauta, Action, protocol,
   notification or public map point;
10. rollback/cleanup of synthetic local fixtures leaves no rows or objects.

## Minimal next action after SP-0

Open one narrow implementation issue for **SP-1A only** with a table-by-table
column list, constraints, RLS/grants matrix, local migration rehearsal and the
ten tests above. Do not combine it with Dataset 001, admin UI, public pages,
map integration or monitoring.
# Serviços Públicos e Controle Popular — reusable COMUN surfaces

Related: #433 · Base snapshot `1387e1bcecdc4147bb5dad41aa7d541ec97b1497` · No code or schema change.

## Reuse map

| Existing surface | SP role | Reuse decision | Boundary |
| --- | --- | --- | --- |
| `comun_pauta_spaces` and public Pauta routes | canonical collective continuity | Reuse as the only Pauta target through a reviewed junction | SP does not create Pauta automatically. |
| `comun_pauta_evidence_items` | curated public evidence already linked to Pauta | Reuse as downstream editorial reference, not as the SP source registry | SP source/claim review remains separate; only approved public-safe evidence crosses. |
| `comun_pauta_dossiers`, reviews and publication snapshots | reviewed dossier and public publication mechanics | Reuse for public case/dossier narrative | Do not duplicate dossier workflow or expose drafts/reviewer data. |
| `comun_official_protocols` | LAI/ouvidoria and official response lifecycle | Reuse as a linked information-request/protocol object | Raw response, notes and operational identifiers remain server-side. |
| `comun_mobilization_actions`, `comun_hub_results`, `comun_pauta_timeline_events` | action, result and public timeline | Reuse via reviewed links | An SP claim cannot start or complete an action/result. |
| `comun_editorial_operation_*` and admin operation UI | private review queue infrastructure | Adapt only after SP-1 has a concrete workflow | Keep origin-specific queues; do not force a generic queue now. |
| `comun_reports` and `comun_public_reports` | private citizen intake and existing safe projection | Link privately only when a report is a reviewed source | Never equate a report with a claim/occurrence; never reuse raw data in SP public DTOs. |
| Relata private cases, consent and collective matching | sensitive intake/collective context | Keep independent; optional private provenance link only in a later reviewed design | Map and public projections are not an SP data source; no inferred location or identity. |
| `comun_territorial_*` and map shell | public territorial context | Reuse only for officially public service/facility coverage | No private coordinates, heatmaps or report-derived facility points. |
| `comun_archive_items` | published historical sources/memory | Link a reviewed public derivative where rights permit | Archive original and rights workflow remain canonical. |
| `comun_pauta_action_cycles` | sanitized political-cycle history | Consume as a downstream public display relation if needed | It does not represent evidence provenance or contract status. |
| RLS matrix, no-leak HTTP tests, forward-only migration runner | security/promotion controls | Reuse as mandatory SP verification pattern | SP adds cases; it never weakens existing thresholds. |

## Important non-reuse decisions

| Existing item | Why it is not the SP canonical entity |
| --- | --- |
| `comun_actions` | It represents lightweight visitor confirmation/support, not an organized collective action. SP must use `comun_mobilization_actions` only through an explicit link. |
| `comun_reports` | It contains raw text, contact and potentially precise location; it is intake, not verified evidence. |
| `comun_public_reports` | It is a narrow sanitized report view, not a model for contracts, payments, claims or source versioning. |
| `comun_issues` | It is legacy compatibility; future collective links target `comun_pauta_spaces`. |
| Relata collective projections | They are consent- and threshold-governed private/public safety mechanisms, not a general services database. |
| generic company name text in existing content | It lacks a canonical CNPJ/alias/confidence model and must not be upgraded by inference. |
| current public map | It is not an authorization to make service, contract, or allegation layers public. |

## Existing routes that can eventually host, but not SP-0

- `/comun`: organic entry point, only after a separately reviewed navigation
  decision.
- `/comun/pautas/[slug]`: public continuity for a reviewed service-related
  Pauta.
- `/comun/dossies`: published, snapshot-backed case narrative.
- `/comun/acoes/[slug]` and protocol-following screens: downstream outcomes.
- `/comun/admin/operacao`: private operational context.
- territory/map surfaces: public facilities only after SP-6, not a shortcut for
  claim visualization.

SP-0 creates no route, menu item, API, map layer, search index or DTO.

## Canonical ownership and the next bounded case

InformationRequest is a reference to `comun_official_protocols`, and CaseFile
references existing dossiers, review records and publication snapshots. No
second request, response, deadline, review or publication workflow is proposed.
An eventual extension must identify a concrete missing field and keep the
canonical object's identity and authorization. A catalogued body/company is
not an authenticated representative and confers neither consent nor editorial
authority; PR #432 and its verification remain independent.

The [minimal plan](SERVICOS_PUBLICOS_SP0_MINIMAL_MIGRATION_PLAN.md) replaces a
large identity-first batch with a separately reviewed synthetic provenance case:
claim revisions and N:N source-version citations from the start. The catalog and
cross-domain junction lists remain provisional. Merenda is the first future
editorial case; Cuidadores is later, subject to coverage/privacy review. Both
belong in COMUN's existing civic cycle, without a second portal/map/form/protocol
system. No example represents verified real-world evidence until its source
document/version, page/locator, period and scope are recorded.

The radio closure needs no SP tables. Neither its reported tests nor the evidence
of another PR certifies this package. Future authorization tests must use distinct
actors and populated synthetic data in local or Linux-runner ephemeral stacks,
with grants, RLS and privileged application scopes proved separately.

## Reuse principles

1. Reuse the mature **publication mechanism**, never its schema by copy/paste.
2. Keep each domain's source of truth intact; use optional audited junctions.
3. Reuse the private/public separation, role checks, snapshot and no-leak
   patterns before creating any new public surface.
4. Give SP its own canonical identity and provenance model instead of encoding
   contracts and evidence as improvised fields on Pautas, reports or actions.
5. Defer UI composition until a safe read model exists; SP-0 is intentionally
   invisible to end users.

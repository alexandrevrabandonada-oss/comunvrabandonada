# COMUN 49.2 — entity onboarding + R4 review desk

State: **operational upstream chain under review**.

Production readiness diagnostics found zero active entities, representations,
consents, candidates, reviews and publishers. The missing path was not database
infrastructure: R1-R4 runtime functions existed, but there was no member page
for entity onboarding and no dedicated R4 reviewer desk.

## Member flow

`/comun/entidades` now provides an authenticated owner flow:

1. declare a collective entity and representation;
2. read the pinned consent notice;
3. explicitly grant or revoke sanitized-projection consent;
4. explicitly prepare a private R3 candidate;
5. follow R4 legitimacy states;
6. optionally revoke the representation with an explicit confirmation.

Consent never auto-creates a candidate, and candidate preparation never
publishes.

## R4 reviewer flow

`/comun/admin/entidades/revisao` is limited to active
`admin`, `editor` and `factual_reviewer` profiles.

Reviewer identity comes only from the authenticated session. The form supports
the exact R4 stages, decisions and basis kinds, and private references never
enter member/public DTOs.

Two supported stages still require distinct reviewer profiles before
`eligible_for_projection_review`.

## R5 and map boundary

This slice never calls the R5 projection-decision RPC. It does not create a
public projection, change `future_map_eligibility`, publish reports or touch
PMTiles.

R5 publisher operation remains a later, independent human decision.

# COMUN 49.2 R5 — publisher desk

State: **operational UI under review; no R5 business row created by this slice**.

## Scope

This slice turns the promoted R5 schema into an explicit internal publisher
workflow at `/comun/admin/entidades`.

The page is restricted to an active `publisher` profile and reads only:

- the R5 publisher review queue;
- the sanitized active projection DTO.

The browser never supplies publisher identity. The runtime derives the auth user
with `auth.getUser()`, and the database independently validates the dedicated
publisher profile.

## Decision UX

Each eligible candidate has one decision form with:

- `hold` as the safe default;
- `publish`;
- `reject`;
- a required private rationale;
- a stable request UUID rendered with the form;
- an explicit confirmation checkbox required only for `publish`.

The Server Action re-validates publisher role, UUIDs, decision values and
rationale length. Known database denials are mapped to safe UI states rather
than exposing raw database errors.

## Public-data boundary

The desk displays active projections only through the existing sanitized DTO:
opaque projection id, public name, entity type and publication timestamp.

It does not expose publisher identity, reviewer identity, representation,
consent, evidence, reports, location or coordinates.

## Map boundary

This slice does not modify `future_map_eligibility`, does not enable the
public map, does not touch PMTiles and does not publish individual reports.

## Production boundary

The PR adds UI/runtime orchestration only. CI never calls the R5 decision RPC
against Production and contains no Production credentials.

A real `publish`, `hold` or `reject` remains a deliberate human action
inside the authenticated publisher desk.

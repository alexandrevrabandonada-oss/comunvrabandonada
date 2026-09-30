# COMUN 49.2 — specialist role linking

Production role-readiness showed two operational R4 reviewers and zero R5
publishers. The existing Team page supported the required profile roles but
required manual Auth UUIDs and did not protect the R4 two-reviewer minimum.

This slice keeps the human authorization decision while reducing mechanical
friction.

## Guided existing-account linking

An admin can enter the exact email of an **already registered COMUN account**
and choose one specialist role:

- factual_reviewer;
- editorial_reviewer;
- publisher;
- viewer.

The server resolves Supabase Auth users only through the service-role admin API.
No Auth directory data is returned to the browser.

The flow does not create an Auth account and does not send an invitation.

The specialist profile is established first. Only after that succeeds is the
base `comun_admin_users` row activated as `viewer`. This keeps a partial
failure fail-closed because a profile alone cannot establish an admin session.

Existing admin/editor base access is never silently downgraded or repurposed.

## R4 capacity protection

The advanced profile editor now blocks deactivation, role reassignment or auth
unlinking when the affected profile is one of the last two operational R4
reviewers.

This prevents fixing the current publisher gap by accidentally reducing R4 to
one reviewer.

## Human gate preserved

The system does not choose who becomes publisher. An admin must identify the
real person, confirm the exact email and explicitly approve specialist access.

No R5 publication decision, entity business row or map change is performed by
this slice.

import assert from "node:assert/strict";
import test from "node:test";
import { classifyMigrationLane } from "./classify-migration-lane.mjs";

const a3 =
  "supabase/migrations/20260818120000_comun_cultural_specialized_handoff.sql";
const pauta =
  "supabase/migrations/20260813124308_comun_pautas_vivas_public_evidence.sql";
const solidarity =
  "supabase/migrations/20260815184529_comun_solidarity_offers.sql";
const a1 =
  "supabase/migrations/20260825090000_comun_multidomain_assisted_forwarding.sql";
const a4 =
  "supabase/migrations/20260819130000_comun_cultural_progressive_rights.sql";
const a5a1 =
  "supabase/migrations/20260823003249_comun_cultural_specialized_provenance_readiness.sql";
const a5a2 =
  "supabase/migrations/20260824001340_comun_artwork_submission_private_materialization.sql";
const a3Followup =
  "supabase/migrations/20260825120000_comun_followup_escalation_continuity.sql";
const b2a1 =
  "supabase/migrations/20260826150000_comun_denuncias_public_evidence_pauta_bridge.sql";
const b2a2 =
  "supabase/migrations/20260827120000_comun_denuncias_private_collective_matching.sql";
const entityConsent =
  "supabase/migrations/20260901000000_comun_relata_collective_entity_consent_foundation.sql";
const entityAuthRuntime =
  "supabase/migrations/20260924015511_comun_relata_collective_entity_authenticated_runtime.sql";
const entityPrivateCandidate =
  "supabase/migrations/20260924225210_comun_relata_collective_entity_private_candidate.sql";

test("R3 private candidate is explicit and N/A to historical lanes", () => {
  assert.equal(
    classifyMigrationLane("collective-entity-private-candidate", [
      entityPrivateCandidate,
    ]).mode,
    "candidate",
  );
  for (const lane of [
    "p6c-b1",
    "p6c-b2",
    "48-2-a",
    "48-3-a1",
    "48-4-a0",
    "culture-b2-a2",
  ]) {
    assert.equal(
      classifyMigrationLane(lane, [entityPrivateCandidate]).mode,
      "not_applicable",
    );
  }
  assert.equal(
    classifyMigrationLane("48-2-a", ["future_candidate.sql"]).mode,
    "blocked",
  );
});
const hardening =
  "supabase/migrations/20260922120000_comun_canonical_security_hardening_v2.sql";
const b1 =
  "supabase/migrations/20260810155310_comun_public_education_sensitive_routing.sql";
const b2 =
  "supabase/migrations/20260810171448_comun_child_protection_private_routing.sql";

test("R2 authenticated runtime has explicit ownership and is N/A to historical lanes", () => {
  for (const lane of [
    "p6c-b1",
    "p6c-b2",
    "48-2-a",
    "48-3-a1",
    "48-4-a0",
    "culture-b2-a2",
  ]) {
    const result = classifyMigrationLane(lane, [entityAuthRuntime]);
    assert.equal(result.mode, "not_applicable", lane);
    assert.equal(result.files[0].owner, "collective-entity-auth-runtime", lane);
  }
  assert.equal(
    classifyMigrationLane("p6c-b1", [b1, entityAuthRuntime]).mode,
    "blocked",
  );
  assert.equal(
    classifyMigrationLane("p6c-b1", ["20260924015512_unknown.sql"]).mode,
    "blocked",
  );
});

test("historical P6C gates classify security hardening by canonical ownership", () => {
  for (const [lane, own] of [
    ["p6c-b1", b1],
    ["p6c-b2", b2],
  ]) {
    assert.equal(classifyMigrationLane(lane, []).mode, "none");
    assert.equal(
      classifyMigrationLane(lane, [hardening]).mode,
      "not_applicable",
    );
    assert.equal(classifyMigrationLane(lane, [own]).mode, "candidate");
    assert.equal(classifyMigrationLane(lane, [own, hardening]).mode, "blocked");
    assert.equal(
      classifyMigrationLane(lane, ["20990101000000_unknown.sql"]).mode,
      "blocked",
    );
  }
});

test("A3 culture migration is not applicable to historical observatory, social, solidarity or P6C-C gates", () => {
  for (const lane of ["48-2-a", "48-3-b0", "48-4-a0", "p6c-c"]) {
    assert.equal(classifyMigrationLane(lane, [a3]).mode, "not_applicable");
  }
});

test("A3 follow-up migration is classified as the existing cultural A3 lane", () => {
  assert.equal(
    classifyMigrationLane("p6c-c", [a3Followup]).mode,
    "not_applicable",
  );
  assert.equal(
    classifyMigrationLane("48-5-a0", [a3Followup]).mode,
    "not_applicable",
  );
});

test("A3 culture migration is not a historical A0 zero-migration failure", () => {
  assert.equal(classifyMigrationLane("48-5-a0", [a3]).mode, "not_applicable");
});

test("A1 culture migration is not applicable to historical solidarity or P6C-C gates", () => {
  for (const lane of [
    "48-4-a2",
    "48-4-a4",
    "48-4-a5",
    "48-4-a7",
    "p6c-c",
    "48-5-a0",
  ]) {
    assert.equal(classifyMigrationLane(lane, [a1]).mode, "not_applicable");
  }
});

test("A1 culture migration is not applicable to the legacy 48.3-A1 gate", () => {
  assert.equal(classifyMigrationLane("48-3-a1", [a1]).mode, "not_applicable");
});

test("A1 culture migration is not applicable to the legacy 48.3-B0 gate", () => {
  assert.equal(classifyMigrationLane("48-3-b0", [a1]).mode, "not_applicable");
});

test("known later cultural migrations remain classified and non-applicable to A0", () => {
  assert.equal(
    classifyMigrationLane("48-5-a0", [a4, a5a1, a5a2]).mode,
    "not_applicable",
  );
});

test("A1 culture migration is not applicable to the legacy 48.2 observatory gate", () => {
  assert.equal(classifyMigrationLane("48-2-a", [a1]).mode, "not_applicable");
});

test("B2-A1 migration is not applicable to historical lanes or organization bridges", () => {
  for (const lane of [
    "48-2-a",
    "48-3-a1",
    "48-3-b0",
    "48-3-e2",
    "48-4-a0",
    "48-4-a2",
    "48-4-a4",
    "48-4-a5",
    "48-4-a7",
    "48-5-a0",
    "p6c-c",
  ]) {
    assert.equal(classifyMigrationLane(lane, [b2a1]).mode, "not_applicable");
  }
});

test("B2-A1 migration is owned by its own lane", () => {
  assert.equal(
    classifyMigrationLane("culture-b2-a1", [b2a1]).mode,
    "candidate",
  );
});

test("B2-A2 migration is not applicable to historical and non-owning lanes", () => {
  for (const lane of [
    "48-2-a",
    "48-3-a1",
    "48-3-b0",
    "48-3-e2",
    "48-4-a0",
    "48-4-a2",
    "48-4-a4",
    "48-4-a5",
    "48-4-a7",
    "48-5-a0",
    "p6c-c",
    "culture-b2-a1",
  ]) {
    assert.equal(classifyMigrationLane(lane, [b2a2]).mode, "not_applicable");
  }
});

test("B2-A2 migration is owned by its own lane", () => {
  assert.equal(
    classifyMigrationLane("culture-b2-a2", [b2a2]).mode,
    "candidate",
  );
});

test("collective entity consent is known and non-applicable to historical lanes", () => {
  for (const lane of [
    "48-2-a",
    "48-4-a4",
    "48-5-a0",
    "culture-b2-a1",
    "culture-b2-a2",
  ]) {
    assert.equal(
      classifyMigrationLane(lane, [entityConsent]).mode,
      "not_applicable",
    );
  }
});

test("lane-owned migration remains a candidate and does not become N/A", () => {
  assert.equal(
    classifyMigrationLane("48-4-a0", [solidarity]).mode,
    "candidate",
  );
  assert.equal(classifyMigrationLane("48-3-a1", [pauta]).mode, "candidate");
});

test("unknown migration ownership fails closed", () => {
  const result = classifyMigrationLane("48-4-a0", [
    "supabase/migrations/20990101000000_future.sql",
  ]);
  assert.equal(result.mode, "blocked");
  assert.match(result.reason, /unknown migration ownership/);
});

test("mixed lanes fail closed instead of being silently ignored", () => {
  assert.equal(
    classifyMigrationLane("48-4-a0", [solidarity, a3]).mode,
    "blocked",
  );
});

test("no migration change is represented separately from N/A", () => {
  assert.equal(classifyMigrationLane("48-5-a0", []).mode, "none");
});

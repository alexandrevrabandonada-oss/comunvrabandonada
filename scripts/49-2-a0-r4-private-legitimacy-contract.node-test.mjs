import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260925014131_comun_relata_collective_entity_legitimacy_eligibility.sql",
  "utf8",
);
const ownerActions = readFileSync("app/comun/entidades/actions.ts", "utf8");
const reviewerActions = readFileSync(
  "app/comun/admin/entidades/actions.ts",
  "utf8",
);
const workflow = readFileSync(
  ".github/workflows/comun-49-2-a0-r4-private-legitimacy-disposable.yml",
  "utf8",
);

test("R4 stores only private append-only review evidence", () => {
  assert.match(
    migration,
    /create table private\.comun_relata_collective_entity_candidate_reviews/,
  );
  assert.match(migration, /force row level security/);
  assert.match(migration, /COMUN_RELATA_CANDIDATE_REVIEW_APPEND_ONLY/);
  assert.match(
    migration,
    /review_stage in \('entity_existence','representation_legitimacy'\)/,
  );
  assert.match(
    migration,
    /decision in \('supported','needs_evidence','contested','unsupported'\)/,
  );
  assert.doesNotMatch(
    migration,
    /create (?:or replace )?(?:table|view) public\./i,
  );
  assert.doesNotMatch(
    migration,
    /future_map_eligibility|public_projection|map_feature|search_projection/i,
  );
});

test("R4 eligibility is derived and never mutates the R3 candidate into an approval state", () => {
  assert.match(migration, /eligible_for_projection_review/);
  assert.match(migration, /pending_review/);
  assert.match(migration, /needs_evidence/);
  assert.match(migration, /contested/);
  assert.doesNotMatch(
    migration,
    /set\s+candidate_state\s*=\s*'(?:verified|approved|eligible|published)'/i,
  );
  assert.doesNotMatch(
    migration,
    /update\s+private\.comun_relata_collective_entity_candidates[\s\S]*eligible_for_projection_review/i,
  );
});

test("R4 reviewer identity is server-derived and browser inputs cannot choose authority", () => {
  assert.match(
    reviewerActions,
    /reviewCollectiveEntityCandidateAction\(input: \{/,
  );
  assert.doesNotMatch(
    reviewerActions,
    /reviewerUserId|reviewerProfileId|actorUserId|userId/,
  );
  assert.match(
    migration,
    /profile\.role in \('admin','editor','factual_reviewer'\)/,
  );
  assert.match(migration, /COMUN_RELATA_CANDIDATE_SELF_REVIEW_FORBIDDEN/);
  assert.match(ownerActions, /listOwnCollectiveEntityLegitimacyAction/);
});

test("R4 disposable proof is local-only and checks zero security findings", () => {
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /workflow_dispatch|SUPABASE_PROJECT_REF/);
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(workflow, /assert-zero-security-findings/);
  assert.match(workflow, /COMUN_49_2_A0_R4_DISPOSABLE_GREEN/);
});

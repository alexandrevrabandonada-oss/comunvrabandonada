import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260924225210_comun_relata_collective_entity_private_candidate.sql",
  "utf8",
);
const workflow = readFileSync(
  ".github/workflows/comun-49-2-a0-r3-private-candidate-disposable.yml",
  "utf8",
);
const actions = readFileSync("app/comun/entidades/actions.ts", "utf8");

test("R3 creates only a private candidate with a fixed sanitized snapshot", () => {
  const table = migration.match(
    /create table private\.comun_relata_collective_entity_candidates \(([\s\S]*?)\n\);/,
  )?.[1];
  assert.ok(table);
  const columnNames = [
    ...table.matchAll(/^  ([a-z_]+) (?:uuid|text|timestamptz)\b/gm),
  ].map((match) => match[1]);
  assert.deepEqual(columnNames, [
    "id",
    "entity_id",
    "generation_request_id",
    "source_representation_id",
    "source_consent_id",
    "candidate_version",
    "candidate_state",
    "public_name",
    "entity_type",
    "generated_at",
    "invalidated_at",
    "invalidation_reason",
  ]);
  assert.match(
    migration,
    /candidate_state in \('pending_legitimacy','invalidated'\)/,
  );
  assert.match(migration, /force row level security/);
  assert.doesNotMatch(
    migration,
    /create (?:or replace )?(?:view|table) public\./i,
  );
  assert.doesNotMatch(
    migration,
    /future_map_eligibility|map_feature|public_projection|collective_cases|search_projection/i,
  );
});

test("R3 browser action accepts handles only and disposable workflow has no Production credential", () => {
  const action = actions.match(
    /export async function prepareOwnCollectiveEntityCandidateAction\(input: \{([\s\S]*?)\}\)/,
  )?.[1];
  assert.ok(action);
  assert.match(action, /entityId: string/);
  assert.match(action, /requestId: string/);
  assert.doesNotMatch(
    action,
    /userId|actorUserId|representationId|consentId|candidateState|publicName|entityType/,
  );
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /workflow_dispatch|SUPABASE_PROJECT_REF/);
  assert.match(workflow, /supabase db reset --local --yes/);
  assert.match(workflow, /assert-zero-security-findings/);
});

test("historical P6C preflights use canonical ownership before remote inspection", () => {
  for (const lane of ["b1", "b2"]) {
    const text = readFileSync(
      `.github/workflows/comun-p6c-${lane}-preflight.yml`,
      "utf8",
    );
    assert.match(text, /ownership:\s*\n/);
    assert.match(
      text,
      new RegExp(`check-p6c-migration-plan\\.mjs --lane p6c-${lane}`),
    );
    assert.match(
      text,
      /needs: ownership\s*\n\s*if: needs\.ownership\.outputs\.mode == 'candidate'/,
    );
    assert.match(text, /candidate\|not_applicable\|none/);
  }
});

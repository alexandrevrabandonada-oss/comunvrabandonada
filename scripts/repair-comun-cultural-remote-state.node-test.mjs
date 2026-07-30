import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assertCulturalRepairArtifactSanitized,
  assertExactCulturalRepairPlan,
  repairConfirmation,
  validateCulturalRepairEnvironment,
} from "./repair-comun-cultural-remote-state.mjs";

const environment = {
  SUPABASE_DB_URL:
    "postgresql://postgres.projectref:secret@pooler.supabase.com:6543/postgres",
  SUPABASE_PROJECT_REF: "projectref",
  COMUN_CULTURAL_ALLOWED_PROJECT_REFS: "projectref",
  COMUN_CULTURAL_EXPECTED_PLAN_HASH: "a".repeat(64),
  COMUN_CULTURAL_REPAIR_CONFIRMATION: repairConfirmation,
};

function exactArtifact() {
  return {
    repairPlan: {
      exact: true,
      marker: "COMUN_CULTURAL_REMOTE_REPAIR_PLAN_EXACT",
      planHash: "a".repeat(64),
    },
    storage: {
      missingBuckets: [],
      incompatibleBuckets: [],
      similarUnexpectedBuckets: 0,
      policyEvidence: { policiesGreen: true },
    },
    privacy: { publicImageAssetsWithoutAltText: 1 },
  };
}

test("correção editorial exige banco allowlisted, confirmação e hash exatos", () => {
  const validated = validateCulturalRepairEnvironment(environment);
  assert.equal(validated.expectedPlanHash, "a".repeat(64));
  for (const key of [
    "COMUN_CULTURAL_EXPECTED_PLAN_HASH",
    "COMUN_CULTURAL_REPAIR_CONFIRMATION",
  ]) {
    assert.throws(
      () =>
        validateCulturalRepairEnvironment({
          ...environment,
          [key]: "",
        }),
      /COMUN_CULTURAL_/,
    );
  }
});

test("plano exato aceita apenas o hash e a cardinalidade observados", () => {
  assert.equal(
    assertExactCulturalRepairPlan(exactArtifact(), "a".repeat(64)),
    true,
  );
  assert.throws(
    () => assertExactCulturalRepairPlan(exactArtifact(), "b".repeat(64)),
    /PLAN_MISMATCH/,
  );
  const tooMany = exactArtifact();
  tooMany.storage.missingBuckets.push("radio-public-audio");
  assert.throws(
    () => assertExactCulturalRepairPlan(tooMany, "a".repeat(64)),
    /PLAN_MISMATCH/,
  );
});

test("artifact permite somente um campo alt text e zero Storage writes", () => {
  const artifact = {
    result: "COMUN_ARCHIVE_RADIO_ART_REMOTE_STATE_REPAIRED",
    storageObjectsCreated: 0,
    rightsChanged: false,
    consentsChanged: false,
    publicationStatusChanged: false,
    databaseWrites: "one_alt_text_field",
    storageWrites: "none",
  };
  assert.equal(assertCulturalRepairArtifactSanitized(artifact), true);
  assert.throws(
    () =>
      assertCulturalRepairArtifactSanitized({
        ...artifact,
        public_url: "https://example.invalid/private",
      }),
    /SANITIZATION_FAILED/,
  );
  assert.throws(
    () =>
      assertCulturalRepairArtifactSanitized({
        ...artifact,
        storageObjectsCreated: 1,
      }),
    /CONTRACT_INVALID/,
  );
});

test("reparador editorial não toca buckets nem cria ou remove objetos", async () => {
  const source = await readFile(
    new URL("./repair-comun-cultural-remote-state.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /storage\.(?:createBucket|updateBucket|upload|remove|move|copy|deleteBucket)/,
  );
  assert.match(source, /set alt_text = \$2/);
  assert.match(source, /for update of asset/);
  assert.match(source, /createAltCandidateFingerprint\(candidate\)/);
  assert.match(source, /currentImageSha256 !== expectedImageSha256/);
  assert.match(source, /nullif\(trim\(asset\.alt_text\), ''\) is null/);
  assert.match(source, /await client\.query\("rollback"\)/);
  assert.doesNotMatch(source, /set\s+(?:rights|consent|status|visibility)\b/i);
});

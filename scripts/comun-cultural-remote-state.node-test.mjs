import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCulturalRepairPlan,
  buildCulturalStoragePolicyEvidence,
  buildRadioStorageMigrationPlan,
  culturalAltTextContract,
  expectedCulturalBuckets,
  sanitizeBucketState,
  validateAltText,
} from "./comun-cultural-remote-state.mjs";

const exactRows = expectedCulturalBuckets.map((bucket) => ({
  id: bucket.id,
  present: true,
  public: bucket.public,
  file_size_limit: bucket.fileSizeLimit,
  allowed_mime_types: bucket.allowedMimeTypes,
}));

test("contrato reconhece os quatro buckets com configuração exata", () => {
  const state = sanitizeBucketState(exactRows);
  assert.equal(state.presentBuckets, 4);
  assert.deepEqual(state.missingBuckets, []);
  assert.deepEqual(state.incompatibleBuckets, []);
  assert.ok(state.buckets.every((bucket) => bucket.exact));
  assert.equal(
    state.buckets.find((bucket) => bucket.id === "radio-private-originals")
      ?.fileSizeLimit,
    47_185_920,
  );
});

test("contrato lista os dois buckets de Rádio ausentes sem inventar estado", () => {
  const state = sanitizeBucketState(exactRows.slice(0, 2));
  assert.deepEqual(state.missingBuckets, [
    "radio-private-originals",
    "radio-public-audio",
  ]);
});

test("bucket existente incompatível nunca é atualizado silenciosamente", () => {
  const rows = structuredClone(exactRows);
  rows[0].public = true;
  const state = sanitizeBucketState(rows);
  assert.deepEqual(state.incompatibleBuckets, ["archive-private-originals"]);
});

test("ausência de policies mantém privados fechados e públicos somente leitura", () => {
  const buckets = sanitizeBucketState(exactRows).buckets;
  const evidence = buildCulturalStoragePolicyEvidence({
    buckets,
    policies: [],
    storageRlsDisabled: 0,
    serviceOperation: true,
  });
  assert.equal(evidence.marker, "COMUN_CULTURAL_STORAGE_POLICIES_GREEN");
  assert.equal(evidence.dangerousPolicyCount, 0);
  assert.equal(evidence.matrix[0].anonRead, false);
  assert.equal(evidence.matrix[1].anonRead, true);
  assert.ok(evidence.matrix.every((row) => row.anonWrite === false));
});

test("policy de escrita pública bloqueia o checkpoint", () => {
  const evidence = buildCulturalStoragePolicyEvidence({
    buckets: sanitizeBucketState(exactRows).buckets,
    policies: [
      {
        tablename: "objects",
        roles: ["anon"],
        cmd: "INSERT",
        with_check: "bucket_id = 'archive-public-derivatives'",
      },
    ],
    storageRlsDisabled: 0,
    serviceOperation: true,
  });
  assert.equal(
    evidence.marker,
    "COMUN_ARCHIVE_RADIO_ART_BLOCKED_STORAGE_POLICY",
  );
  assert.equal(evidence.dangerousPolicyCount, 1);
});

test("authenticated amplo em update ou delete é perigoso", () => {
  for (const cmd of ["UPDATE", "DELETE"]) {
    const evidence = buildCulturalStoragePolicyEvidence({
      buckets: sanitizeBucketState(exactRows).buckets,
      policies: [{ tablename: "objects", roles: ["authenticated"], cmd }],
      storageRlsDisabled: 0,
      serviceOperation: true,
    });
    assert.equal(evidence.policiesGreen, false);
  }
});

test("plano editorial exato só existe depois da migration e limita um alt text", () => {
  const plan = buildCulturalRepairPlan({
    targetVerified: true,
    schemaGreen: true,
    policiesGreen: true,
    similarUnexpectedBuckets: 0,
    missingBuckets: [],
    incompatibleBuckets: [],
    altCandidateCount: 1,
    altCandidateFingerprint: "a".repeat(64),
    publicImageSha256: "b".repeat(64),
  });
  assert.equal(plan.marker, "COMUN_CULTURAL_REMOTE_REPAIR_PLAN_EXACT");
  assert.match(plan.planHash, /^[a-f0-9]{64}$/);
  assert.equal(plan.plan.writes.bucketRowsCreatedMax, 0);
  assert.equal(plan.plan.writes.altTextRowsUpdatedMax, 1);
  assert.equal(plan.plan.writes.storageObjectsCreated, 0);
});

test("plano da migration aceita exatamente os dois buckets de Rádio ausentes", () => {
  const plan = buildRadioStorageMigrationPlan({
    targetVerified: true,
    schemaGreen: true,
    policiesGreen: true,
    similarUnexpectedBuckets: 0,
    missingBuckets: ["radio-private-originals", "radio-public-audio"],
    incompatibleBuckets: [],
  });
  assert.equal(plan.exact, true);
  assert.equal(plan.plan.buckets.length, 2);
  assert.ok(
    plan.plan.buckets.every((bucket) => bucket.fileSizeLimit === 47_185_920),
  );
});

test("plano bloqueia mais de dois buckets, bucket incompatível e lookalike", () => {
  const common = {
    targetVerified: true,
    schemaGreen: true,
    policiesGreen: true,
    altCandidateCount: 1,
    altCandidateFingerprint: "a".repeat(64),
    publicImageSha256: "b".repeat(64),
  };
  assert.equal(
    buildCulturalRepairPlan({
      ...common,
      missingBuckets: ["a", "b", "c"],
      incompatibleBuckets: [],
      similarUnexpectedBuckets: 0,
    }).exact,
    false,
  );
  assert.equal(
    buildCulturalRepairPlan({
      ...common,
      missingBuckets: ["radio-public-audio"],
      incompatibleBuckets: ["archive-private-originals"],
      similarUnexpectedBuckets: 0,
    }).exact,
    false,
  );
  assert.equal(
    buildCulturalRepairPlan({
      ...common,
      missingBuckets: ["radio-public-audio-copy"],
      incompatibleBuckets: [],
      similarUnexpectedBuckets: 0,
    }).exact,
    false,
  );
  assert.equal(
    buildCulturalRepairPlan({
      ...common,
      missingBuckets: ["radio-public-audio"],
      incompatibleBuckets: [],
      similarUnexpectedBuckets: 1,
    }).exact,
    false,
  );
});

test("plano falha fechado quando a imagem já mudou ou não pôde ser inspecionada", () => {
  const common = {
    targetVerified: true,
    schemaGreen: true,
    policiesGreen: true,
    similarUnexpectedBuckets: 0,
    missingBuckets: [],
    incompatibleBuckets: [],
  };
  assert.equal(
    buildCulturalRepairPlan({
      ...common,
      altCandidateCount: 0,
      altCandidateFingerprint: null,
      publicImageSha256: null,
    }).exact,
    false,
  );
  assert.equal(
    buildCulturalRepairPlan({
      ...common,
      altCandidateCount: 1,
      altCandidateFingerprint: "a".repeat(64),
      publicImageSha256: null,
    }).exact,
    false,
  );
});

test("texto alternativo visual é específico e textos genéricos são rejeitados", () => {
  assert.equal(
    validateAltText(culturalAltTextContract.text),
    culturalAltTextContract.text,
  );
  assert.throws(() => validateAltText("imagem do acervo"), /NOT_SPECIFIC/);
  assert.throws(
    () =>
      validateAltText(
        "Calçada enviada por pessoa@example.com com informação privada.",
      ),
    /PRIVATE_DATA/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCulturalAuditReadOnly,
  assertSanitizedCulturalArtifact,
  fixedCulturalAuditSql,
  sanitizeCulturalMetrics,
} from "./audit-comun-cultural-deliverability.mjs";

const greenInput = {
  schema: {
    expectedTables: 11,
    presentTables: 11,
    rlsDisabled: 0,
    dangerousPublicGrants: 0,
  },
  storage: {
    expectedBuckets: 4,
    presentBuckets: 4,
    privateBucketsAccidentallyPublic: 0,
    knownObjects: 8,
  },
  privacy: {
    privateAssetsWithPublicUrl: 0,
    publicImageAssetsWithoutAltText: 0,
    orphanAssetRows: 0,
  },
  content: {
    archive: { published: 2, potentialRealCandidates: 1 },
    communityRadio: {
      publishedPrograms: 1,
      publishedEpisodes: 1,
      potentialRealCandidates: 1,
    },
    territorialArt: { published: 1, potentialRealCandidates: 1 },
  },
};

test("auditoria usa somente SELECT fixo e transação read-only", () => {
  assert.equal(assertCulturalAuditReadOnly(), true);
  assert.match(fixedCulturalAuditSql, /^\s*select/i);
  assert.throws(
    () => assertCulturalAuditReadOnly("update public.x set y = 1"),
    /WRITE_BLOCKED/,
  );
});

test("resultado técnico não inventa autorização editorial real", () => {
  const artifact = sanitizeCulturalMetrics(greenInput);
  assert.equal(
    artifact.result,
    "COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL",
  );
  assert.equal(artifact.realContentAuthorizationProven, false);
  assert.equal(artifact.allDomainsHavePotentialContent, true);
});

test("RLS ausente bloqueia o estado remoto", () => {
  const artifact = sanitizeCulturalMetrics({
    ...greenInput,
    schema: { ...greenInput.schema, rlsDisabled: 1 },
  });
  assert.equal(artifact.result, "COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE");
});

test("ausência de métricas vira zero, nunca sucesso inventado", () => {
  const artifact = sanitizeCulturalMetrics({});
  assert.equal(artifact.schema.presentTables, 0);
  assert.equal(artifact.allDomainsHavePotentialContent, false);
  assert.notEqual(artifact.structuralFindings, 0);
});

test("scanner rejeita conexão e chaves privadas", () => {
  const artifact = sanitizeCulturalMetrics(greenInput);
  assert.equal(assertSanitizedCulturalArtifact(artifact), true);
  assert.throws(
    () =>
      assertSanitizedCulturalArtifact({
        ...artifact,
        detail: "postgresql://user:password@example.invalid/db",
      }),
    /SANITIZATION_FAILED/,
  );
  assert.throws(
    () =>
      assertSanitizedCulturalArtifact({
        ...artifact,
        object_key: "private/original.jpg",
      }),
    /SANITIZATION_FAILED/,
  );
});

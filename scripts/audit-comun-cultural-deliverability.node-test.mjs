import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCulturalAuditReadOnly,
  assertSanitizedCulturalArtifact,
  fetchPublicImageSha256,
  fixedCulturalAuditSql,
  sanitizeCulturalMetrics,
  validateCulturalDatabaseTarget,
} from "./audit-comun-cultural-deliverability.mjs";
import { expectedCulturalBuckets } from "./comun-cultural-remote-state.mjs";

const greenInput = {
  target: { verified: true },
  schema: {
    expectedTables: 11,
    presentTables: 11,
    rlsDisabled: 0,
    dangerousPublicGrants: 0,
  },
  storage: {
    bucketRows: expectedCulturalBuckets.map((bucket) => ({
      id: bucket.id,
      present: true,
      public: bucket.public,
      file_size_limit: bucket.fileSizeLimit,
      allowed_mime_types: bucket.allowedMimeTypes,
    })),
    similarUnexpectedBuckets: 0,
    knownObjects: 8,
    storageRlsDisabled: 0,
    serviceOperation: true,
    policies: [],
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

test("destino remoto exige project ref único e compatível com conexão direta", () => {
  const result = validateCulturalDatabaseTarget({
    SUPABASE_DB_URL:
      "postgresql://postgres:secret@db.projectref.supabase.co:5432/postgres",
    SUPABASE_PROJECT_REF: "projectref",
    COMUN_CULTURAL_ALLOWED_PROJECT_REFS: "projectref",
  });
  assert.equal(result.targetVerified, true);
});

test("destino remoto aceita pooler somente quando usuário contém o project ref exato", () => {
  const result = validateCulturalDatabaseTarget({
    SUPABASE_DB_URL:
      "postgresql://postgres.projectref:secret@aws-0-region.pooler.supabase.com:6543/postgres",
    SUPABASE_PROJECT_REF: "projectref",
    COMUN_CULTURAL_ALLOWED_PROJECT_REFS: "projectref",
  });
  assert.equal(result.targetVerified, true);
  assert.throws(
    () =>
      validateCulturalDatabaseTarget({
        SUPABASE_DB_URL:
          "postgresql://postgres.other:secret@aws-0-region.pooler.supabase.com:6543/postgres",
        SUPABASE_PROJECT_REF: "projectref",
        COMUN_CULTURAL_ALLOWED_PROJECT_REFS: "projectref",
      }),
    /TARGET_MISMATCH/,
  );
});

test("allowlist ausente ou ambígua falha antes da conexão", () => {
  assert.throws(
    () =>
      validateCulturalDatabaseTarget({
        SUPABASE_DB_URL:
          "postgresql://postgres:secret@db.projectref.supabase.co:5432/postgres",
        SUPABASE_PROJECT_REF: "projectref",
        COMUN_CULTURAL_ALLOWED_PROJECT_REFS: "projectref,other",
      }),
    /PROJECT_NOT_ALLOWLISTED/,
  );
});

test("destino local canônico é aceito sem contrato diferente entre sistemas", () => {
  const result = validateCulturalDatabaseTarget({
    PR23_DATABASE_URL:
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    SUPABASE_PROJECT_REF: "LOCAL_VALIDATION",
    PR23_ALLOWED_PROJECT_REFS: "LOCAL_VALIDATION",
  });
  assert.equal(result.targetVerified, true);
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

test("métricas sem destino verificado nunca produzem sucesso", () => {
  const artifact = sanitizeCulturalMetrics({
    ...greenInput,
    target: { verified: false },
  });
  assert.equal(artifact.result, "COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE");
  assert.throws(
    () => assertSanitizedCulturalArtifact(artifact),
    /CONTRACT_INVALID/,
  );
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

test("fingerprint público aceita somente imagem HTTPS limitada", async () => {
  const headers = new Headers({
    "content-type": "image/webp",
    "content-length": "4",
  });
  const digest = await fetchPublicImageSha256(
    "https://media.example.invalid/image.webp",
    async () =>
      new Response(new Uint8Array([1, 2, 3, 4]), { status: 200, headers }),
  );
  assert.match(digest, /^[a-f0-9]{64}$/);
  await assert.rejects(
    () =>
      fetchPublicImageSha256("http://example.invalid/image.webp", async () => {
        throw new Error("fetch não deveria executar");
      }),
    /URL_INVALID/,
  );
  await assert.rejects(
    () =>
      fetchPublicImageSha256(
        "https://media.example.invalid/image.webp",
        async () =>
          new Response("not an image", {
            status: 200,
            headers: { "content-type": "text/plain" },
          }),
      ),
    /RESPONSE_INVALID/,
  );
});

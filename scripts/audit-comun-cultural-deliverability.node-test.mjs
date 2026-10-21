import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertCulturalAuditReadOnly,
  assertSanitizedCulturalArtifact,
  buildCulturalAuditFailure,
  fixedAssetOwnershipSql,
  validateAssetOwnership,
  fetchPublicImageSha256,
  fixedCulturalAuditSql,
  sanitizeCulturalMetrics,
  validateCulturalDatabaseTarget,
} from "./audit-comun-cultural-deliverability.mjs";
import { expectedCulturalBuckets } from "./comun-cultural-remote-state.mjs";

test("failure diagnostics distinguish recognized transport and database codes", () => {
  const groups = {
    "tls-verification": [
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "CERT_HAS_EXPIRED",
      "ERR_TLS_CERT_ALTNAME_INVALID",
    ],
    network: [
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAI_AGAIN",
      "ECONNRESET",
      "ENETUNREACH",
      "EHOSTUNREACH",
    ],
    authentication: ["28P01", "28000"],
    authorization: ["42501"],
    schema: ["42P01", "42703", "3F000"],
    capacity: ["53300", "53200", "53100"],
    "query-cancelled": ["57014"],
    "server-shutdown": ["57P01"],
  };
  for (const [category, codes] of Object.entries(groups))
    for (const code of codes)
      for (const error of [{ code }, { cause: { code } }]) {
        const failure = buildCulturalAuditFailure(error, "connect");
        assert.deepEqual(failure.diagnostic, {
          phase: "connect",
          category,
          code,
        });
        assert.equal(failure.result, "COMUN_CULTURAL_AUDIT_FAILED");
        assert.equal(failure.target.verified, false);
      }
});

test("messages cannot establish a cause and unknown codes never escape", () => {
  for (const error of [
    null,
    undefined,
    "TLS quota password secret-canary",
    { message: "TLS quota secret-canary", code: "secret-canary" },
    { message: "COMUN_SECRET_CANARY", code: "COMUN_SECRET_CANARY" },
    { code: "__proto__" },
    { code: { secret: "secret-canary" } },
    {
      get code() {
        throw Error("secret-canary");
      },
      get cause() {
        throw Error("secret-canary");
      },
    },
  ]) {
    const failure = buildCulturalAuditFailure(error, "secret-canary");
    assert.deepEqual(failure.diagnostic, {
      phase: "unknown",
      category: "unknown",
      code: "UNKNOWN",
    });
    assert.equal(failure.result, "COMUN_CULTURAL_AUDIT_FAILED");
    assert.doesNotMatch(
      JSON.stringify(failure),
      /secret-canary|SECRET_CANARY|TLS quota/,
    );
  }
});

test("causes are bounded, cycle safe, and the nearest recognized code wins", () => {
  const cycle = {};
  cycle.cause = cycle;
  assert.equal(buildCulturalAuditFailure(cycle).diagnostic.code, "UNKNOWN");
  const nested = { code: "42501", cause: { code: "CERT_HAS_EXPIRED" } };
  assert.equal(
    buildCulturalAuditFailure(nested).diagnostic.category,
    "authorization",
  );
  const tooDeep = { cause: { cause: { cause: { code: "ETIMEDOUT" } } } };
  assert.equal(buildCulturalAuditFailure(tooDeep).diagnostic.code, "UNKNOWN");
});

test("only internal phases and fixed failure markers are retained", () => {
  for (const phase of [
    "preflight",
    "target-validation",
    "connect",
    "transaction",
    "query",
    "enrichment",
    "sanitization",
    "rollback",
    "persist",
  ])
    assert.equal(buildCulturalAuditFailure({}, phase).diagnostic.phase, phase);
  const failure = buildCulturalAuditFailure(
    { message: "COMUN_CULTURAL_AUDIT_WRITE_BLOCKED" },
    "preflight",
  );
  assert.equal(failure.result, "COMUN_CULTURAL_AUDIT_WRITE_BLOCKED");
  assert.equal(failure.databaseWrites, "none");
  assert.equal(failure.storageWrites, "none");
});

test("raw messages, SQL, stack, host and nested private fields are never persisted", () => {
  const secret = "do-not-export-this-canary";
  const error = Object.assign(
    new Error(`postgresql://user:${secret}@example.invalid/db`),
    {
      code: "42501",
      detail: secret,
      hint: secret,
      schema: secret,
      table: secret,
      host: secret,
      query: `select '${secret}'`,
      cause: { message: secret },
    },
  );
  error.stack = secret;
  const failure = buildCulturalAuditFailure(error, "query");
  assert.doesNotMatch(
    JSON.stringify(failure),
    /do-not-export|postgresql:|select /,
  );
  assert.deepEqual(failure.diagnostic, {
    phase: "query",
    category: "authorization",
    code: "42501",
  });
});

test("CLI target refusal writes sanitized JSON and markdown and still exits 1", () => {
  const directory = mkdtempSync(join(tmpdir(), "comun-cultural-failure-"));
  const secret = "never-persist-this-canary";
  try {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL("./audit-comun-cultural-deliverability.mjs", import.meta.url),
        ),
        "--output",
        join(directory, "audit.json"),
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          SUPABASE_DB_URL: `postgresql://user:${secret}@db.projectref.supabase.co/db`,
          SUPABASE_PROJECT_REF: "projectref",
          COMUN_CULTURAL_ALLOWED_PROJECT_REFS: "other-project",
        },
      },
    );
    assert.equal(result.status, 1);
    const json = readFileSync(join(directory, "audit.json"), "utf8");
    const markdown = readFileSync(join(directory, "audit.md"), "utf8");
    const failure = JSON.parse(json);
    assert.equal(
      failure.result,
      "COMUN_CULTURAL_AUDIT_PROJECT_NOT_ALLOWLISTED",
    );
    assert.deepEqual(failure.diagnostic, {
      phase: "target-validation",
      category: "unknown",
      code: "UNKNOWN",
    });
    assert.match(markdown, /falhou fechada/);
    assert.match(markdown, /target-validation/);
    assert.doesNotMatch(
      json + markdown + result.stdout + result.stderr,
      /never-persist|postgresql:|db\.projectref/,
    );
  } finally {
    assert(directory.startsWith(join(tmpdir(), "comun-cultural-failure-")));
    rmSync(directory, { recursive: true, force: true });
  }
});

const greenInput = {
  target: { verified: true },
  schema: {
    expectedTables: 13,
    presentTables: 13,
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

test("submission ownership counts stay sanitized and genuine orphans still block", () => {
  for (const [submissionOwnedRows, orphanRows] of [
    [2, 0],
    [1, 1],
    [0, 2],
  ]) {
    const artifact = sanitizeCulturalMetrics({
      ...greenInput,
      privacy: {
        ...greenInput.privacy,
        assetOwnership: {
          itemlessRows: 2,
          submissionOwnedRows,
          orphanRows,
          ignored: "secret-canary",
        },
      },
    });
    assert.equal(artifact.privacy.orphanAssetRows, orphanRows);
    assert.equal(artifact.privacy.itemlessAssetRows, 2);
    assert.equal(
      artifact.privacy.submissionOwnedAssetRows,
      submissionOwnedRows,
    );
    assert.equal(artifact.structuralFindings, orphanRows);
    assert.equal(
      artifact.result,
      orphanRows
        ? "COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE"
        : "COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL",
    );
    assert.equal(artifact.realContentAuthorizationProven, false);
    assert.doesNotMatch(JSON.stringify(artifact), /secret-canary/);
    assert.equal(assertSanitizedCulturalArtifact(artifact), true);
  }
  const legacy = sanitizeCulturalMetrics({
    ...greenInput,
    privacy: { ...greenInput.privacy, orphanAssetRows: 2 },
  });
  assert.equal(legacy.result, "COMUN_ARCHIVE_RADIO_ART_BLOCKED_REMOTE_STATE");
});

test("missing, inconsistent or invalid ownership counters fail closed", () => {
  for (const input of [
    null,
    {},
    { itemlessRows: 2, submissionOwnedRows: 3, orphanRows: 0 },
    { itemlessRows: 2, submissionOwnedRows: 2 },
    { itemlessRows: 0, submissionOwnedRows: -1, orphanRows: 1 },
    { itemlessRows: "2", submissionOwnedRows: 2, orphanRows: 0 },
  ]) {
    assert.throws(
      () => validateAssetOwnership(input),
      /ASSET_OWNERSHIP_INVALID/,
    );
    assert.throws(
      () =>
        sanitizeCulturalMetrics({
          ...greenInput,
          privacy: { assetOwnership: input },
        }),
      /ASSET_OWNERSHIP_INVALID/,
    );
  }
  assert.equal(assertCulturalAuditReadOnly(fixedAssetOwnershipSql), true);
});

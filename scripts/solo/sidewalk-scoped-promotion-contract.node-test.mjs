import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CONTRACT_ID,
  CONTRACT_PATH,
  CONTRACT_SHA256,
  assertExactContractMatrix,
  authorizationFormats,
  selectScopedPromotionContract,
  validateScopedPromotionContract,
} from "./sidewalk-scoped-promotion-contract.mjs";
import {
  assertSaferPreMatrix,
  saferPreFixtureSql,
} from "./rehearse-sidewalk-safer-pre-contract.mjs";
import { assertPausedResponse } from "./assert-sidewalk-public-paused.mjs";

const migrationPath =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
const canonicalManifestPath =
  "supabase/releases/20260724233256-comun-sidewalk-operational-hardening.json";
const migrationHash =
  "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";
const canonicalManifestHash =
  "ceb7002f9a7069cbe82c4e6b16032bef1cd3619f12271a260dbca37fb5bc1335";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("safer PRE contract is fixed, exact, and free of credentials", () => {
  const selected = selectScopedPromotionContract();
  assert.equal(selected.contract.contractId, CONTRACT_ID);
  assert.equal(selected.contractPath, CONTRACT_PATH);
  assert.equal(selected.contractHash, CONTRACT_SHA256);
  assert.equal(selected.contract.grantRisk, "safer_than_pre");
  assert.equal(
    selected.contract.acceptedRemoteCondition,
    "public.comun_admin_audit_log possui zero grants para anon/authenticated",
  );
  assert.doesNotMatch(
    JSON.stringify(selected.contract),
    /postgres(?:ql)?:\/\/|password|token|secret/i,
  );
});

test("contract rejects canonical PRE, public privileges, service role loss, and another scoped drift", () => {
  const { contract } = selectScopedPromotionContract();
  const canonicalPre = clone(contract);
  canonicalPre.expectedScopedPreFingerprint = "a".repeat(64);
  assert.throws(
    () => validateScopedPromotionContract(canonicalPre),
    /SOLO_SCOPED_PROMOTION_CONTRACT_/,
  );

  const publicGrant = clone(contract);
  publicGrant.expectedAuditGrantMatrixPre.push({
    schema: "public",
    table: "comun_admin_audit_log",
    role: "anon",
    privilege: "REFERENCES",
    isGrantable: false,
  });
  assert.throws(
    () => validateScopedPromotionContract(publicGrant),
    /SOLO_SCOPED_PROMOTION_CONTRACT_GRANTS_INVALID/,
  );

  const missingServiceCrud = clone(contract);
  missingServiceCrud.expectedAuditGrantMatrixPost =
    missingServiceCrud.expectedAuditGrantMatrixPost.filter(
      (grant) =>
        !(grant.role === "service_role" && grant.privilege === "UPDATE"),
    );
  assert.throws(
    () => validateScopedPromotionContract(missingServiceCrud),
    /SOLO_SCOPED_PROMOTION_CONTRACT_GRANTS_INVALID/,
  );

  assert.throws(
    () => assertExactContractMatrix(contract, "pre", []),
    /SOLO_SCOPED_PROMOTION_CONTRACT_GRANT_MATRIX_MISMATCH/,
  );
});

test("only the fixed contract identifier can be selected and migration and manifest stay canonical", async () => {
  assert.throws(
    () => selectScopedPromotionContract("../../untrusted-contract"),
    /SOLO_SCOPED_PROMOTION_CONTRACT_NOT_ALLOWED/,
  );
  const [migration, canonicalManifest] = await Promise.all([
    readFile(migrationPath),
    readFile(canonicalManifestPath),
  ]);
  assert.equal(
    createHash("sha256").update(migration).digest("hex"),
    migrationHash,
  );
  assert.equal(
    createHash("sha256").update(canonicalManifest).digest("hex"),
    canonicalManifestHash,
  );
});

test("safer PRE fixture removes the exact public grants and retains service role CRUD", () => {
  assert.match(
    saferPreFixtureSql,
    /revoke references, trigger, truncate[\s\S]*comun_admin_audit_log[\s\S]*anon, authenticated/i,
  );
  const { contract } = selectScopedPromotionContract();
  assert.doesNotThrow(() =>
    assertSaferPreMatrix(contract.expectedAuditGrantMatrixPre),
  );
  assert.doesNotThrow(() =>
    assertExactContractMatrix(
      contract,
      "post",
      contract.expectedAuditGrantMatrixPost,
    ),
  );
});

test("migration and activation authorizations are intentionally different", () => {
  const formats = authorizationFormats({
    projectRef: "local-project-ref",
    mainSha: "a".repeat(40),
    ledgerHash: "b".repeat(64),
  });
  assert.match(formats.migration, /^AUTORIZO_MIGRATION_CALCADAS_/);
  assert.match(formats.activate, /^AUTORIZO_ATIVAR_CALCADAS_/);
  assert.notEqual(formats.migration, formats.activate);
  assert.match(formats.migration, /MANTER_FLAG_DESABILITADA$/);
});

test("preflight can confirm the public contribution path is paused without Vercel access", () => {
  const paused =
    "O envio de novos registros está temporariamente pausado enquanto concluímos uma atualização operacional. O mapa e os registros publicados continuam disponíveis.";
  assert.doesNotThrow(() =>
    assertPausedResponse({ status: 200, body: `<p>${paused}</p>` }),
  );
  assert.throws(
    () => assertPausedResponse({ status: 200, body: "operational form" }),
    /COMUN_SIDEWALK_OPERATIONAL_FLAG_NOT_DISABLED/,
  );
});

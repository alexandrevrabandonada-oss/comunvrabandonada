import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeAuditGrantMatrix } from "./diagnose-sidewalk-remote-drift.mjs";
import { scopedObjects } from "./sidewalk-operational-fingerprint.mjs";

export const CONTRACT_ID = "sidewalk-operational-safer-pre-v1";
export const CONTRACT_PATH =
  "supabase/releases/20260724233256-comun-sidewalk-operational-hardening-safer-pre-v1.json";
export const RELEASE = "20260724233256-comun-sidewalk-operational-hardening";
export const MIGRATION_PATH =
  "supabase/migrations/20260724233256_comun_sidewalk_operational_hardening.sql";
export const MIGRATION_SHA256 =
  "6a2e69dcc66f760fa1828bb43249079e8db474ad8b175d3af6aa7c97ec05b1be";
export const CANONICAL_PRE_FINGERPRINT =
  "a6599aa24658c4339c7518d484364699d07ca4fa9cb1db68bb6fed4c20b94a10";
export const CANONICAL_POST_FINGERPRINT =
  "614908b735616fc64d4d36bc05e050ee53a0fb2b1f4e099febe1f327923350c4";
export const CONTRACT_SHA256 =
  "1ae7b7c8bc000acc5369276809f2f4d58ca919d925399d9750e840c9e3aecc74";

const fingerprint = /^[a-f0-9]{64}$/;
const unsafe =
  /postgres(?:ql)?:\/\/|\b(?:password|token|secret|authorization|cookie|service[_ -]?role\s*(?:key|token|=|:))\b/i;

const fail = (marker) => {
  throw new Error(marker);
};

function assertSafeGrantMatrix(matrix) {
  const normalized = normalizeAuditGrantMatrix(matrix);
  if (!Array.isArray(normalized)) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_GRANTS_INVALID");
  }
  if (
    normalized.some((grant) => ["anon", "authenticated"].includes(grant.role))
  ) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_GRANTS_INVALID");
  }
  const serviceRole = new Set(
    normalized
      .filter((grant) => grant.role === "service_role")
      .map((grant) => grant.privilege),
  );
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE"]) {
    if (!serviceRole.has(privilege)) {
      fail("SOLO_SCOPED_PROMOTION_CONTRACT_GRANTS_INVALID");
    }
  }
}

export function contractHash(source) {
  return createHash("sha256").update(source).digest("hex");
}

export function compareGrantMatrices(expected, observed) {
  const normalizedExpected = normalizeAuditGrantMatrix(expected);
  const normalizedObserved = normalizeAuditGrantMatrix(observed);
  return (
    Array.isArray(normalizedExpected) &&
    Array.isArray(normalizedObserved) &&
    JSON.stringify(normalizedExpected) === JSON.stringify(normalizedObserved)
  );
}

export function validateScopedPromotionContract(contract) {
  if (!contract || typeof contract !== "object") {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_INVALID");
  }
  if (
    contract.contractId !== CONTRACT_ID ||
    contract.release !== RELEASE ||
    contract.migration !== MIGRATION_PATH ||
    contract.migrationSha256 !== MIGRATION_SHA256 ||
    contract.destructiveSql !== false ||
    contract.requiresPromotion !== true ||
    contract.expectedBlockingFindings !== 0 ||
    contract.platformObservationsAllowed !== true ||
    contract.releaseLedger !== "public.comun_schema_releases" ||
    contract.fingerprintScope !== "sidewalk-operational-v1" ||
    JSON.stringify(contract.scopedObjects) !== JSON.stringify(scopedObjects) ||
    contract.expectedPreFingerprint !== CANONICAL_PRE_FINGERPRINT ||
    contract.expectedPostFingerprint !== CANONICAL_POST_FINGERPRINT ||
    contract.derivedFromDiagnosticRun !== 30237943854 ||
    contract.grantRisk !== "safer_than_pre" ||
    contract.acceptedRemoteCondition !==
      "public.comun_admin_audit_log possui zero grants para anon/authenticated"
  ) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_INVALID");
  }
  if (
    !fingerprint.test(contract.expectedScopedPreFingerprint ?? "") ||
    !fingerprint.test(contract.expectedScopedPostFingerprint ?? "") ||
    contract.expectedScopedPreFingerprint ===
      contract.expectedScopedPostFingerprint
  ) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_FINGERPRINT_INVALID");
  }
  const ledger = contract.expectedLedger;
  if (
    !ledger ||
    ledger.status !== "applied" ||
    ledger.migrationPath !== MIGRATION_PATH ||
    ledger.migrationSha256 !== MIGRATION_SHA256 ||
    ledger.preFingerprint !== contract.expectedScopedPreFingerprint ||
    ledger.postFingerprint !== contract.expectedScopedPostFingerprint
  ) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_LEDGER_INVALID");
  }
  assertSafeGrantMatrix(contract.expectedAuditGrantMatrixPre);
  assertSafeGrantMatrix(contract.expectedAuditGrantMatrixPost);
  if (unsafe.test(JSON.stringify(contract))) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_SENSITIVE_DATA");
  }
  return contract;
}

export function selectScopedPromotionContract(contractId = CONTRACT_ID) {
  if (contractId !== CONTRACT_ID) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_NOT_ALLOWED");
  }
  const absolutePath = path.resolve(CONTRACT_PATH);
  const source = readFileSync(absolutePath, "utf8");
  if (contractHash(source) !== CONTRACT_SHA256) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_CHECKSUM_MISMATCH");
  }
  return {
    contract: validateScopedPromotionContract(JSON.parse(source)),
    contractHash: contractHash(source),
    contractPath: CONTRACT_PATH,
  };
}

export function assertExactContractMatrix(contract, phase, matrix) {
  const key =
    phase === "pre"
      ? "expectedAuditGrantMatrixPre"
      : phase === "post"
        ? "expectedAuditGrantMatrixPost"
        : null;
  if (!key || !compareGrantMatrices(contract[key], matrix)) {
    fail("SOLO_SCOPED_PROMOTION_CONTRACT_GRANT_MATRIX_MISMATCH");
  }
}

export function authorizationFormats({ projectRef, mainSha, ledgerHash }) {
  const { contractHash: currentContractHash } = selectScopedPromotionContract();
  return {
    migration: `AUTORIZO_MIGRATION_CALCADAS_${projectRef}_${mainSha}_${currentContractHash}_MANTER_FLAG_DESABILITADA`,
    activate: `AUTORIZO_ATIVAR_CALCADAS_${projectRef}_${mainSha}_${ledgerHash}`,
  };
}

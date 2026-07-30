import { createHash } from "node:crypto";

export const expectedCulturalBuckets = [
  {
    id: "archive-private-originals",
    public: false,
    fileSizeLimit: 30 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  {
    id: "archive-public-derivatives",
    public: true,
    fileSizeLimit: 15 * 1024 * 1024,
    allowedMimeTypes: ["image/webp"],
  },
  {
    id: "radio-private-originals",
    public: false,
    fileSizeLimit: 250 * 1024 * 1024,
    allowedMimeTypes: [
      "audio/wav",
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/flac",
    ],
  },
  {
    id: "radio-public-audio",
    public: true,
    fileSizeLimit: 250 * 1024 * 1024,
    allowedMimeTypes: [
      "audio/mpeg",
      "application/json",
      "text/vtt",
      "text/plain",
    ],
  },
];

export const culturalAltTextContract = {
  id: "sidewalk-public-image-47-6a-v1",
  text: "Trecho de calçada de concreto com rachaduras, vegetação e uma abertura circular junto a um muro amarelo.",
  inspectionMethod: "visual_public_derivative_and_public_editorial_context",
};

const expectedBucketIds = new Set(
  expectedCulturalBuckets.map((bucket) => bucket.id),
);

function sortedStrings(values) {
  return [...new Set((values ?? []).map(String))].sort();
}

function boundedCount(value) {
  return Math.max(0, Math.min(1_000_000_000, Number(value) || 0));
}

function equalStringArrays(left, right) {
  return (
    JSON.stringify(sortedStrings(left)) === JSON.stringify(sortedStrings(right))
  );
}

export function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function sanitizeBucketState(rows = []) {
  const rowById = new Map(
    rows
      .filter((row) => expectedBucketIds.has(String(row?.id)))
      .map((row) => [String(row.id), row]),
  );
  const buckets = expectedCulturalBuckets.map((expected) => {
    const row = rowById.get(expected.id);
    const present =
      typeof row?.present === "boolean" ? row.present : row?.id === expected.id;
    const actualMimeTypes = present
      ? sortedStrings(row.allowed_mime_types)
      : [];
    const exact =
      present &&
      row.public === expected.public &&
      Number(row.file_size_limit) === expected.fileSizeLimit &&
      equalStringArrays(actualMimeTypes, expected.allowedMimeTypes);
    return {
      id: expected.id,
      present,
      public: present ? row.public === true : null,
      fileSizeLimit: present ? boundedCount(row.file_size_limit) : null,
      allowedMimeTypes: actualMimeTypes,
      exact,
    };
  });
  return {
    expectedBuckets: expectedCulturalBuckets.length,
    presentBuckets: buckets.filter((bucket) => bucket.present).length,
    missingBuckets: buckets
      .filter((bucket) => !bucket.present)
      .map((bucket) => bucket.id),
    incompatibleBuckets: buckets
      .filter((bucket) => bucket.present && !bucket.exact)
      .map((bucket) => bucket.id),
    buckets,
  };
}

function normalizeRoles(roles) {
  if (Array.isArray(roles)) return roles.map(String);
  return String(roles ?? "")
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((role) => role.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function expressionText(policy) {
  return `${policy?.qual ?? ""} ${policy?.with_check ?? ""}`.toLowerCase();
}

function policyTargetsBucket(policy, bucketId) {
  const expression = expressionText(policy);
  const mentionedExpected = expectedCulturalBuckets.filter((bucket) =>
    expression.includes(bucket.id.toLowerCase()),
  );
  return (
    mentionedExpected.length === 0 ||
    mentionedExpected.some((bucket) => bucket.id === bucketId)
  );
}

function policyAllows(policy, role, commands, bucketId) {
  const roles = normalizeRoles(policy?.roles);
  const command = String(policy?.cmd ?? "").toUpperCase();
  return (
    (roles.includes(role) || roles.includes("public")) &&
    (commands.includes(command) || command === "ALL") &&
    policyTargetsBucket(policy, bucketId)
  );
}

function policyIsStrictAuthenticatedWrite(policy, bucketId) {
  const expression = expressionText(policy);
  return (
    policyTargetsBucket(policy, bucketId) &&
    expression.includes(bucketId.toLowerCase()) &&
    expression.includes("auth.uid")
  );
}

export function buildCulturalStoragePolicyEvidence(input = {}) {
  const policies = Array.isArray(input.policies) ? input.policies : [];
  const buckets = Array.isArray(input.buckets) ? input.buckets : [];
  const storageRlsDisabled = boundedCount(input.storageRlsDisabled);
  const serviceOperation = input.serviceOperation === true;
  let dangerousPolicyCount = 0;

  for (const policy of policies) {
    const table = String(policy?.tablename ?? "");
    const command = String(policy?.cmd ?? "").toUpperCase();
    const roles = normalizeRoles(policy?.roles);
    const publicRole =
      roles.includes("public") ||
      roles.includes("anon") ||
      roles.includes("authenticated");
    if (!publicRole) continue;
    if (
      table === "buckets" &&
      ["INSERT", "UPDATE", "DELETE", "ALL"].includes(command)
    ) {
      dangerousPolicyCount += 1;
      continue;
    }
    if (table !== "objects") continue;
    for (const bucket of expectedCulturalBuckets) {
      if (!policyTargetsBucket(policy, bucket.id)) continue;
      if (
        (roles.includes("public") || roles.includes("anon")) &&
        ["INSERT", "UPDATE", "DELETE", "ALL"].includes(command)
      ) {
        dangerousPolicyCount += 1;
        break;
      }
      if (
        roles.includes("authenticated") &&
        ["INSERT", "UPDATE", "DELETE", "ALL"].includes(command) &&
        !policyIsStrictAuthenticatedWrite(policy, bucket.id)
      ) {
        dangerousPolicyCount += 1;
        break;
      }
    }
  }

  const matrix = expectedCulturalBuckets.map((expected) => {
    const actual = buckets.find((bucket) => bucket.id === expected.id);
    const publicBucket = actual?.present === true && actual?.public === true;
    const anonPolicyRead = policies.some(
      (policy) =>
        String(policy?.tablename ?? "") === "objects" &&
        policyAllows(policy, "anon", ["SELECT"], expected.id),
    );
    const authenticatedPolicyRead = policies.some(
      (policy) =>
        String(policy?.tablename ?? "") === "objects" &&
        policyAllows(policy, "authenticated", ["SELECT"], expected.id),
    );
    const anonWrite = policies.some(
      (policy) =>
        String(policy?.tablename ?? "") === "objects" &&
        policyAllows(
          policy,
          "anon",
          ["INSERT", "UPDATE", "DELETE"],
          expected.id,
        ),
    );
    const authenticatedWrite = policies.some(
      (policy) =>
        String(policy?.tablename ?? "") === "objects" &&
        policyAllows(
          policy,
          "authenticated",
          ["INSERT", "UPDATE", "DELETE"],
          expected.id,
        ),
    );
    return {
      bucket: expected.id,
      public: publicBucket,
      anonRead: publicBucket || anonPolicyRead,
      anonWrite,
      authenticatedRead: publicBucket || authenticatedPolicyRead,
      authenticatedWrite,
      serviceOperation,
    };
  });

  const privateReadExposure = matrix.filter(
    (row) =>
      !expectedCulturalBuckets.find((bucket) => bucket.id === row.bucket)
        ?.public &&
      (row.anonRead || row.authenticatedRead),
  ).length;
  const policiesGreen =
    storageRlsDisabled === 0 &&
    dangerousPolicyCount === 0 &&
    privateReadExposure === 0 &&
    serviceOperation;
  return {
    marker: policiesGreen
      ? "COMUN_CULTURAL_STORAGE_POLICIES_GREEN"
      : "COMUN_ARCHIVE_RADIO_ART_BLOCKED_STORAGE_POLICY",
    storageRlsDisabled,
    policiesInspected: policies.length,
    dangerousPolicyCount,
    privateReadExposure,
    serviceOperation,
    matrix,
    policiesGreen,
  };
}

export function createAltCandidateFingerprint(candidate) {
  if (!candidate) return null;
  const normalizeTimestamp = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? String(value ?? "")
      : parsed.toISOString();
  };
  return sha256Json({
    assetId: candidate.asset_id,
    archiveItemId: candidate.archive_item_id,
    assetCreatedAt: normalizeTimestamp(candidate.asset_created_at),
    itemUpdatedAt: normalizeTimestamp(candidate.item_updated_at),
    publicUrl: candidate.public_url,
    reviewStatus: candidate.review_status,
    itemStatus: candidate.item_status,
    itemVisibility: candidate.item_visibility,
  });
}

export function buildCulturalRepairPlan(input = {}) {
  const missingBuckets = sortedStrings(input.missingBuckets);
  const incompatibleBuckets = sortedStrings(input.incompatibleBuckets);
  const missingBucketsAllowlisted = missingBuckets.every((bucket) =>
    expectedBucketIds.has(bucket),
  );
  const exact =
    input.targetVerified === true &&
    input.schemaGreen === true &&
    input.policiesGreen === true &&
    boundedCount(input.similarUnexpectedBuckets) === 0 &&
    missingBucketsAllowlisted &&
    missingBuckets.length > 0 &&
    missingBuckets.length <= 2 &&
    incompatibleBuckets.length === 0 &&
    boundedCount(input.altCandidateCount) === 1 &&
    typeof input.altCandidateFingerprint === "string" &&
    typeof input.publicImageSha256 === "string";
  const plan = {
    formatVersion: 1,
    repairId: "comun-cultural-remote-state-47-6a",
    missingBuckets,
    bucketContracts: expectedCulturalBuckets
      .filter((bucket) => missingBuckets.includes(bucket.id))
      .map((bucket) => ({
        id: bucket.id,
        public: bucket.public,
        fileSizeLimit: bucket.fileSizeLimit,
        allowedMimeTypes: bucket.allowedMimeTypes,
      })),
    altTextContractId: culturalAltTextContract.id,
    altCandidateFingerprint: input.altCandidateFingerprint ?? null,
    publicImageSha256: input.publicImageSha256 ?? null,
    writes: {
      bucketRowsCreatedMax: 2,
      altTextRowsUpdatedMax: 1,
      storageObjectsCreated: 0,
    },
  };
  return {
    exact,
    marker: exact
      ? "COMUN_CULTURAL_REMOTE_REPAIR_PLAN_EXACT"
      : "COMUN_CULTURAL_REMOTE_REPAIR_PLAN_BLOCKED",
    planHash: exact ? sha256Json(plan) : null,
    plan,
  };
}

export function validateAltText(text) {
  const normalized = String(text ?? "").trim();
  const generic =
    /^(imagem do acervo|foto histórica|imagem ilustrativa|obra de arte)$/i;
  const privatePattern =
    /(?:@|https?:\/\/|object[_ -]?key|signed[_ -]?url|private[_ -]?notes|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i;
  if (
    normalized.length < 40 ||
    normalized.length > 220 ||
    generic.test(normalized)
  ) {
    throw new Error("COMUN_CULTURAL_ALT_TEXT_NOT_SPECIFIC");
  }
  if (privatePattern.test(normalized)) {
    throw new Error("COMUN_CULTURAL_ALT_TEXT_PRIVATE_DATA_BLOCKED");
  }
  return normalized;
}

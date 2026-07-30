import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import {
  assertSanitizedCulturalArtifact,
  enrichCulturalMetricsForRepair,
  fetchPublicImageSha256,
  fixedCulturalAuditSql,
  sanitizeCulturalMetrics,
  validateCulturalDatabaseTarget,
} from "./audit-comun-cultural-deliverability.mjs";
import {
  createAltCandidateFingerprint,
  culturalAltTextContract,
  expectedCulturalBuckets,
  validateAltText,
} from "./comun-cultural-remote-state.mjs";

const { Client } = pg;

export const repairConfirmation = "EXECUTAR_REPARO_CULTURAL_47_6A";

export function validateCulturalRepairEnvironment(environment = process.env) {
  const database = validateCulturalDatabaseTarget(environment);
  const projectRef = String(environment.SUPABASE_PROJECT_REF ?? "").trim();
  const apiUrl = String(environment.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceKey = String(environment.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const expectedPlanHash = String(
    environment.COMUN_CULTURAL_EXPECTED_PLAN_HASH ?? "",
  ).trim();
  if (environment.COMUN_CULTURAL_REPAIR_CONFIRMATION !== repairConfirmation) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_CONFIRMATION_INVALID");
  }
  if (apiUrl !== `https://${projectRef}.supabase.co` || !serviceKey) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_API_TARGET_INVALID");
  }
  if (!/^[a-f0-9]{64}$/.test(expectedPlanHash)) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_PLAN_HASH_INVALID");
  }
  return { ...database, apiUrl, serviceKey, expectedPlanHash };
}

export function assertExactCulturalRepairPlan(artifact, expectedPlanHash) {
  if (
    artifact?.repairPlan?.exact !== true ||
    artifact.repairPlan.marker !== "COMUN_CULTURAL_REMOTE_REPAIR_PLAN_EXACT" ||
    artifact.repairPlan.planHash !== expectedPlanHash ||
    artifact.storage.missingBuckets.length < 1 ||
    artifact.storage.missingBuckets.length > 2 ||
    artifact.storage.incompatibleBuckets.length !== 0 ||
    artifact.storage.similarUnexpectedBuckets !== 0 ||
    artifact.privacy.publicImageAssetsWithoutAltText !== 1 ||
    artifact.storage.policyEvidence.policiesGreen !== true
  ) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_PLAN_MISMATCH");
  }
  return true;
}

export function assertCulturalRepairArtifactSanitized(artifact) {
  const serialized = JSON.stringify(artifact);
  const forbidden =
    /(postgres(?:ql)?:\/\/|supabase\.co|service_role|bearer\s+|authorization|cookie|object_key|signed_url|private_notes|public_url|eyJ[a-zA-Z0-9_-]{10,})/i;
  if (forbidden.test(serialized)) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_SANITIZATION_FAILED");
  }
  if (
    artifact.storageObjectsCreated !== 0 ||
    artifact.rightsChanged !== false ||
    artifact.consentsChanged !== false ||
    artifact.publicationStatusChanged !== false
  ) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_CONTRACT_INVALID");
  }
  return true;
}

async function collectAudit(environment) {
  const { databaseUrl } = validateCulturalDatabaseTarget(environment);
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
  });
  try {
    await client.connect();
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction read only");
    const result = await client.query(fixedCulturalAuditSql);
    const enriched = await enrichCulturalMetricsForRepair(
      result.rows[0]?.metrics ?? {},
    );
    const artifact = sanitizeCulturalMetrics({
      ...enriched,
      target: { verified: true },
    });
    assertSanitizedCulturalArtifact(artifact);
    await client.query("rollback");
    return artifact;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function createMissingBuckets({
  apiUrl,
  serviceKey,
  missingBuckets,
  environment,
}) {
  const supabase = createClient(apiUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  let created = 0;
  for (const id of missingBuckets) {
    const contract = expectedCulturalBuckets.find((bucket) => bucket.id === id);
    if (!contract) {
      throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_BUCKET_NOT_ALLOWLISTED");
    }
    const { error } = await supabase.storage.createBucket(contract.id, {
      public: contract.public,
      fileSizeLimit: contract.fileSizeLimit,
      allowedMimeTypes: contract.allowedMimeTypes,
    });
    if (!error) {
      created += 1;
      continue;
    }
    const reread = await collectAudit(environment);
    const current = reread.storage.buckets.find((bucket) => bucket.id === id);
    if (!current?.present || !current.exact) {
      throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_BUCKET_CREATE_FAILED");
    }
  }
  return created;
}

async function updateExactAltText({
  databaseUrl,
  expectedFingerprint,
  expectedImageSha256,
}) {
  const altText = validateAltText(culturalAltTextContract.text);
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
  });
  try {
    await client.connect();
    await client.query("begin");
    const selected = await client.query(
      `select
         asset.id as asset_id,
         asset.archive_item_id,
         asset.created_at as asset_created_at,
         item.updated_at as item_updated_at,
         asset.public_url,
         asset.review_status,
         item.status as item_status,
         item.visibility as item_visibility
       from public.comun_archive_assets asset
       join public.comun_archive_items item
         on item.id = asset.archive_item_id
       where asset.bucket_scope = 'public_safe'
         and asset.review_status = 'approved'
         and asset.public_url is not null
         and asset.mime_type like 'image/%'
         and nullif(trim(asset.alt_text), '') is null
         and item.status = 'published'
         and item.visibility = 'public'
         and item.published_at is not null
       for update of asset`,
    );
    if (selected.rowCount !== 1) {
      throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_ALT_CANDIDATE_CHANGED");
    }
    const candidate = selected.rows[0];
    if (createAltCandidateFingerprint(candidate) !== expectedFingerprint) {
      throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_ALT_CANDIDATE_CHANGED");
    }
    const currentImageSha256 = await fetchPublicImageSha256(
      candidate.public_url,
    );
    if (currentImageSha256 !== expectedImageSha256) {
      throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_PUBLIC_ASSET_CHANGED");
    }
    const updated = await client.query(
      `update public.comun_archive_assets asset
       set alt_text = $2
       where asset.id = $1
         and nullif(trim(asset.alt_text), '') is null
         and asset.review_status = 'approved'
         and asset.public_url is not null
         and exists (
           select 1
           from public.comun_archive_items item
           where item.id = asset.archive_item_id
             and item.status = 'published'
             and item.visibility = 'public'
             and item.published_at is not null
         )`,
      [candidate.asset_id, altText],
    );
    if (updated.rowCount !== 1) {
      throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_ALT_UPDATE_CONFLICT");
    }
    await client.query("commit");
    return 1;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function executeCulturalRemoteRepair(environment = process.env) {
  const validated = validateCulturalRepairEnvironment(environment);
  const preflight = await collectAudit(environment);
  assertExactCulturalRepairPlan(preflight, validated.expectedPlanHash);
  const missingBefore = [...preflight.storage.missingBuckets];
  const bucketRowsCreated = await createMissingBuckets({
    apiUrl: validated.apiUrl,
    serviceKey: validated.serviceKey,
    missingBuckets: missingBefore,
    environment,
  });
  const afterBuckets = await collectAudit(environment);
  if (
    afterBuckets.storage.missingBuckets.length !== 0 ||
    afterBuckets.storage.incompatibleBuckets.length !== 0 ||
    afterBuckets.storage.policyEvidence.policiesGreen !== true ||
    afterBuckets.privacy.altCandidateFingerprint !==
      preflight.privacy.altCandidateFingerprint ||
    afterBuckets.privacy.publicImageSha256 !==
      preflight.privacy.publicImageSha256
  ) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_BUCKET_POSTCHECK_FAILED");
  }
  const altTextRowsUpdated = await updateExactAltText({
    databaseUrl: validated.databaseUrl,
    expectedFingerprint: preflight.privacy.altCandidateFingerprint,
    expectedImageSha256: preflight.privacy.publicImageSha256,
  });
  const postflight = await collectAudit(environment);
  if (
    postflight.result !==
      "COMUN_ARCHIVE_RADIO_ART_READY_FOR_REAL_CONTENT_REHEARSAL" ||
    postflight.storage.presentBuckets !== 4 ||
    postflight.storage.incompatibleBuckets.length !== 0 ||
    postflight.storage.policyEvidence.policiesGreen !== true ||
    postflight.privacy.publicImageAssetsWithoutAltText !== 0 ||
    postflight.privacy.privateAssetsWithPublicUrl !== 0 ||
    postflight.privacy.orphanAssetRows !== 0
  ) {
    throw new Error("COMUN_CULTURAL_REMOTE_REPAIR_POSTFLIGHT_FAILED");
  }
  return {
    formatVersion: 1,
    repairId: "comun-cultural-remote-state-47-6a",
    result: "COMUN_ARCHIVE_RADIO_ART_REMOTE_STATE_REPAIRED",
    planHash: validated.expectedPlanHash,
    missingBucketsBefore: missingBefore,
    bucketRowsCreated,
    altTextRowsUpdated,
    altTextContractId: culturalAltTextContract.id,
    bucketsAfter: postflight.storage.presentBuckets,
    policies: postflight.storage.policyEvidence.marker,
    publicImagesWithoutAltAfter:
      postflight.privacy.publicImageAssetsWithoutAltText,
    storageObjectsCreated: 0,
    rightsChanged: false,
    consentsChanged: false,
    publicationStatusChanged: false,
    databaseWrites: "one_alt_text_field",
    storageWrites: `${bucketRowsCreated}_bucket_metadata_rows`,
  };
}

async function persistResult(output, artifact) {
  assertCulturalRepairArtifactSanitized(artifact);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(path.dirname(output), "repair.md"),
    `# Reparo focal do estado cultural remoto

- Resultado: \`${artifact.result}\`
- Buckets ausentes antes: ${artifact.missingBucketsBefore?.join(", ") || "não disponível"}
- Registros de bucket criados: ${artifact.bucketRowsCreated ?? 0}
- Campos de texto alternativo atualizados: ${artifact.altTextRowsUpdated ?? 0}
- Objetos de Storage criados: 0
- Direitos alterados: não
- Consentimentos alterados: não
- Status editorial alterado: não
`,
    "utf8",
  );
}

async function run() {
  const outputIndex = process.argv.indexOf("--output");
  const output =
    outputIndex >= 0
      ? process.argv[outputIndex + 1]
      : ".ci-artifacts/comun-cultural-deliverability/repair.json";
  try {
    const artifact = await executeCulturalRemoteRepair(process.env);
    await persistResult(output, artifact);
    process.stdout.write(`${artifact.result}\n`);
  } catch (error) {
    const marker = String(error?.message ?? "");
    const safeMarker = /^COMUN_[A-Z0-9_]+$/.test(marker)
      ? marker
      : "COMUN_CULTURAL_REMOTE_REPAIR_FAILED";
    const failure = {
      formatVersion: 1,
      repairId: "comun-cultural-remote-state-47-6a",
      result: safeMarker,
      bucketRowsCreated: "unknown",
      altTextRowsUpdated: "unknown",
      storageObjectsCreated: 0,
      rightsChanged: false,
      consentsChanged: false,
      publicationStatusChanged: false,
      databaseWrites: "unknown",
      storageWrites: "unknown",
    };
    await persistResult(output, failure);
    process.stderr.write(`${safeMarker}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}

import { createHash } from "node:crypto";
import { classifyMigrationLane } from "./classify-migration-lane.mjs";
import { assertEmptyPlan } from "./readonly-reconciled-migration-plan.mjs";

const learningPath = "supabase/migrations/20261006134804_comun_learning_r0.sql";
const learningName = "20261006134804_comun_learning_r0.sql";
const learningHash =
  "5036a833b1b681487204349f8ebc58690228a2f5aa932943a81f60df1d3b6ba7";
const learningManifestHash =
  "3b598bc6b3ea3dfe462ba205b6747016aace52de87c87dec332ecbb1a567d4de";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function validateDeferredLearningR0({ migrationBytes, manifestBytes }) {
  if (
    !migrationBytes ||
    !manifestBytes ||
    hash(migrationBytes) !== learningHash ||
    hash(manifestBytes) !== learningManifestHash
  )
    throw new Error("DEFERRED_LEARNING_R0_BYTES_INVALID");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (
    manifest.release !== "20261006134804-comun-learning-r0" ||
    manifest.migration !== learningPath ||
    manifest.migrationSha256 !== learningHash ||
    manifest.remotePromotionAllowed !== false ||
    manifest.scope !== "local_candidate" ||
    manifest.migrations?.length !== 1 ||
    manifest.migrations[0].path !== learningPath ||
    manifest.migrations[0].sha256 !== learningHash
  )
    throw new Error("DEFERRED_LEARNING_R0_MANIFEST_INVALID");
  if (classifyMigrationLane("48-4-a7", [learningPath]).mode !== "not_applicable")
    throw new Error("DEFERRED_LEARNING_R0_NOT_OUTSIDE_A7");
}

export function assertA7MigrationPlan(plan, deferredBytes = {}) {
  // Do not deduplicate: an ambiguous or duplicated plan must fail closed.
  const pending = [...plan.matchAll(/[A-Za-z0-9][A-Za-z0-9_.-]*\.sql(?![A-Za-z0-9_.-])/gi)].map(
    ([filename]) => filename,
  );
  if (/--include-all|migration repair|db reset|seed/.test(plan))
    throw new Error(
      "REMOTE_MIGRATION_PLAN_FORBIDDEN_OPERATION",
    );
  if (pending.length === 0) {
    assertEmptyPlan(plan);
    return { state: "empty", pending: [] };
  }
  if (
    pending.length !== 1 ||
    pending[0] !== learningName ||
    /Remote database is up to date\./.test(plan)
  )
    throw new Error(`REMOTE_MIGRATION_PLAN_NOT_ACCEPTED:pending-count=${pending.length}`);
  if (
    !plan.includes("DRY RUN: migrations will *not* be pushed to the database.") ||
    !/Would push (?:these migrations:|migration )/.test(plan)
  )
    throw new Error("REMOTE_MIGRATION_PLAN_DRY_RUN_MARKER_MISSING");
  validateDeferredLearningR0(deferredBytes);
  return { state: "one-unrelated-learning-r0-pending", pending: [learningName] };
}

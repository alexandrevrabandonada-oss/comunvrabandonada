import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  classifyLocalReleaseManifests,
  validateLocalManifestShape,
} from "./local-release-manifest.mjs";

const migration = "supabase/local-migrations/20260805090000_test.sql";
const baseManifest = {
  release: "20260805090000-test",
  migration,
  sha256: "a".repeat(64),
  requiresPromotion: false,
  remotePromotionAllowed: false,
  scope: "local-only",
  featureFlag: "COMUN_TEST_LOCAL",
};

async function fixture(manifest = baseManifest, directory = "supabase/local-releases") {
  const root = await mkdtemp(path.join(os.tmpdir(), "comun-local-release-"));
  await mkdir(path.join(root, "supabase/local-migrations"), { recursive: true });
  await mkdir(path.join(root, directory), { recursive: true });
  const bytes = "-- local-only test migration\n";
  const { createHash } = await import("node:crypto");
  const sha = createHash("sha256").update(bytes).digest("hex");
  await writeFile(path.join(root, migration), bytes);
  await writeFile(
    path.join(root, directory, "20260805090000-test.json"),
    JSON.stringify({ ...manifest, sha256: sha }),
  );
  return root;
}

test("discovers the allowlisted supabase/local-releases directory exactly", async () => {
  const root = await fixture();
  const [entry] = await classifyLocalReleaseManifests(root);
  assert.equal(entry.status, "LOCAL_ONLY_MANIFEST_EXACT");
  assert.equal(entry.quarantineAllowed, true);
});

test("does not classify a manifest in an unallowlisted directory", async () => {
  const root = await fixture(baseManifest, "supabase/other");
  assert.deepEqual(await classifyLocalReleaseManifests(root), []);
});

test("rejects promotion flags, scope and feature flag mismatches", () => {
  assert.equal(validateLocalManifestShape(baseManifest), true);
  assert.equal(
    validateLocalManifestShape({ ...baseManifest, requiresPromotion: true }),
    false,
  );
  assert.equal(
    validateLocalManifestShape({ ...baseManifest, remotePromotionAllowed: true }),
    false,
  );
  assert.equal(
    validateLocalManifestShape({ ...baseManifest, scope: "production" }),
    false,
  );
  assert.equal(
    validateLocalManifestShape({ ...baseManifest, featureFlag: "COMUN_TEST" }),
    false,
  );
});

test("marks duplicate or conflicting manifests as mismatch", async () => {
  const root = await fixture();
  await mkdir(path.join(root, "supabase/releases"), { recursive: true });
  const promotion = { ...baseManifest, sha256: "a".repeat(64) };
  await writeFile(
    path.join(root, "supabase/releases/20260805090000-test.json"),
    JSON.stringify(promotion),
  );
  const [entry] = await classifyLocalReleaseManifests(root);
  assert.equal(entry.status, "MANIFEST_MISMATCH");
  assert.equal(entry.conflictingPromotion, true);
});

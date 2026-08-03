import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(
  root,
  "supabase/local-releases/20260803161310-comun-relata-durable-local.json",
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const migration = await readFile(path.join(root, manifest.migration));
const sha256 = createHash("sha256").update(migration).digest("hex");

assert.equal(manifest.migrationSha256, sha256);
assert.equal(manifest.requiresPromotion, false);
assert.equal(manifest.remotePromotionAllowed, false);
assert.equal(manifest.scope, "disposable_local_supabase_only");

const remoteApplyScripts = (await readdir(path.join(root, "scripts"), {
  recursive: true,
  withFileTypes: true,
}))
  .filter(
    (entry) =>
      entry.isFile() &&
      /(?:apply|promot).*remote|remote.*(?:apply|promot)/i.test(entry.name),
  )
  .map((entry) => path.join(entry.parentPath, entry.name));

for (const scriptPath of remoteApplyScripts) {
  const contents = await readFile(scriptPath, "utf8");
  assert.equal(
    contents.includes(manifest.migration),
    false,
    `${path.relative(root, scriptPath)} must not promote the local-only release`,
  );
}

console.log(
  JSON.stringify({
    result: "COMUN_RELATA_LOCAL_RELEASE_CONTRACT_GREEN",
    migrationSha256: sha256,
    remotePromotionAllowed: false,
  }),
);

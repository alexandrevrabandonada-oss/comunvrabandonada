import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const releaseDirectory = path.join(root, "supabase/local-releases");
const manifesta = (await readdir(releaseDirectory))
  .filter((name) => /^\d+-comun-(?:relata|bus|capture)-.+\.json$/.test(name))
  .sort();
assert.ok(manifesta.length >= 2);
const verified = [];
for (const name of manifesta) {
  const manifest = JSON.parse(
    await readFile(path.join(releaseDirectory, name), "utf8"),
  );
  const migration = await readFile(path.join(root, manifest.migration));
  const sha256 = createHash("sha256").update(migration).digest("hex");
  assert.equal(manifest.migrationSha256, sha256);
  assert.equal(manifest.requiresPromotion, false);
  assert.equal(manifest.remotePromotionAllowed, false);
  assert.equal(manifest.scope, "disposable_local_supabase_only");
  verified.push({
    release: manifest.release,
    migration: manifest.migration,
    migrationSha256: sha256,
  });
}

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
  for (const release of verified) {
    assert.equal(
      contents.includes(release.release) || contents.includes(release.migration),
      false,
      `${path.relative(root, scriptPath)} must not promote ${release.release}`,
    );
  }
}

console.log(
  JSON.stringify({
    result: "COMUN_RELATA_LOCAL_RELEASE_CONTRACT_GREEN",
    releases: verified,
    remotePromotionAllowed: false,
  }),
);

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { readFile, writeFile, statfs } from "node:fs/promises";
import tar from "tar-stream";
import { verifyStorageTar } from "../../lib/security/storage-encrypted-stream.mjs";

// Run only in an owned disposable Linux container, no network, /restore on tmpfs.
// stdin is decrypted TAR. No source credentials, key files or provider writes.
try {
  if (
    process.platform !== "linux" ||
    (await statfs("/restore")).type !== 0x01021994
  )
    throw new Error("TMPFS_REQUIRED");
  const chunks = [];
  let length = 0;
  for await (const chunk of process.stdin) {
    length += chunk.length;
    if (length > 16 * 1024 * 1024) throw new Error("LOCAL_REPLAY_BUDGET");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  const verified = await verifyStorageTar(Readable.from([raw]));
  const extract = tar.extract();
  const input = Readable.from([raw]);
  input.on("error", () => extract.destroy());
  input.pipe(extract);
  const written = [];
  let manifest;
  for await (const entry of extract) {
    const pieces = [];
    for await (const chunk of entry) pieces.push(chunk);
    const bytes = Buffer.concat(pieces);
    if (entry.header.name === "manifest.json")
      manifest = JSON.parse(bytes.toString("utf8"));
    else {
      const file = `/restore/${written.length + 1}.bin`;
      await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
      written.push(file);
    }
  }
  assert.equal(written.length, manifest.objects.length);
  // Preserve logical keys and metadata as an index; never interpret source keys as filesystem paths.
  const expectedIndex = manifest.objects.map((object, index) => ({
    scope: object.scope,
    key: object.key,
    attributes: object.attributes,
    file: `${index + 1}.bin`,
  }));
  await writeFile("/restore/index.json", JSON.stringify(expectedIndex), {
    flag: "wx",
    mode: 0o600,
  });
  assert.deepEqual(
    JSON.parse(await readFile("/restore/index.json", "utf8")),
    expectedIndex,
  );
  let restoredBytes = 0;
  for (let i = 0; i < written.length; i++) {
    const restored = await readFile(written[i]);
    restoredBytes += restored.length;
    assert.equal(restored.length, manifest.objects[i].size);
    assert.equal(
      createHash("sha256").update(restored).digest("hex"),
      manifest.objects[i].sha256,
    );
  }
  console.log(
    JSON.stringify({
      kind: "STORAGE_LOCAL_TMPFS_RESTORE_PASS_NOT_R2_REPLAY",
      objectCount: written.length,
      bytes: restoredBytes,
      manifestSha256: verified.manifestSha256,
      objectBytesReadback: true,
      logicalIdentityAndMetadataReadback: true,
      providerRestoreVerified: false,
      remoteWrites: false,
    }),
  );
} catch {
  console.error("COMUN_STORAGE_TMPFS_RESTORE_FAILED");
  process.exitCode = 1;
}

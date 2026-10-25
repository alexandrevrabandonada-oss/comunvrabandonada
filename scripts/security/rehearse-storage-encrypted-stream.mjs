import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  exportEncryptedStorage,
  verifyEncryptedStorage,
} from "../../lib/security/storage-encrypted-stream.mjs";

// Only synthetic bytes and a new disposable identity. Never accepts a source URL.
const [age, ageSha256, keygen, parent] = process.argv.slice(2);
let directory;
try {
  if (![age, keygen, parent].every((value) => value && path.isAbsolute(value)))
    throw new Error("OPTIONS");
  directory = await mkdtemp(path.join(parent, "storage-stream-synthetic-"));
  const identity = path.join(directory, "identity.txt");
  const generated = spawnSync(keygen, ["-o", identity], {
    stdio: "ignore",
    windowsHide: true,
    timeout: 10000,
  });
  assert.equal(generated.status, 0);
  const publicResult = spawnSync(keygen, ["-y", identity], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10000,
  });
  assert.equal(publicResult.status, 0);
  const recipient = publicResult.stdout.trim();
  const source = {
    async list(scope) {
      return {
        IsTruncated: false,
        Contents: [
          {
            Key: `synthetic-${scope}`,
            Size: scope === "private" ? 4 : 0,
            ETag: '"synthetic-v1"',
          },
        ],
      };
    },
    async read(object) {
      return {
        etag: object.etag,
        length: object.size,
        body: Readable.from([
          object.size ? Buffer.from([0, 128, 255, 42]) : Buffer.alloc(0),
        ]),
      };
    },
  };
  const output = path.join(directory, "copy.age");
  const result = await exportEncryptedStorage({
    source,
    age,
    ageSha256,
    recipient,
    output,
  });
  const verified = await verifyEncryptedStorage({
    age,
    ageSha256,
    identity,
    input: output,
    expectedCipherSha256: result.cipherSha256,
  });
  assert.equal(verified.objectCount, 2);
  assert.equal(verified.bytes, 4);
  assert.equal(verified.manifestSha256, result.manifestSha256);
  const before = await readFile(output);
  await assert.rejects(
    exportEncryptedStorage({ source, age, ageSha256, recipient, output }),
  );
  assert.deepEqual(await readFile(output), before);
  await assert.rejects(
    verifyEncryptedStorage({
      age,
      ageSha256,
      identity,
      input: output,
      expectedCipherSha256: "0".repeat(64),
    }),
  );
  const damaged = Buffer.from(before);
  damaged[damaged.length - 1] ^= 1;
  await writeFile(output, damaged);
  const { createHash } = await import("node:crypto");
  await assert.rejects(
    verifyEncryptedStorage({
      age,
      ageSha256,
      identity,
      input: output,
      expectedCipherSha256: createHash("sha256").update(damaged).digest("hex"),
    }),
  );
  await rm(directory, { recursive: true, force: true });
  await assert.rejects(access(directory));
  directory = undefined;
  console.log(
    JSON.stringify({
      kind: "SYNTHETIC_STORAGE_STREAM_ROUNDTRIP_PASS",
      objects: 2,
      bytes: 4,
      realR2Read: false,
      realDataExported: false,
      plaintextPersisted: false,
      cleanupVerified: true,
      outputCollisionPreserved: true,
      corruptedCipherRejected: true,
      providerRestoreVerified: false,
    }),
  );
} catch {
  console.error("COMUN_STORAGE_SYNTHETIC_REHEARSAL_FAILED");
  process.exitCode = 1;
} finally {
  if (directory) await rm(directory, { recursive: true, force: true });
}

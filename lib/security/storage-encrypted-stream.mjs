import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { open, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import tar from "tar-stream";
import { listCompleteStorageScope } from "./storage-copy-inventory.mjs";

const MAX_BYTES = 256 * 1024 * 1024;
const MAX_MANIFEST = 8 * 1024 * 1024;
const SCOPES = ["private", "public"];
const fail = (code) => {
  throw new Error(`COMUN_STORAGE_COPY_${code}`);
};
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const etagValid = (value) =>
  typeof value === "string" && /^"[^"\r\n]{1,200}"$/.test(value);
const header = (name, size) => ({
  name,
  size,
  type: "file",
  mode: 0o600,
  uid: 0,
  gid: 0,
  mtime: new Date(0),
});

function attributes(input = {}) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (key) =>
        ![
          "contentType",
          "contentEncoding",
          "cacheControl",
          "contentDisposition",
          "metadata",
        ].includes(key),
    )
  )
    fail("METADATA_INVALID");
  const output = {};
  for (const name of [
    "contentType",
    "contentEncoding",
    "cacheControl",
    "contentDisposition",
  ]) {
    const value = input[name] ?? null;
    if (
      value !== null &&
      (typeof value !== "string" ||
        value.length > 8192 ||
        /[\r\n\0]/.test(value))
    )
      fail("METADATA_INVALID");
    output[name] = value;
  }
  const metadata = input.metadata ?? {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    fail("METADATA_INVALID");
  output.metadata = Object.fromEntries(
    Object.entries(metadata)
      .sort(([a], [b]) => compare(a, b))
      .map(([key, value]) => {
        if (
          !/^[a-zA-Z0-9_-]{1,128}$/.test(key) ||
          typeof value !== "string" ||
          /[\r\n\0]/.test(value)
        )
          fail("METADATA_INVALID");
        return [key, value];
      }),
  );
  if (Buffer.byteLength(JSON.stringify(output)) > 16384)
    fail("METADATA_INVALID");
  return output;
}

async function inventory(source, signal) {
  const all = [];
  for (const scope of SCOPES) {
    const tags = new Map();
    const rows = await listCompleteStorageScope(
      async (cursor) => {
        signal.throwIfAborted();
        const page = await source.list(scope, cursor, signal);
        if (Array.isArray(page?.Contents))
          for (const object of page.Contents) {
            if (!etagValid(object.ETag)) fail("ETAG_REQUIRED");
            tags.set(object.Key, object.ETag);
          }
        return page;
      },
      { maxObjects: 10000 },
    );
    for (const row of rows)
      all.push({ scope, ...row, etag: tags.get(row.key) });
  }
  all.sort((a, b) => compare(a.scope, b.scope) || compare(a.key, b.key));
  if (all.length > 10000 || all.reduce((n, o) => n + o.size, 0) > MAX_BYTES)
    fail("BUDGET_EXCEEDED");
  return all;
}

export async function storageTarStream(source, options = {}) {
  const signal = options.signal ?? AbortSignal.timeout(300000);
  const listed = await inventory(source, signal);
  const pack = tar.pack();
  pack.on("error", () => {});
  const completed = (async () => {
    const objects = [];
    let bytes = 0;
    try {
      for (const object of listed) {
        signal.throwIfAborted();
        let result;
        try {
          result = await source.read(object, signal);
        } catch {
          fail("SOURCE_READ_FAILED");
        }
        if (
          result?.etag !== object.etag ||
          result?.length !== object.size ||
          !result.body
        )
          fail("OBJECT_CHANGED");
        const metadata = attributes(result.attributes);
        const entry = `objects/${String(objects.length + 1).padStart(6, "0")}.bin`;
        const digest = createHash("sha256");
        let received = 0;
        const tap = new Transform({
          transform(chunk, _encoding, done) {
            received += chunk.length;
            if (received > object.size) {
              done(new Error("COMUN_STORAGE_COPY_OBJECT_CHANGED"));
              return;
            }
            digest.update(chunk);
            done(null, chunk);
          },
        });
        await pipeline(
          Readable.from(result.body),
          tap,
          pack.entry(header(entry, object.size)),
          { signal },
        );
        if (received !== object.size) fail("OBJECT_CHANGED");
        bytes += received;
        objects.push({
          ...object,
          entry,
          sha256: digest.digest("hex"),
          attributes: metadata,
        });
      }
      const again = await inventory(source, signal);
      if (JSON.stringify(again) !== JSON.stringify(listed))
        fail("INVENTORY_CHANGED");
      const manifest = {
        formatVersion: 1,
        kind: "COMUN_STORAGE_STREAM",
        inventoryRechecked: true,
        atomicSnapshot: false,
        objects,
      };
      const encoded = Buffer.from(JSON.stringify(manifest));
      if (encoded.length > MAX_MANIFEST) fail("MANIFEST_TOO_LARGE");
      await new Promise((resolve, reject) =>
        pack.entry(header("manifest.json", encoded.length), encoded, (error) =>
          error ? reject(error) : resolve(),
        ),
      );
      pack.finalize();
      return {
        objectCount: objects.length,
        bytes,
        manifestSha256: hash(encoded),
        inventoryRechecked: true,
        atomicSnapshot: false,
      };
    } catch {
      pack.destroy(new Error("COMUN_STORAGE_COPY_STREAM_FAILED"));
      fail("STREAM_FAILED");
    }
  })();
  completed.catch(() => {});
  return { stream: pack, completed };
}

function ageCheck(age, expectedSha256) {
  if (!path.isAbsolute(age) || !/^[a-f0-9]{64}$/.test(expectedSha256))
    fail("AGE_UNVERIFIED");
  return readFile(age).then((binary) => {
    if (hash(binary) !== expectedSha256) fail("AGE_UNVERIFIED");
    const version = spawnSync(age, ["--version"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 10000,
    });
    if (version.status !== 0 || version.stdout.trim() !== "v1.3.2")
      fail("AGE_UNVERIFIED");
  });
}
function child(age, args) {
  const process = spawn(age, args, {
    stdio: ["pipe", "pipe", "ignore"],
    windowsHide: true,
    timeout: 300000,
  });
  const completed = new Promise((resolve, reject) => {
    process.once("error", () => reject(new Error("AGE_FAILED")));
    process.once("close", (code) =>
      code === 0 ? resolve() : reject(new Error("AGE_FAILED")),
    );
  });
  completed.catch(() => {});
  return { process, completed };
}

export async function exportEncryptedStorage({
  source,
  age,
  ageSha256,
  recipient,
  output,
}) {
  let file, seal, archive;
  const jobs = [];
  let created = false,
    success = false;
  try {
    if (!path.isAbsolute(output) || !/^age1[0-9a-z]{58}$/.test(recipient))
      fail("OPTIONS_INVALID");
    await ageCheck(age, ageSha256);
    file = await open(output, "wx", 0o600);
    created = true;
    archive = await storageTarStream(source);
    seal = child(age, ["--encrypt", "--recipient", recipient]);
    const digest = createHash("sha256");
    let cipherBytes = 0;
    const tap = new Transform({
      transform(bytes, _encoding, done) {
        digest.update(bytes);
        cipherBytes += bytes.length;
        done(null, bytes);
      },
    });
    jobs.push(
      pipeline(archive.stream, seal.process.stdin),
      pipeline(seal.process.stdout, tap, file.createWriteStream()),
      archive.completed,
      seal.completed,
    );
    const results = await Promise.all(jobs);
    success = true;
    return {
      ...results[2],
      kind: "ENCRYPTED_STORAGE_ARCHIVE_CREATED_NOT_OFFSITE_CERTIFIED",
      cipherSha256: digest.digest("hex"),
      cipherBytes,
      plaintextPersisted: false,
      sourceWrites: false,
      offsiteVerified: false,
    };
  } catch {
    throw new Error("COMUN_STORAGE_ENCRYPTED_EXPORT_FAILED");
  } finally {
    if (!success) {
      archive?.stream.destroy();
      seal?.process.kill();
      await Promise.allSettled([
        ...jobs,
        ...(archive ? [archive.completed] : []),
      ]);
      await file?.close().catch(() => {});
      if (created) await rm(output, { force: true });
    }
  }
}

export async function verifyStorageTar(input) {
  const extract = tar.extract();
  const seen = [];
  let manifest = null,
    total = 0,
    archiveBytes = 0;
  const limit = new Transform({
    transform(chunk, _encoding, done) {
      archiveBytes += chunk.length;
      if (archiveBytes > MAX_BYTES + MAX_MANIFEST + 16 * 1024 * 1024) {
        done(new Error("ARCHIVE_TOO_LARGE"));
        return;
      }
      done(null, chunk);
    },
  });
  const pumping = pipeline(input, limit, extract);
  pumping.catch(() => {});
  try {
    for await (const entry of extract) {
      entry.on("error", () => {});
      const h = entry.header;
      if (
        manifest ||
        h.type !== "file" ||
        !Number.isSafeInteger(h.size) ||
        h.size < 0
      )
        fail("ARCHIVE_INVALID");
      if (h.name === "manifest.json") {
        if (h.size > MAX_MANIFEST) fail("ARCHIVE_INVALID");
        const chunks = [];
        for await (const chunk of entry) chunks.push(chunk);
        const raw = Buffer.concat(chunks);
        manifest = {
          value: JSON.parse(raw.toString("utf8")),
          sha256: hash(raw),
        };
      } else {
        const expected = `objects/${String(seen.length + 1).padStart(6, "0")}.bin`;
        if (h.name !== expected || seen.length >= 10000 || h.size > MAX_BYTES)
          fail("ARCHIVE_INVALID");
        let size = 0;
        const digest = createHash("sha256");
        for await (const chunk of entry) {
          size += chunk.length;
          total += chunk.length;
          if (total > MAX_BYTES) fail("ARCHIVE_INVALID");
          digest.update(chunk);
        }
        if (size !== h.size) fail("ARCHIVE_INVALID");
        seen.push({ entry: expected, size, sha256: digest.digest("hex") });
      }
    }
    await pumping;
    const m = manifest?.value;
    if (
      !m ||
      Object.keys(m).sort().join() !==
        [
          "atomicSnapshot",
          "formatVersion",
          "inventoryRechecked",
          "kind",
          "objects",
        ]
          .sort()
          .join() ||
      m.formatVersion !== 1 ||
      m.kind !== "COMUN_STORAGE_STREAM" ||
      m.inventoryRechecked !== true ||
      m.atomicSnapshot !== false ||
      !Array.isArray(m.objects) ||
      m.objects.length !== seen.length
    )
      fail("MANIFEST_INVALID");
    const identities = new Set();
    for (let i = 0; i < seen.length; i++) {
      const object = m.objects[i];
      if (
        !object ||
        Object.keys(object).sort().join() !==
          ["scope", "key", "size", "etag", "entry", "sha256", "attributes"]
            .sort()
            .join() ||
        !SCOPES.includes(object.scope) ||
        typeof object.key !== "string" ||
        !object.key ||
        !etagValid(object.etag) ||
        object.entry !== seen[i].entry ||
        object.size !== seen[i].size ||
        object.sha256 !== seen[i].sha256
      )
        fail("MANIFEST_INVALID");
      attributes(object.attributes);
      const id = JSON.stringify([object.scope, object.key]);
      if (identities.has(id)) fail("MANIFEST_INVALID");
      identities.add(id);
    }
    return {
      kind: "STORAGE_ARCHIVE_INTEGRITY_VERIFIED_NOT_PROVIDER_RESTORE",
      objectCount: seen.length,
      bytes: total,
      manifestSha256: manifest.sha256,
      sourceWrites: false,
      plaintextPersisted: false,
    };
  } catch {
    extract.destroy();
    input.destroy?.();
    await pumping.catch(() => {});
    throw new Error("COMUN_STORAGE_ARCHIVE_VERIFICATION_FAILED");
  }
}

export async function verifyEncryptedStorage({
  age,
  ageSha256,
  identity,
  input,
  expectedCipherSha256,
}) {
  let decode;
  try {
    if (
      ![identity, input].every(path.isAbsolute) ||
      !/^[a-f0-9]{64}$/.test(expectedCipherSha256)
    )
      fail("OPTIONS_INVALID");
    await ageCheck(age, ageSha256);
    const digest = createHash("sha256");
    for await (const bytes of createReadStream(input)) digest.update(bytes);
    if (digest.digest("hex") !== expectedCipherSha256) fail("CIPHER_MISMATCH");
    decode = child(age, ["--decrypt", "--identity", identity, input]);
    const [evidence] = await Promise.all([
      verifyStorageTar(decode.process.stdout),
      decode.completed,
    ]);
    return { ...evidence, cipherSha256: expectedCipherSha256 };
  } catch {
    throw new Error("COMUN_STORAGE_ENCRYPTED_VERIFICATION_FAILED");
  } finally {
    if (decode?.process.exitCode === null) decode.process.kill();
  }
}

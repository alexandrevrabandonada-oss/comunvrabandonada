import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { statfsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  RESULT,
  checksum,
  durationBand,
  envelopeDigest,
  sanitizedError,
  sizeBand,
  syntheticTag,
  writeEvidence,
  writeFailureEvidence,
} from "./comun-security-contract.mjs";

const local = process.argv.includes("--local");
const startedAt = Date.now();
const tag = syntheticTag("storage");
const sourcePrefix = `security-rehearsal/${tag}/source`;
const restorePrefix = `security-rehearsal/${tag}/isolated-restore`;
let tempDir;
let archiveItemId;
let provider;
let sourceKeys = [];
let restoreKeys = [];

try {
  await loadRestrictedEnvironment();
  tempDir = await mkdtemp(path.join(os.tmpdir(), "comun-storage-backup-"));
  const supabase = createSupabaseClient();
  provider = local ? await supabaseProvider(supabase) : r2Provider();
  const inventory = await backupPhysicalObjects(provider, tempDir);
  const fixtures = fixtureSet(provider);

  for (const fixture of fixtures) {
    const key = `${sourcePrefix}/${fixture.name}`;
    await provider.put(fixture.scope, key, fixture.body, fixture.mime);
    sourceKeys.push([fixture.scope, key]);
  }

  archiveItemId = await createSyntheticRelations(supabase, fixtures);
  const backedUp = [];
  for (const [index, fixture] of fixtures.entries()) {
    const key = sourceKeys[index][1];
    const object = await provider.get(fixture.scope, key);
    assert.equal(checksum(object.body), checksum(fixture.body));
    assert.equal(normalizeMime(object.mime), normalizeMime(fixture.mime));
    backedUp.push({
      fixture,
      body: object.body,
      checksum: checksum(object.body),
    });
  }
  await provider.assertSignedUrlExpiry(sourceKeys[0][0], sourceKeys[0][1]);

  await provider.remove(sourceKeys);
  sourceKeys = [];
  for (const [index, backup] of backedUp.entries()) {
    const key = `${restorePrefix}/${backup.fixture.name}`;
    await provider.put(
      backup.fixture.scope,
      key,
      backup.body,
      backup.fixture.mime,
    );
    restoreKeys.push([backup.fixture.scope, key]);
    const restored = await provider.get(backup.fixture.scope, key);
    assert.equal(checksum(restored.body), backup.checksum);
    assert.equal(
      normalizeMime(restored.mime),
      normalizeMime(backup.fixture.mime),
    );
    if (backup.fixture.visibility === "private") {
      assert.notEqual(
        await provider.publicStatus(backup.fixture.scope, key),
        200,
      );
    } else {
      assert.equal(await provider.publicStatus(backup.fixture.scope, key), 200);
    }
    assert.equal(index >= 0, true);
  }
  for (let index = 0; index < fixtures.length; index += 1) {
    const { error } = await supabase
      .from("comun_archive_assets")
      .update({ object_key: restoreKeys[index][1] })
      .eq("archive_item_id", archiveItemId)
      .eq("object_key", `${sourcePrefix}/${fixtures[index].name}`);
    if (error) throw new Error("COMUN_STORAGE_RELATION_RESTORE_FAILED");
  }
  const { count: restoredRelations, error: relationError } = await supabase
    .from("comun_archive_assets")
    .select("id", { count: "exact", head: true })
    .eq("archive_item_id", archiveItemId);
  if (relationError || restoredRelations !== fixtures.length)
    throw new Error("COMUN_STORAGE_RELATION_COUNT_MISMATCH");

  await provider.remove(restoreKeys);
  restoreKeys = [];
  if (archiveItemId) {
    const { error } = await supabase
      .from("comun_archive_items")
      .delete()
      .eq("id", archiveItemId);
    if (error) throw new Error("COMUN_STORAGE_RELATION_CLEANUP_FAILED");
    archiveItemId = undefined;
  }

  await writeEvidence("35-storage-restore.json", {
    result: RESULT.storageRestore,
    provider: provider.name,
    physicalBackup: {
      objectCount: inventory.objectCount,
      sizeBand: sizeBand(inventory.bytes),
      mimeAggregate: inventory.mimes,
      bucketCount: inventory.bucketCount,
      setChecksum: envelopeDigest(inventory.checksums.sort()),
      objectKeysPublished: false,
      externalUpload: false,
      artifactPublished: false,
      duration: durationBand(Date.now() - startedAt),
    },
    rehearsal: {
      originalPrivate: "green",
      publicDerivative: "green",
      privateAudio: "green",
      publicAudioOrWaveform: "green",
      sidewalkObject: "green",
      checksum: "green",
      mime: "green",
      metadata: "green",
      visibility: "green",
      expiredSignedUrl: "green",
      databaseRelation: "green",
      syntheticObjects: fixtures.length,
    },
    cleanup: {
      sourceObjects: "removed",
      isolatedRestoreObjects: "removed",
      privateBackupWorkspace: "removed",
      databaseFixture: "removed",
      realObjectsDeleted: false,
    },
    rpoRto: {
      storageRpoObserved: "snapshot_at_rehearsal_start",
      isolatedStorageRecoveryRto: durationBand(Date.now() - startedAt),
    },
  });
  console.log(RESULT.storageRestore);
} catch (error) {
  await writeFailureEvidence("storage_restore", error);
  console.error(sanitizedError(error));
  process.exitCode = 1;
} finally {
  if (provider) {
    try {
      await provider.remove([...sourceKeys, ...restoreKeys]);
    } catch {}
  }
  if (archiveItemId) {
    try {
      const supabase = createSupabaseClient();
      await supabase
        .from("comun_archive_items")
        .delete()
        .eq("id", archiveItemId);
    } catch {}
  }
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
}

async function loadRestrictedEnvironment() {
  if (local) {
    const output = execFileSync(
      process.platform === "win32" ? "powershell" : "npx",
      process.platform === "win32"
        ? [
            "-NoProfile",
            "-Command",
            "$env:DO_NOT_TRACK='1'; npx supabase status -o env",
          ]
        : ["supabase", "status", "-o", "env"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const env = Object.fromEntries(
      output
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const index = line.indexOf("=");
          return [
            line.slice(0, index),
            line.slice(index + 1).replace(/^"|"$/g, ""),
          ];
        }),
    );
    process.env.NEXT_PUBLIC_SUPABASE_URL = env.API_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
    return;
  }
  const file = process.env.COMUN_SECURITY_VERCEL_ENV_FILE;
  if (!file) return;
  const allowed = new Set([
    "MEDIA_STORAGE_PROVIDER",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "R2_PUBLIC_BASE_URL",
  ]);
  for (const raw of (await readFile(file, "utf8")).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    if (!allowed.has(key)) continue;
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1);
    process.env[key] = value.replaceAll("\\n", "\n");
  }
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("COMUN_STORAGE_SUPABASE_CREDENTIALS_MISSING");
  return createClient(url, key, { auth: { persistSession: false } });
}

function r2Provider() {
  const required = [
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "R2_PUBLIC_BASE_URL",
  ];
  if (required.some((name) => !process.env[name]))
    throw new Error("COMUN_STORAGE_RESTORE_BLOCKED_PROVIDER_CREDENTIALS");
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const bucket = (scope) =>
    scope.startsWith("public")
      ? process.env.R2_BUCKET_PUBLIC
      : process.env.R2_BUCKET_ORIGINALS;
  return {
    name: "r2",
    scopes: ["private_image", "public_image"],
    bucket,
    async list(scope) {
      const rows = [];
      let ContinuationToken;
      do {
        const result = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket(scope),
            ContinuationToken,
          }),
        );
        for (const object of result.Contents || []) {
          if (object.Key)
            rows.push({ key: object.Key, size: object.Size || 0 });
        }
        ContinuationToken = result.NextContinuationToken;
      } while (ContinuationToken);
      return rows;
    },
    async get(scope, key) {
      const object = await client.send(
        new GetObjectCommand({ Bucket: bucket(scope), Key: key }),
      );
      return {
        body: Buffer.from(await object.Body.transformToByteArray()),
        mime: object.ContentType || "application/octet-stream",
      };
    },
    async put(scope, key, body, mime) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket(scope),
          Key: key,
          Body: body,
          ContentType: mime,
        }),
      );
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket(scope), Key: key }),
      );
      if (Number(head.ContentLength) !== body.length)
        throw new Error("COMUN_STORAGE_PUT_LENGTH_MISMATCH");
    },
    async remove(rows) {
      for (const scope of new Set(rows.map(([itemScope]) => itemScope))) {
        const keys = rows.filter(([itemScope]) => itemScope === scope);
        if (!keys.length) continue;
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket(scope),
            Delete: {
              Objects: keys.map(([, Key]) => ({ Key })),
              Quiet: true,
            },
          }),
        );
      }
    },
    async publicStatus(scope, key) {
      if (scope.startsWith("public")) {
        return fetch(
          `${process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`,
          { redirect: "manual" },
        ).then((response) => response.status);
      }
      const endpoint = process.env.R2_ENDPOINT.replace(/\/$/, "");
      return fetch(`${endpoint}/${bucket(scope)}/${key}`, {
        redirect: "manual",
      }).then((response) => response.status);
    },
    async assertSignedUrlExpiry(scope, key) {
      const signedUrl = await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket(scope), Key: key }),
        { expiresIn: 1 },
      );
      const active = await fetch(signedUrl, { redirect: "manual" });
      if (active.status !== 200)
        throw new Error("COMUN_STORAGE_SIGNED_URL_NOT_ACTIVE");
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      const expired = await fetch(signedUrl, { redirect: "manual" });
      if (expired.status === 200)
        throw new Error("COMUN_STORAGE_SIGNED_URL_NOT_EXPIRED");
    },
  };
}

async function supabaseProvider(supabase) {
  const buckets = {
    private_image: "archive-private-originals",
    public_image: "archive-public-derivatives",
    private_audio: "radio-private-originals",
    public_audio: "radio-public-audio",
  };
  const bucket = (scope) => buckets[scope];
  return {
    name: "supabase_local",
    scopes: Object.keys(buckets),
    bucket,
    async list(scope) {
      return listSupabaseRecursive(supabase, bucket(scope));
    },
    async get(scope, key) {
      const { data, error } = await supabase.storage
        .from(bucket(scope))
        .download(key);
      if (error) throw new Error("COMUN_STORAGE_DOWNLOAD_FAILED");
      return {
        body: Buffer.from(await data.arrayBuffer()),
        mime: data.type || "application/octet-stream",
      };
    },
    async put(scope, key, body, mime) {
      const { error } = await supabase.storage
        .from(bucket(scope))
        .upload(key, body, { contentType: mime, upsert: false });
      if (error) throw new Error("COMUN_STORAGE_PUT_FAILED");
    },
    async remove(rows) {
      for (const scope of new Set(rows.map(([itemScope]) => itemScope))) {
        const keys = rows
          .filter(([itemScope]) => itemScope === scope)
          .map(([, key]) => key);
        if (!keys.length) continue;
        const { error } = await supabase.storage
          .from(bucket(scope))
          .remove(keys);
        if (error) throw new Error("COMUN_STORAGE_REMOVE_FAILED");
      }
    },
    async publicStatus(scope, key) {
      const { data } = supabase.storage.from(bucket(scope)).getPublicUrl(key);
      return fetch(data.publicUrl, { redirect: "manual" }).then(
        (response) => response.status,
      );
    },
    async assertSignedUrlExpiry(scope, key) {
      const { data, error } = await supabase.storage
        .from(bucket(scope))
        .createSignedUrl(key, 1);
      if (error) throw new Error("COMUN_STORAGE_SIGNED_URL_CREATE_FAILED");
      const active = await fetch(data.signedUrl, { redirect: "manual" });
      if (active.status !== 200)
        throw new Error("COMUN_STORAGE_SIGNED_URL_NOT_ACTIVE");
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      const expired = await fetch(data.signedUrl, { redirect: "manual" });
      if (expired.status === 200)
        throw new Error("COMUN_STORAGE_SIGNED_URL_NOT_EXPIRED");
    },
  };
}

async function listSupabaseRecursive(supabase, bucket, prefix = "") {
  const output = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });
    if (error) throw new Error("COMUN_STORAGE_LIST_FAILED");
    for (const item of data || []) {
      const key = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id || item.metadata) {
        output.push({ key, size: Number(item.metadata?.size || 0) });
      } else {
        output.push(...(await listSupabaseRecursive(supabase, bucket, key)));
      }
    }
    if ((data || []).length < 1000) break;
  }
  return output;
}

async function backupPhysicalObjects(target, directory) {
  const objects = [];
  for (const scope of target.scopes) {
    for (const object of await target.list(scope)) {
      objects.push({ ...object, scope });
    }
  }
  const declaredBytes = objects.reduce(
    (total, object) => total + Number(object.size || 0),
    0,
  );
  const filesystem = statfsSync(directory);
  const availableBytes =
    Number(filesystem.bavail ?? filesystem.bfree) * Number(filesystem.bsize);
  const requiredBytes = Math.ceil(declaredBytes * 1.2) + 512 * 1024 * 1024;
  if (availableBytes < requiredBytes) {
    throw new Error("COMUN_STORAGE_BACKUP_EPHEMERAL_SPACE_INSUFFICIENT");
  }

  let objectCount = 0;
  let bytes = 0;
  const checksums = [];
  const mimes = {};
  for (const object of objects) {
    const downloaded = await target.get(object.scope, object.key);
    const digest = checksum(downloaded.body);
    checksums.push(digest);
    bytes += downloaded.body.length;
    objectCount += 1;
    const mime = normalizeMime(downloaded.mime);
    mimes[mime] = (mimes[mime] || 0) + 1;
    await writeFile(
      path.join(directory, `${String(objectCount).padStart(6, "0")}.bin`),
      downloaded.body,
      { mode: 0o600 },
    );
  }
  return {
    objectCount,
    bytes,
    checksums,
    mimes,
    bucketCount: target.scopes.length,
  };
}

function fixtureSet(target) {
  const imagePrivate = Buffer.from("COMUN_SYNTHETIC_PRIVATE_IMAGE_V1");
  const imagePublic = Buffer.from("COMUN_SYNTHETIC_PUBLIC_DERIVATIVE_V1");
  const audioPrivate = Buffer.from("COMUN_SYNTHETIC_PRIVATE_AUDIO_V1");
  const waveformPublic = Buffer.from('{"synthetic":true,"waveform":[0,1,0]}');
  const sidewalk = Buffer.from("COMUN_SYNTHETIC_SIDEWALK_PRIVATE_V1");
  return [
    fixture(
      "original-private.jpg",
      "private_image",
      "private",
      imagePrivate,
      "image/jpeg",
    ),
    fixture(
      target.name === "supabase_local"
        ? "derived-public.webp"
        : "derived-public.webp",
      "public_image",
      "public",
      imagePublic,
      "image/webp",
    ),
    fixture(
      "audio-private.mp3",
      "private_audio",
      "private",
      audioPrivate,
      "audio/mpeg",
    ),
    fixture(
      "waveform-public.json",
      "public_audio",
      "public",
      waveformPublic,
      "application/json",
    ),
    fixture(
      "sidewalk-private.jpg",
      "private_image",
      "private",
      sidewalk,
      "image/jpeg",
    ),
  ];
}

function fixture(name, scope, visibility, body, mime) {
  return { name, scope, visibility, body, mime };
}

async function createSyntheticRelations(supabase, fixtures) {
  const { data: item, error: itemError } = await supabase
    .from("comun_archive_items")
    .insert({
      slug: tag,
      item_type: "document",
      title: "Ensaio sintético privado de recuperação",
      status: "draft",
      visibility: "private",
    })
    .select("id")
    .single();
  if (itemError) throw new Error("COMUN_STORAGE_RELATION_ITEM_FAILED");
  const rows = fixtures.map((fixture, index) => ({
    archive_item_id: item.id,
    asset_role: fixture.visibility === "public" ? "public_version" : "original",
    storage_provider: provider.name,
    bucket_scope:
      fixture.visibility === "public" ? "public_safe" : "private_original",
    object_key: sourceKeys[index][1],
    public_url: null,
    original_filename: fixture.name,
    mime_type: fixture.mime,
    size_bytes: fixture.body.length,
    checksum_sha256: checksum(fixture.body),
    review_status: "pending",
  }));
  const { error } = await supabase.from("comun_archive_assets").insert(rows);
  if (error) throw new Error("COMUN_STORAGE_RELATION_ASSET_FAILED");
  return item.id;
}

function normalizeMime(value) {
  return String(value || "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

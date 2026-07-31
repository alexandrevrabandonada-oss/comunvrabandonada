import { createHash } from "node:crypto";
import { mkdtemp, rm, statfs, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const RESULT = "COMUN_STORAGE_RESTORE_REHEARSAL_GREEN";
const required = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_BUCKET_ORIGINALS",
  "R2_BUCKET_PUBLIC",
  "R2_PUBLIC_BASE_URL",
] as const;

type Scope = "private" | "public";
type Fixture = {
  name: string;
  scope: Scope;
  visibility: Scope;
  body: Buffer;
  mime: string;
};

export async function runRuntimeStorageRestoreRehearsal(attemptId: string) {
  if (required.some((name) => !process.env[name]))
    throw new Error("COMUN_STORAGE_RUNTIME_CREDENTIALS_MISSING");
  const database = createServiceSupabaseClient();
  if (!database)
    throw new Error("COMUN_STORAGE_RUNTIME_DATABASE_CREDENTIALS_MISSING");

  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const bucket = (scope: Scope) =>
    scope === "public"
      ? process.env.R2_BUCKET_PUBLIC!
      : process.env.R2_BUCKET_ORIGINALS!;
  const tag = attemptId.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
  const sourcePrefix = `security-rehearsal/${tag}/source`;
  const restorePrefix = `security-rehearsal/${tag}/isolated-restore`;
  const fixtures: Fixture[] = [
    fixture("original-private.jpg", "private", "image/jpeg"),
    fixture("derived-public.webp", "public", "image/webp"),
    fixture("audio-private.mp3", "private", "audio/mpeg"),
    fixture("waveform-public.json", "public", "application/json"),
    fixture("sidewalk-private.jpg", "private", "image/jpeg"),
  ];
  const sourceObjects = fixtures.map((item) => ({
    scope: item.scope,
    key: `${sourcePrefix}/${item.name}`,
  }));
  const restoreObjects = fixtures.map((item) => ({
    scope: item.scope,
    key: `${restorePrefix}/${item.name}`,
  }));
  const syntheticObjects = [...sourceObjects, ...restoreObjects];
  const startedAt = Date.now();
  let temporaryDirectory: string | undefined;
  let archiveItemId: string | undefined;

  try {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "comun-storage-rehearsal-"),
    );
    const inventory = await backupInventory(client, bucket, temporaryDirectory);
    await removeObjects(client, bucket, syntheticObjects);

    for (const [index, item] of fixtures.entries())
      await putVerified(
        client,
        bucket(item.scope),
        sourceObjects[index].key,
        item,
      );

    const backedUp = [];
    for (const [index, item] of fixtures.entries()) {
      const downloaded = await getObject(
        client,
        bucket(item.scope),
        sourceObjects[index].key,
      );
      if (
        digest(downloaded.body) !== digest(item.body) ||
        normalizeMime(downloaded.mime) !== normalizeMime(item.mime)
      )
        throw new Error("COMUN_STORAGE_RUNTIME_SOURCE_INTEGRITY_FAILED");
      backedUp.push({ ...downloaded, checksum: digest(downloaded.body) });
    }

    await assertSignedUrlExpiry(
      client,
      bucket("private"),
      sourceObjects[0].key,
    );
    archiveItemId = await createRelations(
      database,
      tag,
      fixtures,
      sourceObjects,
    );
    await removeObjects(client, bucket, sourceObjects);

    for (const [index, item] of fixtures.entries()) {
      await putVerified(
        client,
        bucket(item.scope),
        restoreObjects[index].key,
        {
          ...item,
          body: backedUp[index].body,
        },
      );
      const restored = await getObject(
        client,
        bucket(item.scope),
        restoreObjects[index].key,
      );
      if (digest(restored.body) !== backedUp[index].checksum)
        throw new Error("COMUN_STORAGE_RUNTIME_RESTORE_CHECKSUM_FAILED");
      await assertVisibility(
        item.visibility,
        bucket(item.scope),
        restoreObjects[index].key,
      );
    }

    for (const index of fixtures.keys()) {
      const { error } = await database
        .from("comun_archive_assets")
        .update({ object_key: restoreObjects[index].key })
        .eq("archive_item_id", archiveItemId)
        .eq("object_key", sourceObjects[index].key);
      if (error)
        throw new Error("COMUN_STORAGE_RUNTIME_RELATION_RESTORE_FAILED");
    }
    const { count, error: countError } = await database
      .from("comun_archive_assets")
      .select("id", { count: "exact", head: true })
      .eq("archive_item_id", archiveItemId);
    if (countError || count !== fixtures.length)
      throw new Error("COMUN_STORAGE_RUNTIME_RELATION_COUNT_FAILED");

    await removeObjects(client, bucket, restoreObjects);
    const { error: cleanupError } = await database
      .from("comun_archive_items")
      .delete()
      .eq("id", archiveItemId);
    if (cleanupError)
      throw new Error("COMUN_STORAGE_RUNTIME_RELATION_CLEANUP_FAILED");
    archiveItemId = undefined;

    return {
      result: RESULT,
      provider: "r2_runtime",
      physicalBackup: {
        objectCount: inventory.objectCount,
        sizeBand: sizeBand(inventory.bytes),
        mimeAggregate: inventory.mimes,
        bucketCount: 2,
        setChecksum: digest(
          Buffer.from(inventory.checksums.sort().join(":"), "utf8"),
        ),
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
      evidenceBoundary: {
        objectKeysExposed: false,
        credentialsExposed: false,
        realNotificationsSent: false,
      },
    };
  } finally {
    await removeObjects(client, bucket, syntheticObjects).catch(() => {});
    if (archiveItemId) {
      try {
        await database
          .from("comun_archive_items")
          .delete()
          .eq("id", archiveItemId);
      } catch {}
    }
    if (temporaryDirectory)
      await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function fixture(name: string, scope: Scope, mime: string): Fixture {
  const body =
    name === "waveform-public.json"
      ? Buffer.from('{"synthetic":true,"waveform":[0,1,0]}')
      : Buffer.from(`COMUN_SYNTHETIC_${name.toUpperCase()}_V1`);
  return { name, scope, visibility: scope, body, mime };
}

async function backupInventory(
  client: S3Client,
  bucket: (scope: Scope) => string,
  directory: string,
) {
  const objects: Array<{ scope: Scope; key: string; size: number }> = [];
  for (const scope of ["private", "public"] as const) {
    let continuationToken: string | undefined;
    do {
      const listed = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket(scope),
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of listed.Contents ?? [])
        if (object.Key)
          objects.push({
            scope,
            key: object.Key,
            size: Number(object.Size ?? 0),
          });
      continuationToken = listed.NextContinuationToken;
    } while (continuationToken);
  }
  const declaredBytes = objects.reduce((sum, item) => sum + item.size, 0);
  const filesystem = await statfs(directory);
  const availableBytes = Number(filesystem.bavail) * Number(filesystem.bsize);
  if (
    declaredBytes > 256 * 1024 * 1024 ||
    availableBytes < Math.ceil(declaredBytes * 1.2) + 64 * 1024 * 1024
  )
    throw new Error("COMUN_STORAGE_RUNTIME_EPHEMERAL_SPACE_INSUFFICIENT");

  const checksums: string[] = [];
  const mimes: Record<string, number> = {};
  let bytes = 0;
  for (const [index, object] of objects.entries()) {
    const downloaded = await getObject(
      client,
      bucket(object.scope),
      object.key,
    );
    checksums.push(digest(downloaded.body));
    bytes += downloaded.body.length;
    const mime = normalizeMime(downloaded.mime);
    mimes[mime] = (mimes[mime] ?? 0) + 1;
    await writeFile(
      path.join(directory, `${String(index + 1).padStart(6, "0")}.bin`),
      downloaded.body,
      { mode: 0o600 },
    );
  }
  return { objectCount: objects.length, bytes, checksums, mimes };
}

async function putVerified(
  client: S3Client,
  bucket: string,
  key: string,
  fixture: Fixture,
) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fixture.body,
      ContentType: fixture.mime,
    }),
  );
  const head = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (
    Number(head.ContentLength) !== fixture.body.length ||
    normalizeMime(head.ContentType) !== normalizeMime(fixture.mime)
  )
    throw new Error("COMUN_STORAGE_RUNTIME_PUT_INTEGRITY_FAILED");
}

async function getObject(client: S3Client, bucket: string, key: string) {
  const object = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!object.Body)
    throw new Error("COMUN_STORAGE_RUNTIME_OBJECT_BODY_MISSING");
  return {
    body: Buffer.from(await object.Body.transformToByteArray()),
    mime: object.ContentType ?? "application/octet-stream",
  };
}

async function removeObjects(
  client: S3Client,
  bucket: (scope: Scope) => string,
  objects: Array<{ scope: Scope; key: string }>,
) {
  for (const scope of ["private", "public"] as const) {
    const selected = objects.filter((item) => item.scope === scope);
    if (!selected.length) continue;
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket(scope),
        Delete: {
          Objects: selected.map((item) => ({ Key: item.key })),
          Quiet: true,
        },
      }),
    );
  }
}

async function assertSignedUrlExpiry(
  client: S3Client,
  bucket: string,
  key: string,
) {
  const signed = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 1 },
  );
  const active = await fetch(signed, {
    redirect: "manual",
    signal: AbortSignal.timeout(5_000),
  });
  if (active.status !== 200)
    throw new Error("COMUN_STORAGE_RUNTIME_SIGNED_URL_NOT_ACTIVE");
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  const expired = await fetch(signed, {
    redirect: "manual",
    signal: AbortSignal.timeout(5_000),
  });
  if (expired.status === 200)
    throw new Error("COMUN_STORAGE_RUNTIME_SIGNED_URL_NOT_EXPIRED");
}

async function assertVisibility(
  visibility: Scope,
  bucket: string,
  key: string,
) {
  const base =
    visibility === "public"
      ? process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "")
      : `${process.env.R2_ENDPOINT!.replace(/\/$/, "")}/${bucket}`;
  const response = await fetch(`${base}/${key}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(5_000),
  });
  if (
    (visibility === "public" && response.status !== 200) ||
    (visibility === "private" && response.status === 200)
  )
    throw new Error("COMUN_STORAGE_RUNTIME_VISIBILITY_FAILED");
}

async function createRelations(
  database: NonNullable<ReturnType<typeof createServiceSupabaseClient>>,
  tag: string,
  fixtures: Fixture[],
  objects: Array<{ key: string }>,
) {
  const { data: item, error: itemError } = await database
    .from("comun_archive_items")
    .insert({
      slug: `security-${tag}`.slice(0, 100),
      item_type: "document",
      title: "Ensaio sintético privado de recuperação",
      status: "draft",
      visibility: "private",
    })
    .select("id")
    .single();
  if (itemError || !item)
    throw new Error("COMUN_STORAGE_RUNTIME_RELATION_ITEM_FAILED");
  const { error } = await database.from("comun_archive_assets").insert(
    fixtures.map((fixture, index) => ({
      archive_item_id: item.id,
      asset_role:
        fixture.visibility === "public" ? "public_version" : "original",
      storage_provider: "r2",
      bucket_scope:
        fixture.visibility === "public" ? "public_safe" : "private_original",
      object_key: objects[index].key,
      public_url: null,
      original_filename: fixture.name,
      mime_type: fixture.mime,
      size_bytes: fixture.body.length,
      checksum_sha256: digest(fixture.body),
      review_status: "pending",
    })),
  );
  if (error)
    throw new Error("COMUN_STORAGE_RUNTIME_RELATION_ASSET_FAILED");
  return item.id as string;
}

function digest(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeMime(value: string | undefined) {
  return String(value ?? "application/octet-stream")
    .split(";")[0]
    .trim()
    .toLowerCase();
}

function sizeBand(bytes: number) {
  if (bytes === 0) return "empty";
  if (bytes < 1024 * 1024) return "under_1_mib";
  if (bytes < 100 * 1024 * 1024) return "1_to_100_mib";
  return "100_mib_or_more";
}

function durationBand(milliseconds: number) {
  if (milliseconds < 60_000) return "under_1_minute";
  if (milliseconds < 5 * 60_000) return "1_to_5_minutes";
  return "over_5_minutes";
}

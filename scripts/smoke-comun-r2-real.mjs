import { randomUUID } from "node:crypto";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadLocalEnv } from "./env-loader.mjs";
loadLocalEnv();
if (process.env.RUN_REAL_R2_SMOKE !== "true")
  throw new Error(
    "Smoke R2 real bloqueado. Defina RUN_REAL_R2_SMOKE=true explicitamente.",
  );
const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "R2_PUBLIC_BASE_URL",
  ],
  missing = required.filter((key) => !process.env[key]);
if (missing.length)
  throw new Error(`Configuracao R2 incompleta: ${missing.join(", ")}`);
const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  }),
  privateBucket = process.env.R2_BUCKET_ORIGINALS,
  publicBucket = process.env.R2_BUCKET_PUBLIC,
  base = process.env.R2_PUBLIC_BASE_URL.replace(/\/$/, "");
const key = `smoke/${Date.now()}/${randomUUID()}.pdf`,
  fixture = new TextEncoder().encode("COMUN R2 real smoke");
let privateCreated = false,
  publicCreated = false;
const ok = (message) => console.log(`[ok] ${message}`);
const head = async (Bucket) =>
  client.send(new HeadObjectCommand({ Bucket, Key: key }));
try {
  await client.send(
    new PutObjectCommand({
      Bucket: privateBucket,
      Key: key,
      Body: fixture,
      ContentType: "application/pdf",
      CacheControl: "private, no-store",
    }),
  );
  privateCreated = true;
  ok("fixture privada gravada");
  let metadata = await head(privateBucket);
  if (
    metadata.ContentLength !== fixture.byteLength ||
    metadata.ContentType !== "application/pdf"
  )
    throw new Error("Metadata privada invalida.");
  ok("existencia e metadata privadas confirmadas");
  const signed = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: privateBucket, Key: key }),
    { expiresIn: 60 },
  );
  const privateRead = await fetch(signed, { cache: "no-store" });
  if (
    !privateRead.ok ||
    new Uint8Array(await privateRead.arrayBuffer()).length !==
      fixture.byteLength
  )
    throw new Error("Leitura privada temporaria falhou.");
  if (`${base}/${key}` === signed)
    throw new Error("Original recebeu URL publica permanente.");
  ok("leitura privada temporaria confirmada");
  await client.send(
    new CopyObjectCommand({
      Bucket: publicBucket,
      Key: key,
      CopySource: `${privateBucket}/${key}`,
      ContentType: "application/pdf",
      MetadataDirective: "REPLACE",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  publicCreated = true;
  metadata = await head(publicBucket);
  if (metadata.ContentType !== "application/pdf")
    throw new Error("Content-Type publico invalido.");
  const publicRead = await fetch(`${base}/${key}`, { cache: "no-store" });
  if (
    !publicRead.ok ||
    new Uint8Array(await publicRead.arrayBuffer()).length !== fixture.byteLength
  )
    throw new Error("Leitura publica falhou.");
  ok("copia e leitura publicas confirmadas");
} finally {
  if (publicCreated)
    await client
      .send(new DeleteObjectCommand({ Bucket: publicBucket, Key: key }))
      .catch(() => {});
  if (privateCreated)
    await client
      .send(new DeleteObjectCommand({ Bucket: privateBucket, Key: key }))
      .catch(() => {});
  for (const [Bucket, label] of [
    [publicBucket, "publico"],
    [privateBucket, "privado"],
  ]) {
    try {
      await head(Bucket);
      throw new Error(`Objeto ${label} orfao apos cleanup.`);
    } catch (error) {
      if (error?.$metadata?.httpStatusCode !== 404) throw error;
    }
  }
  ok("objetos de smoke excluidos");
}

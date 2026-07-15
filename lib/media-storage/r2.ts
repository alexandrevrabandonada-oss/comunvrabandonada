import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  BucketScope,
  MediaObjectSummary,
  MediaStorageProvider,
  UploadUrlInput,
} from "./types";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/ogg",
]);
const EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/pdf": ["pdf"],
  "audio/mpeg": ["mp3"],
  "audio/mp4": ["mp4", "m4a"],
  "audio/x-m4a": ["m4a"],
  "audio/wav": ["wav"],
  "audio/ogg": ["ogg"],
};
const PREFIXES = ["originals/", "public/", "smoke/", "radio-originals/", "radio-public/"];
let client: S3Client | null = null;

function config() {
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length)
    throw new Error(`R2 nao configurado: ${missing.join(", ")}`);
  return {
    endpoint: process.env.R2_ENDPOINT!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    originals: process.env.R2_BUCKET_ORIGINALS!,
    public: process.env.R2_BUCKET_PUBLIC!,
  };
}
function getClient() {
  const c = config();
  return (client ??= new S3Client({
    region: "auto",
    endpoint: c.endpoint,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
  }));
}
function bucket(scope: BucketScope) {
  const c = config();
  return scope === "private_original" || scope === "radio_private_original" ? c.originals : c.public;
}
function safeKey(key: string) {
  if (
    !key ||
    key.includes("..") ||
    key.startsWith("/") ||
    !PREFIXES.some((prefix) => key.startsWith(prefix))
  )
    throw new Error("Object key invalida.");
  return key;
}

export function validateMediaUpload(input: UploadUrlInput) {
  if (!ALLOWED.has(input.contentType))
    throw new Error("Tipo de arquivo nao permitido.");
  const ext = input.key.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONS[input.contentType]?.includes(ext))
    throw new Error("Extensao incompativel com o MIME informado.");
  const max =
    input.contentType.startsWith("audio/")
      ? 500 * 1024 * 1024
      : input.contentType === "application/pdf"
      ? 50 * 1024 * 1024
      : input.key.includes("/cover/")
        ? 10 * 1024 * 1024
        : 25 * 1024 * 1024;
  if (input.sizeBytes < 1 || input.sizeBytes > max)
    throw new Error("Arquivo excede o limite permitido.");
  if (
    input.scope === "private_original" &&
    !input.key.startsWith("originals/") &&
    !input.key.startsWith("smoke/")
  )
    throw new Error("Original deve usar o prefixo originals/.");
  if (
    input.scope === "public_safe" &&
    !input.key.startsWith("public/") &&
    !input.key.startsWith("smoke/")
  )
    throw new Error("Versao publica deve usar o prefixo public/.");
}

export class R2MediaStorageProvider implements MediaStorageProvider {
  async createUploadTarget(input:UploadUrlInput){const x=await this.createUploadUrl(input);return{...x,key:input.key}}
  async confirmUpload(scope:BucketScope,key:string){const x=await this.getObjectMetadata(scope,key);if(!x)throw new Error("Objeto não encontrado.");return x}
  async headObject(scope:BucketScope,key:string){return this.getObjectMetadata(scope,key)}
  async readObject(_scope:BucketScope,_key:string):Promise<Uint8Array>{throw new Error("Leitura binária R2 não habilitada neste fluxo local.")}
  async writeDerivative(input:UploadUrlInput&{body:Uint8Array}){return this.putObject(input)}
  async removeObject(scope:BucketScope,key:string){return this.deleteObject(scope,key)}
  async listFixtureScopeForCleanup(prefix:string){return[...(await this.listObjects("private_original",prefix)),...(await this.listObjects("public_safe",prefix))]}
  createPublicDerivativeUrl(key:string){const base=process.env.R2_PUBLIC_BASE_URL;if(!base)throw new Error("R2_PUBLIC_BASE_URL nao configurada.");return`${base.replace(/\/$/,"")}/${safeKey(key)}`}
  async createUploadUrl(input: UploadUrlInput) {
    validateMediaUpload(input);
    const expiresIn = Math.min(input.expiresIn ?? 600, 900);
    const url = await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: bucket(input.scope),
        Key: safeKey(input.key),
        ContentType: input.contentType,
        ContentLength: input.sizeBytes,
        CacheControl:
          input.scope === "public_safe"
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
      }),
      { expiresIn },
    );
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000) };
  }
  async createPrivateReadUrl(key: string, expiresIn = 300) {
    const ttl = Math.min(expiresIn, 900);
    const url = await getSignedUrl(
      getClient(),
      new GetObjectCommand({
        Bucket: bucket("private_original"),
        Key: safeKey(key),
        ResponseCacheControl: "private, no-store",
      }),
      { expiresIn: ttl },
    );
    return { url, expiresAt: new Date(Date.now() + ttl * 1000) };
  }
  async putObject(input: UploadUrlInput & { body: Uint8Array }) {
    validateMediaUpload(input);
    await getClient().send(
      new PutObjectCommand({
        Bucket: bucket(input.scope),
        Key: safeKey(input.key),
        Body: input.body,
        ContentType: input.contentType,
        ContentLength: input.sizeBytes,
        CacheControl:
          input.scope === "public_safe"
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
      }),
    );
  }
  async deleteObject(scope: BucketScope, key: string) {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucket(scope), Key: safeKey(key) }),
    );
  }
  async copyObject(
    sourceScope: BucketScope,
    sourceKey: string,
    destinationScope: BucketScope,
    destinationKey: string,
  ) {
    await getClient().send(
      new CopyObjectCommand({
        Bucket: bucket(destinationScope),
        Key: safeKey(destinationKey),
        CopySource: `${bucket(sourceScope)}/${encodeURIComponent(safeKey(sourceKey)).replace(/%2F/g, "/")}`,
        MetadataDirective: "COPY",
        CacheControl:
          destinationScope === "public_safe"
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
      }),
    );
  }
  async objectExists(scope: BucketScope, key: string) {
    return (await this.getObjectMetadata(scope, key)) !== null;
  }
  async getObjectMetadata(scope: BucketScope, key: string) {
    try {
      const r = await getClient().send(
        new HeadObjectCommand({ Bucket: bucket(scope), Key: safeKey(key) }),
      );
      return {
        contentType: r.ContentType,
        contentLength: r.ContentLength,
        checksum: r.ChecksumSHA256,
        lastModified: r.LastModified,
        etag: r.ETag,
      };
    } catch (e) {
      if (
        (e as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      )
        return null;
      throw e;
    }
  }
  async listObjects(scope: BucketScope, prefix: string) {
    safeKey(prefix);
    const objects: MediaObjectSummary[] = [];
    let token: string | undefined;
    do {
      const r = await getClient().send(
        new ListObjectsV2Command({
          Bucket: bucket(scope),
          Prefix: prefix,
          ContinuationToken: token,
        }),
      );
      for (const item of r.Contents ?? []) {
        if (item.Key)
          objects.push({
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
            etag: item.ETag,
          });
      }
      token = r.IsTruncated ? r.NextContinuationToken : undefined;
    } while (token);
    return objects;
  }
}

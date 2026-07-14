import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { BucketScope, MediaStorageProvider, UploadUrlInput } from "./types";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const EXTENSIONS: Record<string, string[]> = { "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/webp": ["webp"], "application/pdf": ["pdf"] };
let client: S3Client | null = null;

function config() {
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT", "R2_BUCKET_ORIGINALS", "R2_BUCKET_PUBLIC"] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`R2 nao configurado: ${missing.join(", ")}`);
  return { endpoint: process.env.R2_ENDPOINT!, accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!, originals: process.env.R2_BUCKET_ORIGINALS!, public: process.env.R2_BUCKET_PUBLIC! };
}
function getClient() { const c=config(); return client ??= new S3Client({ region: "auto", endpoint: c.endpoint, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } }); }
function bucket(scope: BucketScope) { const c=config(); return scope === "private_original" ? c.originals : c.public; }
function validate(input: UploadUrlInput) {
  if (!ALLOWED.has(input.contentType)) throw new Error("Tipo de arquivo nao permitido.");
  const ext=input.key.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONS[input.contentType]?.includes(ext)) throw new Error("Extensao incompatível com o MIME informado.");
  const max=input.contentType === "application/pdf" ? 50*1024*1024 : input.key.includes("/cover/") ? 10*1024*1024 : 25*1024*1024;
  if (input.sizeBytes < 1 || input.sizeBytes > max) throw new Error("Arquivo excede o limite permitido.");
  if (input.scope === "private_original" && !input.key.startsWith("originals/")) throw new Error("Original deve usar o prefixo originals/.");
}
function safeKey(key: string) { if (!key || key.includes("..") || key.startsWith("/")) throw new Error("Object key invalida."); return key; }

export class R2MediaStorageProvider implements MediaStorageProvider {
  async createUploadUrl(input: UploadUrlInput) { validate(input); const expiresIn=Math.min(input.expiresIn ?? 600, 900); const url=await getSignedUrl(getClient(),new PutObjectCommand({Bucket:bucket(input.scope),Key:safeKey(input.key),ContentType:input.contentType,ContentLength:input.sizeBytes}),{expiresIn}); return {url,expiresAt:new Date(Date.now()+expiresIn*1000)}; }
  async createPrivateReadUrl(key: string, expiresIn=300) { const { GetObjectCommand }=await import("@aws-sdk/client-s3"); const ttl=Math.min(expiresIn,900); const url=await getSignedUrl(getClient(),new GetObjectCommand({Bucket:bucket("private_original"),Key:safeKey(key)}),{expiresIn:ttl}); return {url,expiresAt:new Date(Date.now()+ttl*1000)}; }
  async putObject(input: UploadUrlInput & {body: Uint8Array}) { validate(input); await getClient().send(new PutObjectCommand({Bucket:bucket(input.scope),Key:safeKey(input.key),Body:input.body,ContentType:input.contentType,ContentLength:input.sizeBytes})); }
  async deleteObject(scope: BucketScope,key:string){await getClient().send(new DeleteObjectCommand({Bucket:bucket(scope),Key:safeKey(key)}));}
  async copyObject(sourceScope:BucketScope,sourceKey:string,destinationScope:BucketScope,destinationKey:string){await getClient().send(new CopyObjectCommand({Bucket:bucket(destinationScope),Key:safeKey(destinationKey),CopySource:`${bucket(sourceScope)}/${encodeURIComponent(safeKey(sourceKey)).replace(/%2F/g,"/")}`}));}
  async objectExists(scope:BucketScope,key:string){return (await this.getObjectMetadata(scope,key))!==null;}
  async getObjectMetadata(scope:BucketScope,key:string){try{const r=await getClient().send(new HeadObjectCommand({Bucket:bucket(scope),Key:safeKey(key)})); return {contentType:r.ContentType,contentLength:r.ContentLength,checksum:r.ChecksumSHA256,lastModified:r.LastModified,etag:r.ETag};}catch(e){if((e as {$metadata?:{httpStatusCode?:number}}).$metadata?.httpStatusCode===404)return null;throw e;}}
}

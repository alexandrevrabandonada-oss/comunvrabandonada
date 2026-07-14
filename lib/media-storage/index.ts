import { R2MediaStorageProvider } from "./r2";
export type {
  BucketScope,
  MediaStorageProvider,
  MediaObjectMetadata,
  MediaObjectSummary,
  UploadUrlInput,
} from "./types";
let storage: R2MediaStorageProvider | null = null;
export function getMediaStorage() {
  return (storage ??= new R2MediaStorageProvider());
}
export function publicMediaUrl(key: string) {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) throw new Error("R2_PUBLIC_BASE_URL nao configurada.");
  return `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
export function mediaStorageConfiguration() {
  const keys = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_ENDPOINT",
    "R2_BUCKET_ORIGINALS",
    "R2_BUCKET_PUBLIC",
    "R2_PUBLIC_BASE_URL",
  ] as const;
  const missing = keys.filter((key) => !process.env[key]);
  return {
    configured: missing.length === 0,
    missing,
    provider: "r2",
    publicBaseUrlConfigured: Boolean(process.env.R2_PUBLIC_BASE_URL),
  };
}

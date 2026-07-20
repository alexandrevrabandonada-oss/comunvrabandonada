import { R2MediaStorageProvider } from "./r2";
import { SupabaseLocalStorageProvider } from "./supabase-local";
import { FixtureStorageProvider } from "./fixture";
import type { MediaStorageProvider } from "./types";
export type {
  BucketScope,
  MediaStorageProvider,
  MediaObjectMetadata,
  MediaObjectSummary,
  UploadUrlInput,
} from "./types";
let storage: MediaStorageProvider | null = null;
const VALID_PROVIDERS = ["r2", "supabase-local", "fixture"] as const;
export type MediaStorageProviderName = (typeof VALID_PROVIDERS)[number];
export function resolveMediaStorageProvider(
  env: Partial<Pick<NodeJS.ProcessEnv, "MEDIA_STORAGE_PROVIDER" | "NODE_ENV">>,
): MediaStorageProviderName {
  const selected = env.MEDIA_STORAGE_PROVIDER || (env.NODE_ENV === "test" ? "fixture" : "r2");
  if (!VALID_PROVIDERS.includes(selected as MediaStorageProviderName))
    throw new Error(`MEDIA_STORAGE_PROVIDER inválido: "${selected}". Valores aceitos: ${VALID_PROVIDERS.join(", ")}.`);
  if (selected === "fixture" && env.NODE_ENV === "production")
    throw new Error('MEDIA_STORAGE_PROVIDER "fixture" é proibido em produção; use apenas no contrato de testes.');
  return selected as MediaStorageProviderName;
}
export function getMediaStorage() {
  if(storage)return storage;const selected=resolveMediaStorageProvider(process.env);
  if(selected==="supabase-local")storage=new SupabaseLocalStorageProvider();else if(selected==="fixture")storage=new FixtureStorageProvider();else storage=new R2MediaStorageProvider();return storage;
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

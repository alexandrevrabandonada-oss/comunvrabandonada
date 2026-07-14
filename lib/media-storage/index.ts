import { R2MediaStorageProvider } from "./r2";
export type { BucketScope, MediaStorageProvider, MediaObjectMetadata, UploadUrlInput } from "./types";
let storage: R2MediaStorageProvider | null = null;
export function getMediaStorage() { return storage ??= new R2MediaStorageProvider(); }
export function publicMediaUrl(key: string) { const base=process.env.R2_PUBLIC_BASE_URL; if(!base) throw new Error("R2_PUBLIC_BASE_URL nao configurada."); return `${base.replace(/\/$/,"")}/${key.split("/").map(encodeURIComponent).join("/")}`; }

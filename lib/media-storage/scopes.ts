import type { BucketScope } from "./types";

// Database visibility and physical storage buckets are separate contracts.
export function archiveBucketScope(scope: BucketScope): "private_original" | "public_safe" {
  return scope === "private_original" || scope === "radio_private_original"
    ? "private_original"
    : "public_safe";
}

export function resolveStorageScope(scope: BucketScope, key: string): BucketScope {
  if (scope === "private_original" && key.startsWith("radio-originals/"))
    return "radio_private_original";
  if (scope === "public_safe" && key.startsWith("radio-public/"))
    return "radio_public";
  return scope;
}

export type StorageInventoryPage = {
  IsTruncated?: boolean;
  NextContinuationToken?: string;
  KeyCount?: number;
  Contents?: Array<{ Key?: string; Size?: number }>;
};
export function listCompleteStorageScope(
  listPage: (cursor: string | undefined) => Promise<StorageInventoryPage>,
  limits?: { maxPages?: number; maxObjects?: number },
): Promise<Array<{ key: string; size: number }>>;
export function assertStorageObjectLength(
  declaredSize: number,
  downloadedSize: number,
): void;

export type BucketScope = "private_original" | "public_safe";
export type MediaObjectMetadata = {
  contentType?: string;
  contentLength?: number;
  checksum?: string;
  lastModified?: Date;
  etag?: string;
};
export type MediaObjectSummary = {
  key: string;
  size?: number;
  lastModified?: Date;
  etag?: string;
};
export type UploadUrlInput = {
  scope: BucketScope;
  key: string;
  contentType: string;
  sizeBytes: number;
  expiresIn?: number;
};

export interface MediaStorageProvider {
  createUploadUrl(
    input: UploadUrlInput,
  ): Promise<{ url: string; expiresAt: Date }>;
  createPrivateReadUrl(
    key: string,
    expiresIn?: number,
  ): Promise<{ url: string; expiresAt: Date }>;
  putObject(input: UploadUrlInput & { body: Uint8Array }): Promise<void>;
  deleteObject(scope: BucketScope, key: string): Promise<void>;
  copyObject(
    sourceScope: BucketScope,
    sourceKey: string,
    destinationScope: BucketScope,
    destinationKey: string,
  ): Promise<void>;
  objectExists(scope: BucketScope, key: string): Promise<boolean>;
  getObjectMetadata(
    scope: BucketScope,
    key: string,
  ): Promise<MediaObjectMetadata | null>;
  listObjects(
    scope: BucketScope,
    prefix: string,
  ): Promise<MediaObjectSummary[]>;
}

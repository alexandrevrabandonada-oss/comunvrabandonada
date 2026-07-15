export type BucketScope = "private_original" | "public_safe" | "radio_private_original" | "radio_public";
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
  createUploadTarget(input: UploadUrlInput): Promise<{ url: string; token?: string; key: string; expiresAt: Date }>;
  confirmUpload(scope: BucketScope, key: string): Promise<MediaObjectMetadata>;
  headObject(scope: BucketScope, key: string): Promise<MediaObjectMetadata | null>;
  readObject(scope: BucketScope, key: string): Promise<Uint8Array>;
  writeDerivative(input: UploadUrlInput & { body: Uint8Array }): Promise<void>;
  removeObject(scope: BucketScope, key: string): Promise<void>;
  listFixtureScopeForCleanup(prefix: string): Promise<MediaObjectSummary[]>;
  createPublicDerivativeUrl(key: string): string;
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

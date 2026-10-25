import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

// Credentials stay in the source process. This adapter exposes no mutation operation.
export function createReadonlyStorageSource(env = process.env) {
  const account = env.R2_ACCOUNT_ID;
  const endpoint = env.R2_ENDPOINT;
  const buckets = {
    private: env.R2_BUCKET_ORIGINALS,
    public: env.R2_BUCKET_PUBLIC,
  };
  if (
    !/^[a-f0-9]{32}$/.test(account ?? "") ||
    endpoint !== `https://${account}.r2.cloudflarestorage.com` ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    buckets.private === buckets.public ||
    Object.values(buckets).some(
      (value) => !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value ?? ""),
    )
  ) {
    throw new Error("COMUN_STORAGE_SOURCE_CONFIGURATION_INVALID");
  }
  const client = new S3Client({
    region: "auto",
    endpoint,
    maxAttempts: 1,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  const bucket = (scope) => {
    if (!Object.hasOwn(buckets, scope))
      throw new Error("COMUN_STORAGE_SCOPE_INVALID");
    return buckets[scope];
  };
  return {
    async list(scope, cursor, signal) {
      return client.send(
        new ListObjectsV2Command({
          Bucket: bucket(scope),
          MaxKeys: 1000,
          ContinuationToken: cursor,
        }),
        { abortSignal: signal },
      );
    },
    async read(object, signal) {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: bucket(object.scope),
          Key: object.key,
          IfMatch: object.etag,
        }),
        { abortSignal: signal },
      );
      return {
        etag: result.ETag,
        length: result.ContentLength,
        body: result.Body,
        attributes: {
          contentType: result.ContentType,
          contentEncoding: result.ContentEncoding,
          cacheControl: result.CacheControl,
          contentDisposition: result.ContentDisposition,
          metadata: result.Metadata,
        },
      };
    },
    close() {
      client.destroy();
    },
  };
}

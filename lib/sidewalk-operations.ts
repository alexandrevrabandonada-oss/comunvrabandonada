export type SidewalkUploadOperationRow = {
  status: string;
  confirmation_state?: string | null;
  failure_code?: string | null;
  created_at: string;
  expires_at: string;
  record_id?: string | null;
};

export type SidewalkRecordOperationRow = {
  status: string;
  visibility: string;
  created_at: string;
  updated_at?: string | null;
};

export type SidewalkPhotoOperationRow = {
  review_status: string;
  is_public: boolean;
  derivative_asset_id?: string | null;
};

export type SidewalkOperationsInput = {
  uploads: SidewalkUploadOperationRow[];
  records: SidewalkRecordOperationRow[];
  photos: SidewalkPhotoOperationRow[];
};

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

function isAfter(value: string, threshold: number) {
  return new Date(value).getTime() >= threshold;
}

function ageHours(value: string, now: Date) {
  return Math.max(0, (now.getTime() - new Date(value).getTime()) / HOUR_MS);
}

export function summarizeSidewalkOperations(
  input: SidewalkOperationsInput,
  now = new Date(),
) {
  const dayAgo = now.getTime() - DAY_MS;
  const weekAgo = now.getTime() - WEEK_MS;
  const pendingRecords = input.records.filter((record) =>
    ["under_review", "pending"].includes(record.status),
  );
  const failureCodes = new Map<string, number>();

  for (const upload of input.uploads) {
    if (!upload.failure_code || !isAfter(upload.created_at, dayAgo)) continue;
    failureCodes.set(
      upload.failure_code,
      (failureCodes.get(upload.failure_code) ?? 0) + 1,
    );
  }

  const oldestQueueAgeHours = pendingRecords.length
    ? Math.max(
        ...pendingRecords.map((record) => ageHours(record.created_at, now)),
      )
    : null;

  return {
    funnel7d: {
      authorized: input.uploads.filter((upload) =>
        isAfter(upload.created_at, weekAgo),
      ).length,
      uploaded: input.uploads.filter(
        (upload) =>
          isAfter(upload.created_at, weekAgo) &&
          ["uploaded", "confirmed"].includes(upload.status),
      ).length,
      confirmed: input.uploads.filter(
        (upload) =>
          isAfter(upload.created_at, weekAgo) && upload.status === "confirmed",
      ).length,
      records: input.records.filter((record) =>
        isAfter(record.created_at, weekAgo),
      ).length,
      published: input.records.filter(
        (record) =>
          isAfter(record.created_at, weekAgo) &&
          record.status === "published" &&
          record.visibility === "public",
      ).length,
    },
    queue: {
      pendingRecords: pendingRecords.length,
      oldestAgeHours: oldestQueueAgeHours,
      pendingPhotos: input.photos.filter(
        (photo) => photo.review_status === "pending" && !photo.is_public,
      ).length,
    },
    uploads: {
      awaiting: input.uploads.filter(
        (upload) => upload.status === "awaiting_upload",
      ).length,
      uploaded: input.uploads.filter((upload) => upload.status === "uploaded")
        .length,
      confirmed: input.uploads.filter((upload) => upload.status === "confirmed")
        .length,
      abandoned: input.uploads.filter((upload) => upload.status === "abandoned")
        .length,
    },
    failures24h: Array.from(failureCodes, ([code, count]) => ({
      code,
      count,
    })).sort(
      (left, right) =>
        right.count - left.count || left.code.localeCompare(right.code),
    ),
    publishedTotal: input.records.filter(
      (record) =>
        record.status === "published" && record.visibility === "public",
    ).length,
  };
}

export function formatSidewalkOperationAge(hours: number | null) {
  if (hours == null) return "sem fila";
  if (hours < 1) return "menos de 1 hora";
  if (hours < 24) return `${Math.floor(hours)} h`;
  const days = Math.floor(hours / 24);
  return `${days} dia${days === 1 ? "" : "s"}`;
}

export function hasExactSidewalkLocationConsent(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;
  const candidate = payload as {
    consent_publish?: unknown;
    consent_location_precision?: unknown;
  };
  return (
    candidate.consent_publish === "yes" &&
    candidate.consent_location_precision === "exact"
  );
}

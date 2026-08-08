import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import sharp, { type Metadata } from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PrivacyClass,
  RelataCategory,
  RelataUrgency,
} from "./comun-relata-contract";
import {
  COMUN_RELATA_LOCATION_KEY,
  COMUN_RELATA_SPATIAL_KEY,
  isComunRelataLocationEnabled,
} from "./comun-relata-evidence-feature";

export const COMUN_RELATA_EVIDENCE_BUCKET = "comun-relata-private" as const;
export const COMUN_RELATA_LOCATION_KEY_VERSION =
  "relata-location-key-v1" as const;
export const COMUN_RELATA_MATCH_RULE_VERSION = "relata-match-v1" as const;
export const COMUN_RELATA_MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const COMUN_RELATA_MAX_PHOTO_PIXELS = 20_000_000;

export type ComunRelataEvidenceState = {
  location: "not_added" | "added_private" | "approximate_private" | "withdrawn";
  locationApproximation: "neighborhood" | "region" | "none";
  photos: Array<{
    label: string;
    state:
      | "quarantine"
      | "validating"
      | "sealed_private"
      | "rejected"
      | "orphaned"
      | "withdrawn";
    mimeType: string | null;
    width: number | null;
    height: number | null;
    reviewRequiredForPublication: true;
    accessUrl: string;
  }>;
  grouping:
    | "case_individual"
    | "auto_link_high_confidence"
    | "candidate_medium_confidence"
    | "new_collective_case"
    | "never_auto_link"
    | "human_review_future";
  groupingConfidence: "high" | "medium" | "low" | "blocked";
  activeReportsInCollective: number;
  noOfficialSend: true;
  nothingPublished: true;
};

function readLocalKey(
  name: string,
  env: Record<string, string | undefined> = process.env,
) {
  if (!isComunRelataLocationEnabled(env))
    throw new Error("COMUN_RELATA_LOCATION_DISABLED");
  const value = env[name];
  const key = value ? Buffer.from(value, "base64url") : Buffer.alloc(0);
  if (key.byteLength !== 32)
    throw new Error("COMUN_RELATA_EVIDENCE_KEY_INVALID");
  return key;
}

function readSpatialKey(env: Record<string, string | undefined> = process.env) {
  const value = env[COMUN_RELATA_SPATIAL_KEY];
  const key = value ? Buffer.from(value, "base64url") : Buffer.alloc(0);
  if (key.byteLength !== 32)
    throw new Error("COMUN_RELATA_SPATIAL_KEY_INVALID");
  return key;
}

function locationAad(protocol: string) {
  if (!/^COMUN-RELATA-[A-F0-9]{16}$/.test(protocol))
    throw new Error("COMUN_RELATA_LOCATION_AAD_INVALID");
  return Buffer.from(`relata-private-location-v1:${protocol}`, "utf8");
}

export function encryptComunRelataLocation(
  input: { longitude: number; latitude: number; accuracyMeters: number | null },
  protocol: string,
  env: Record<string, string | undefined> = process.env,
) {
  assertCoordinates(input.longitude, input.latitude);
  if (
    input.accuracyMeters !== null &&
    (!Number.isFinite(input.accuracyMeters) ||
      input.accuracyMeters < 0 ||
      input.accuracyMeters > 100_000)
  )
    throw new Error("COMUN_RELATA_LOCATION_ACCURACY_INVALID");
  const key = readLocalKey(COMUN_RELATA_LOCATION_KEY, env);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(locationAad(protocol));
  const plaintext = Buffer.from(
    JSON.stringify({
      longitude: input.longitude,
      latitude: input.latitude,
      accuracyMeters: input.accuracyMeters,
    }),
    "utf8",
  );
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    ciphertext,
    nonce,
    authTag: cipher.getAuthTag(),
    keyVersion: COMUN_RELATA_LOCATION_KEY_VERSION,
  };
}

export function decryptComunRelataLocationForServer(
  encrypted: { ciphertext: Buffer; nonce: Buffer; authTag: Buffer },
  protocol: string,
  env: Record<string, string | undefined> = process.env,
) {
  const key = readLocalKey(COMUN_RELATA_LOCATION_KEY, env);
  const decipher = createDecipheriv("aes-256-gcm", key, encrypted.nonce);
  decipher.setAAD(locationAad(protocol));
  decipher.setAuthTag(encrypted.authTag);
  return JSON.parse(
    Buffer.concat([
      decipher.update(encrypted.ciphertext),
      decipher.final(),
    ]).toString("utf8"),
  ) as { longitude: number; latitude: number; accuracyMeters: number | null };
}

// Backward-compatible test name. Production callers use the neutral,
// server-only contract above; the key never crosses this module boundary.
export const decryptComunRelataLocationForLocalTest =
  decryptComunRelataLocationForServer;

function assertCoordinates(longitude: number, latitude: number) {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  )
    throw new Error("COMUN_RELATA_LOCATION_INVALID");
}

export function classifyComunRelataAccuracy(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "not_provided" as const;
  if (value < 25) return "under_25m" as const;
  if (value <= 100) return "25_to_100m" as const;
  return "over_100m" as const;
}

const MATCH_CONFIG: Record<
  "public_lighting" | "power_distribution" | "smoke_or_environmental_trace",
  { cellDegrees: number; neighborRadius: number; windowHours: number }
> = {
  public_lighting: { cellDegrees: 0.0015, neighborRadius: 1, windowHours: 24 * 21 },
  power_distribution: { cellDegrees: 0.004, neighborRadius: 1, windowHours: 12 },
  smoke_or_environmental_trace: {
    cellDegrees: 0.01,
    neighborRadius: 1,
    windowHours: 24,
  },
};

export function deriveComunRelataMatchPlan(
  input: {
    category: RelataCategory;
    urgency: RelataUrgency;
    privacyClass: PrivacyClass;
    longitude?: number;
    latitude?: number;
  },
  env: Record<string, string | undefined> = process.env,
) {
  const blocked =
    input.category === "electrical_hazard" ||
    input.category === "active_fire" ||
    input.urgency === "emergency" ||
    input.privacyClass === "sensitive" ||
    input.privacyClass === "high_risk";
  if (blocked)
    return {
      decision: "never_auto_link" as const,
      spatialKeys: [] as Buffer[],
      windowStart: new Date(Date.now() - 60 * 60 * 1000),
    };
  const config = MATCH_CONFIG[
    input.category as keyof typeof MATCH_CONFIG
  ];
  if (
    !config ||
    input.longitude === undefined ||
    input.latitude === undefined
  )
    return {
      decision: "new_collective_case" as const,
      spatialKeys: [] as Buffer[],
      windowStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
    };
  assertCoordinates(input.longitude, input.latitude);
  const key = readSpatialKey(env);
  const x = Math.floor((input.longitude + 180) / config.cellDegrees);
  const y = Math.floor((input.latitude + 90) / config.cellDegrees);
  const spatialKeys: Buffer[] = [];
  for (let dx = -config.neighborRadius; dx <= config.neighborRadius; dx += 1) {
    for (
      let dy = -config.neighborRadius;
      dy <= config.neighborRadius;
      dy += 1
    ) {
      spatialKeys.push(
        createHmac("sha256", key)
          .update(
            `${COMUN_RELATA_MATCH_RULE_VERSION}:${input.category}:${config.cellDegrees}:${x + dx}:${y + dy}`,
          )
          .digest(),
      );
    }
  }
  return {
    decision: "auto_link_high_confidence" as const,
    spatialKeys,
    windowStart: new Date(Date.now() - config.windowHours * 60 * 60 * 1000),
  };
}

function detectedImageMime(body: Uint8Array) {
  if (body.byteLength >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff)
    return "image/jpeg" as const;
  if (
    body.byteLength >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => body[index] === value,
    )
  )
    return "image/png" as const;
  if (
    body.byteLength >= 12 &&
    Buffer.from(body.subarray(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(body.subarray(8, 12)).toString("ascii") === "WEBP"
  )
    return "image/webp" as const;
  throw new Error("COMUN_RELATA_PHOTO_TYPE_INVALID");
}

export async function validateAndDeriveComunRelataPhoto(body: Uint8Array) {
  if (body.byteLength < 12 || body.byteLength > COMUN_RELATA_MAX_PHOTO_BYTES)
    throw new Error("COMUN_RELATA_PHOTO_SIZE_INVALID");
  const mimeType = detectedImageMime(body);
  let metadata: Metadata;
  try {
    metadata = await sharp(body, {
      animated: false,
      failOn: "error",
      limitInputPixels: COMUN_RELATA_MAX_PHOTO_PIXELS,
    }).metadata();
  } catch {
    throw new Error("COMUN_RELATA_PHOTO_CORRUPT");
  }
  if (
    !metadata.width ||
    !metadata.height ||
    (metadata.pages ?? 1) > 1 ||
    metadata.width * metadata.height > COMUN_RELATA_MAX_PHOTO_PIXELS
  )
    throw new Error("COMUN_RELATA_PHOTO_DIMENSIONS_INVALID");
  const derivative = await sharp(body, {
    animated: false,
    failOn: "error",
    limitInputPixels: COMUN_RELATA_MAX_PHOTO_PIXELS,
  })
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
  return {
    mimeType,
    width: metadata.width,
    height: metadata.height,
    originalSizeBytes: body.byteLength,
    derivative,
    checksum: createHash("sha256").update(body).digest(),
    derivativeChecksum: createHash("sha256").update(derivative).digest(),
  };
}

export function comunRelataAttachmentPaths(attachmentId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attachmentId))
    throw new Error("COMUN_RELATA_ATTACHMENT_ID_INVALID");
  return {
    original: `quarantine/${attachmentId}.bin`,
    derivative: `sealed/${attachmentId}.webp`,
  };
}

export async function removeComunRelataEvidenceObjects(
  db: SupabaseClient,
  attachmentId: string,
) {
  const paths = comunRelataAttachmentPaths(attachmentId);
  await db.storage
    .from(COMUN_RELATA_EVIDENCE_BUCKET)
    .remove([paths.original, paths.derivative]);
}

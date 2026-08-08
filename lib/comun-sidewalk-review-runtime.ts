import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptComunRelataLocationForServer } from "./comun-relata-evidence";
import { sanitizeSidewalkPointForPublic } from "./comun-sidewalk-public-location";

type AdminIntakeRow = {
  intake_id: string;
  protocol: string;
  original_text: string;
  condition: string;
  problems: string[];
  affected_groups: string[];
  review_state: string;
  created_at: string;
  location_origin: string;
  location_accuracy_class: string;
  location_captured_at: string;
  location_ciphertext: string;
  location_nonce: string;
  location_auth_tag: string;
  location_key_version: string;
  attachment_id: string | null;
  attachment_derivative_object_key: string | null;
};

function bytea(value: string) {
  if (!/^\\x[0-9a-f]+$/i.test(value)) throw new Error("COMUN_SIDEWALK_LOCATION_BYTES_INVALID");
  return Buffer.from(value.slice(2), "hex");
}

export async function listSidewalkReviewQueue(
  db: SupabaseClient,
  options: { intakeId?: string; includePrivatePhoto?: boolean } = {},
) {
  const { data, error } = await db.rpc("comun_sidewalk_intake_admin_list", {
    p_intake_id: options.intakeId ?? null,
  });
  if (error) throw new Error("COMUN_SIDEWALK_REVIEW_QUEUE_UNAVAILABLE");
  const rows = (Array.isArray(data) ? data : []) as AdminIntakeRow[];
  return Promise.all(rows.map(async (row) => {
    const exact = decryptComunRelataLocationForServer(
      {
        ciphertext: bytea(row.location_ciphertext),
        nonce: bytea(row.location_nonce),
        authTag: bytea(row.location_auth_tag),
      },
      row.protocol,
    );
    const reviewPoint = sanitizeSidewalkPointForPublic(exact);
    let privatePhotoUrl: string | null = null;
    if (options.includePrivatePhoto !== false && row.attachment_derivative_object_key) {
      const signed = await db.storage
        .from("comun-relata-private")
        .createSignedUrl(row.attachment_derivative_object_key, 300);
      privatePhotoUrl = signed.data?.signedUrl ?? null;
    }
    return {
      id: row.intake_id,
      originalText: row.original_text,
      condition: row.condition,
      problems: row.problems,
      affectedGroups: row.affected_groups,
      reviewState: row.review_state,
      createdAt: row.created_at,
      locationOrigin: row.location_origin,
      locationAccuracyClass: row.location_accuracy_class,
      locationCapturedAt: row.location_captured_at,
      approximateReviewPoint: reviewPoint,
      privatePhotoUrl,
    };
  }));
}

export async function resolveSidewalkPublicPoint(db: SupabaseClient, intakeId: string) {
  const queue = await listSidewalkReviewQueue(db, {
    intakeId,
    includePrivatePhoto: false,
  });
  const item = queue.find((candidate) => candidate.id === intakeId);
  if (!item) throw new Error("COMUN_SIDEWALK_REVIEW_ITEM_NOT_FOUND");
  return item.approximateReviewPoint;
}

import "server-only";

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  decodeComunRelataReceiptCookie,
} from "./comun-relata-persistence";
import {
  deriveComunRelataMatchPlan,
  decryptComunRelataLocationForServer,
  type ComunRelataEvidenceState,
} from "./comun-relata-evidence";
import {
  isComunRelataCollectiveEnabled,
  isComunRelataAttachmentsEnabled,
  isComunRelataEvidenceEnabled,
  isComunRelataLocationEnabled,
} from "./comun-relata-evidence-feature";
import { walletSecretHash } from "./comun-participation-wallet-runtime";

export const COMUN_RELATA_EVIDENCE_NO_STORE = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

export function getComunRelataEvidenceRuntime(
  request: NextRequest,
  capability: "evidence" | "attachments" | "location" | "grouping" = "evidence",
) {
  const enabled =
    capability === "attachments"
      ? isComunRelataAttachmentsEnabled()
      : capability === "location"
        ? isComunRelataLocationEnabled()
        : capability === "grouping"
          ? isComunRelataCollectiveEnabled()
          : isComunRelataEvidenceEnabled();
  if (!enabled) return null;
  const proof = decodeComunRelataReceiptCookie(
    request.cookies.get(COMUN_RELATA_RECEIPT_COOKIE)?.value,
  );
  if (!proof) return null;
  return {
    proof,
    db: createComunRelataPersistenceClient(),
  };
}
export function postgresBytea(value: Uint8Array) {
  return `\\x${Buffer.from(value).toString("hex")}`;
}

function readPostgresBytea(value: unknown) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string" && /^\\x[0-9a-f]*$/i.test(value))
    return Buffer.from(value.slice(2), "hex");
  if (value instanceof Uint8Array) return Buffer.from(value);
  throw new Error("COMUN_RELATA_BYTEA_INVALID");
}

export async function readComunRelataEvidenceState(
  db: SupabaseClient,
  proof: { protocol: string; receiptSecret: string },
) {
  const { data, error } = await db.rpc("comun_relata_get_evidence_state", {
    p_protocol: proof.protocol,
    p_receipt_secret: proof.receiptSecret,
  });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return (data[0] as { evidence: ComunRelataEvidenceState }).evidence;
}

export async function associateComunRelataCollectiveForWallet(
  db: SupabaseClient,
  walletToken: string,
  walletItemId: string,
) {
  if (!isComunRelataCollectiveEnabled()) return null;
  const locationResult = await db.rpc(
    "comun_relata_public_projection_owned_location",
    {
      p_token_hash_hex: walletSecretHash(walletToken),
      p_wallet_item_id: walletItemId,
    },
  );
  if (
    locationResult.error ||
    !Array.isArray(locationResult.data) ||
    !locationResult.data[0]
  )
    return null;
  const location = locationResult.data[0] as {
    protocol: string;
    category: string;
    urgency: string;
    privacy_class: string;
    encrypted_value: unknown;
    nonce: unknown;
    auth_tag: unknown;
  };
  const coordinates = decryptComunRelataLocationForServer(
    {
      ciphertext: readPostgresBytea(location.encrypted_value),
      nonce: readPostgresBytea(location.nonce),
      authTag: readPostgresBytea(location.auth_tag),
    },
    location.protocol,
  );
  const plan = deriveComunRelataMatchPlan({
    category: location.category as Parameters<
      typeof deriveComunRelataMatchPlan
    >[0]["category"],
    urgency: location.urgency as Parameters<
      typeof deriveComunRelataMatchPlan
    >[0]["urgency"],
    privacyClass: location.privacy_class as Parameters<
      typeof deriveComunRelataMatchPlan
    >[0]["privacyClass"],
    longitude: coordinates.longitude,
    latitude: coordinates.latitude,
  });
  if (plan.decision !== "auto_link_high_confidence") return null;
  const { data, error } = await db.rpc(
    "comun_relata_associate_collective_for_wallet",
    {
      p_token_hash_hex: walletSecretHash(walletToken),
      p_wallet_item_id: walletItemId,
      p_requested_decision: plan.decision,
      p_spatial_keys: plan.spatialKeys.map(postgresBytea),
      p_window_start: plan.windowStart.toISOString(),
    },
  );
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0] as {
    grouping_state: string;
    confidence_level: string;
    active_members_count: number;
  };
}

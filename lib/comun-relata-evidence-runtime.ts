import "server-only";

import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  COMUN_RELATA_RECEIPT_COOKIE,
  createComunRelataPersistenceClient,
  decodeComunRelataReceiptCookie,
  normalizeComunRelataReceipt,
} from "./comun-relata-persistence";
import {
  deriveComunRelataMatchPlan,
  type ComunRelataEvidenceState,
} from "./comun-relata-evidence";
import {
  isComunRelataCollectiveEnabled,
  isComunRelataEvidenceEnabled,
} from "./comun-relata-evidence-feature";

export const COMUN_RELATA_EVIDENCE_NO_STORE = {
  "cache-control": "private, no-store, max-age=0",
  "x-content-type-options": "nosniff",
};

export function getComunRelataEvidenceRuntime(request: NextRequest) {
  if (!isComunRelataEvidenceEnabled()) return null;
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

export async function associateComunRelataCollective(
  db: SupabaseClient,
  proof: { protocol: string; receiptSecret: string },
  coordinates?: { longitude: number; latitude: number },
) {
  if (!isComunRelataCollectiveEnabled()) return null;
  const receiptResult = await db.rpc("comun_relata_get_receipt", {
    p_protocol: proof.protocol,
    p_receipt_secret: proof.receiptSecret,
  });
  if (
    receiptResult.error ||
    !Array.isArray(receiptResult.data) ||
    !receiptResult.data[0]
  )
    return null;
  const receipt = normalizeComunRelataReceipt(receiptResult.data[0]);
  const plan = deriveComunRelataMatchPlan({
    category: receipt.category as Parameters<
      typeof deriveComunRelataMatchPlan
    >[0]["category"],
    urgency: receipt.urgency as Parameters<
      typeof deriveComunRelataMatchPlan
    >[0]["urgency"],
    privacyClass: "public_after_sanitization",
    ...coordinates,
  });
  const { data, error } = await db.rpc("comun_relata_associate_collective", {
    p_protocol: proof.protocol,
    p_receipt_secret: proof.receiptSecret,
    p_requested_decision: plan.decision,
    p_spatial_keys: plan.spatialKeys.map(postgresBytea),
    p_window_start: plan.windowStart.toISOString(),
  });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0] as {
    grouping_state: string;
    confidence_level: string;
    active_members_count: number;
  };
}
